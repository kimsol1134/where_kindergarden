import Combine
import Foundation
import Models
import Services

public enum NativeTab: Hashable {
    case search
    case compare
    case saved
    case more
}

@MainActor
public final class NativeAppModel: ObservableObject {
    public static let defaultCenter = Coordinates(lat: 37.5665, lng: 126.9780)
    public static let defaultLocationLabel = "서울 시청"

    @Published public var query: String {
        didSet { refresh() }
    }

    @Published public var filters: SearchFilters {
        didSet { refresh() }
    }

    @Published public private(set) var userLocation: Coordinates
    @Published public private(set) var locationLabel: String
    @Published public private(set) var results: [Kindergarten]
    @Published public private(set) var reviewsData: ReviewsData?
    @Published public private(set) var favorites: [FavoriteItem]
    @Published public private(set) var recentSearches: [RecentSearch]
    @Published public var compareSelection: CompareSelection {
        didSet { persistence.saveCompareSelection(compareSelection) }
    }
    @Published public var selectedTab: NativeTab = .search
    @Published public private(set) var selectedKindergarten: Kindergarten?
    @Published public private(set) var isCatalogLoading = false
    @Published public private(set) var isReviewsLoading = false
    @Published public private(set) var catalogError: String?
    @Published public private(set) var reviewsError: String?
    @Published public private(set) var locationError: String?

    public let configuration: NativeAppConfiguration

    private let kindergartenRepository: KindergartenJSONRepository
    private let reviewRepository: ReviewRepository
    private let searchEngine: KindergartenSearchEngine
    private let locationProvider: CurrentLocationProviding
    private let persistence: NativeAppPersistence

    private var allKindergartens: [KindergartenRaw]
    private var hasBootstrapped: Bool
    private var kindergartenLookup: [String: KindergartenRaw]

    public init(
        kindergartenRepository: KindergartenJSONRepository,
        reviewRepository: ReviewRepository,
        searchEngine: KindergartenSearchEngine = KindergartenSearchEngine(),
        locationProvider: CurrentLocationProviding,
        persistence: NativeAppPersistence,
        configuration: NativeAppConfiguration,
        initialKindergartens: [KindergartenRaw] = [],
        initialReviews: ReviewsData? = nil,
        filters: SearchFilters = SearchFilters(),
        query: String = ""
    ) {
        let restoredState = persistence.restore()
        self.kindergartenRepository = kindergartenRepository
        self.reviewRepository = reviewRepository
        self.searchEngine = searchEngine
        self.locationProvider = locationProvider
        self.persistence = persistence
        self.configuration = configuration
        self.allKindergartens = initialKindergartens
        self.hasBootstrapped = !initialKindergartens.isEmpty && initialReviews != nil
        self.kindergartenLookup = Dictionary(
            uniqueKeysWithValues: initialKindergartens.map { ($0.kindercode, $0) }
        )
        self.query = query
        self.filters = filters
        self.reviewsData = initialReviews
        self.favorites = restoredState.favorites
        self.recentSearches = restoredState.recentSearches
        self.compareSelection = restoredState.compareSelection

        if let restoredSearch = restoredState.recentSearches.first, let coordinates = restoredSearch.coordinates {
            self.userLocation = coordinates
            self.locationLabel = restoredSearch.label
        } else {
            self.userLocation = Self.defaultCenter
            self.locationLabel = Self.defaultLocationLabel
        }

        self.results = []
        refresh()
    }

    public static func live(
        bundle: Bundle = .main,
        userDefaults: UserDefaults = .standard,
        session: URLSession = .shared
    ) -> NativeAppModel {
        let configuration = NativeAppConfiguration.live(bundle: bundle)
        let bundledLoader = BundledJSONResourceLoader(bundle: bundle)
        let remoteLoader = RemoteJSONLoader(session: session)

        let kindergartenRepository = KindergartenJSONRepository {
            try bundledLoader.data(named: configuration.kindergartensResourceName)
        }

        let reviewRepository = ReviewRepository(
            remoteLoader: {
                try await remoteLoader.data(from: configuration.reviewsRemoteURL)
            },
            localLoader: {
                try bundledLoader.data(named: configuration.reviewsResourceName)
            }
        )

        return NativeAppModel(
            kindergartenRepository: kindergartenRepository,
            reviewRepository: reviewRepository,
            locationProvider: CurrentLocationService(),
            persistence: NativeAppPersistence(store: userDefaults),
            configuration: configuration
        )
    }

    public static func preview() -> NativeAppModel {
        let store = InMemoryNativeAppStore()
        let persistence = NativeAppPersistence(store: store)
        let previewReviews = ReviewsData(
            version: "2026-03-17",
            totalCount: 2,
            kindergartenCount: 2,
            reviews: [
                "A001": [
                    ReviewLink(
                        id: "rev-1",
                        kindergartenId: "A001",
                        title: "아이와 잘 맞았어요",
                        url: "https://example.com/rev-1",
                        source: "naver_blog",
                        sourceName: "네이버 블로그",
                        snippet: "선생님과 공간이 모두 안정적이었습니다.",
                        summary: nil,
                        tags: nil,
                        content: nil,
                        date: "2026-03-01",
                        collectedAt: "2026-03-17T00:00:00Z",
                        relevanceScore: 4
                    )
                ],
                "A002": [
                    ReviewLink(
                        id: "rev-2",
                        kindergartenId: "A002",
                        title: "통학 버스가 편해요",
                        url: "https://example.com/rev-2",
                        source: "naver_cafe",
                        sourceName: "네이버 카페",
                        snippet: "셔틀 동선이 좋아 맞벌이 가정이 쓰기 편했습니다.",
                        summary: nil,
                        tags: nil,
                        content: nil,
                        date: "2026-02-24",
                        collectedAt: "2026-03-17T00:00:00Z",
                        relevanceScore: 3
                    )
                ],
            ]
        )

        return NativeAppModel(
            kindergartenRepository: KindergartenJSONRepository {
                Data()
            },
            reviewRepository: ReviewRepository(localLoader: { Data() }),
            locationProvider: PreviewLocationProvider(coordinates: Coordinates(lat: 37.4981, lng: 127.0276)),
            persistence: persistence,
            configuration: NativeAppConfiguration(kakaoAppKey: nil),
            initialKindergartens: NativePreviewFixtures.kindergartens,
            initialReviews: previewReviews
        )
    }

    public func bootstrapIfNeeded() async {
        guard !hasBootstrapped else { return }
        hasBootstrapped = true

        async let catalogTask: Void = loadCatalog()
        async let reviewsTask: Void = loadReviews()
        _ = await (catalogTask, reviewsTask)
    }

    public func loadCatalog() async {
        guard !isCatalogLoading else { return }
        isCatalogLoading = true
        catalogError = nil
        defer { isCatalogLoading = false }

        do {
            let loaded = try await kindergartenRepository.load()
            allKindergartens = loaded
            kindergartenLookup = Dictionary(uniqueKeysWithValues: loaded.map { ($0.kindercode, $0) })
            refresh()
        } catch {
            catalogError = error.localizedDescription
            results = []
        }
    }

    public func loadReviews() async {
        guard !isReviewsLoading else { return }
        isReviewsLoading = true
        reviewsError = nil
        defer { isReviewsLoading = false }

        do {
            reviewsData = try await reviewRepository.load()
        } catch {
            reviewsError = error.localizedDescription
        }
    }

    public func updateRadius(to radius: Double) {
        filters.radiusKM = radius
    }

    public func updateSort(to sort: SortOption) {
        filters.sort = sort
    }

    public func toggleBusFilter() {
        filters.hasBus = filters.hasBus == true ? nil : true
    }

    public func toggleLargeSpaceFilter() {
        filters.hasLargeSpace = filters.hasLargeSpace == true ? nil : true
    }

    public func setLocation(_ coordinates: Coordinates, label: String, recordRecents: Bool = true) {
        userLocation = coordinates
        locationLabel = label
        locationError = nil

        guard recordRecents else {
            refresh()
            return
        }

        let nextSearch = RecentSearch(label: label, coordinates: coordinates)
        let filtered = recentSearches.filter { $0.label != label }
        recentSearches = Array(([nextSearch] + filtered).prefix(5))
        persistence.saveRecentSearches(recentSearches)
        refresh()
    }

    public func centerOnCurrentLocation() async {
        do {
            let coordinates = try await locationProvider.requestCurrentLocation()
            setLocation(coordinates, label: "현재 위치")
        } catch {
            locationError = error.localizedDescription
        }
    }

    public func select(kindergarten: Kindergarten) {
        selectedKindergarten = kindergarten
    }

    public func dismissDetail() {
        selectedKindergarten = nil
    }

    public func toggleCompare(for kindergarten: Kindergarten) {
        compareSelection.toggle(id: kindergarten.kindercode)
        persistence.saveCompareSelection(compareSelection)
        refreshSelectedKindergarten()
    }

    public func isCompared(_ kindergarten: Kindergarten) -> Bool {
        compareSelection.contains(kindergarten.kindercode)
    }

    public func compareOrder(for kindercode: String) -> Int? {
        compareSelection.ids.firstIndex(of: kindercode).map { $0 + 1 }
    }

    public func comparedKindergartens() -> [Kindergarten] {
        compareSelection.ids.compactMap { id in
            kindergartenLookup[id].map(makeKindergarten(from:))
        }
    }

    public func compareShareURL() -> URL? {
        guard !compareSelection.ids.isEmpty else { return nil }

        guard var components = URLComponents(url: configuration.compareShareBaseURL, resolvingAgainstBaseURL: false) else {
            return nil
        }

        components.queryItems = [
            URLQueryItem(name: "ids", value: compareSelection.ids.joined(separator: ","))
        ]
        return components.url
    }

    public func toggleFavorite(for kindergarten: Kindergarten) {
        if favorites.contains(where: { $0.kindercode == kindergarten.kindercode }) {
            favorites.removeAll { $0.kindercode == kindergarten.kindercode }
        } else {
            favorites.insert(
                FavoriteItem(
                    kindercode: kindergarten.kindercode,
                    name: kindergarten.name,
                    address: kindergarten.address,
                    type: kindergarten.type
                ),
                at: 0
            )
        }

        persistence.saveFavorites(favorites)
    }

    public func isFavorite(_ kindergarten: Kindergarten) -> Bool {
        favorites.contains { $0.kindercode == kindergarten.kindercode }
    }

    public func favoriteKindergartens() -> [Kindergarten] {
        favorites.compactMap { item in
            kindergartenLookup[item.kindercode].map(makeKindergarten(from:))
        }
    }

    public func reviews(for kindercode: String) -> [ReviewLink] {
        reviewsData?.reviews[kindercode] ?? []
    }

    public func applyDeepLink(_ url: URL) {
        let parser = DeepLinkParser()
        guard let destination = parser.destination(for: url) else { return }

        switch destination {
        case let .compare(ids):
            compareSelection = CompareSelection(ids: ids)
            persistence.saveCompareSelection(compareSelection)
            selectedTab = .compare
            refreshSelectedKindergarten()
        case let .search(query):
            self.query = query ?? ""
            selectedTab = .search
        }
    }

    public func applyUniversalLink(_ userActivity: NSUserActivity) {
        guard let url = userActivity.webpageURL else { return }
        applyDeepLink(url)
    }

    public func restoreRecentSearch(_ search: RecentSearch) {
        guard let coordinates = search.coordinates else { return }
        setLocation(coordinates, label: search.label)
        selectedTab = .search
    }

    private func refresh() {
        guard !allKindergartens.isEmpty else {
            results = []
            refreshSelectedKindergarten()
            return
        }

        let baseResults = searchEngine.search(
            raws: allKindergartens,
            location: userLocation,
            filters: filters
        )

        let normalizedQuery = query
            .trimmingCharacters(in: .whitespacesAndNewlines)
            .folding(options: .diacriticInsensitive, locale: Locale(identifier: "ko_KR"))

        if normalizedQuery.isEmpty {
            results = baseResults
        } else {
            results = baseResults.filter { kindergarten in
                let searchable = "\(kindergarten.name) \(kindergarten.address)"
                    .folding(options: .diacriticInsensitive, locale: Locale(identifier: "ko_KR"))
                return searchable.localizedCaseInsensitiveContains(normalizedQuery)
            }
        }

        refreshSelectedKindergarten()
    }

    private func refreshSelectedKindergarten() {
        guard let selectedID = selectedKindergarten?.kindercode else { return }
        selectedKindergarten = results.first(where: { $0.kindercode == selectedID })
            ?? kindergartenLookup[selectedID].map(makeKindergarten(from:))
    }

    private func makeKindergarten(from raw: KindergartenRaw) -> Kindergarten {
        searchEngine.makeKindergartens(raws: [raw], relativeTo: userLocation).first ?? Kindergarten(raw: raw, distance: -1)
    }
}

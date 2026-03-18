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
    private static let searchSuggestionMinimumLength = 2
    private static let searchLocale = Locale(identifier: "ko_KR")

    @Published public private(set) var searchText: String

    @Published public var filters: SearchFilters {
        didSet { refresh() }
    }

    @Published public private(set) var userLocation: Coordinates
    @Published public private(set) var currentDeviceLocation: Coordinates?
    @Published public private(set) var locationLabel: String
    @Published public private(set) var results: [Kindergarten]
    @Published public private(set) var reviewsData: ReviewsData?
    @Published public private(set) var favorites: [FavoriteItem]
    @Published public private(set) var recentSearches: [RecentSearch]
    @Published public private(set) var localSearchSuggestions: [SearchSuggestion]
    @Published public private(set) var remoteSearchSuggestions: [SearchSuggestion]
    @Published public private(set) var isSearchSuggestionsLoading = false
    @Published public private(set) var searchSuggestionMessage: String?
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
    private let remoteSearchService: any RemoteLocationSuggesting
    private let locationProvider: CurrentLocationProviding
    private let persistence: NativeAppPersistence
    private let searchDebounceDuration: Duration

    private var allKindergartens: [KindergartenRaw]
    private var hasBootstrapped: Bool
    private var kindergartenLookup: [String: KindergartenRaw]
    private var pendingSearchDeepLinkQuery: String?
    private var searchDeepLinkTask: Task<Void, Never>?
    private var searchSuggestionTask: Task<Void, Never>?
    private var resultQuery: String

    public init(
        kindergartenRepository: KindergartenJSONRepository,
        reviewRepository: ReviewRepository,
        searchEngine: KindergartenSearchEngine = KindergartenSearchEngine(),
        remoteSearchService: any RemoteLocationSuggesting,
        locationProvider: CurrentLocationProviding,
        persistence: NativeAppPersistence,
        configuration: NativeAppConfiguration,
        initialKindergartens: [KindergartenRaw] = [],
        initialReviews: ReviewsData? = nil,
        filters: SearchFilters = SearchFilters(),
        searchText: String = "",
        searchDebounceDuration: Duration = .milliseconds(300)
    ) {
        let restoredState = persistence.restore()
        self.kindergartenRepository = kindergartenRepository
        self.reviewRepository = reviewRepository
        self.searchEngine = searchEngine
        self.remoteSearchService = remoteSearchService
        self.locationProvider = locationProvider
        self.persistence = persistence
        self.configuration = configuration
        self.allKindergartens = initialKindergartens
        self.hasBootstrapped = !initialKindergartens.isEmpty && initialReviews != nil
        self.kindergartenLookup = Dictionary(
            uniqueKeysWithValues: initialKindergartens.map { ($0.kindercode, $0) }
        )
        self.searchText = searchText
        self.resultQuery = searchText
        self.filters = filters
        self.reviewsData = initialReviews
        self.favorites = restoredState.favorites
        self.recentSearches = restoredState.recentSearches
        self.localSearchSuggestions = []
        self.remoteSearchSuggestions = []
        self.compareSelection = restoredState.compareSelection
        self.searchDebounceDuration = searchDebounceDuration

        if let restoredSearch = restoredState.recentSearches.first, let coordinates = restoredSearch.coordinates {
            self.userLocation = coordinates
            self.locationLabel = restoredSearch.label
        } else {
            self.userLocation = Self.defaultCenter
            self.locationLabel = Self.defaultLocationLabel
        }
        self.currentDeviceLocation = nil

        self.results = []
        refresh()
        refreshSearchSuggestions()
    }

    deinit {
        searchDeepLinkTask?.cancel()
        searchSuggestionTask?.cancel()
    }

    public var recentSearchSuggestions: [SearchSuggestion] {
        recentSearches.compactMap { search in
            guard let coordinates = search.coordinates else {
                return nil
            }

            return SearchSuggestion(
                id: "recent:\(search.id.uuidString)",
                kind: .recent,
                title: search.label,
                subtitle: String(format: "%.4f, %.4f", coordinates.lat, coordinates.lng),
                coordinates: coordinates
            )
        }
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
            remoteSearchService: KakaoLocalSuggestionService(
                client: KakaoLocalAPIClient(
                    apiKey: configuration.kakaoRESTAPIKey,
                    session: session
                )
            ),
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
            remoteSearchService: KakaoLocalSuggestionService(
                client: KakaoLocalAPIClient(apiKey: nil)
            ),
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
            refreshSearchSuggestions()

            if let pendingSearchDeepLinkQuery {
                self.pendingSearchDeepLinkQuery = nil
                applySearchDeepLink(query: pendingSearchDeepLinkQuery)
            }
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

    public func updateSearchText(_ text: String) {
        setSearchText(text, refreshSuggestions: true, applyAsResultQuery: true)
    }

    public func clearSearchText() {
        setSearchText("", refreshSuggestions: false, applyAsResultQuery: true)
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
        let filtered = recentSearches.filter {
            $0.label != label || $0.coordinates != coordinates
        }
        recentSearches = Array(([nextSearch] + filtered).prefix(5))
        persistence.saveRecentSearches(recentSearches)
        refresh()
    }

    public func centerOnCurrentLocation() async {
        do {
            let coordinates = try await locationProvider.requestCurrentLocation()
            currentDeviceLocation = coordinates
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

    public func selectSearchSuggestion(_ suggestion: SearchSuggestion) {
        setLocation(suggestion.coordinates, label: suggestion.title)
        setSearchText(
            suggestion.title,
            refreshSuggestions: false,
            applyAsResultQuery: suggestion.kind == .kindergarten
        )
        selectedTab = .search
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

    public func deleteFavorites(atOffsets offsets: IndexSet) {
        _ = takeFavorites(atOffsets: offsets)
    }

    public func openKindergartenDetail(kindercode: String, recordRecents: Bool = false) {
        guard let raw = kindergartenLookup[kindercode] else { return }
        let kindergarten = makeKindergarten(from: raw)
        setLocation(kindergarten.location, label: kindergarten.name, recordRecents: recordRecents)
        setSearchText(kindergarten.name, refreshSuggestions: false, applyAsResultQuery: true)
        selectedTab = .search
        selectedKindergarten = kindergartenLookup[kindercode].map(makeKindergarten(from:))
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
            selectedTab = .search
            applySearchDeepLink(query: query)
        }
    }

    public func applyUniversalLink(_ userActivity: NSUserActivity) {
        guard let url = userActivity.webpageURL else { return }
        applyDeepLink(url)
    }

    public func restoreRecentSearch(_ search: RecentSearch) {
        guard let coordinates = search.coordinates else { return }
        setLocation(coordinates, label: search.label)
        setSearchText(search.label, refreshSuggestions: false, applyAsResultQuery: false)
        selectedTab = .search
    }

    public func deleteRecentSearches(atOffsets offsets: IndexSet) {
        _ = takeRecentSearches(atOffsets: offsets)
    }

    public func clearRecentSearches() {
        _ = takeAllRecentSearches()
    }

    public func takeFavorite(kindercode: String) -> IndexedFavoriteItem? {
        guard let index = favorites.firstIndex(where: { $0.kindercode == kindercode }) else {
            return nil
        }

        let item = favorites.remove(at: index)
        persistence.saveFavorites(favorites)
        return IndexedFavoriteItem(value: item, index: index)
    }

    public func takeFavorites(atOffsets offsets: IndexSet) -> [IndexedFavoriteItem] {
        let removals = offsets.sorted().compactMap { offset -> IndexedFavoriteItem? in
            guard favorites.indices.contains(offset) else { return nil }
            return IndexedFavoriteItem(value: favorites[offset], index: offset)
        }

        guard !removals.isEmpty else { return [] }

        for offset in offsets.sorted(by: >) where favorites.indices.contains(offset) {
            favorites.remove(at: offset)
        }
        persistence.saveFavorites(favorites)
        return removals
    }

    public func restoreFavorites(_ items: [IndexedFavoriteItem]) {
        guard !items.isEmpty else { return }

        for item in items.sorted(by: { $0.index < $1.index }) {
            favorites.removeAll { $0.kindercode == item.value.kindercode }
            favorites.insert(item.value, at: min(item.index, favorites.count))
        }
        persistence.saveFavorites(favorites)
    }

    public func removeRecentSearch(_ search: RecentSearch) {
        _ = takeRecentSearch(search)
    }

    public func takeRecentSearch(_ search: RecentSearch) -> IndexedRecentSearch? {
        guard let index = recentSearches.firstIndex(where: {
            $0.id == search.id || ($0.label == search.label && $0.coordinates == search.coordinates)
        }) else {
            return nil
        }

        let item = recentSearches.remove(at: index)
        persistence.saveRecentSearches(recentSearches)
        return IndexedRecentSearch(value: item, index: index)
    }

    public func takeRecentSearches(atOffsets offsets: IndexSet) -> [IndexedRecentSearch] {
        let removals = offsets.sorted().compactMap { offset -> IndexedRecentSearch? in
            guard recentSearches.indices.contains(offset) else { return nil }
            return IndexedRecentSearch(value: recentSearches[offset], index: offset)
        }

        guard !removals.isEmpty else { return [] }

        for offset in offsets.sorted(by: >) where recentSearches.indices.contains(offset) {
            recentSearches.remove(at: offset)
        }
        persistence.saveRecentSearches(recentSearches)
        return removals
    }

    public func takeAllRecentSearches() -> [IndexedRecentSearch] {
        takeRecentSearches(atOffsets: IndexSet(recentSearches.indices))
    }

    public func restoreRecentSearches(_ items: [IndexedRecentSearch]) {
        guard !items.isEmpty else { return }

        for item in items.sorted(by: { $0.index < $1.index }) {
            recentSearches.removeAll {
                $0.id == item.value.id || ($0.label == item.value.label && $0.coordinates == item.value.coordinates)
            }
            recentSearches.insert(item.value, at: min(item.index, recentSearches.count))
        }
        persistence.saveRecentSearches(recentSearches)
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
            filters: filters,
            query: resultQuery
        )

        results = baseResults
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

    private func setSearchText(_ text: String, refreshSuggestions: Bool, applyAsResultQuery: Bool) {
        searchText = text
        resultQuery = applyAsResultQuery ? text : ""
        refresh()

        if refreshSuggestions {
            refreshSearchSuggestions()
        } else {
            clearSearchSuggestions()
        }
    }

    private func refreshSearchSuggestions() {
        searchSuggestionTask?.cancel()

        let trimmedQuery = trimmedSearchText(searchText)
        guard trimmedQuery.count >= Self.searchSuggestionMinimumLength else {
            clearSearchSuggestions()
            return
        }

        localSearchSuggestions = makeLocalSearchSuggestions(for: trimmedQuery)
        remoteSearchSuggestions = []
        searchSuggestionMessage = nil

        guard remoteSearchService.isConfigured else {
            isSearchSuggestionsLoading = false
            searchSuggestionMessage = remoteSearchService.unavailableMessage
            return
        }

        isSearchSuggestionsLoading = true
        let origin = userLocation
        let querySnapshot = trimmedQuery

        searchSuggestionTask = Task { [weak self] in
            guard let self else { return }

            do {
                try await Task.sleep(for: self.searchDebounceDuration)
            } catch {
                return
            }

            let result = await self.remoteSearchService.suggestions(for: querySnapshot, near: origin)
            self.applyRemoteSearchSuggestions(result, for: querySnapshot)
        }
    }

    private func applyRemoteSearchSuggestions(
        _ result: RemoteLocationSearchResult,
        for query: String
    ) {
        guard trimmedSearchText(searchText) == query else {
            return
        }

        remoteSearchSuggestions = result.suggestions
        searchSuggestionMessage = result.message
        isSearchSuggestionsLoading = false
    }

    private func clearSearchSuggestions() {
        searchSuggestionTask?.cancel()
        searchSuggestionTask = nil
        localSearchSuggestions = []
        remoteSearchSuggestions = []
        searchSuggestionMessage = nil
        isSearchSuggestionsLoading = false
    }

    private func makeLocalSearchSuggestions(for query: String) -> [SearchSuggestion] {
        let normalizedQuery = normalizedSearchText(query)

        let rankedMatches = allKindergartens.compactMap { raw -> (priority: Int, distance: Double, raw: KindergartenRaw)? in
            let normalizedName = normalizedSearchText(raw.name)
            let normalizedAddress = normalizedSearchText(raw.address)

            let priority: Int?
            if normalizedName == normalizedQuery {
                priority = 0
            } else if normalizedName.hasPrefix(normalizedQuery) {
                priority = 1
            } else if normalizedName.localizedCaseInsensitiveContains(normalizedQuery) {
                priority = 2
            } else if normalizedAddress.localizedCaseInsensitiveContains(normalizedQuery) {
                priority = 3
            } else {
                priority = nil
            }

            guard let priority else {
                return nil
            }

            let distance = DistanceCalculator().kilometers(
                from: userLocation,
                to: Coordinates(lat: raw.lat, lng: raw.lng)
            )

            return (priority, distance, raw)
        }

        return rankedMatches
            .sorted { lhs, rhs in
                if lhs.priority != rhs.priority {
                    return lhs.priority < rhs.priority
                }

                if lhs.distance != rhs.distance {
                    return lhs.distance < rhs.distance
                }

                return lhs.raw.name.localizedCompare(rhs.raw.name) == .orderedAscending
            }
            .prefix(6)
            .map { match in
                SearchSuggestion(
                    id: "kindergarten:\(match.raw.kindercode)",
                    kind: .kindergarten,
                    title: match.raw.name,
                    subtitle: match.raw.address,
                    coordinates: Coordinates(lat: match.raw.lat, lng: match.raw.lng),
                    kindercode: match.raw.kindercode
                )
            }
    }

    private func applySearchDeepLink(query: String?) {
        searchDeepLinkTask?.cancel()
        searchDeepLinkTask = nil
        selectedKindergarten = nil

        let trimmedQuery = trimmedSearchText(query ?? "")
        guard !trimmedQuery.isEmpty else {
            pendingSearchDeepLinkQuery = nil
            clearSearchText()
            return
        }

        guard !allKindergartens.isEmpty else {
            pendingSearchDeepLinkQuery = trimmedQuery
            setSearchText(trimmedQuery, refreshSuggestions: false, applyAsResultQuery: false)
            return
        }

        if let matchingKindergarten = makeLocalSearchSuggestions(for: trimmedQuery).first?.kindercode {
            openKindergartenDetail(kindercode: matchingKindergarten, recordRecents: false)
            return
        }

        guard remoteSearchService.isConfigured else {
            setSearchText(trimmedQuery, refreshSuggestions: false, applyAsResultQuery: true)
            return
        }

        setSearchText(trimmedQuery, refreshSuggestions: false, applyAsResultQuery: false)
        let origin = userLocation

        searchDeepLinkTask = Task { @MainActor [weak self] in
            guard let self else { return }

            let result = await self.remoteSearchService.suggestions(for: trimmedQuery, near: origin)
            guard !Task.isCancelled else { return }

            if let suggestion = result.suggestions.first {
                self.selectSearchSuggestion(suggestion)
            } else {
                self.setSearchText(trimmedQuery, refreshSuggestions: false, applyAsResultQuery: true)
                self.searchSuggestionMessage = result.message
            }
        }
    }

    private func trimmedSearchText(_ text: String) -> String {
        text.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    private func normalizedSearchText(_ text: String) -> String {
        trimmedSearchText(text)
            .folding(options: [.diacriticInsensitive, .caseInsensitive], locale: Self.searchLocale)
    }
}

import Foundation
import Models
import Services

public enum NativeTab: Hashable {
    case search
    case compare
    case saved
    case more
}

public enum SearchHomePresentationState: Equatable {
    case firstVisit
    case normal
    case permissionRecovery
}

@MainActor
public final class NativeAppModel: ObservableObject {
    public static let defaultCenter = Coordinates(lat: 37.5665, lng: 126.9780)
    public static let defaultLocationLabel = "서울 시청"
    private static let searchSuggestionMinimumLength = 2
    private static let searchLocale = Locale(identifier: "ko_KR")

    @Published public private(set) var searchText: String

    @Published public var filters: SearchFilters {
        didSet {
            analytics?.track(event: .filterChanged, properties: ["radius": "\(filters.radiusKM)", "sort": filters.sort.rawValue])
            refresh()
        }
    }

    @Published public private(set) var userLocation: Coordinates
    @Published public private(set) var currentDeviceLocation: Coordinates?
    @Published public private(set) var locationLabel: String
    @Published public private(set) var results: [Kindergarten]
    @Published public private(set) var reviewsData: ReviewsData?
    @Published public private(set) var vacancyData: VacancyDataset?
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
    @Published public private(set) var isVacancyLoading = false
    @Published public private(set) var catalogError: String?
    @Published public private(set) var reviewsError: String?
    @Published public private(set) var vacancyError: String?
    @Published public private(set) var locationError: String?
    @Published public private(set) var locationPermissionState: LocationPermissionState
    @Published public private(set) var isFirstLaunch: Bool
    @Published public var shouldFocusSearchField: Bool = false

    public let configuration: NativeAppConfiguration

    private let kindergartenRepository: KindergartenJSONRepository
    private let reviewRepository: ReviewRepository
    private let vacancyRepository: VacancyRepository
    private let searchEngine: KindergartenSearchEngine
    private let remoteSearchService: any RemoteLocationSuggesting
    private let locationProvider: CurrentLocationProviding
    private let persistence: NativeAppPersistence
    private let analytics: AnalyticsTracking?
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
        vacancyRepository: VacancyRepository = .empty,
        searchEngine: KindergartenSearchEngine = KindergartenSearchEngine(),
        remoteSearchService: any RemoteLocationSuggesting,
        locationProvider: CurrentLocationProviding,
        persistence: NativeAppPersistence,
        configuration: NativeAppConfiguration,
        analytics: AnalyticsTracking? = nil,
        initialKindergartens: [KindergartenRaw] = [],
        initialReviews: ReviewsData? = nil,
        initialVacancy: VacancyDataset? = nil,
        filters: SearchFilters = SearchFilters(),
        searchText: String = "",
        searchDebounceDuration: Duration = .milliseconds(300)
    ) {
        let restoredState = persistence.restore()
        self.kindergartenRepository = kindergartenRepository
        self.reviewRepository = reviewRepository
        self.vacancyRepository = vacancyRepository
        self.searchEngine = searchEngine
        self.remoteSearchService = remoteSearchService
        self.locationProvider = locationProvider
        self.persistence = persistence
        self.configuration = configuration
        self.analytics = analytics
        self.allKindergartens = initialKindergartens
        self.hasBootstrapped = !initialKindergartens.isEmpty && initialReviews != nil
        self.kindergartenLookup = Dictionary(
            uniqueKeysWithValues: initialKindergartens.map { ($0.kindercode, $0) }
        )
        self.searchText = searchText
        self.resultQuery = searchText
        self.filters = filters
        self.reviewsData = initialReviews
        self.vacancyData = initialVacancy
        self.favorites = restoredState.favorites
        self.recentSearches = restoredState.recentSearches
        self.localSearchSuggestions = []
        self.remoteSearchSuggestions = []
        self.compareSelection = restoredState.compareSelection
        self.searchDebounceDuration = searchDebounceDuration
        self.locationPermissionState = locationProvider.permissionState()
        self.isFirstLaunch = !persistence.hasLaunched()

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
                subtitle: search.resolvedDisplayName,
                coordinates: coordinates
            )
        }
    }

    public var searchHomePresentationState: SearchHomePresentationState {
        if isFirstLaunch {
            return .firstVisit
        }

        switch locationPermissionState {
        case .denied, .restricted, .servicesDisabled:
            return .permissionRecovery
        case .notDetermined, .granted, .transientFailure:
            return .normal
        }
    }

    public var locationPermissionStatusText: String {
        switch locationPermissionState {
        case .granted:
            return "사용 중"
        case .denied, .restricted:
            return "꺼짐"
        case .servicesDisabled:
            return "서비스 꺼짐"
        case .transientFailure:
            return "다시 확인 필요"
        case .notDetermined:
            return "설정 전"
        }
    }

    public var locationPermissionMessage: String? {
        switch locationPermissionState {
        case .denied:
            return "위치 권한 없이도 검색할 수 있어요. 필요하면 설정에서 켤 수 있어요."
        case .restricted:
            return "이 기기에서는 위치 사용이 제한되어 있어요. 동네 이름으로도 찾을 수 있어요."
        case .servicesDisabled:
            return "위치 서비스가 꺼져 있어요. 동네 이름이나 기관명으로도 찾을 수 있어요."
        case .transientFailure:
            return locationError ?? "현재 위치를 다시 확인해 주세요."
        case .notDetermined, .granted:
            return nil
        }
    }

    public var shouldShowLocationSettingsCTA: Bool {
        switch locationPermissionState {
        case .denied, .restricted:
            return true
        case .notDetermined, .granted, .servicesDisabled, .transientFailure:
            return false
        }
    }

    public var shouldShowLocationRetryCTA: Bool {
        locationPermissionState == .transientFailure
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

        let vacancyRepository = VacancyRepository(
            remoteLoader: {
                try await remoteLoader.data(from: configuration.vacancyRemoteURL)
            },
            localLoader: {
                try bundledLoader.data(named: configuration.vacancyResourceName)
            }
        )

        return NativeAppModel(
            kindergartenRepository: kindergartenRepository,
            reviewRepository: reviewRepository,
            vacancyRepository: vacancyRepository,
            remoteSearchService: KakaoLocalSuggestionService(
                client: KakaoLocalAPIClient(
                    apiKey: configuration.kakaoRESTAPIKey,
                    session: session
                )
            ),
            locationProvider: CurrentLocationService(),
            persistence: NativeAppPersistence(store: userDefaults),
            configuration: configuration,
            analytics: OSLogAnalytics()
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
        let previewVacancy = VacancyDataset(
            version: "2026-03-17",
            source: "bundled-preview",
            aidYear: "2026",
            totalCount: 2,
            positiveCount: 1,
            items: [
                "A001": VacancySummary(
                    kindercode: "A001",
                    aidYear: "2026",
                    vacancyCount: 2,
                    updatedAt: "2026-03-17T00:00:00Z",
                    preschCd: nil,
                    upperEduOfficeCd: nil,
                    eduOfficeCd: nil,
                    foundType: "국공립",
                    name: "역삼유치원",
                    address: "서울 강남구 역삼로 123",
                    phone: "02-1234-5678",
                    detail: [
                        VacancyDetailRow(rowNo: 1, age: "만 4세", course: "일반과정", vacancyCount: 1),
                        VacancyDetailRow(rowNo: 2, age: "만 5세", course: "방과후과정", vacancyCount: 1),
                    ]
                ),
                "A002": VacancySummary(
                    kindercode: "A002",
                    aidYear: "2026",
                    vacancyCount: 0,
                    updatedAt: "2026-03-16T00:00:00Z",
                    preschCd: nil,
                    upperEduOfficeCd: nil,
                    eduOfficeCd: nil,
                    foundType: "사립",
                    name: "해맑은유치원",
                    address: "서울 강남구 도곡로 47",
                    phone: "02-9876-5432",
                    detail: []
                ),
            ]
        )

        return NativeAppModel(
            kindergartenRepository: KindergartenJSONRepository {
                Data()
            },
            reviewRepository: ReviewRepository(localLoader: { Data() }),
            vacancyRepository: .empty,
            remoteSearchService: KakaoLocalSuggestionService(
                client: KakaoLocalAPIClient(apiKey: nil)
            ),
            locationProvider: PreviewLocationProvider(coordinates: Coordinates(lat: 37.4981, lng: 127.0276)),
            persistence: persistence,
            configuration: NativeAppConfiguration(kakaoAppKey: nil),
            initialKindergartens: NativePreviewFixtures.kindergartens,
            initialReviews: previewReviews,
            initialVacancy: previewVacancy
        )
    }

    public func bootstrapIfNeeded() async {
        guard !hasBootstrapped else { return }
        hasBootstrapped = true
        analytics?.track(event: .appLaunched)

        async let catalogTask: Void = loadCatalog()
        async let reviewsTask: Void = loadReviews()
        async let vacancyTask: Void = loadVacancy()
        _ = await (catalogTask, reviewsTask, vacancyTask)
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

    public func loadVacancy() async {
        guard !isVacancyLoading else { return }
        isVacancyLoading = true
        vacancyError = nil
        defer { isVacancyLoading = false }

        do {
            vacancyData = try await vacancyRepository.load()
        } catch {
            vacancyError = error.localizedDescription
        }
    }

    public func updateRadius(to radius: Double) {
        dismissFirstLaunchIfNeeded()
        filters.radiusKM = radius
    }

    public func updateSort(to sort: SortOption) {
        dismissFirstLaunchIfNeeded()
        filters.sort = sort
    }

    public func updateSearchText(_ text: String) {
        if !trimmedSearchText(text).isEmpty {
            dismissFirstLaunchIfNeeded()
        }
        setSearchText(text, refreshSuggestions: true, applyAsResultQuery: true)
    }

    public func clearSearchText() {
        setSearchText("", refreshSuggestions: false, applyAsResultQuery: true)
    }

    public func toggleBusFilter() {
        dismissFirstLaunchIfNeeded()
        filters.hasBus = filters.hasBus == true ? nil : true
    }

    public func toggleLargeSpaceFilter() {
        dismissFirstLaunchIfNeeded()
        filters.hasLargeSpace = filters.hasLargeSpace == true ? nil : true
    }

    public func setLocation(_ coordinates: Coordinates, label: String, recordRecents: Bool = true, searchType: SearchType? = nil) {
        dismissFirstLaunchIfNeeded()
        userLocation = coordinates
        locationLabel = label
        locationError = nil

        guard recordRecents else {
            refresh()
            return
        }

        let nextSearch = RecentSearch(
            label: label,
            coordinates: coordinates,
            displayName: label,
            searchType: searchType,
            createdAt: Date()
        )
        let filtered = recentSearches.filter {
            $0.label != label || $0.coordinates != coordinates
        }
        recentSearches = Array(([nextSearch] + filtered).prefix(5))
        persistence.saveRecentSearches(recentSearches)
        refresh()
    }

    public func centerOnCurrentLocation() async {
        dismissFirstLaunchIfNeeded()
        refreshLocationPermissionState()

        do {
            let coordinates = try await locationProvider.requestCurrentLocation()
            currentDeviceLocation = coordinates
            locationPermissionState = .granted
            locationError = nil
            shouldFocusSearchField = false
            setLocation(coordinates, label: "현재 위치", searchType: .currentLocation)
        } catch {
            locationPermissionState = resolvedPermissionState(for: error)
            locationError = error.localizedDescription
            shouldFocusSearchField = false
        }
    }

    public func refreshLocationPermissionState() {
        locationPermissionState = locationProvider.permissionState()
    }

    public func focusSearchField() {
        dismissFirstLaunchIfNeeded()
        shouldFocusSearchField = true
    }

    public func select(kindergarten: Kindergarten) {
        analytics?.track(event: .resultTapped, properties: ["kindercode": kindergarten.kindercode])
        selectedKindergarten = kindergarten
    }

    public func dismissDetail() {
        selectedKindergarten = nil
    }

    public func selectSearchSuggestion(_ suggestion: SearchSuggestion) {
        dismissFirstLaunchIfNeeded()
        let mappedType: SearchType? = {
            switch suggestion.kind {
            case .address: return .address
            case .place: return .place
            case .kindergarten: return .kindergarten
            case .recent: return nil
            }
        }()
        setLocation(suggestion.coordinates, label: suggestion.title, searchType: mappedType)
        setSearchText(
            suggestion.title,
            refreshSuggestions: false,
            applyAsResultQuery: suggestion.kind == .kindergarten
        )
        selectedTab = .search
    }

    public func toggleCompare(for kindergarten: Kindergarten) {
        compareSelection.toggle(id: kindergarten.kindercode)
        analytics?.track(event: .compareToggled, properties: [
            "kindercode": kindergarten.kindercode,
            "selected": "\(compareSelection.contains(kindergarten.kindercode))"
        ])
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
        let wasFavorite = favorites.contains(where: { $0.kindercode == kindergarten.kindercode })
        analytics?.track(event: .favoriteToggled, properties: [
            "kindercode": kindergarten.kindercode,
            "favorited": "\(!wasFavorite)"
        ])
        if wasFavorite {
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

    public func vacancy(for kindercode: String) -> VacancySummary? {
        vacancyData?.items[kindercode]
    }

    public func vacancyCount(for kindercode: String) -> Int {
        vacancy(for: kindercode)?.vacancyCount ?? 0
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
        dismissFirstLaunchIfNeeded()
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

    // MARK: - Filters

    public func resetFilters() {
        dismissFirstLaunchIfNeeded()
        filters = SearchFilters()
    }

    public var hasActiveAdvancedFilters: Bool {
        activeAdvancedFilterCount > 0
    }

    public var nextRadius: Double {
        switch filters.radiusKM {
        case 1: return 2
        case 2: return 5
        default: return 5
        }
    }

    public var activeAdvancedFilterCount: Int {
        var count = 0
        if filters.hasAfterSchool == true { count += 1 }
        if filters.hasVacancy == true { count += 1 }
        if filters.hasLargeSpace == true { count += 1 }
        if filters.hasIndoorPlayground == true { count += 1 }
        if filters.hasModernBuilding == true { count += 1 }
        if filters.type != .all { count += 1 }
        return count
    }

    public var activeAdvancedFilterDescriptions: [(label: String, reset: () -> Void)] {
        var result: [(label: String, reset: () -> Void)] = []
        if filters.hasAfterSchool == true { result.append(("방과후", { [self] in filters.hasAfterSchool = nil })) }
        if filters.hasVacancy == true { result.append(("여유정원", { [self] in filters.hasVacancy = nil })) }
        if filters.hasLargeSpace == true { result.append(("넓은공간", { [self] in filters.hasLargeSpace = nil })) }
        if filters.hasIndoorPlayground == true { result.append(("실내놀이터", { [self] in filters.hasIndoorPlayground = nil })) }
        if filters.hasModernBuilding == true { result.append(("최신건물", { [self] in filters.hasModernBuilding = nil })) }
        if filters.type != .all { result.append((filters.type.label, { [self] in filters.type = .all })) }
        return result
    }

    // MARK: - Compare

    public func removeCompare(at index: Int) {
        guard compareSelection.ids.indices.contains(index) else { return }
        let id = compareSelection.ids[index]
        compareSelection.remove(at: index)
        analytics?.track(event: .compareToggled, properties: ["kindercode": id, "selected": "false"])
        persistence.saveCompareSelection(compareSelection)
    }

    public func comparedKindergartenNames() -> [String] {
        compareSelection.ids.compactMap { id in
            kindergartenLookup[id]?.name
        }
    }

    // MARK: - First Launch

    public func completeFirstLaunch() {
        isFirstLaunch = false
        persistence.markAsLaunched()
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

        let previouslyHadResults = !results.isEmpty
        results = baseResults
        analytics?.track(event: .searchExecuted, properties: ["resultCount": "\(baseResults.count)"])
        if baseResults.isEmpty && previouslyHadResults {
            analytics?.track(event: .emptyStateShown)
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
            guard !Task.isCancelled else { return }
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
        dismissFirstLaunchIfNeeded()
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

    private func dismissFirstLaunchIfNeeded() {
        guard isFirstLaunch else { return }
        completeFirstLaunch()
    }

    private func resolvedPermissionState(for error: Error) -> LocationPermissionState {
        if let error = error as? LocationServiceError {
            switch error {
            case .servicesDisabled:
                return .servicesDisabled
            case .authorizationDenied:
                return .denied
            case .authorizationRestricted:
                return .restricted
            case .unavailable, .unknown:
                break
            }
        }

        let providerState = locationProvider.permissionState()
        return providerState == .granted ? .transientFailure : providerState
    }
}

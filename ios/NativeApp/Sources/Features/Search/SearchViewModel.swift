import Domain
import Foundation
import Models
import Observation
import Services
import SwiftUI

@Observable
@MainActor
public final class SearchViewModel {
    public static let defaultCenter = Coordinates(lat: 37.5665, lng: 126.9780)
    public static let defaultLocationLabel = "서울 시청"
    private static let searchSuggestionMinimumLength = 2
    private static let searchLocale = Locale(identifier: "ko_KR")

    // MARK: - Published State

    public private(set) var searchText: String
    public private(set) var activeSearchType: SearchType?
    public private(set) var isLocatingCurrentPosition = false
    public private(set) var currentLocationRecenterRequestID = 0

    public var filters: SearchFilters {
        didSet {
            scheduleFilterAppliedTracking()
            refresh()
        }
    }

    public private(set) var userLocation: Coordinates
    public private(set) var currentDeviceLocation: Coordinates?
    public private(set) var locationLabel: String
    public private(set) var results: [Kindergarten]
    public private(set) var localSearchSuggestions: [SearchSuggestion]
    public private(set) var remoteSearchSuggestions: [SearchSuggestion]
    public private(set) var isSearchSuggestionsLoading = false
    public private(set) var searchSuggestionMessage: String?

    public private(set) var selectedKindergarten: Kindergarten?
    public private(set) var isCatalogLoading = false
    public private(set) var isReviewsLoading = false
    public private(set) var isVacancyLoading = false
    public private(set) var catalogError: String?
    public private(set) var reviewsError: String?
    public private(set) var vacancyError: String?
    public private(set) var locationError: String?

    public private(set) var locationPermissionState: LocationPermissionState
    public private(set) var isFirstLaunch: Bool
    public var shouldFocusSearchField: Bool = false

    public let configuration: NativeAppConfiguration

    // MARK: - Dependencies

    private let kindergartenRepo: any KindergartenProviding
    private let reviewRepo: any ReviewProviding
    private let vacancyRepo: any VacancyProviding
    private let compareRepo: any CompareStoring
    private let favoriteRepo: any FavoriteStoring
    private let recentSearchRepo: any RecentSearchStoring
    private let searchUseCase: SearchUseCase
    private let fitReasonBuilder: FitReasonBuilder
    private let deepLinkUseCase: DeepLinkUseCase
    private let locationProvider: CurrentLocationProviding
    private let remoteSearchService: any RemoteLocationSuggesting
    private let analytics: AnalyticsTracking?
    private let router: AppRouter
    private let persistence: NativeAppPersistence
    private let searchDebounceDuration: Duration

    // MARK: - Internal State

    private var hasBootstrapped: Bool
    private var kindergartenLookup: [String: KindergartenRaw]
    private var pendingSearchDeepLinkQuery: String?
    @ObservationIgnored nonisolated(unsafe) private var searchDeepLinkTask: Task<Void, Never>?
    @ObservationIgnored nonisolated(unsafe) private var searchSuggestionTask: Task<Void, Never>?
    @ObservationIgnored nonisolated(unsafe) private var filterAppliedTask: Task<Void, Never>?
    private var resultQuery: String
    private var currentDeviceLocationTask: Task<Coordinates, Error>?
    private var currentDeviceLocationTaskID = 0

    // MARK: - Init

    public init(
        kindergartenRepo: any KindergartenProviding,
        reviewRepo: any ReviewProviding,
        vacancyRepo: any VacancyProviding,
        compareRepo: any CompareStoring,
        favoriteRepo: any FavoriteStoring,
        recentSearchRepo: any RecentSearchStoring,
        searchUseCase: SearchUseCase = SearchUseCase(),
        fitReasonBuilder: FitReasonBuilder = FitReasonBuilder(),
        deepLinkUseCase: DeepLinkUseCase = DeepLinkUseCase(),
        locationProvider: CurrentLocationProviding,
        remoteSearchService: any RemoteLocationSuggesting,
        analytics: AnalyticsTracking? = nil,
        router: AppRouter,
        persistence: NativeAppPersistence,
        configuration: NativeAppConfiguration,
        searchText: String = "",
        filters: SearchFilters = SearchFilters(),
        searchDebounceDuration: Duration = .milliseconds(300)
    ) {
        self.kindergartenRepo = kindergartenRepo
        self.reviewRepo = reviewRepo
        self.vacancyRepo = vacancyRepo
        self.compareRepo = compareRepo
        self.favoriteRepo = favoriteRepo
        self.recentSearchRepo = recentSearchRepo
        self.searchUseCase = searchUseCase
        self.fitReasonBuilder = fitReasonBuilder
        self.deepLinkUseCase = deepLinkUseCase
        self.locationProvider = locationProvider
        self.remoteSearchService = remoteSearchService
        self.analytics = analytics
        self.router = router
        self.persistence = persistence
        self.configuration = configuration
        self.searchDebounceDuration = searchDebounceDuration

        self.hasBootstrapped = false
        self.kindergartenLookup = [:]
        self.searchText = searchText
        self.resultQuery = searchText
        self.filters = filters
        self.localSearchSuggestions = []
        self.remoteSearchSuggestions = []
        self.locationPermissionState = locationProvider.permissionState()
        self.isFirstLaunch = !persistence.hasLaunched()

        let recentSearches = recentSearchRepo.recentSearches
        if let restoredSearch = recentSearches.first, let coordinates = restoredSearch.coordinates {
            self.userLocation = coordinates
            self.locationLabel = restoredSearch.label
            self.activeSearchType = restoredSearch.searchType
        } else {
            self.userLocation = Self.defaultCenter
            self.locationLabel = Self.defaultLocationLabel
            self.activeSearchType = nil
        }
        self.currentDeviceLocation = nil
        self.results = []

        refresh()
        refreshSearchSuggestions()
    }

    deinit {
        searchDeepLinkTask?.cancel()
        searchSuggestionTask?.cancel()
        filterAppliedTask?.cancel()
    }

    // MARK: - Exposed Repo/Router State

    public var reviewsData: ReviewsData? { reviewRepo.reviewsData }
    public var compareSelectionIDs: [String] { compareRepo.selection.ids }
    public var favorites: [FavoriteItem] { favoriteRepo.favorites }
    public var recentSearches: [RecentSearch] { recentSearchRepo.recentSearches }
    public var isSearchTabActive: Bool { router.activeTab == .search }
    public var toast: CompareToast? { router.toast }

    public func dismissToast() { router.dismissToast() }
    public func navigateToSearch() { router.activeTab = .search }
    public func navigateToCompare() {
        selectedKindergarten = nil
        router.activeTab = .compare
    }
    public func clearRecentSearches() { _ = recentSearchRepo.deleteAll() }

    // MARK: - Computed Properties

    public var recentSearchSuggestions: [SearchSuggestion] {
        recentSearchRepo.recentSearches.compactMap { search in
            guard let coordinates = search.coordinates else { return nil }
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
        if isFirstLaunch { return .firstVisit }
        switch locationPermissionState {
        case .denied, .restricted, .servicesDisabled:
            return .permissionRecovery
        case .notDetermined, .granted, .transientFailure:
            return .normal
        }
    }

    public var locationPermissionStatusText: String {
        switch locationPermissionState {
        case .granted: return "사용 중"
        case .denied, .restricted: return "꺼짐"
        case .servicesDisabled: return "서비스 꺼짐"
        case .transientFailure: return "다시 확인 필요"
        case .notDetermined: return "설정 전"
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
        case .denied, .restricted: return true
        case .notDetermined, .granted, .servicesDisabled, .transientFailure: return false
        }
    }

    public var shouldShowLocationRetryCTA: Bool {
        locationPermissionState == .transientFailure
    }

    public var isCurrentLocationSearchActive: Bool {
        activeSearchType == .currentLocation
    }

    var activeSearchLens: SearchLens? {
        SearchLens.activeLens(in: filters)
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

    // MARK: - Bootstrap & Data Loading

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

        await kindergartenRepo.load()

        if let repoError = kindergartenRepo.error {
            catalogError = repoError
            results = []
        } else {
            kindergartenLookup = Dictionary(
                uniqueKeysWithValues: kindergartenRepo.kindergartens.map { ($0.kindercode, $0) }
            )
            refresh()
            refreshSearchSuggestions()

            if let pendingSearchDeepLinkQuery {
                self.pendingSearchDeepLinkQuery = nil
                applySearchDeepLink(query: pendingSearchDeepLinkQuery)
            }
        }
    }

    public func loadReviews() async {
        guard !isReviewsLoading else { return }
        isReviewsLoading = true
        reviewsError = nil
        defer { isReviewsLoading = false }

        await reviewRepo.load()

        if let error = reviewRepo.error {
            reviewsError = error
        }
    }

    public func loadVacancy() async {
        guard !isVacancyLoading else { return }
        isVacancyLoading = true
        vacancyError = nil
        defer { isVacancyLoading = false }

        await vacancyRepo.load()

        if let error = vacancyRepo.error {
            vacancyError = error
        }
    }

    // MARK: - Search Text

    public func updateSearchText(_ text: String) {
        if !trimmedSearchText(text).isEmpty {
            dismissFirstLaunchIfNeeded()
        }
        setSearchText(text, refreshSuggestions: true, applyAsResultQuery: true)
    }

    public func clearSearchText() {
        setSearchText("", refreshSuggestions: false, applyAsResultQuery: true)
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
        router.activeTab = .search
    }

    // MARK: - Location

    public func setLocation(
        _ coordinates: Coordinates,
        label: String,
        recordRecents: Bool = true,
        searchType: SearchType? = nil
    ) {
        dismissFirstLaunchIfNeeded()
        userLocation = coordinates
        locationLabel = label
        activeSearchType = searchType
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
        recentSearchRepo.record(nextSearch)
        refresh()
    }

    public func primeCurrentDeviceLocationIfAuthorized() async {
        refreshLocationPermissionState()

        guard locationPermissionState == .granted else {
            currentDeviceLocation = nil
            return
        }

        do {
            let coordinates = try await resolveCurrentDeviceLocation()
            currentDeviceLocation = coordinates
            locationPermissionState = .granted
            locationError = nil
        } catch {
            let nextPermissionState = resolvedPermissionState(for: error)
            locationPermissionState = nextPermissionState
            if nextPermissionState != .granted {
                currentDeviceLocation = nil
            }
        }
    }

    public func centerOnCurrentLocation() async {
        dismissFirstLaunchIfNeeded()
        refreshLocationPermissionState()

        if kindergartenRepo.kindergartens.isEmpty {
            await loadCatalog()
        }

        do {
            let coordinates = try await resolveCurrentDeviceLocation()
            applyCurrentLocationSearch(using: coordinates, requestMapRecenter: false)
        } catch {
            let nextPermissionState = resolvedPermissionState(for: error)
            locationPermissionState = nextPermissionState
            if nextPermissionState != .granted {
                currentDeviceLocation = nil
            }
            locationError = error.localizedDescription
            shouldFocusSearchField = false
        }
    }

    public func recenterMapToCurrentLocation() async {
        dismissFirstLaunchIfNeeded()
        refreshLocationPermissionState()

        if let currentDeviceLocation {
            applyCurrentLocationSearch(using: currentDeviceLocation, requestMapRecenter: true)
            return
        }

        await centerOnCurrentLocation()
    }

    public func refreshLocationPermissionState() {
        locationPermissionState = locationProvider.permissionState()
    }

    public func focusSearchField() {
        dismissFirstLaunchIfNeeded()
        shouldFocusSearchField = true
    }

    // MARK: - Selection & Detail

    public func select(
        kindergarten: Kindergarten,
        source: String = "result",
        rankPosition: Int? = nil
    ) {
        let properties = kindergartenAnalyticsProperties(
            for: kindergarten,
            source: source,
            rankPosition: rankPosition
        )
        analytics?.track(event: .resultTapped, properties: properties)
        analytics?.track(event: .detailOpened, properties: properties)
        selectedKindergarten = kindergarten
    }

    public func trackTabChanged(from previous: NativeTab, to next: NativeTab) {
        guard previous != next else { return }
        analytics?.track(event: .tabChanged, properties: [
            "from_tab": .string(previous.analyticsName),
            "to_tab": .string(next.analyticsName),
        ])
    }

    public func dismissDetail() {
        selectedKindergarten = nil
    }

    func makeDetailSheet(for kindergarten: Kindergarten) -> KindergartenDetailSheet {
        KindergartenDetailSheet(
            kindergarten: kindergarten,
            reviews: reviews(for: kindergarten.kindercode),
            reviewsVersion: reviewRepo.reviewsData?.version,
            vacancySummary: vacancy(for: kindergarten.kindercode),
            vacancyDatasetVersion: vacancyRepo.vacancyData?.version,
            isVacancyLoading: isVacancyLoading,
            vacancyError: vacancyError,
            isCompared: isCompared(kindergarten),
            isFavorite: isFavorite(kindergarten),
            compareCount: compareRepo.selection.ids.count,
            fitReasons: fitReasons(for: kindergarten),
            onToggleCompare: { [weak self] in self?.toggleCompare(for: kindergarten, source: "detail") },
            onToggleFavorite: { [weak self] in self?.toggleFavorite(for: kindergarten, source: "detail") },
            onNavigateToCompare: { [weak self] in self?.navigateFromDetailToCompare() }
        )
    }

    // MARK: - Compare & Favorite

    public func toggleCompare(for kindergarten: Kindergarten, source: String = "search") {
        let result = compareRepo.toggle(id: kindergarten.kindercode)
        switch result {
        case .added:
            analytics?.track(event: .comparisonAdded, properties: [
                "kindergarten_id": .string(kindergarten.kindercode),
                "kindercode": .string(kindergarten.kindercode),
                "source": .string(source),
                "compare_count": .int(compareRepo.selection.ids.count),
            ])
            refreshSelectedKindergarten()
            router.showToast(.success("비교에 담았어요"))
        case .removed:
            analytics?.track(event: .comparisonRemoved, properties: [
                "kindergarten_id": .string(kindergarten.kindercode),
                "kindercode": .string(kindergarten.kindercode),
                "source": .string(source),
                "compare_count": .int(compareRepo.selection.ids.count),
            ])
            refreshSelectedKindergarten()
            router.showToast(.success("비교에서 뺐어요"))
        case .limitReached:
            router.showToast(.warning("비교는 최대 3곳까지 가능해요"))
        }
    }

    public func toggleFavorite(for kindergarten: Kindergarten, source: String = "search") {
        let wasFavorite = favoriteRepo.isFavorite(kindergarten.kindercode)
        favoriteRepo.toggle(for: kindergarten)

        let properties: AnalyticsProperties = [
            "kindergarten_id": .string(kindergarten.kindercode),
            "kindercode": .string(kindergarten.kindercode),
            "source": .string(source),
            "favorite_count": .int(favoriteRepo.favorites.count),
        ]
        if wasFavorite {
            analytics?.track(event: .favoriteRemoved, properties: properties)
        } else {
            analytics?.track(event: .favoriteAdded, properties: properties)
        }
    }

    public func isCompared(_ kindergarten: Kindergarten) -> Bool {
        compareRepo.contains(kindergarten.kindercode)
    }

    public func isFavorite(_ kindergarten: Kindergarten) -> Bool {
        favoriteRepo.isFavorite(kindergarten.kindercode)
    }

    public func compareOrder(for kindercode: String) -> Int? {
        compareRepo.order(for: kindercode)
    }

    private func navigateFromDetailToCompare() {
        selectedKindergarten = nil
        router.activeTab = .compare
    }

    // MARK: - Data Accessors

    public func reviews(for kindercode: String) -> [ReviewLink] {
        reviewRepo.reviews(for: kindercode)
    }

    func fitReasons(for kindergarten: Kindergarten) -> [KindergartenFitReason] {
        fitReasonBuilder.reasons(
            for: kindergarten,
            filters: filters,
            reviewCount: reviews(for: kindergarten.kindercode).count,
            vacancyCount: vacancyCount(for: kindergarten.kindercode)
        )
    }

    public func vacancy(for kindercode: String) -> VacancySummary? {
        vacancyRepo.vacancy(for: kindercode)
    }

    public func vacancyCount(for kindercode: String) -> Int {
        vacancyRepo.vacancyCount(for: kindercode)
    }

    // MARK: - Deep Link

    public func applyDeepLink(_ url: URL) {
        guard let destination = deepLinkUseCase.resolve(url) else { return }

        switch destination {
        case let .compare(ids):
            compareRepo.replace(with: CompareSelection(ids: ids))
            router.activeTab = .compare
            refreshSelectedKindergarten()
        case let .search(query):
            router.activeTab = .search
            applySearchDeepLink(query: query)
        }
    }

    public func applyUniversalLink(_ userActivity: NSUserActivity) {
        guard let url = userActivity.webpageURL else { return }
        applyDeepLink(url)
    }

    // MARK: - Recent Search

    public func restoreRecentSearch(_ search: RecentSearch) {
        dismissFirstLaunchIfNeeded()
        guard let coordinates = search.coordinates else { return }
        setLocation(coordinates, label: search.label, searchType: search.searchType)
        let text = search.searchType == .currentLocation ? "" : search.label
        setSearchText(text, refreshSuggestions: false, applyAsResultQuery: false)
        router.activeTab = .search
    }

    public func openKindergartenDetail(kindercode: String, recordRecents: Bool = false) {
        guard let raw = kindergartenLookup[kindercode] else { return }
        let kindergarten = makeKindergarten(from: raw)
        setLocation(kindergarten.location, label: kindergarten.name, recordRecents: recordRecents)
        setSearchText(kindergarten.name, refreshSuggestions: false, applyAsResultQuery: true)
        router.activeTab = .search
        selectedKindergarten = kindergartenLookup[kindercode].map(makeKindergarten(from:))
    }

    // MARK: - Filters

    public func updateRadius(to radius: Double) {
        dismissFirstLaunchIfNeeded()
        filters.radiusKM = radius
    }

    public func updateSort(to sort: SortOption) {
        dismissFirstLaunchIfNeeded()
        filters.sort = sort
    }

    public func resetFilters() {
        dismissFirstLaunchIfNeeded()
        filters = SearchFilters()
    }

    public func toggleBusFilter() {
        dismissFirstLaunchIfNeeded()
        filters.hasBus = filters.hasBus == true ? nil : true
    }

    public func toggleLargeSpaceFilter() {
        dismissFirstLaunchIfNeeded()
        filters.hasLargeSpace = filters.hasLargeSpace == true ? nil : true
    }

    func applySearchLens(_ lens: SearchLens) {
        dismissFirstLaunchIfNeeded()
        filters = SearchLens.toggledFilters(from: filters, lens: lens)
    }

    // MARK: - First Launch

    public func completeFirstLaunch() {
        isFirstLaunch = false
        persistence.markAsLaunched()
    }

    // MARK: - Private Helpers

    private func scheduleFilterAppliedTracking() {
        filterAppliedTask?.cancel()
        let radius = Int(filters.radiusKM)
        let sort = filters.sort.rawValue
        filterAppliedTask = Task { [weak self] in
            do {
                try await Task.sleep(for: .milliseconds(500))
            } catch {
                return
            }
            guard !Task.isCancelled else { return }
            await MainActor.run {
                guard let self else { return }
                self.analytics?.track(event: .filterApplied, properties: [
                    "radius": .int(radius),
                    "sort": .string(sort),
                ])
            }
        }
    }

    private func refresh() {
        let catalog = kindergartenRepo.kindergartens
        guard !catalog.isEmpty else {
            results = []
            refreshSelectedKindergarten()
            return
        }

        let baseResults = searchUseCase.search(
            catalog: catalog,
            location: userLocation,
            filters: filters,
            query: resultQuery
        )

        let previouslyHadResults = !results.isEmpty
        results = baseResults
        analytics?.track(event: .searchExecuted, properties: [
            "result_count": .int(baseResults.count),
            "has_results": .bool(!baseResults.isEmpty),
            "radius": .int(Int(filters.radiusKM)),
            "sort": .string(filters.sort.rawValue),
            "filter_count": .int(activeAdvancedFilterCount),
            "query_length": .int(resultQuery.count),
            "search_query": .string(Self.sanitizedSearchQuery(resultQuery)),
            "query_type": .string(resultQuery.isEmpty ? "location" : "keyword"),
        ])
        if baseResults.isEmpty && previouslyHadResults {
            analytics?.track(event: .emptyStateShown, properties: [
                "radius": .int(Int(filters.radiusKM)),
                "sort": .string(filters.sort.rawValue),
                "filter_count": .int(activeAdvancedFilterCount),
                "query_length": .int(resultQuery.count),
                "search_query": .string(Self.sanitizedSearchQuery(resultQuery)),
                "query_type": .string(resultQuery.isEmpty ? "location" : "keyword"),
            ])
        }
        refreshSelectedKindergarten()
    }

    private func kindergartenAnalyticsProperties(
        for kindergarten: Kindergarten,
        source: String,
        rankPosition: Int?
    ) -> AnalyticsProperties {
        var properties: AnalyticsProperties = [
            "kindergarten_id": .string(kindergarten.kindercode),
            "kindercode": .string(kindergarten.kindercode),
            "kindergarten_type": .string(kindergarten.type.rawValue),
            "source": .string(source),
            "result_count": .int(results.count),
            "has_reviews": .bool(!reviews(for: kindergarten.kindercode).isEmpty),
            "has_vacancy": .bool(vacancyCount(for: kindergarten.kindercode) > 0),
        ]

        let resolvedRank = rankPosition
            ?? results.firstIndex(where: { $0.kindercode == kindergarten.kindercode }).map { $0 + 1 }
        if let resolvedRank {
            properties["rank_position"] = .int(resolvedRank)
        }

        return properties
    }

    private func refreshSelectedKindergarten() {
        guard let selectedID = selectedKindergarten?.kindercode else { return }
        selectedKindergarten = results.first(where: { $0.kindercode == selectedID })
            ?? kindergartenLookup[selectedID].map(makeKindergarten(from:))
    }

    /// 검색어를 분석용으로 정제: 앞뒤 공백 제거, 30자 제한, 숫자 연속 토큰(상세주소 가능성)을 ##로 마스킹.
    static func sanitizedSearchQuery(_ raw: String) -> String {
        let trimmed = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return "" }
        let masked = trimmed.replacingOccurrences(
            of: #"\d{2,}(-\d+)?"#,
            with: "##",
            options: .regularExpression
        )
        return masked.count > 30 ? String(masked.prefix(30)) : masked
    }

    private func makeKindergarten(from raw: KindergartenRaw) -> Kindergarten {
        searchUseCase.makeKindergarten(from: raw, relativeTo: userLocation)
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

    private func applyCurrentLocationSearch(using coordinates: Coordinates, requestMapRecenter: Bool) {
        currentDeviceLocation = coordinates
        locationPermissionState = .granted
        locationError = nil
        shouldFocusSearchField = false

        if requestMapRecenter {
            currentLocationRecenterRequestID &+= 1
        }

        setSearchText("", refreshSuggestions: false, applyAsResultQuery: false)
        setLocation(coordinates, label: "현재 위치", searchType: .currentLocation)
        expandRadiusForSparseCurrentLocationResultsIfNeeded()
    }

    private func expandRadiusForSparseCurrentLocationResultsIfNeeded() {
        guard results.isEmpty, filters.radiusKM < 5 else { return }

        let expandedRadii: [Double] = [2, 5]
        for radius in expandedRadii where radius > filters.radiusKM {
            filters.radiusKM = radius
            if !results.isEmpty { break }
        }
    }

    private func resolveCurrentDeviceLocation() async throws -> Coordinates {
        try await sharedCurrentDeviceLocationTask().value
    }

    private func sharedCurrentDeviceLocationTask() -> Task<Coordinates, Error> {
        if let currentDeviceLocationTask {
            return currentDeviceLocationTask
        }

        currentDeviceLocationTaskID &+= 1
        let requestID = currentDeviceLocationTaskID
        isLocatingCurrentPosition = true

        let task = Task { @MainActor [weak self] in
            guard let self else { throw CancellationError() }
            return try await self.locationProvider.requestCurrentLocation()
        }

        currentDeviceLocationTask = task

        Task { @MainActor [weak self] in
            do {
                _ = try await task.value
            } catch {
                _ = error
            }

            guard let self, self.currentDeviceLocationTaskID == requestID else { return }
            self.currentDeviceLocationTask = nil
            self.isLocatingCurrentPosition = false
        }

        return task
    }

    private func refreshSearchSuggestions() {
        searchSuggestionTask?.cancel()

        let trimmedQuery = trimmedSearchText(searchText)
        guard trimmedQuery.count >= Self.searchSuggestionMinimumLength else {
            clearSearchSuggestions()
            return
        }

        localSearchSuggestions = searchUseCase.localSuggestions(
            query: trimmedQuery,
            catalog: kindergartenRepo.kindergartens,
            userLocation: userLocation
        )
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
        guard trimmedSearchText(searchText) == query else { return }
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

        guard !kindergartenRepo.kindergartens.isEmpty else {
            pendingSearchDeepLinkQuery = trimmedQuery
            setSearchText(trimmedQuery, refreshSuggestions: false, applyAsResultQuery: false)
            return
        }

        let localResults = searchUseCase.localSuggestions(
            query: trimmedQuery,
            catalog: kindergartenRepo.kindergartens,
            userLocation: userLocation
        )
        if let matchingKindercode = localResults.first?.kindercode {
            openKindergartenDetail(kindercode: matchingKindercode, recordRecents: false)
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

    private func dismissFirstLaunchIfNeeded() {
        guard isFirstLaunch else { return }
        completeFirstLaunch()
    }

    private func resolvedPermissionState(for error: Error) -> LocationPermissionState {
        if let error = error as? LocationServiceError {
            switch error {
            case .servicesDisabled: return .servicesDisabled
            case .authorizationDenied: return .denied
            case .authorizationRestricted: return .restricted
            case .unavailable, .unknown: break
            }
        }

        let providerState = locationProvider.permissionState()
        return providerState == .granted ? .transientFailure : providerState
    }
}

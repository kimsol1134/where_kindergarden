import XCTest
@testable import Domain
@testable import Features
@testable import Models
@testable import Services

/// 검색창은 글자가 바뀔 때마다 뷰모델을 갱신한다. 계측이 디바운스되지 않으면
/// "강남"을 입력하는 동안 `Search Executed`가 네 번 발생하고, 조합 중 상태의 0건 결과가
/// 검색 실패로 기록된다. 이 테스트는 그 회귀를 막는다.
@MainActor
final class SearchAnalyticsDebounceTests: XCTestCase {

    // MARK: - Stubs

    private final class StubKindergartenRepo: KindergartenProviding, @unchecked Sendable {
        var kindergartens: [KindergartenRaw]
        var isLoading = false
        var error: String?

        init(kindergartens: [KindergartenRaw]) { self.kindergartens = kindergartens }
        func load() async {}
    }

    private final class StubReviewRepo: ReviewProviding, @unchecked Sendable {
        var reviewsData: ReviewsData?
        var isLoading = false
        var error: String?

        init(reviewsData: ReviewsData? = nil) { self.reviewsData = reviewsData }
        func load() async {}
        func reviews(for kindercode: String) -> [ReviewLink] {
            reviewsData?.reviews[kindercode] ?? []
        }
    }

    private final class StubVacancyRepo: VacancyProviding, @unchecked Sendable {
        var vacancyData: VacancyDataset?
        var isLoading = false
        var error: String?

        func load() async {}
        func vacancy(for kindercode: String) -> VacancySummary? { nil }
        func vacancyCount(for kindercode: String) -> Int { 0 }
    }

    private final class StubCompareRepo: CompareStoring, @unchecked Sendable {
        var selection = CompareSelection()

        func toggle(id: String) -> CompareToggleResult {
            if selection.ids.contains(id) {
                selection = CompareSelection(ids: selection.ids.filter { $0 != id })
                return .removed
            }
            selection = CompareSelection(ids: selection.ids + [id])
            return .added
        }
        func remove(at index: Int) {
            var ids = selection.ids
            guard ids.indices.contains(index) else { return }
            ids.remove(at: index)
            selection = CompareSelection(ids: ids)
        }
        func replace(with selection: CompareSelection) { self.selection = selection }
        func contains(_ kindercode: String) -> Bool { selection.ids.contains(kindercode) }
        func order(for kindercode: String) -> Int? { selection.ids.firstIndex(of: kindercode) }
    }

    private final class StubFavoriteRepo: FavoriteStoring, @unchecked Sendable {
        var favorites: [FavoriteItem] = []

        func toggle(for kindergarten: Kindergarten) {
            if let index = favorites.firstIndex(where: { $0.kindercode == kindergarten.kindercode }) {
                favorites.remove(at: index)
            } else {
                favorites.append(
                    FavoriteItem(
                        kindercode: kindergarten.kindercode,
                        name: kindergarten.name,
                        address: kindergarten.address,
                        type: kindergarten.type
                    )
                )
            }
        }
        func isFavorite(_ kindercode: String) -> Bool {
            favorites.contains { $0.kindercode == kindercode }
        }
        func delete(atOffsets offsets: IndexSet) -> [IndexedFavoriteItem] { [] }
        func restore(_ items: [IndexedFavoriteItem]) {}
    }

    private final class StubRecentSearchRepo: RecentSearchStoring, @unchecked Sendable {
        var recentSearches: [RecentSearch] = []

        func record(_ search: RecentSearch) { recentSearches.insert(search, at: 0) }
        func delete(atOffsets offsets: IndexSet) -> [IndexedRecentSearch] { [] }
        func deleteAll() -> [IndexedRecentSearch] { [] }
        func restore(_ items: [IndexedRecentSearch]) {}
    }

    private final class StubLocationProvider: CurrentLocationProviding, @unchecked Sendable {
        func requestCurrentLocation() async throws -> Coordinates {
            Coordinates(lat: 37.4981, lng: 127.0276)
        }
        func permissionState() -> LocationPermissionState { .notDetermined }
    }

    private struct StubRemoteSearch: RemoteLocationSuggesting {
        var isConfigured: Bool { false }
        var unavailableMessage: String { "검색 서비스를 사용할 수 없어요" }
        func suggestions(for query: String, near origin: Coordinates?) async -> RemoteLocationSearchResult {
            RemoteLocationSearchResult(suggestions: [])
        }
    }

    // MARK: - Fixtures

    /// 기본 검색 기준점(서울 시청)에 딱 맞춰 둔다. 반경 필터에 걸리지 않아야
    /// 이 테스트가 거리 계산이 아니라 계측 동작만 검증하게 된다.
    private func makeKindergarten(kindercode: String, name: String) throws -> KindergartenRaw {
        let center = SearchViewModel.defaultCenter
        let json = """
        {
          "kindercode": "\(kindercode)", "name": "\(name)",
          "address": "서울 중구 세종대로 110", "lat": \(center.lat), "lng": \(center.lng),
          "type": "public", "phone": null, "homepage": null, "operation_hours": null,
          "sido_code": "11", "sigungu_code": "11680",
          "capacity": 40, "current_count": 32,
          "class_count_age3": 1, "class_count_age4": 1, "class_count_age5": 1,
          "capacity_age3": 12, "capacity_age4": 14, "capacity_age5": 14,
          "current_age3": 10, "current_age4": 10, "current_age5": 12,
          "class_count_mix": 0, "capacity_mix": 0, "current_mix": 0,
          "capacity_special": 0, "current_special": 0,
          "establish_date": "20160302", "has_bus": true, "bus_count": 1,
          "meal_type": "direct", "has_after_school": true, "area_per_child": 4.9,
          "has_playground": true, "building_year": 2016, "floor_info": "지상 3층",
          "classroom_area": 180, "indoor_playground_area": 36, "outdoor_playground_area": 82,
          "teacher_count": 8, "senior_teacher_count": 2, "cctv_count": 12
        }
        """
        return try JSONDecoder().decode(KindergartenRaw.self, from: Data(json.utf8))
    }

    /// 디바운스 간격을 아주 짧게 두어 테스트가 결정적으로 끝나게 한다.
    private let debounce = Duration.milliseconds(20)

    private func makeViewModel(
        kindergartens: [KindergartenRaw],
        analytics: MockAnalytics
    ) -> SearchViewModel {
        SearchViewModel(
            kindergartenRepo: StubKindergartenRepo(kindergartens: kindergartens),
            reviewRepo: StubReviewRepo(),
            vacancyRepo: StubVacancyRepo(),
            compareRepo: StubCompareRepo(),
            favoriteRepo: StubFavoriteRepo(),
            recentSearchRepo: StubRecentSearchRepo(),
            locationProvider: StubLocationProvider(),
            remoteSearchService: StubRemoteSearch(),
            analytics: analytics,
            router: AppRouter(),
            persistence: NativeAppPersistence(store: InMemoryNativeAppStore()),
            configuration: NativeAppConfiguration(kakaoAppKey: nil),
            searchAnalyticsDebounce: debounce
        )
    }

    /// 디바운스 창이 닫히고 이벤트가 방출될 때까지 기다린다.
    private func waitForDebounce() async throws {
        try await Task.sleep(for: debounce * 6)
    }

    // MARK: - Tests

    func testTypingHangulEmitsSingleSearchEvent() async throws {
        let analytics = MockAnalytics()
        let viewModel = makeViewModel(
            kindergartens: [try makeKindergarten(kindercode: "A001", name: "강남유치원")],
            analytics: analytics
        )
        try await waitForDebounce()
        let baseline = analytics.events.filter { $0.event == .searchExecuted }.count

        // 한글 IME가 "강남"을 만드는 실제 중간 상태들.
        for step in ["ㄱ", "가", "강", "강ㄴ", "강나", "강남"] {
            viewModel.updateSearchText(step)
        }
        try await waitForDebounce()

        let emitted = analytics.events.filter { $0.event == .searchExecuted }.count - baseline
        XCTAssertEqual(emitted, 1, "타이핑 6단계는 확정 후 1건으로 합쳐져야 한다")
    }

    func testDebouncedEventReportsFinalQueryOnly() async throws {
        let analytics = MockAnalytics()
        let viewModel = makeViewModel(
            kindergartens: [try makeKindergarten(kindercode: "A001", name: "강남유치원")],
            analytics: analytics
        )
        try await waitForDebounce()

        for step in ["ㄱ", "가", "강", "강ㄴ", "강나", "강남"] {
            viewModel.updateSearchText(step)
        }
        try await waitForDebounce()

        let last = try XCTUnwrap(analytics.events.last { $0.event == .searchExecuted })
        XCTAssertEqual(
            last.properties["search_query"],
            .string("강남"),
            "중간 조합 상태가 아니라 확정된 검색어가 기록되어야 한다"
        )
    }

    func testIncompleteJamoDoesNotProduceEmptyResults() async throws {
        let analytics = MockAnalytics()
        let viewModel = makeViewModel(
            kindergartens: [try makeKindergarten(kindercode: "A001", name: "강남유치원")],
            analytics: analytics
        )
        try await waitForDebounce()

        // 자모만 입력된 상태는 "아직 키워드 없음"으로 취급되어 주변 결과가 유지된다.
        viewModel.updateSearchText("ㄱ")
        XCTAssertFalse(viewModel.results.isEmpty, "조합 중 자모 때문에 결과가 사라지면 안 된다")

        viewModel.updateSearchText("강ㄴ")
        XCTAssertFalse(viewModel.results.isEmpty, "'강ㄴ'은 '강'으로 검색되어야 한다")
    }

    func testEmptyStateIsNotReportedForIntermediateTypingStates() async throws {
        let analytics = MockAnalytics()
        let viewModel = makeViewModel(
            kindergartens: [try makeKindergarten(kindercode: "A001", name: "강남유치원")],
            analytics: analytics
        )
        try await waitForDebounce()

        for step in ["ㅅ", "서", "서초", "서초ㄷ", "서초동"] {
            viewModel.updateSearchText(step)
        }
        try await waitForDebounce()

        let emptyStates = analytics.events.filter { $0.event == .emptyStateShown }
        XCTAssertEqual(
            emptyStates.count,
            1,
            "결과 없는 검색어 하나는 1건만 보고되어야 하고, 조합 중 상태는 잡히면 안 된다"
        )
        XCTAssertEqual(emptyStates.first?.properties["search_query"], .string("서초동"))
    }

    func testSearchEventCarriesResultCountAndHasResults() async throws {
        let analytics = MockAnalytics()
        let viewModel = makeViewModel(
            kindergartens: [try makeKindergarten(kindercode: "A001", name: "강남유치원")],
            analytics: analytics
        )
        try await waitForDebounce()

        viewModel.updateSearchText("강남")
        try await waitForDebounce()

        let last = try XCTUnwrap(analytics.events.last { $0.event == .searchExecuted })
        XCTAssertEqual(last.properties["has_results"], .bool(true))
        XCTAssertEqual(last.properties["result_count"], .int(1))
        XCTAssertEqual(last.properties["query_type"], .string("keyword"))
    }
}

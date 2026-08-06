import XCTest
@testable import Domain
@testable import Features
@testable import Models
@testable import Services

@MainActor
final class CompareAnalyticsSemanticsTests: XCTestCase {
    private func makeViewModel(
        selection: CompareSelection,
        analytics: MockAnalytics
    ) async -> CompareViewModel {
        let kindergartenRepository = KindergartenRepository(
            loader: { try JSONEncoder().encode(NativePreviewFixtures.kindergartens) }
        )
        await kindergartenRepository.load()

        let persistence = NativeAppPersistence(store: InMemoryNativeAppStore())
        let compareRepository = CompareRepository(persistence: persistence)
        compareRepository.replace(with: selection)
        let reviewRepository = ReviewRepository(
            localLoader: {
                Data("""
                {"version":"2026-08-06","totalCount":0,"kindergartenCount":0,"reviews":{}}
                """.utf8)
            }
        )

        return CompareViewModel(
            compareRepo: compareRepository,
            kindergartenRepo: kindergartenRepository,
            reviewRepo: reviewRepository,
            vacancyRepo: VacancyRepository.empty,
            analytics: analytics,
            router: AppRouter(),
            configuration: NativeAppConfiguration(kakaoAppKey: nil)
        )
    }

    func testCompareViewedRequiresAtLeastTwoCandidates() async {
        let analytics = MockAnalytics()
        let oneCandidate = await makeViewModel(
            selection: CompareSelection(ids: ["A001"]),
            analytics: analytics
        )

        oneCandidate.trackCompareViewed()
        XCTAssertTrue(analytics.events.filter { $0.event == .compareViewed }.isEmpty)

        let twoCandidates = await makeViewModel(
            selection: CompareSelection(ids: ["A001", "A002"]),
            analytics: analytics
        )
        twoCandidates.trackCompareViewed()

        let viewed = analytics.events.filter { $0.event == .compareViewed }
        XCTAssertEqual(viewed.count, 1)
        XCTAssertEqual(viewed.first?.properties["compare_count"], .int(2))
    }

    func testShareInitiationIsSeparatedFromCompletion() async throws {
        let analytics = MockAnalytics()
        let viewModel = await makeViewModel(
            selection: CompareSelection(ids: ["A001", "A002"]),
            analytics: analytics
        )

        _ = try XCTUnwrap(viewModel.shareSystem())
        XCTAssertEqual(analytics.events.filter { $0.event == .compareShareInitiated }.count, 1)
        XCTAssertTrue(analytics.events.filter { $0.event == .compareShared }.isEmpty)

        viewModel.trackShareResult(method: "system", result: .cancelled)
        XCTAssertEqual(analytics.events.filter { $0.event == .compareShareResult }.count, 1)
        XCTAssertTrue(analytics.events.filter { $0.event == .compareShared }.isEmpty)

        viewModel.trackShareResult(method: "system", result: .completed)
        XCTAssertEqual(analytics.events.filter { $0.event == .compareShareResult }.count, 2)
        XCTAssertEqual(analytics.events.filter { $0.event == .compareShared }.count, 1)
    }
}

import XCTest
@testable import Domain
@testable import Models
@testable import Services

@MainActor
final class ReviewPromptCoordinatorTests: XCTestCase {

    private let now = Date(timeIntervalSince1970: 1_800_000_000)

    /// 테스트용 인메모리 이력 저장소.
    private final class StubPromptStore: ReviewPromptStateStoring {
        var state = ReviewPromptState()
        private(set) var saveCount = 0

        func loadReviewPromptState() -> ReviewPromptState { state }

        func saveReviewPromptState(_ state: ReviewPromptState) {
            self.state = state
            saveCount += 1
        }
    }

    private func makeCoordinator(
        store: StubPromptStore,
        prompter: MockReviewPrompter,
        analytics: MockAnalytics = MockAnalytics(),
        appVersion: String = "2.2.3"
    ) -> ReviewPromptCoordinator {
        ReviewPromptCoordinator(
            prompter: prompter,
            store: store,
            analytics: analytics,
            appVersion: appVersion,
            now: { self.now }
        )
    }

    func testPromptsWhenCompareThresholdMet() {
        let store = StubPromptStore()
        let prompter = MockReviewPrompter()
        let coordinator = makeCoordinator(store: store, prompter: prompter)

        XCTAssertTrue(coordinator.requestReviewIfEligible(trigger: .compareViewed, count: 2))
        XCTAssertEqual(prompter.requestCount, 1)
        XCTAssertEqual(store.state.promptedAppVersions, ["2.2.3"])
    }

    func testDoesNotPromptBelowThreshold() {
        let store = StubPromptStore()
        let prompter = MockReviewPrompter()
        let coordinator = makeCoordinator(store: store, prompter: prompter)

        XCTAssertFalse(coordinator.requestReviewIfEligible(trigger: .compareViewed, count: 1))
        XCTAssertEqual(prompter.requestCount, 0)
        XCTAssertEqual(store.saveCount, 0, "발동하지 않았으면 이력도 남기지 않는다")
    }

    func testPromptsOnlyOncePerSessionAcrossTriggers() {
        let store = StubPromptStore()
        let prompter = MockReviewPrompter()
        let coordinator = makeCoordinator(store: store, prompter: prompter)

        XCTAssertTrue(coordinator.requestReviewIfEligible(trigger: .compareViewed, count: 3))
        XCTAssertFalse(
            coordinator.requestReviewIfEligible(trigger: .favoriteMilestone, count: 5),
            "같은 세션에서 다른 경로로 또 묻지 않는다"
        )
        XCTAssertEqual(prompter.requestCount, 1)
    }

    func testDoesNotPromptWhenAlreadyPromptedForThisVersion() {
        let store = StubPromptStore()
        store.state = ReviewPromptState(
            promptedAppVersions: ["2.2.3"],
            promptDates: [now.addingTimeInterval(-200 * 24 * 60 * 60)]
        )
        let prompter = MockReviewPrompter()
        let coordinator = makeCoordinator(store: store, prompter: prompter)

        XCTAssertFalse(coordinator.requestReviewIfEligible(trigger: .compareViewed, count: 2))
        XCTAssertEqual(prompter.requestCount, 0)
    }

    func testTracksTriggerEventWithContext() {
        let store = StubPromptStore()
        let analytics = MockAnalytics()
        let coordinator = makeCoordinator(
            store: store,
            prompter: MockReviewPrompter(),
            analytics: analytics
        )

        coordinator.requestReviewIfEligible(trigger: .favoriteMilestone, count: 4)

        let events = analytics.events.filter { $0.event == .reviewPromptTriggered }
        XCTAssertEqual(events.count, 1)
        XCTAssertEqual(events.first?.properties["trigger"], .string("favorite_milestone"))
        XCTAssertEqual(events.first?.properties["count"], .int(4))
    }

    func testDoesNotPromptWithoutAppVersion() {
        let store = StubPromptStore()
        let prompter = MockReviewPrompter()
        let coordinator = makeCoordinator(store: store, prompter: prompter, appVersion: "")

        XCTAssertFalse(coordinator.requestReviewIfEligible(trigger: .compareViewed, count: 3))
        XCTAssertEqual(prompter.requestCount, 0)
    }
}

final class ReviewSubmissionLinkTests: XCTestCase {

    func testReturnsNilWhenFormNotConfigured() {
        XCTAssertNil(
            ReviewSubmissionLink.makeURL(
                formID: "",
                nameEntryID: "entry.1",
                kindercodeEntryID: "entry.2",
                kindergartenName: "행복유치원",
                kindercode: "D100000001"
            ),
            "폼 ID가 없으면 진입점을 숨겨야 하므로 nil을 돌려준다"
        )

        XCTAssertNil(
            ReviewSubmissionLink.makeURL(
                formID: "abc",
                nameEntryID: "",
                kindercodeEntryID: "entry.2",
                kindergartenName: "행복유치원",
                kindercode: "D100000001"
            )
        )
    }

    func testBuildsPrefilledURL() throws {
        let url = try XCTUnwrap(
            ReviewSubmissionLink.makeURL(
                formID: "1FAIpQLSfake",
                nameEntryID: "entry.111",
                kindercodeEntryID: "entry.222",
                kindergartenName: "행복유치원",
                kindercode: "D100000001"
            )
        )

        let components = try XCTUnwrap(URLComponents(url: url, resolvingAgainstBaseURL: false))
        XCTAssertEqual(components.host, "docs.google.com")
        XCTAssertEqual(components.path, "/forms/d/e/1FAIpQLSfake/viewform")

        let items = Dictionary(
            uniqueKeysWithValues: (components.queryItems ?? []).map { ($0.name, $0.value) }
        )
        XCTAssertEqual(items["usp"], "pp_url")
        XCTAssertEqual(items["entry.111"], "행복유치원")
        XCTAssertEqual(items["entry.222"], "D100000001")
    }

    func testEncodesKoreanNameSafely() throws {
        let url = try XCTUnwrap(
            ReviewSubmissionLink.makeURL(
                formID: "form",
                nameEntryID: "entry.1",
                kindercodeEntryID: "entry.2",
                kindergartenName: "서울 강남 어린이집 & 유치원",
                kindercode: "D1"
            )
        )

        XCTAssertFalse(url.absoluteString.contains(" "), "공백은 인코딩되어야 한다")
        XCTAssertTrue(url.absoluteString.contains("%26"), "& 는 인코딩되어야 쿼리가 깨지지 않는다")
    }
}

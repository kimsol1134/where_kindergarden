import XCTest
@testable import Domain
@testable import Models

final class ReviewPromptPolicyTests: XCTestCase {

    private let now = Date(timeIntervalSince1970: 1_800_000_000)
    private func daysAgo(_ days: Int) -> Date {
        now.addingTimeInterval(-Double(days) * 24 * 60 * 60)
    }

    // MARK: - shouldPrompt

    func testPromptsOnCleanState() {
        XCTAssertTrue(
            ReviewPromptPolicy.shouldPrompt(
                state: ReviewPromptState(),
                appVersion: "2.2.3",
                now: now
            )
        )
    }

    func testDoesNotPromptTwiceInSameAppVersion() {
        let state = ReviewPromptState(
            promptedAppVersions: ["2.2.3"],
            promptDates: [daysAgo(200)]
        )
        XCTAssertFalse(
            ReviewPromptPolicy.shouldPrompt(state: state, appVersion: "2.2.3", now: now)
        )
    }

    func testPromptsAgainAfterVersionBumpOnceIntervalPassed() {
        let state = ReviewPromptState(
            promptedAppVersions: ["2.2.3"],
            promptDates: [daysAgo(120)]
        )
        XCTAssertTrue(
            ReviewPromptPolicy.shouldPrompt(state: state, appVersion: "2.3.0", now: now)
        )
    }

    func testRespectsMinimumIntervalEvenOnNewVersion() {
        let state = ReviewPromptState(
            promptedAppVersions: ["2.2.3"],
            promptDates: [daysAgo(30)]
        )
        XCTAssertFalse(
            ReviewPromptPolicy.shouldPrompt(state: state, appVersion: "2.3.0", now: now),
            "마지막 요청 후 90일이 지나지 않으면 버전이 올라가도 묻지 않는다"
        )
    }

    func testAllowsPromptExactlyAtMinimumInterval() {
        let state = ReviewPromptState(
            promptedAppVersions: ["2.2.3"],
            promptDates: [daysAgo(ReviewPromptPolicy.minimumDaysBetweenPrompts)]
        )
        XCTAssertTrue(
            ReviewPromptPolicy.shouldPrompt(state: state, appVersion: "2.3.0", now: now)
        )
    }

    func testStopsAtYearlyLimit() {
        // 365일 안에 3회를 모두 소진했고, 마지막 요청도 90일이 지난 상태.
        let state = ReviewPromptState(
            promptedAppVersions: ["2.0.0", "2.1.0", "2.2.0"],
            promptDates: [daysAgo(350), daysAgo(250), daysAgo(150)]
        )
        XCTAssertFalse(
            ReviewPromptPolicy.shouldPrompt(state: state, appVersion: "2.3.0", now: now),
            "iOS 시스템 한도와 동일하게 연 3회를 넘기지 않는다"
        )
    }

    func testYearlyLimitIgnoresPromptsOlderThanOneYear() {
        let state = ReviewPromptState(
            promptedAppVersions: ["1.0.0", "1.1.0", "1.2.0"],
            promptDates: [daysAgo(400), daysAgo(380), daysAgo(370)]
        )
        XCTAssertTrue(
            ReviewPromptPolicy.shouldPrompt(state: state, appVersion: "2.3.0", now: now)
        )
    }

    func testDoesNotPromptWhenAppVersionIsUnknown() {
        XCTAssertFalse(
            ReviewPromptPolicy.shouldPrompt(state: ReviewPromptState(), appVersion: "", now: now)
        )
    }

    // MARK: - meetsThreshold

    func testCompareViewedNeedsTwoKindergartens() {
        XCTAssertFalse(ReviewPromptPolicy.meetsThreshold(.compareViewed, count: 0))
        XCTAssertFalse(ReviewPromptPolicy.meetsThreshold(.compareViewed, count: 1))
        XCTAssertTrue(ReviewPromptPolicy.meetsThreshold(.compareViewed, count: 2))
        XCTAssertTrue(ReviewPromptPolicy.meetsThreshold(.compareViewed, count: 3))
    }

    func testFavoriteMilestoneNeedsTwoFavorites() {
        XCTAssertFalse(ReviewPromptPolicy.meetsThreshold(.favoriteMilestone, count: 1))
        XCTAssertTrue(ReviewPromptPolicy.meetsThreshold(.favoriteMilestone, count: 2))
    }

    // MARK: - recordingPrompt

    func testRecordingPromptAppendsVersionAndDate() {
        let next = ReviewPromptPolicy.recordingPrompt(
            in: ReviewPromptState(),
            appVersion: "2.2.3",
            now: now
        )
        XCTAssertEqual(next.promptedAppVersions, ["2.2.3"])
        XCTAssertEqual(next.promptDates, [now])
    }

    func testRecordingPromptPrunesExpiredDates() {
        let state = ReviewPromptState(
            promptedAppVersions: ["1.0.0"],
            promptDates: [daysAgo(400), daysAgo(100)]
        )
        let next = ReviewPromptPolicy.recordingPrompt(in: state, appVersion: "2.2.3", now: now)

        XCTAssertEqual(next.promptDates.count, 2, "365일이 지난 이력은 정리된다")
        XCTAssertFalse(next.promptDates.contains(daysAgo(400)))
        XCTAssertTrue(next.promptDates.contains(now))
    }

    func testRecordingPromptDoesNotDuplicateVersion() {
        let state = ReviewPromptState(promptedAppVersions: ["2.2.3"], promptDates: [daysAgo(100)])
        let next = ReviewPromptPolicy.recordingPrompt(in: state, appVersion: "2.2.3", now: now)

        XCTAssertEqual(next.promptedAppVersions, ["2.2.3"])
    }

    /// 정책 전체 왕복: 요청 → 기록 → 즉시 재요청 차단.
    func testPromptThenRecordBlocksImmediateSecondPrompt() {
        var state = ReviewPromptState()
        XCTAssertTrue(ReviewPromptPolicy.shouldPrompt(state: state, appVersion: "2.2.3", now: now))

        state = ReviewPromptPolicy.recordingPrompt(in: state, appVersion: "2.2.3", now: now)

        XCTAssertFalse(ReviewPromptPolicy.shouldPrompt(state: state, appVersion: "2.2.3", now: now))
        XCTAssertFalse(ReviewPromptPolicy.shouldPrompt(state: state, appVersion: "2.3.0", now: now))
    }
}

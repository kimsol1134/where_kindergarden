import XCTest
@testable import Services

@MainActor
final class ParentSurveyTests: XCTestCase {
    private let url = URL(string: "https://docs.google.com/forms/d/e/test-survey/viewform")!

    private func makeSurvey(
        store: InMemoryNativeAppStore? = nil,
        gate: SessionPromptGate? = nil,
        analytics: MockAnalytics = MockAnalytics(),
        campaignID: String = "test"
    ) -> ParentSurveyCoordinator {
        ParentSurveyCoordinator(
            campaign: ParentSurveyCampaign(id: campaignID, url: url),
            persistence: NativeAppPersistence(store: store ?? InMemoryNativeAppStore()),
            gate: gate ?? SessionPromptGate(), analytics: analytics
        )
    }

    private func qualify(_ survey: ParentSurveyCoordinator) {
        survey.recordDetailPresented(kindercode: "A")
        survey.recordDetailPresented(kindercode: "B")
        survey.returnedToSearch()
    }

    func testOnlyShowsAfterTwoDistinctDetailsAndReturn() {
        let survey = makeSurvey()
        survey.returnedToSearch()
        XCTAssertFalse(survey.isInvitationVisible)
        survey.recordDetailPresented(kindercode: "A")
        survey.recordDetailPresented(kindercode: "A")
        survey.returnedToSearch()
        XCTAssertFalse(survey.isInvitationVisible)
        survey.recordDetailPresented(kindercode: "B")
        XCTAssertFalse(survey.isInvitationVisible, "Don't interrupt the detail screen")
        survey.returnedToSearch()
        XCTAssertTrue(survey.isInvitationVisible)
    }

    func testImpressionIsRecordedOnceOnlyWhenCardAppears() {
        let analytics = MockAnalytics()
        let survey = makeSurvey(analytics: analytics)
        qualify(survey)
        XCTAssertTrue(analytics.events.isEmpty)
        survey.recordImpression()
        survey.recordImpression()
        survey.returnedToSearch()
        XCTAssertEqual(analytics.events.map(\.event), [.surveyInvitationShown])
        XCTAssertEqual(analytics.events.first?.properties["detail_count"], .int(2))
        XCTAssertNil(analytics.events.first?.properties["kindercode"])
    }

    func testImpressionSurvivesAppRestartButNewCampaignCanRun() {
        let store = InMemoryNativeAppStore()
        let original = makeSurvey(store: store)
        qualify(original)
        original.recordImpression()
        let restarted = makeSurvey(store: store)
        qualify(restarted)
        XCTAssertFalse(restarted.isInvitationVisible)
        let next = makeSurvey(store: store, campaignID: "next-campaign")
        qualify(next)
        XCTAssertTrue(next.isInvitationVisible)
    }

    func testDismissedInvitationDoesNotReturn() {
        let store = InMemoryNativeAppStore()
        let survey = makeSurvey(store: store)
        qualify(survey)
        survey.dismiss()
        qualify(survey)
        XCTAssertFalse(survey.isInvitationVisible)
        let restarted = makeSurvey(store: store)
        qualify(restarted)
        XCTAssertFalse(restarted.isInvitationVisible)
    }

    func testFailedURLHandoffAllowsRetryAndDoesNotClaimSubmission() {
        let analytics = MockAnalytics()
        let survey = makeSurvey(analytics: analytics)
        qualify(survey)
        survey.recordImpression()
        XCTAssertEqual(survey.beginOpening(), url)
        XCTAssertNil(survey.beginOpening(), "Ignore double taps")
        survey.finishOpening(accepted: false)
        XCTAssertTrue(survey.isInvitationVisible)
        XCTAssertNotNil(survey.openError)
        XCTAssertEqual(survey.beginOpening(), url)
        survey.finishOpening(accepted: true)
        XCTAssertFalse(survey.isInvitationVisible)
        XCTAssertEqual(analytics.events.filter { $0.event == .surveyLinkTapped }.count, 2)
        let results = analytics.events.filter { $0.event == .surveyLinkOpenResult }
        XCTAssertEqual(results.map { $0.properties["accepted"] }, [.bool(false), .bool(true)])
    }

    func testReviewThenSurveyAreMutuallyExclusive() {
        let gate = SessionPromptGate()
        let persistence = NativeAppPersistence(store: InMemoryNativeAppStore())
        let review = ReviewPromptCoordinator(
            prompter: MockReviewPrompter(), store: persistence,
            sessionGate: gate, appVersion: "test"
        )
        XCTAssertTrue(review.requestReviewIfEligible(trigger: .compareViewed, count: 2))
        let survey = makeSurvey(gate: gate)
        qualify(survey)
        XCTAssertFalse(survey.isInvitationVisible)
    }

    func testSurveyThenReviewAreMutuallyExclusiveEvenAfterDismissal() {
        let gate = SessionPromptGate()
        let survey = makeSurvey(gate: gate)
        qualify(survey)
        survey.dismiss()
        let prompter = MockReviewPrompter()
        let review = ReviewPromptCoordinator(
            prompter: prompter,
            store: NativeAppPersistence(store: InMemoryNativeAppStore()),
            sessionGate: gate, appVersion: "test"
        )
        XCTAssertFalse(review.requestReviewIfEligible(trigger: .favoriteMilestone, count: 2))
        XCTAssertEqual(prompter.requestCount, 0)
    }

    func testIneligibleReviewDoesNotPreventSurvey() {
        let gate = SessionPromptGate()
        let review = ReviewPromptCoordinator(
            prompter: MockReviewPrompter(),
            store: NativeAppPersistence(store: InMemoryNativeAppStore()),
            sessionGate: gate, appVersion: "test"
        )
        XCTAssertFalse(review.requestReviewIfEligible(trigger: .compareViewed, count: 1))
        let survey = makeSurvey(gate: gate)
        qualify(survey)
        XCTAssertTrue(survey.isInvitationVisible)
    }

    func testMissingOrInvalidFormDoesNotShowOrConsumePromptGate() {
        let gate = SessionPromptGate()
        let survey = ParentSurveyCoordinator(
            campaign: ParentSurveyCampaign(id: "test", url: nil),
            persistence: NativeAppPersistence(store: InMemoryNativeAppStore()), gate: gate
        )
        qualify(survey)
        XCTAssertFalse(survey.isInvitationVisible)
        XCTAssertTrue(gate.claim(.review))
        for value in ["http://docs.google.com/forms/d/e/a/viewform", "https://example.com/forms/d/e/a/viewform", "https://docs.google.com/forms/d/a/edit", "https://docs.google.com/forms/d/e/a/viewform?user=123"] {
            XCTAssertNil(ParentSurveyCampaign(id: "test", url: URL(string: value)).url)
        }
    }
}

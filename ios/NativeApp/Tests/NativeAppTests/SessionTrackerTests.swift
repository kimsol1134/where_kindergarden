import Foundation
import XCTest
@testable import Services

final class SessionTrackerTests: XCTestCase {
    private func makeTracker() -> (SessionTracker, UserDefaults) {
        let suiteName = "test.\(UUID().uuidString)"
        let defaults = UserDefaults(suiteName: suiteName)!
        let tracker = SessionTracker(defaults: defaults)
        return (tracker, defaults)
    }

    func test_initialSessionId_isNotEmpty() {
        let (tracker, _) = makeTracker()
        XCTAssertFalse(tracker.currentSessionId.isEmpty)
    }

    func test_handleBackground_storesTimestamp() {
        let (tracker, defaults) = makeTracker()
        let before = Date().timeIntervalSince1970
        tracker.handleBackground()
        let after = Date().timeIntervalSince1970
        let stored = defaults.double(forKey: "analytics.background_entered_at")
        XCTAssertGreaterThanOrEqual(stored, before)
        XCTAssertLessThanOrEqual(stored, after)
    }

    func test_handleForeground_withinTimeout_keepsSameSessionId() {
        let (tracker, defaults) = makeTracker()
        let originalId = tracker.currentSessionId

        // 10분 전에 백그라운드 진입한 것처럼 설정
        let tenMinutesAgo = Date().timeIntervalSince1970 - (10 * 60)
        defaults.set(tenMinutesAgo, forKey: "analytics.background_entered_at")

        tracker.handleForeground()
        XCTAssertEqual(tracker.currentSessionId, originalId)
    }

    func test_handleForeground_afterTimeout_generatesNewSessionId() {
        let (tracker, defaults) = makeTracker()
        let originalId = tracker.currentSessionId

        // 31분 전에 백그라운드 진입한 것처럼 설정
        let thirtyOneMinutesAgo = Date().timeIntervalSince1970 - (31 * 60)
        defaults.set(thirtyOneMinutesAgo, forKey: "analytics.background_entered_at")

        tracker.handleForeground()
        XCTAssertNotEqual(tracker.currentSessionId, originalId)
        XCTAssertFalse(tracker.currentSessionId.isEmpty)
    }

    func test_handleForeground_callsOnSessionChanged_afterTimeout() {
        let (tracker, defaults) = makeTracker()
        var capturedId: String?
        tracker.onSessionChanged = { capturedId = $0 }

        // 31분 전에 백그라운드 진입한 것처럼 설정
        let thirtyOneMinutesAgo = Date().timeIntervalSince1970 - (31 * 60)
        defaults.set(thirtyOneMinutesAgo, forKey: "analytics.background_entered_at")

        tracker.handleForeground()
        XCTAssertNotNil(capturedId)
        XCTAssertEqual(capturedId, tracker.currentSessionId)
    }
}

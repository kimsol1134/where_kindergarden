import XCTest
@testable import Services

/// 의도(Intent) 이벤트 계측 검증.
/// 전화/홈페이지/길찾기/후기 탭은 앱의 사실상 전환 신호이므로
/// 이벤트명·프로퍼티 계약이 깨지지 않도록 고정한다.
final class AnalyticsIntentEventsTests: XCTestCase {

    func test_intentEvent_rawValues_matchLexiconContract() {
        XCTAssertEqual(AnalyticsEvent.contactTapped.rawValue, "Contact Tapped")
        XCTAssertEqual(AnalyticsEvent.homepageOpened.rawValue, "Homepage Opened")
        XCTAssertEqual(AnalyticsEvent.directionsOpened.rawValue, "Directions Opened")
        XCTAssertEqual(AnalyticsEvent.reviewOpened.rawValue, "Review Opened")
        XCTAssertEqual(AnalyticsEvent.alertRequested.rawValue, "Alert Requested")
    }

    func test_trackContactTapped_emitsEventWithProperties() {
        let analytics = MockAnalytics()

        analytics.trackContactTapped(kindercode: "D100000001", type: "private", source: "detail")

        XCTAssertEqual(analytics.events.count, 1)
        let recorded = analytics.events[0]
        XCTAssertEqual(recorded.event, .contactTapped)
        XCTAssertEqual(recorded.properties["kindercode"], .string("D100000001"))
        XCTAssertEqual(recorded.properties["kindergarten_type"], .string("private"))
        XCTAssertEqual(recorded.properties["source"], .string("detail"))
    }

    func test_trackHomepageOpened_emitsEventWithProperties() {
        let analytics = MockAnalytics()

        analytics.trackHomepageOpened(kindercode: "D100000002", type: "public", source: "saved")

        XCTAssertEqual(analytics.events.count, 1)
        XCTAssertEqual(analytics.events[0].event, .homepageOpened)
        XCTAssertEqual(analytics.events[0].properties["kindercode"], .string("D100000002"))
        XCTAssertEqual(analytics.events[0].properties["kindergarten_type"], .string("public"))
        XCTAssertEqual(analytics.events[0].properties["source"], .string("saved"))
    }

    func test_trackDirectionsOpened_emitsEventWithProperties() {
        let analytics = MockAnalytics()

        analytics.trackDirectionsOpened(kindercode: "D100000003", type: "home", source: "detail")

        XCTAssertEqual(analytics.events.count, 1)
        XCTAssertEqual(analytics.events[0].event, .directionsOpened)
        XCTAssertEqual(analytics.events[0].properties["kindercode"], .string("D100000003"))
        XCTAssertEqual(analytics.events[0].properties["kindergarten_type"], .string("home"))
        XCTAssertEqual(analytics.events[0].properties["source"], .string("detail"))
    }

    func test_trackReviewOpened_emitsEventWithReviewSourceAndCount() {
        let analytics = MockAnalytics()

        analytics.trackReviewOpened(
            kindercode: "D100000004",
            reviewSource: "naver_blog",
            reviewCount: 7,
            source: "detail"
        )

        XCTAssertEqual(analytics.events.count, 1)
        let recorded = analytics.events[0]
        XCTAssertEqual(recorded.event, .reviewOpened)
        XCTAssertEqual(recorded.properties["kindercode"], .string("D100000004"))
        XCTAssertEqual(recorded.properties["review_source"], .string("naver_blog"))
        XCTAssertEqual(recorded.properties["review_count"], .int(7))
        XCTAssertEqual(recorded.properties["source"], .string("detail"))
    }

    func test_trackAlertRequested_emitsEventWithAlertType() {
        let analytics = MockAnalytics()

        analytics.trackAlertRequested(
            kindercode: "D100000005",
            type: "private",
            alertType: "admission_deadline",
            source: "detail"
        )

        XCTAssertEqual(analytics.events.count, 1)
        let recorded = analytics.events[0]
        XCTAssertEqual(recorded.event, .alertRequested)
        XCTAssertEqual(recorded.properties["kindercode"], .string("D100000005"))
        XCTAssertEqual(recorded.properties["kindergarten_type"], .string("private"))
        XCTAssertEqual(recorded.properties["alert_type"], .string("admission_deadline"))
        XCTAssertEqual(recorded.properties["source"], .string("detail"))
    }
}

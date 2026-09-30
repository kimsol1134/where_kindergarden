import Foundation
import os

public enum AnalyticsValue: Sendable, Equatable {
    case string(String)
    case int(Int)
    case double(Double)
    case bool(Bool)
}

public typealias AnalyticsProperties = [String: AnalyticsValue]

public enum AnalyticsEvent: String, Sendable {
    case appLaunched       = "App Launched"
    case searchExecuted    = "Search Executed"
    case emptyStateShown   = "Empty State Shown"
    case resultTapped      = "Result Tapped"
    case detailOpened      = "Detail Opened"
    case favoriteAdded     = "Favorite Added"
    case favoriteRemoved   = "Favorite Removed"
    case comparisonAdded   = "Comparison Added"
    case comparisonRemoved = "Comparison Removed"
    case compareViewed     = "Compare Viewed"
    case compareShared     = "Compare Shared"
    case filterApplied     = "Filter Applied"
    case tabChanged        = "Tab Changed"
    // Intent events — 사용자가 특정 유치원에 행동(전환 신호)을 보인 시점.
    case contactTapped     = "Contact Tapped"
    case homepageOpened    = "Homepage Opened"
    case directionsOpened  = "Directions Opened"
    case reviewOpened      = "Review Opened"
    case alertRequested    = "Alert Requested"
}

public protocol AnalyticsTracking: AnyObject {
    func track(event: AnalyticsEvent, properties: AnalyticsProperties)
    func updateSuperProperties(_ properties: AnalyticsProperties)
}

extension AnalyticsTracking {
    public func track(event: AnalyticsEvent) {
        track(event: event, properties: [:])
    }

    /// 전화 걸기 탭 — 앱이 가진 가장 강한 전환(의도) 신호.
    /// - Parameter source: 발생 화면 (`detail` / `saved` 등).
    public func trackContactTapped(kindercode: String, type: String, source: String) {
        track(event: .contactTapped, properties: [
            "kindercode": .string(kindercode),
            "kindergarten_type": .string(type),
            "source": .string(source),
        ])
    }

    /// 홈페이지 열기 탭 — 깊은 탐색 의도.
    public func trackHomepageOpened(kindercode: String, type: String, source: String) {
        track(event: .homepageOpened, properties: [
            "kindercode": .string(kindercode),
            "kindergarten_type": .string(type),
            "source": .string(source),
        ])
    }

    /// 지도/길찾기 열기 탭 — 오프라인 방문 의도.
    public func trackDirectionsOpened(kindercode: String, type: String, source: String) {
        track(event: .directionsOpened, properties: [
            "kindercode": .string(kindercode),
            "kindergarten_type": .string(type),
            "source": .string(source),
        ])
    }

    /// 후기 링크 열기 탭 — 신뢰 검증 단계 + 후기 콘텐츠 가치 측정.
    /// - Parameter reviewSource: 후기 플랫폼 (`naver_blog` 등). 화면 출처는 `source`.
    public func trackReviewOpened(kindercode: String, reviewSource: String, reviewCount: Int, source: String) {
        track(event: .reviewOpened, properties: [
            "kindercode": .string(kindercode),
            "review_source": .string(reviewSource),
            "review_count": .int(reviewCount),
            "source": .string(source),
        ])
    }

    /// 모집/빈자리 알림 수요 확인용 fake-door 이벤트.
    /// - Parameters:
    ///   - alertType: `admission_deadline` / `vacancy` 등 알림 종류.
    ///   - source: 발생 화면 (`detail` / `saved` / `compare` 등).
    public func trackAlertRequested(kindercode: String, type: String, alertType: String, source: String) {
        track(event: .alertRequested, properties: [
            "kindercode": .string(kindercode),
            "kindergarten_type": .string(type),
            "alert_type": .string(alertType),
            "source": .string(source),
        ])
    }
}

public final class OSLogAnalytics: AnalyticsTracking {
    private let logger: Logger

    public init(subsystem: String = Bundle.main.bundleIdentifier ?? "com.wherekindergarten", category: String = "analytics") {
        self.logger = Logger(subsystem: subsystem, category: category)
    }

    public func track(event: AnalyticsEvent, properties: AnalyticsProperties) {
        if properties.isEmpty {
            logger.info("[\(event.rawValue, privacy: .public)]")
        } else {
            let propsString = properties
                .map { "\($0.key)=\(Self.stringValue($0.value))" }
                .joined(separator: ", ")
            logger.info("[\(event.rawValue, privacy: .public)] \(propsString, privacy: .public)")
        }
    }

    public func updateSuperProperties(_ properties: AnalyticsProperties) {
        guard !properties.isEmpty else { return }
        let propsString = properties
            .map { "\($0.key)=\(Self.stringValue($0.value))" }
            .joined(separator: ", ")
        logger.info("[super_properties] \(propsString, privacy: .public)")
    }

    private static func stringValue(_ value: AnalyticsValue) -> String {
        switch value {
        case .string(let s): return s
        case .int(let i): return String(i)
        case .double(let d): return String(d)
        case .bool(let b): return String(b)
        }
    }
}

public final class MockAnalytics: AnalyticsTracking {
    public struct RecordedEvent: Equatable {
        public let event: AnalyticsEvent
        public let properties: AnalyticsProperties
    }

    public private(set) var events: [RecordedEvent] = []
    public private(set) var superProperties: AnalyticsProperties = [:]

    public init() {}

    public func track(event: AnalyticsEvent, properties: AnalyticsProperties) {
        events.append(RecordedEvent(event: event, properties: properties))
    }

    public func updateSuperProperties(_ properties: AnalyticsProperties) {
        superProperties.merge(properties) { _, new in new }
    }
}

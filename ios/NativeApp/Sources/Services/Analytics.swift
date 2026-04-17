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
}

public protocol AnalyticsTracking: AnyObject {
    func track(event: AnalyticsEvent, properties: AnalyticsProperties)
    func updateSuperProperties(_ properties: AnalyticsProperties)
}

extension AnalyticsTracking {
    public func track(event: AnalyticsEvent) {
        track(event: event, properties: [:])
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

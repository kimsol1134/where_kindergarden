import Foundation
import os

public enum AnalyticsEvent: String, Sendable {
    case appLaunched
    case searchExecuted
    case filterChanged
    case resultTapped
    case compareToggled
    case compareViewed
    case compareShared
    case detailOpened
    case favoriteToggled
    case emptyStateShown
}

public protocol AnalyticsTracking: AnyObject {
    func track(event: AnalyticsEvent, properties: [String: String])
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

    public func track(event: AnalyticsEvent, properties: [String: String]) {
        if properties.isEmpty {
            logger.info("[\(event.rawValue, privacy: .public)]")
        } else {
            let propsString = properties.map { "\($0.key)=\($0.value)" }.joined(separator: ", ")
            logger.info("[\(event.rawValue, privacy: .public)] \(propsString, privacy: .public)")
        }
    }
}

public final class MockAnalytics: AnalyticsTracking {
    public struct RecordedEvent: Equatable {
        public let event: AnalyticsEvent
        public let properties: [String: String]
    }

    public private(set) var events: [RecordedEvent] = []

    public init() {}

    public func track(event: AnalyticsEvent, properties: [String: String]) {
        events.append(RecordedEvent(event: event, properties: properties))
    }
}

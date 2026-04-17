import Foundation
import Mixpanel
import UIKit

public final class MixpanelAnalytics: AnalyticsTracking, @unchecked Sendable {

    public static let shared = MixpanelAnalytics()

    private let lock = NSLock()
    private var isConfigured = false
    private var sessionTracker: SessionTracker?

    private init() {}

    @MainActor
    public func configure(token: String, sessionTracker: SessionTracker, deviceInfo: DeviceInfo) {
        lock.lock()
        defer { lock.unlock() }
        guard !isConfigured else { return }

        Mixpanel.initialize(token: token, trackAutomaticEvents: false)

        let distinctId = UIDevice.current.identifierForVendor?.uuidString ?? UUID().uuidString
        Mixpanel.mainInstance().identify(distinctId: distinctId)

        let initialSuperProps = Self.superProperties(from: deviceInfo, sessionId: sessionTracker.currentSessionId)
        Mixpanel.mainInstance().registerSuperProperties(initialSuperProps)

        sessionTracker.onSessionChanged = { newSessionId in
            Mixpanel.mainInstance().registerSuperProperties(["session_id": newSessionId])
        }

        self.sessionTracker = sessionTracker
        self.isConfigured = true
    }

    public func track(event: AnalyticsEvent, properties: AnalyticsProperties) {
        lock.lock()
        let configured = isConfigured
        lock.unlock()
        guard configured else { return }

        let mixpanelProps = properties.isEmpty
            ? nil
            : properties.mapValues { Self.analyticsValueToMixpanel($0) }
        Mixpanel.mainInstance().track(event: event.rawValue, properties: mixpanelProps)
    }

    public func updateSuperProperties(_ properties: AnalyticsProperties) {
        lock.lock()
        let configured = isConfigured
        lock.unlock()
        guard configured, !properties.isEmpty else { return }

        let mixpanelProps = properties.mapValues { Self.analyticsValueToMixpanel($0) }
        Mixpanel.mainInstance().registerSuperProperties(mixpanelProps)
    }

    static func analyticsValueToMixpanel(_ value: AnalyticsValue) -> MixpanelType {
        switch value {
        case .string(let stringValue): return stringValue
        case .int(let intValue): return intValue
        case .double(let doubleValue): return doubleValue
        case .bool(let boolValue): return boolValue
        }
    }

    static func superProperties(from deviceInfo: DeviceInfo, sessionId: String) -> [String: MixpanelType] {
        [
            "app_version": deviceInfo.appVersion,
            "build_number": deviceInfo.buildNumber,
            "os_version": deviceInfo.osVersion,
            "device_model": deviceInfo.deviceModel,
            "locale": deviceInfo.locale,
            "is_testflight": deviceInfo.isTestFlight,
            "days_since_install": deviceInfo.daysSinceInstall,
            "session_id": sessionId
        ]
    }
}

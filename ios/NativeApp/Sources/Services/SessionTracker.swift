import Foundation

public final class SessionTracker: @unchecked Sendable {
    public static let sessionTimeoutInterval: TimeInterval = 30 * 60  // 30분

    private static let sessionIdKey = "analytics.session_id"
    private static let backgroundEnteredAtKey = "analytics.background_entered_at"

    public private(set) var currentSessionId: String
    public var onSessionChanged: ((String) -> Void)?

    private let defaults: UserDefaults

    public init(defaults: UserDefaults = .standard) {
        self.defaults = defaults
        if let stored = defaults.string(forKey: Self.sessionIdKey), !stored.isEmpty {
            self.currentSessionId = stored
        } else {
            let newId = UUID().uuidString
            self.currentSessionId = newId
            defaults.set(newId, forKey: Self.sessionIdKey)
        }
    }

    /// applicationDidBecomeActive 시 호출.
    /// 마지막 background 진입 후 30분 초과면 새 session_id 생성.
    public func handleForeground() {
        let backgroundEnteredAt = defaults.double(forKey: Self.backgroundEnteredAtKey)
        guard backgroundEnteredAt > 0 else { return }

        let elapsed = Date().timeIntervalSince1970 - backgroundEnteredAt
        if elapsed > Self.sessionTimeoutInterval {
            let newId = UUID().uuidString
            currentSessionId = newId
            defaults.set(newId, forKey: Self.sessionIdKey)
            onSessionChanged?(newId)
        }
    }

    /// applicationDidEnterBackground 시 호출.
    /// backgroundEnteredAt 타임스탬프를 UserDefaults에 저장.
    public func handleBackground() {
        defaults.set(Date().timeIntervalSince1970, forKey: Self.backgroundEnteredAtKey)
    }
}

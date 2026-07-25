import Foundation
import Models

/// 앱스토어 리뷰 요청을 언제 띄울지 결정한다.
///
/// iOS는 `requestReview` 호출을 365일당 3회까지만 실제로 노출하고, 그마저도 표시를 보장하지 않는다.
/// 시스템 한도에 도달해 조용히 무시당하는 낭비를 막기 위해 앱에서도 같은 상한을 두고,
/// 한 번 요청한 버전에서는 다시 묻지 않는다.
public enum ReviewPromptPolicy {

    /// 요청 간 최소 간격.
    public static let minimumDaysBetweenPrompts = 90
    /// 최근 365일 내 최대 요청 횟수. iOS 시스템 한도와 동일하게 맞춘다.
    public static let maximumPromptsPerYear = 3

    /// 즐겨찾기 경로의 발동 기준. 2곳째부터 "후보를 모으는 중"으로 본다.
    public static let favoriteMilestoneThreshold = 2
    /// 비교표 경로의 발동 기준. 최소 2곳을 비교해야 비교표가 의미를 갖는다.
    public static let compareViewedThreshold = 2

    private static let secondsPerDay: TimeInterval = 24 * 60 * 60

    /// 지금 리뷰를 요청해도 되는지 판정한다.
    ///
    /// - Parameters:
    ///   - state: 저장된 요청 이력.
    ///   - appVersion: 현재 앱 버전 (`CFBundleShortVersionString`).
    ///   - now: 판정 기준 시각.
    public static func shouldPrompt(
        state: ReviewPromptState,
        appVersion: String,
        now: Date
    ) -> Bool {
        guard !appVersion.isEmpty else { return false }
        guard !state.promptedAppVersions.contains(appVersion) else { return false }

        let yearAgo = now.addingTimeInterval(-365 * secondsPerDay)
        let recentPrompts = state.promptDates.filter { $0 > yearAgo }
        guard recentPrompts.count < maximumPromptsPerYear else { return false }

        if let mostRecent = state.promptDates.max() {
            let elapsedDays = now.timeIntervalSince(mostRecent) / secondsPerDay
            guard elapsedDays >= Double(minimumDaysBetweenPrompts) else { return false }
        }

        return true
    }

    /// 행동이 발동 기준을 넘었는지 판정한다.
    ///
    /// - Parameters:
    ///   - trigger: 발동 경로.
    ///   - count: 비교 중인 유치원 수 또는 즐겨찾기 총 개수.
    public static func meetsThreshold(_ trigger: ReviewPromptTrigger, count: Int) -> Bool {
        switch trigger {
        case .compareViewed:
            return count >= compareViewedThreshold
        case .favoriteMilestone:
            return count >= favoriteMilestoneThreshold
        }
    }

    /// 요청을 기록한 뒤의 새 상태를 만든다. 365일이 지난 이력은 정리한다.
    public static func recordingPrompt(
        in state: ReviewPromptState,
        appVersion: String,
        now: Date
    ) -> ReviewPromptState {
        let yearAgo = now.addingTimeInterval(-365 * secondsPerDay)
        var next = state

        if !next.promptedAppVersions.contains(appVersion) {
            next.promptedAppVersions.append(appVersion)
        }
        next.promptDates = next.promptDates.filter { $0 > yearAgo }
        next.promptDates.append(now)

        return next
    }
}

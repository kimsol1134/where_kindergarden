import Foundation

/// 앱스토어 리뷰 요청을 유발할 수 있는 사용자 행동.
///
/// D1 재방문율이 10% 미만이므로 "설치 N일 후" 같은 시간 기반 규칙은 대상자가 거의 남지 않는다.
/// 대신 첫 세션 안에서 사용자가 앱의 가치를 실제로 경험한 순간에 요청한다.
public enum ReviewPromptTrigger: String, Codable, Sendable, CaseIterable {
    /// 비교표를 2곳 이상으로 실제 조회한 시점. 앱의 핵심 가치를 경험한 가장 강한 신호.
    case compareViewed = "compare_viewed"
    /// 즐겨찾기 2곳째를 담은 시점. 비교까지 가지 않는 사용자를 담는 보조 경로.
    case favoriteMilestone = "favorite_milestone"
}

/// 리뷰 요청 이력. `UserDefaults`에 영속화되어 과다 노출을 막는다.
public struct ReviewPromptState: Codable, Sendable, Equatable {
    /// 이미 리뷰를 요청한 앱 버전 목록. 같은 버전에서 두 번 묻지 않는다.
    public var promptedAppVersions: [String]
    /// 요청 시각 목록. 연간 횟수와 최소 간격 판정에 쓴다.
    public var promptDates: [Date]

    public init(promptedAppVersions: [String] = [], promptDates: [Date] = []) {
        self.promptedAppVersions = promptedAppVersions
        self.promptDates = promptDates
    }
}

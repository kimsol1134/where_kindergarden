import Domain
import Foundation
import Models
#if canImport(StoreKit)
import StoreKit
#endif
#if canImport(UIKit)
import UIKit
#endif

/// 앱스토어 리뷰 요청 창을 띄우는 주체. 테스트에서 대체할 수 있도록 분리한다.
@MainActor
public protocol ReviewPromptRequesting: AnyObject {
    func requestReview()
}

/// StoreKit을 통해 실제 시스템 리뷰 요청 창을 띄운다.
///
/// iOS는 이 호출을 365일당 3회까지만 실제로 노출하며 표시 여부를 알려주지 않는다.
/// 따라서 호출 성공을 "리뷰를 받았다"로 해석하면 안 되고, 계측은 트리거 도달 기준으로만 봐야 한다.
@MainActor
public final class StoreKitReviewPrompter: ReviewPromptRequesting {
    public init() {}

    public func requestReview() {
        #if canImport(StoreKit) && canImport(UIKit)
        guard let scene = UIApplication.shared.connectedScenes
            .compactMap({ $0 as? UIWindowScene })
            .first(where: { $0.activationState == .foregroundActive })
        else {
            return
        }

        AppStore.requestReview(in: scene)
        #endif
    }
}

/// 테스트 및 프리뷰용. 요청을 실제로 띄우지 않고 횟수만 기록한다.
@MainActor
public final class MockReviewPrompter: ReviewPromptRequesting {
    public private(set) var requestCount = 0

    public init() {}

    public func requestReview() {
        requestCount += 1
    }
}

/// 리뷰 요청 이력을 읽고 쓰는 저장소.
@MainActor
public protocol ReviewPromptStateStoring: AnyObject {
    func loadReviewPromptState() -> ReviewPromptState
    func saveReviewPromptState(_ state: ReviewPromptState)
}

extension NativeAppPersistence: ReviewPromptStateStoring {}

/// 발동 조건 판정 → 시스템 요청 → 이력 기록을 한 곳에서 처리한다.
///
/// 정책 판단은 `ReviewPromptPolicy`(순수 함수)에 있고, 이 타입은 상태 입출력과
/// 계측만 담당한다.
@MainActor
public final class ReviewPromptCoordinator {
    private let prompter: any ReviewPromptRequesting
    private let store: any ReviewPromptStateStoring
    private let analytics: AnalyticsTracking?
    private let appVersion: String
    private let now: () -> Date

    /// 한 세션에서 두 경로가 동시에 발동해도 한 번만 요청하도록 막는다.
    private var hasPromptedInSession = false

    public init(
        prompter: any ReviewPromptRequesting,
        store: any ReviewPromptStateStoring,
        analytics: AnalyticsTracking? = nil,
        appVersion: String = Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "",
        now: @escaping () -> Date = Date.init
    ) {
        self.prompter = prompter
        self.store = store
        self.analytics = analytics
        self.appVersion = appVersion
        self.now = now
    }

    /// 가치 경험 시점에 호출한다. 조건을 만족할 때만 실제 요청이 나간다.
    ///
    /// - Parameters:
    ///   - trigger: 발동 경로.
    ///   - count: 비교 중인 유치원 수 또는 즐겨찾기 총 개수.
    /// - Returns: 시스템 요청을 호출했으면 `true`.
    @discardableResult
    public func requestReviewIfEligible(trigger: ReviewPromptTrigger, count: Int) -> Bool {
        guard !hasPromptedInSession else { return false }
        guard ReviewPromptPolicy.meetsThreshold(trigger, count: count) else { return false }

        let currentState = store.loadReviewPromptState()
        let timestamp = now()
        guard ReviewPromptPolicy.shouldPrompt(
            state: currentState,
            appVersion: appVersion,
            now: timestamp
        ) else {
            return false
        }

        hasPromptedInSession = true
        store.saveReviewPromptState(
            ReviewPromptPolicy.recordingPrompt(
                in: currentState,
                appVersion: appVersion,
                now: timestamp
            )
        )

        analytics?.track(event: .reviewPromptTriggered, properties: [
            "trigger": .string(trigger.rawValue),
            "count": .int(count),
        ])

        prompter.requestReview()
        return true
    }
}

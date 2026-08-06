import Domain
import Foundation
import Models
import Observation
import Services

@Observable
@MainActor
public final class CompareViewModel {
    public enum ShareResult: String, Sendable, Equatable {
        case completed
        case cancelled
        case failed
        case handoffSucceeded = "handoff_succeeded"
    }

    private let compareRepo: any CompareStoring
    private let kindergartenRepo: any KindergartenProviding
    private let reviewRepo: any ReviewProviding
    private let vacancyRepo: any VacancyProviding
    private let compareUseCase: CompareUseCase
    private let analytics: AnalyticsTracking?
    private let router: AppRouter
    private let configuration: NativeAppConfiguration
    private let reviewPrompt: ReviewPromptCoordinator?

    public init(
        compareRepo: any CompareStoring,
        kindergartenRepo: any KindergartenProviding,
        reviewRepo: any ReviewProviding,
        vacancyRepo: any VacancyProviding,
        compareUseCase: CompareUseCase = CompareUseCase(),
        analytics: AnalyticsTracking? = nil,
        router: AppRouter,
        configuration: NativeAppConfiguration,
        reviewPrompt: ReviewPromptCoordinator? = nil
    ) {
        self.compareRepo = compareRepo
        self.kindergartenRepo = kindergartenRepo
        self.reviewRepo = reviewRepo
        self.vacancyRepo = vacancyRepo
        self.compareUseCase = compareUseCase
        self.analytics = analytics
        self.router = router
        self.configuration = configuration
        self.reviewPrompt = reviewPrompt
    }

    // MARK: - Computed Properties

    public var comparedKindergartens: [Kindergarten] {
        let lookup = Dictionary(
            uniqueKeysWithValues: kindergartenRepo.kindergartens.map { ($0.kindercode, $0) }
        )
        return compareRepo.selection.ids.compactMap { id in
            lookup[id].map { Kindergarten(raw: $0, distance: -1) }
        }
    }

    public var scores: [Int] {
        compareUseCase.calculateScores(for: comparedKindergartens)
    }

    public var winnerSummary: String? {
        compareUseCase.winnerSummary(items: comparedKindergartens, scores: scores)
    }

    public func navigateToSearch() { router.activeTab = .search }

    // MARK: - Actions

    public func removeKindergarten(_ kindergarten: Kindergarten) {
        guard let index = compareRepo.selection.ids.firstIndex(of: kindergarten.kindercode) else { return }
        remove(at: index)
    }

    public func remove(at index: Int) {
        let ids = compareRepo.selection.ids
        guard ids.indices.contains(index) else { return }
        let id = ids[index]
        compareRepo.remove(at: index)
        analytics?.track(event: .comparisonRemoved, properties: [
            "kindergarten_id": .string(id),
            "kindercode": .string(id),
            "source": .string("compare"),
            "compare_count": .int(compareRepo.selection.ids.count),
        ])
    }

    public func shareURL() -> URL? {
        compareUseCase.shareURL(ids: compareRepo.selection.ids, baseURL: configuration.compareShareBaseURL)
    }

    public func trackCompareViewed() {
        let count = comparedKindergartens.count
        guard count >= 2 else { return }
        analytics?.track(event: .compareViewed, properties: [
            "compare_count": .int(count),
        ])

        // 2곳 이상을 실제로 비교한 시점이 이 앱의 핵심 가치를 경험한 가장 강한 신호다.
        // D1 재방문이 10% 미만이라 다음 세션을 기다릴 수 없으므로 여기서 요청한다.
        reviewPrompt?.requestReviewIfEligible(trigger: .compareViewed, count: count)
    }

    public func shareKakao(names: [String]) -> URL? {
        _ = names
        guard let url = shareURL() else { return nil }
        trackShareInitiated(method: "kakao")
        return url
    }

    public func shareSystem() -> URL? {
        guard let url = shareURL() else { return nil }
        trackSystemShareInitiated()
        return url
    }

    public func trackSystemShareInitiated() {
        trackShareInitiated(method: "system")
    }

    public func trackShareResult(method: String, result: ShareResult) {
        let properties: AnalyticsProperties = [
            "method": .string(method),
            "compare_count": .int(comparedKindergartens.count),
            "result": .string(result.rawValue),
            "measurement_version": .string("completion_v2_2026-08-06"),
        ]
        analytics?.track(event: .compareShareResult, properties: properties)

        // 기존 대시보드와의 연결을 유지하되, 성공으로 판단할 수 있는 결과에만 기록한다.
        if result == .completed || result == .handoffSucceeded {
            analytics?.track(event: .compareShared, properties: properties)
        }
    }

    private func trackShareInitiated(method: String) {
        analytics?.track(event: .compareShareInitiated, properties: [
            "method": .string(method),
            "compare_count": .int(comparedKindergartens.count),
            "measurement_version": .string("completion_v2_2026-08-06"),
        ])
    }

    public func reviews(for kindercode: String) -> [ReviewLink] {
        reviewRepo.reviews(for: kindercode)
    }

    public func vacancyCount(for kindercode: String) -> Int {
        vacancyRepo.vacancyCount(for: kindercode)
    }
}

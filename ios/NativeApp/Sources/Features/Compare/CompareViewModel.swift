import Domain
import Foundation
import Models
import Observation
import Services

@Observable
@MainActor
public final class CompareViewModel {
    private let compareRepo: any CompareStoring
    private let kindergartenRepo: any KindergartenProviding
    private let reviewRepo: any ReviewProviding
    private let vacancyRepo: any VacancyProviding
    private let compareUseCase: CompareUseCase
    private let analytics: AnalyticsTracking?
    private let router: AppRouter
    private let configuration: NativeAppConfiguration

    public init(
        compareRepo: any CompareStoring,
        kindergartenRepo: any KindergartenProviding,
        reviewRepo: any ReviewProviding,
        vacancyRepo: any VacancyProviding,
        compareUseCase: CompareUseCase = CompareUseCase(),
        analytics: AnalyticsTracking? = nil,
        router: AppRouter,
        configuration: NativeAppConfiguration
    ) {
        self.compareRepo = compareRepo
        self.kindergartenRepo = kindergartenRepo
        self.reviewRepo = reviewRepo
        self.vacancyRepo = vacancyRepo
        self.compareUseCase = compareUseCase
        self.analytics = analytics
        self.router = router
        self.configuration = configuration
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
        analytics?.track(event: .compareViewed, properties: [
            "compare_count": .int(comparedKindergartens.count),
        ])
    }

    public func shareKakao(names: [String]) -> URL? {
        guard let url = shareURL() else { return nil }
        analytics?.track(event: .compareShared, properties: [
            "method": .string("kakao"),
            "compare_count": .int(comparedKindergartens.count),
            "result": .string("initiated"),
        ])
        return url
    }

    public func shareSystem() -> URL? {
        guard let url = shareURL() else { return nil }
        trackSystemShareInitiated()
        return url
    }

    public func trackSystemShareInitiated() {
        analytics?.track(event: .compareShared, properties: [
            "method": .string("system"),
            "compare_count": .int(comparedKindergartens.count),
            "result": .string("initiated"),
        ])
    }

    public func reviews(for kindercode: String) -> [ReviewLink] {
        reviewRepo.reviews(for: kindercode)
    }

    public func vacancyCount(for kindercode: String) -> Int {
        vacancyRepo.vacancyCount(for: kindercode)
    }
}

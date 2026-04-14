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

    // MARK: - Actions

    public func remove(at index: Int) {
        let ids = compareRepo.selection.ids
        guard ids.indices.contains(index) else { return }
        let id = ids[index]
        compareRepo.remove(at: index)
        analytics?.track(event: .compareToggled, properties: ["kindercode": id, "selected": "false"])
    }

    public func shareURL() -> URL? {
        compareUseCase.shareURL(ids: compareRepo.selection.ids, baseURL: configuration.compareShareBaseURL)
    }

    public func reviews(for kindercode: String) -> [ReviewLink] {
        reviewRepo.reviews(for: kindercode)
    }

    public func vacancyCount(for kindercode: String) -> Int {
        vacancyRepo.vacancyCount(for: kindercode)
    }
}

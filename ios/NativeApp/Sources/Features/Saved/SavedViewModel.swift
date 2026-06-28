import Domain
import Foundation
import Models
import Observation
import Services
import SwiftUI

@Observable
@MainActor
public final class SavedViewModel {
    private let favoriteRepo: any FavoriteStoring
    private let recentSearchRepo: any RecentSearchStoring
    private let kindergartenRepo: any KindergartenProviding
    private let compareRepo: any CompareStoring
    private let reviewRepo: any ReviewProviding
    private let vacancyRepo: (any VacancyProviding)?
    private let analytics: AnalyticsTracking?
    private let router: AppRouter

    // Undo state (local to this ViewModel)
    public var favoriteUndoItems: [IndexedFavoriteItem]?
    public var recentSearchUndoItems: [IndexedRecentSearch]?

    public init(
        favoriteRepo: any FavoriteStoring,
        recentSearchRepo: any RecentSearchStoring,
        kindergartenRepo: any KindergartenProviding,
        compareRepo: any CompareStoring,
        reviewRepo: any ReviewProviding,
        vacancyRepo: (any VacancyProviding)? = nil,
        analytics: AnalyticsTracking? = nil,
        router: AppRouter
    ) {
        self.favoriteRepo = favoriteRepo
        self.recentSearchRepo = recentSearchRepo
        self.kindergartenRepo = kindergartenRepo
        self.compareRepo = compareRepo
        self.reviewRepo = reviewRepo
        self.vacancyRepo = vacancyRepo
        self.analytics = analytics
        self.router = router
    }

    // MARK: - Exposed Repo/Router State

    public var favorites: [FavoriteItem] { favoriteRepo.favorites }
    public var recentSearches: [RecentSearch] { recentSearchRepo.recentSearches }
    public var toast: CompareToast? { router.toast }

    public func dismissToast() { router.dismissToast() }
    public func navigateToSearch() { router.activeTab = .search }

    public func isCompared(_ kindergarten: Kindergarten) -> Bool {
        compareRepo.contains(kindergarten.kindercode)
    }

    public func reviews(for kindercode: String) -> [ReviewLink] {
        reviewRepo.reviews(for: kindercode)
    }

    // MARK: - Detail Sheet

    func makeDetailSheet(for kindergarten: Kindergarten) -> KindergartenDetailSheet {
        KindergartenDetailSheet(
            kindergarten: kindergarten,
            reviews: reviewRepo.reviews(for: kindergarten.kindercode),
            reviewsVersion: reviewRepo.reviewsData?.version,
            vacancySummary: vacancyRepo?.vacancy(for: kindergarten.kindercode),
            vacancyDatasetVersion: vacancyRepo?.vacancyData?.version,
            isVacancyLoading: vacancyRepo?.isLoading ?? false,
            vacancyError: vacancyRepo?.error,
            isCompared: compareRepo.contains(kindergarten.kindercode),
            isFavorite: favoriteRepo.isFavorite(kindergarten.kindercode),
            compareCount: compareRepo.selection.ids.count,
            fitReasons: [],
            onToggleCompare: { [weak self] in self?.toggleCompare(for: kindergarten) },
            onToggleFavorite: { [weak self] in self?.toggleFavorite(for: kindergarten) },
            onNavigateToCompare: { [weak self] in self?.navigateFromDetailToCompare() }
        )
    }

    // MARK: - Computed Properties

    public var favoriteKindergartens: [Kindergarten] {
        let lookup = Dictionary(
            uniqueKeysWithValues: kindergartenRepo.kindergartens.map { ($0.kindercode, $0) }
        )
        return favoriteRepo.favorites.compactMap { item in
            lookup[item.kindercode].map { Kindergarten(raw: $0, distance: -1) }
        }
    }

    private func navigateFromDetailToCompare() {
        router.activeTab = .compare
    }

    // MARK: - Favorite Actions

    public func deleteFavorite(atOffsets offsets: IndexSet) {
        let removed = favoriteRepo.delete(atOffsets: offsets)
        guard !removed.isEmpty else { return }
        favoriteUndoItems = removed
    }

    public func undoFavoriteDelete() {
        guard let items = favoriteUndoItems else { return }
        favoriteRepo.restore(items)
        favoriteUndoItems = nil
    }

    public func toggleFavorite(for kindergarten: Kindergarten) {
        let wasFavorite = favoriteRepo.isFavorite(kindergarten.kindercode)
        favoriteRepo.toggle(for: kindergarten)

        let properties: AnalyticsProperties = [
            "kindergarten_id": .string(kindergarten.kindercode),
            "kindercode": .string(kindergarten.kindercode),
            "source": .string("saved"),
            "favorite_count": .int(favoriteRepo.favorites.count),
        ]
        if wasFavorite {
            analytics?.track(event: .favoriteRemoved, properties: properties)
        } else {
            analytics?.track(event: .favoriteAdded, properties: properties)
        }
    }

    // MARK: - Compare Actions

    public func toggleCompare(for kindergarten: Kindergarten) {
        let result = compareRepo.toggle(id: kindergarten.kindercode)
        switch result {
        case .added:
            analytics?.track(event: .comparisonAdded, properties: [
                "kindergarten_id": .string(kindergarten.kindercode),
                "kindercode": .string(kindergarten.kindercode),
                "source": .string("saved"),
                "compare_count": .int(compareRepo.selection.ids.count),
            ])
            router.showToast(.success("비교에 담았어요"))
        case .removed:
            analytics?.track(event: .comparisonRemoved, properties: [
                "kindergarten_id": .string(kindergarten.kindercode),
                "kindercode": .string(kindergarten.kindercode),
                "source": .string("saved"),
                "compare_count": .int(compareRepo.selection.ids.count),
            ])
            router.showToast(.success("비교에서 뺐어요"))
        case .limitReached:
            router.showToast(.warning("비교는 최대 3곳까지 가능해요"))
        }
    }

    public func takeFavorite(kindercode: String) -> IndexedFavoriteItem? {
        guard let index = favoriteRepo.favorites.firstIndex(where: { $0.kindercode == kindercode }) else {
            return nil
        }
        return favoriteRepo.delete(atOffsets: IndexSet(integer: index)).first
    }

    public func restoreFavorites(_ items: [IndexedFavoriteItem]) {
        favoriteRepo.restore(items)
    }

    public func restoreRecentSearches(_ items: [IndexedRecentSearch]) {
        recentSearchRepo.restore(items)
    }

    public func takeRecentSearch(_ search: RecentSearch) -> IndexedRecentSearch? {
        guard let index = recentSearchRepo.recentSearches.firstIndex(where: {
            $0.id == search.id || ($0.label == search.label && $0.coordinates == search.coordinates)
        }) else {
            return nil
        }
        return recentSearchRepo.delete(atOffsets: IndexSet(integer: index)).first
    }

    public func takeAllRecentSearches() -> [IndexedRecentSearch] {
        recentSearchRepo.deleteAll()
    }

    // MARK: - Recent Search Actions

    public func deleteRecentSearch(_ search: RecentSearch) {
        guard let index = recentSearchRepo.recentSearches.firstIndex(where: {
            $0.id == search.id || ($0.label == search.label && $0.coordinates == search.coordinates)
        }) else { return }
        let removed = recentSearchRepo.delete(atOffsets: IndexSet(integer: index))
        guard !removed.isEmpty else { return }
        recentSearchUndoItems = removed
    }

    public func restoreRecentSearch(_ search: RecentSearch) {
        guard let items = recentSearchUndoItems else { return }
        recentSearchRepo.restore(items)
        recentSearchUndoItems = nil
    }
}

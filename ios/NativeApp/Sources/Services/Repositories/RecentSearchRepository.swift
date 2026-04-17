import Foundation
import Observation
import Models
import Domain

@Observable
@MainActor
public final class RecentSearchRepository: RecentSearchStoring, @unchecked Sendable {
    public private(set) var recentSearches: [RecentSearch]
    private let persistence: NativeAppPersistence

    public init(persistence: NativeAppPersistence) {
        self.recentSearches = persistence.restore().recentSearches
        self.persistence = persistence
    }

    public func record(_ search: RecentSearch) {
        recentSearches.removeAll {
            $0.id == search.id || ($0.label == search.label && $0.coordinates == search.coordinates)
        }
        recentSearches.insert(search, at: 0)
        persistence.saveRecentSearches(recentSearches)
    }

    public func delete(atOffsets offsets: IndexSet) -> [IndexedRecentSearch] {
        let removals = offsets.sorted().compactMap { offset -> IndexedRecentSearch? in
            guard recentSearches.indices.contains(offset) else { return nil }
            return IndexedRecentSearch(value: recentSearches[offset], index: offset)
        }

        guard !removals.isEmpty else { return [] }

        for offset in offsets.sorted(by: >) where recentSearches.indices.contains(offset) {
            recentSearches.remove(at: offset)
        }
        persistence.saveRecentSearches(recentSearches)
        return removals
    }

    public func deleteAll() -> [IndexedRecentSearch] {
        delete(atOffsets: IndexSet(recentSearches.indices))
    }

    public func restore(_ items: [IndexedRecentSearch]) {
        guard !items.isEmpty else { return }

        for item in items.sorted(by: { $0.index < $1.index }) {
            recentSearches.removeAll {
                $0.id == item.value.id || ($0.label == item.value.label && $0.coordinates == item.value.coordinates)
            }
            recentSearches.insert(item.value, at: min(item.index, recentSearches.count))
        }
        persistence.saveRecentSearches(recentSearches)
    }
}

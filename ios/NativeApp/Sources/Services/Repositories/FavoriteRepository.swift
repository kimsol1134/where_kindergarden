import Foundation
import Observation
import Models
import Domain

@Observable
@MainActor
public final class FavoriteRepository: FavoriteStoring, @unchecked Sendable {
    public private(set) var favorites: [FavoriteItem]
    private let persistence: NativeAppPersistence

    public init(persistence: NativeAppPersistence) {
        self.favorites = persistence.restore().favorites
        self.persistence = persistence
    }

    public func toggle(for kindergarten: Kindergarten) {
        if let index = favorites.firstIndex(where: { $0.kindercode == kindergarten.kindercode }) {
            favorites.remove(at: index)
        } else {
            favorites.insert(
                FavoriteItem(
                    kindercode: kindergarten.kindercode,
                    name: kindergarten.name,
                    address: kindergarten.address,
                    type: kindergarten.type
                ),
                at: 0
            )
        }
        persistence.saveFavorites(favorites)
    }

    public func isFavorite(_ kindercode: String) -> Bool {
        favorites.contains { $0.kindercode == kindercode }
    }

    public func delete(atOffsets offsets: IndexSet) -> [IndexedFavoriteItem] {
        let removals = offsets.sorted().compactMap { offset -> IndexedFavoriteItem? in
            guard favorites.indices.contains(offset) else { return nil }
            return IndexedFavoriteItem(value: favorites[offset], index: offset)
        }
        for offset in offsets.sorted(by: >) where favorites.indices.contains(offset) {
            favorites.remove(at: offset)
        }
        persistence.saveFavorites(favorites)
        return removals
    }

    public func restore(_ items: [IndexedFavoriteItem]) {
        for item in items.sorted(by: { $0.index < $1.index }) {
            favorites.removeAll { $0.kindercode == item.value.kindercode }
            favorites.insert(item.value, at: min(item.index, favorites.count))
        }
        persistence.saveFavorites(favorites)
    }
}

import Foundation
import Models

public protocol FavoriteStoring: AnyObject, Sendable {
    var favorites: [FavoriteItem] { get }
    func toggle(for kindergarten: Kindergarten)
    func isFavorite(_ kindercode: String) -> Bool
    func delete(atOffsets: IndexSet) -> [IndexedFavoriteItem]
    func restore(_ items: [IndexedFavoriteItem])
}

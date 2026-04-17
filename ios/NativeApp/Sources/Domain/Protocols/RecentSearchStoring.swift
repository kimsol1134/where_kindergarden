import Foundation
import Models

public protocol RecentSearchStoring: AnyObject, Sendable {
    var recentSearches: [RecentSearch] { get }
    func record(_ search: RecentSearch)
    func delete(atOffsets: IndexSet) -> [IndexedRecentSearch]
    func deleteAll() -> [IndexedRecentSearch]
    func restore(_ items: [IndexedRecentSearch])
}

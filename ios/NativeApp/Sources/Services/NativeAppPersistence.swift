import Foundation
import Models

@MainActor
public protocol NativeAppDataStoring: AnyObject {
    func data(forKey defaultName: String) -> Data?
    func set(_ value: Any?, forKey defaultName: String)
}

extension UserDefaults: NativeAppDataStoring {}

@MainActor
public final class InMemoryNativeAppStore: NativeAppDataStoring {
    private var storage: [String: Data] = [:]

    public init() {}

    public func data(forKey defaultName: String) -> Data? {
        storage[defaultName]
    }

    public func set(_ value: Any?, forKey defaultName: String) {
        storage[defaultName] = value as? Data
    }
}

public enum NativeAppStorageKey: String, CaseIterable, Sendable {
    case favorites = "native.favorites"
    case recentSearches = "native.recentSearches"
    case compareSelection = "native.compareSelection"
    case hasLaunched = "native.hasLaunched"
    case reviewPromptState = "native.reviewPromptState"
}

@MainActor
public struct CodableStoredValue<Value: Codable> {
    private let key: NativeAppStorageKey
    private let store: NativeAppDataStoring
    private let encoder = JSONEncoder()
    private let decoder = JSONDecoder()

    public init(key: NativeAppStorageKey, store: NativeAppDataStoring) {
        self.key = key
        self.store = store
    }

    public func load(defaultValue: Value) -> Value {
        guard let data = store.data(forKey: key.rawValue) else {
            return defaultValue
        }

        return (try? decoder.decode(Value.self, from: data)) ?? defaultValue
    }

    public func save(_ value: Value) {
        let encoded = try? encoder.encode(value)
        store.set(encoded, forKey: key.rawValue)
    }
}

public struct PersistedNativeState: Sendable {
    public let favorites: [FavoriteItem]
    public let recentSearches: [RecentSearch]
    public let compareSelection: CompareSelection

    public init(
        favorites: [FavoriteItem] = [],
        recentSearches: [RecentSearch] = [],
        compareSelection: CompareSelection = CompareSelection()
    ) {
        self.favorites = favorites
        self.recentSearches = recentSearches
        self.compareSelection = compareSelection
    }
}

@MainActor
public final class NativeAppPersistence {
    private let favoritesStore: CodableStoredValue<[FavoriteItem]>
    private let recentSearchesStore: CodableStoredValue<[RecentSearch]>
    private let compareSelectionStore: CodableStoredValue<CompareSelection>
    private let hasLaunchedStore: CodableStoredValue<Bool>
    private let reviewPromptStore: CodableStoredValue<ReviewPromptState>

    public init(store: NativeAppDataStoring = UserDefaults.standard) {
        favoritesStore = CodableStoredValue(key: .favorites, store: store)
        recentSearchesStore = CodableStoredValue(key: .recentSearches, store: store)
        compareSelectionStore = CodableStoredValue(key: .compareSelection, store: store)
        hasLaunchedStore = CodableStoredValue(key: .hasLaunched, store: store)
        reviewPromptStore = CodableStoredValue(key: .reviewPromptState, store: store)
    }

    public func restore() -> PersistedNativeState {
        PersistedNativeState(
            favorites: favoritesStore.load(defaultValue: []),
            recentSearches: recentSearchesStore.load(defaultValue: []),
            compareSelection: compareSelectionStore.load(defaultValue: CompareSelection())
        )
    }

    public func saveFavorites(_ favorites: [FavoriteItem]) {
        favoritesStore.save(favorites)
    }

    public func saveRecentSearches(_ searches: [RecentSearch]) {
        recentSearchesStore.save(searches)
    }

    public func saveCompareSelection(_ selection: CompareSelection) {
        compareSelectionStore.save(selection)
    }

    public func hasLaunched() -> Bool {
        hasLaunchedStore.load(defaultValue: false)
    }

    public func markAsLaunched() {
        hasLaunchedStore.save(true)
    }

    public func loadReviewPromptState() -> ReviewPromptState {
        reviewPromptStore.load(defaultValue: ReviewPromptState())
    }

    public func saveReviewPromptState(_ state: ReviewPromptState) {
        reviewPromptStore.save(state)
    }
}

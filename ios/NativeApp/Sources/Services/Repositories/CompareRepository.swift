import Foundation
import Observation
import Models
import Domain

@Observable
@MainActor
public final class CompareRepository: CompareStoring, @unchecked Sendable {
    public private(set) var selection: CompareSelection
    private let persistence: NativeAppPersistence

    public init(persistence: NativeAppPersistence) {
        self.selection = persistence.restore().compareSelection
        self.persistence = persistence
    }

    public func toggle(id: String) -> CompareToggleResult {
        if selection.contains(id) {
            selection.toggle(id: id)
            persistence.saveCompareSelection(selection)
            return .removed
        }
        guard selection.ids.count < CompareSelection.limit else {
            return .limitReached
        }
        selection.toggle(id: id)
        persistence.saveCompareSelection(selection)
        return .added
    }

    public func remove(at index: Int) {
        guard selection.ids.indices.contains(index) else { return }
        selection.remove(at: index)
        persistence.saveCompareSelection(selection)
    }

    public func replace(with newSelection: CompareSelection) {
        selection = newSelection
        persistence.saveCompareSelection(selection)
    }

    public func contains(_ kindercode: String) -> Bool {
        selection.contains(kindercode)
    }

    public func order(for kindercode: String) -> Int? {
        selection.ids.firstIndex(of: kindercode).map { $0 + 1 }
    }
}

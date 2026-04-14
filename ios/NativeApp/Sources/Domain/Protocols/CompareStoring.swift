import Models

public protocol CompareStoring: AnyObject, Sendable {
    var selection: CompareSelection { get }
    func toggle(id: String) -> CompareToggleResult
    func remove(at index: Int)
    func replace(with selection: CompareSelection)
    func contains(_ kindercode: String) -> Bool
    func order(for kindercode: String) -> Int?
}

public enum CompareToggleResult: Equatable {
    case added
    case removed
    case limitReached
}

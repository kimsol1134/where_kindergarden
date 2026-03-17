import Foundation

public enum SearchSuggestionKind: String, Hashable, Sendable {
    case recent
    case kindergarten
    case address
    case place
}

public struct SearchSuggestion: Identifiable, Hashable, Sendable {
    public let id: String
    public let kind: SearchSuggestionKind
    public let title: String
    public let subtitle: String?
    public let coordinates: Coordinates
    public let kindercode: String?

    public init(
        id: String,
        kind: SearchSuggestionKind,
        title: String,
        subtitle: String?,
        coordinates: Coordinates,
        kindercode: String? = nil
    ) {
        self.id = id
        self.kind = kind
        self.title = title
        self.subtitle = subtitle
        self.coordinates = coordinates
        self.kindercode = kindercode
    }
}

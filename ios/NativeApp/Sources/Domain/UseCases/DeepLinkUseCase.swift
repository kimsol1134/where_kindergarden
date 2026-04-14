import Foundation
import Models

public struct DeepLinkUseCase: Sendable {
    private let parser: DeepLinkParser

    public init(parser: DeepLinkParser = DeepLinkParser()) {
        self.parser = parser
    }

    public func resolve(_ url: URL) -> DeepLinkDestination? {
        parser.destination(for: url)
    }
}

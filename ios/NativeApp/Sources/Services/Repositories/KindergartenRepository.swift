import Foundation
import Observation
import Models
import Domain

@Observable
@MainActor
public final class KindergartenRepository: KindergartenProviding, @unchecked Sendable {
    public private(set) var kindergartens: [KindergartenRaw] = []
    public private(set) var isLoading = false
    public private(set) var error: String?

    /// kindercode → KindergartenRaw fast lookup
    public private(set) var lookup: [String: KindergartenRaw] = [:]

    private let decoder: JSONDecoder
    private let loader: @Sendable () throws -> Data

    public init(
        decoder: JSONDecoder = JSONDecoder(),
        loader: @escaping @Sendable () throws -> Data
    ) {
        self.decoder = decoder
        self.loader = loader
    }

    public func load() async {
        guard !isLoading else { return }
        isLoading = true
        error = nil
        defer { isLoading = false }

        do {
            let data = try loader()
            let decoded = try decoder.decode([KindergartenRaw].self, from: data)
            kindergartens = decoded
            lookup = Dictionary(uniqueKeysWithValues: decoded.map { ($0.kindercode, $0) })
        } catch {
            self.error = error.localizedDescription
            kindergartens = []
            lookup = [:]
        }
    }
}

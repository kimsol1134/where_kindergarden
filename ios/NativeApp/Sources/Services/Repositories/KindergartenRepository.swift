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
    private let remoteLoader: (@Sendable () async throws -> Data)?
    private let localLoader: @Sendable () throws -> Data

    public init(
        decoder: JSONDecoder = JSONDecoder(),
        remoteLoader: (@Sendable () async throws -> Data)? = nil,
        localLoader: @escaping @Sendable () throws -> Data
    ) {
        self.decoder = decoder
        self.remoteLoader = remoteLoader
        self.localLoader = localLoader
    }

    /// Backward-compatible initializer for previews and tests that only need
    /// a bundled or in-memory catalog.
    public convenience init(
        decoder: JSONDecoder = JSONDecoder(),
        loader: @escaping @Sendable () throws -> Data
    ) {
        self.init(decoder: decoder, localLoader: loader)
    }

    public func load() async {
        guard !isLoading else { return }
        isLoading = true
        error = nil
        defer { isLoading = false }

        do {
            if let remoteLoader {
                do {
                    let remoteData = try await remoteLoader()
                    let decoded = try decodeValidated(remoteData)
                    replaceCatalog(with: decoded)
                    return
                } catch {
                    // Remote fetch is best-effort. The bundled catalog keeps
                    // search available offline and during a bad deployment.
                }
            }

            let localData = try localLoader()
            let decoded = try decodeValidated(localData)
            replaceCatalog(with: decoded)
        } catch {
            self.error = error.localizedDescription
            kindergartens = []
            lookup = [:]
        }
    }

    private func decodeValidated(_ data: Data) throws -> [KindergartenRaw] {
        let decoded = try decoder.decode([KindergartenRaw].self, from: data)
        guard !decoded.isEmpty else {
            throw KindergartenRepositoryError.emptyCatalog
        }

        let identifiers = Set(decoded.map(\.kindercode))
        guard identifiers.count == decoded.count else {
            throw KindergartenRepositoryError.duplicateIdentifiers
        }

        return decoded
    }

    private func replaceCatalog(with decoded: [KindergartenRaw]) {
        kindergartens = decoded
        lookup = Dictionary(uniqueKeysWithValues: decoded.map { ($0.kindercode, $0) })
    }
}

private enum KindergartenRepositoryError: LocalizedError {
    case emptyCatalog
    case duplicateIdentifiers

    var errorDescription: String? {
        switch self {
        case .emptyCatalog:
            return "유치원 데이터가 비어 있습니다."
        case .duplicateIdentifiers:
            return "유치원 데이터에 중복 식별자가 있습니다."
        }
    }
}

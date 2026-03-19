import Foundation
import Models

public struct VacancyRepository {
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

    public func load() async throws -> VacancyDataset {
        if let remoteLoader {
            do {
                let remoteData = try await remoteLoader()
                return try decoder.decode(VacancyDataset.self, from: remoteData)
            } catch {
                // Remote fetch is best-effort. Local bundled data is the fallback contract.
            }
        }

        let localData = try localLoader()
        return try decoder.decode(VacancyDataset.self, from: localData)
    }
}

public extension VacancyRepository {
    static let empty = VacancyRepository(
        localLoader: {
            try JSONEncoder().encode(VacancyDataset.empty)
        }
    )
}

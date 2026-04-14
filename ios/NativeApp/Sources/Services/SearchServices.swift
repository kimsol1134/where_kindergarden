import Foundation
import Models

public struct KindergartenJSONRepository {
    private let loader: @Sendable () async throws -> Data
    private let decoder: JSONDecoder

    public init(
        decoder: JSONDecoder = JSONDecoder(),
        loader: @escaping @Sendable () async throws -> Data
    ) {
        self.decoder = decoder
        self.loader = loader
    }

    public func load() async throws -> [KindergartenRaw] {
        try decoder.decode([KindergartenRaw].self, from: try await loader())
    }
}

public struct ReviewRepository {
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

    public func load() async throws -> ReviewsData {
        if let remoteLoader {
            do {
                let remoteData = try await remoteLoader()
                return try decoder.decode(ReviewsData.self, from: remoteData)
            } catch {
                // Remote fetch is best-effort. Local bundled data is the fallback contract.
            }
        }

        let localData = try localLoader()
        return try decoder.decode(ReviewsData.self, from: localData)
    }
}

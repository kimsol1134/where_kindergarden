import Foundation
import Observation
import Models
import Domain

@Observable
@MainActor
public final class VacancyRepository: VacancyProviding, @unchecked Sendable {
    public private(set) var vacancyData: VacancyDataset?
    public private(set) var isLoading = false
    public private(set) var error: String?

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

    public func vacancy(for kindercode: String) -> VacancySummary? {
        vacancyData?.items[kindercode]
    }

    public func vacancyCount(for kindercode: String) -> Int {
        vacancyData?.items[kindercode]?.vacancyCount ?? 0
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
                    vacancyData = try decoder.decode(VacancyDataset.self, from: remoteData)
                    return
                } catch {
                    // Remote fetch is best-effort. Local bundled data is the fallback contract.
                }
            }

            let localData = try localLoader()
            vacancyData = try decoder.decode(VacancyDataset.self, from: localData)
        } catch {
            self.error = error.localizedDescription
            vacancyData = nil
        }
    }
}

public extension VacancyRepository {
    @MainActor
    static let empty = VacancyRepository(
        localLoader: {
            try JSONEncoder().encode(VacancyDataset.empty)
        }
    )
}

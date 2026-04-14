import Foundation
import Observation
import Models
import Domain

@Observable
@MainActor
public final class ReviewRepository: ReviewProviding, @unchecked Sendable {
    public private(set) var reviewsData: ReviewsData?
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

    public func reviews(for kindercode: String) -> [ReviewLink] {
        reviewsData?.reviews[kindercode] ?? []
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
                    reviewsData = try decoder.decode(ReviewsData.self, from: remoteData)
                    return
                } catch {
                    // Remote fetch is best-effort. Local bundled data is the fallback contract.
                }
            }

            let localData = try localLoader()
            reviewsData = try decoder.decode(ReviewsData.self, from: localData)
        } catch {
            self.error = error.localizedDescription
            reviewsData = nil
        }
    }
}

import Foundation

public struct NativeAppConfiguration: Sendable {
    public let kakaoAppKey: String?
    public let reviewsRemoteURL: URL
    public let compareShareBaseURL: URL
    public let kindergartensResourceName: String
    public let reviewsResourceName: String

    public init(
        kakaoAppKey: String?,
        reviewsRemoteURL: URL = URL(string: "https://where-kindergarden.vercel.app/data/reviews.json")!,
        compareShareBaseURL: URL = URL(string: "https://where-kindergarden.vercel.app/compare")!,
        kindergartensResourceName: String = "kindergartens",
        reviewsResourceName: String = "reviews"
    ) {
        self.kakaoAppKey = Self.normalizedValue(kakaoAppKey)
        self.reviewsRemoteURL = reviewsRemoteURL
        self.compareShareBaseURL = compareShareBaseURL
        self.kindergartensResourceName = kindergartensResourceName
        self.reviewsResourceName = reviewsResourceName
    }

    public static func live(bundle: Bundle = .main) -> NativeAppConfiguration {
        NativeAppConfiguration(
            kakaoAppKey: bundle.object(forInfoDictionaryKey: "KAKAO_NATIVE_APP_KEY") as? String
        )
    }

    private static func normalizedValue(_ rawValue: String?) -> String? {
        guard let rawValue else { return nil }
        let trimmed = rawValue.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty, !trimmed.hasPrefix("$(") else { return nil }
        return trimmed
    }
}

public enum NativeAppDataError: LocalizedError, Equatable {
    case missingBundledResource(String)
    case invalidHTTPStatus(Int)

    public var errorDescription: String? {
        switch self {
        case let .missingBundledResource(resource):
            return "앱 번들에서 \(resource).json 파일을 찾을 수 없습니다."
        case let .invalidHTTPStatus(statusCode):
            return "원격 데이터 응답이 유효하지 않습니다. (\(statusCode))"
        }
    }
}

public struct BundledJSONResourceLoader: Sendable {
    public let bundle: Bundle

    public init(bundle: Bundle = .main) {
        self.bundle = bundle
    }

    public func data(named resourceName: String) throws -> Data {
        guard let url = bundle.url(forResource: resourceName, withExtension: "json") else {
            throw NativeAppDataError.missingBundledResource(resourceName)
        }
        return try Data(contentsOf: url)
    }
}

public struct RemoteJSONLoader: Sendable {
    public let session: URLSession

    public init(session: URLSession = .shared) {
        self.session = session
    }

    public func data(from url: URL) async throws -> Data {
        var request = URLRequest(url: url)
        request.cachePolicy = .reloadIgnoringLocalCacheData
        request.timeoutInterval = 5

        let (data, response) = try await session.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse else {
            return data
        }
        guard (200 ... 299).contains(httpResponse.statusCode) else {
            throw NativeAppDataError.invalidHTTPStatus(httpResponse.statusCode)
        }
        return data
    }
}

import Foundation

public struct NativeAppConfiguration: Sendable {
    public static let kakaoKeysConfigRelativePath = "ios/WhereKindergartenNative/Config/KakaoKeys.local.xcconfig"
    public static let kakaoNativeAppKeyBuildSetting = "WK_KAKAO_NATIVE_APP_KEY"
    public static let kakaoRESTAPIKeyBuildSetting = "WK_KAKAO_REST_API_KEY"

    public static let defaultReviewsRemoteURL = URL(string: "https://where-kindergarden.vercel.app/data/reviews.json")!
    public static let defaultVacancyRemoteURL = URL(string: "https://where-kindergarden.vercel.app/data/vacancy.json")!
    public static let defaultCompareShareBaseURL = URL(string: "https://where-kindergarden.vercel.app/compare")!

    public let kakaoAppKey: String?
    public let kakaoRESTAPIKey: String?
    public let adMobBannerUnitID: String
    public let reviewsRemoteURL: URL
    public let vacancyRemoteURL: URL
    public let compareShareBaseURL: URL
    public let kindergartensResourceName: String
    public let reviewsResourceName: String
    public let vacancyResourceName: String

    public init(
        kakaoAppKey: String?,
        kakaoRESTAPIKey: String? = nil,
        adMobBannerUnitID: String = "ca-app-pub-5648788643644962/5397823299",
        reviewsRemoteURL: URL = NativeAppConfiguration.defaultReviewsRemoteURL,
        vacancyRemoteURL: URL = NativeAppConfiguration.defaultVacancyRemoteURL,
        compareShareBaseURL: URL = NativeAppConfiguration.defaultCompareShareBaseURL,
        kindergartensResourceName: String = "kindergartens",
        reviewsResourceName: String = "reviews",
        vacancyResourceName: String = "vacancy"
    ) {
        self.kakaoAppKey = Self.normalizedValue(kakaoAppKey)
        self.kakaoRESTAPIKey = Self.normalizedValue(kakaoRESTAPIKey)
        self.adMobBannerUnitID = adMobBannerUnitID
        self.reviewsRemoteURL = reviewsRemoteURL
        self.vacancyRemoteURL = vacancyRemoteURL
        self.compareShareBaseURL = compareShareBaseURL
        self.kindergartensResourceName = kindergartensResourceName
        self.reviewsResourceName = reviewsResourceName
        self.vacancyResourceName = vacancyResourceName
    }

    public static func live(bundle: Bundle = .main) -> NativeAppConfiguration {
        NativeAppConfiguration(
            kakaoAppKey: bundle.object(forInfoDictionaryKey: "KAKAO_NATIVE_APP_KEY") as? String,
            kakaoRESTAPIKey: bundle.object(forInfoDictionaryKey: "KAKAO_REST_API_KEY") as? String
        )
    }

    public var hasKakaoMapKey: Bool {
        kakaoAppKey != nil
    }

    public var hasKakaoRESTAPIKey: Bool {
        kakaoRESTAPIKey != nil
    }

    public var missingKakaoBuildSettings: [String] {
        var missing: [String] = []

        if kakaoAppKey == nil {
            missing.append(Self.kakaoNativeAppKeyBuildSetting)
        }

        if kakaoRESTAPIKey == nil {
            missing.append(Self.kakaoRESTAPIKeyBuildSetting)
        }

        return missing
    }

    public var kakaoConfigurationHelpText: String {
        let missingKeys = missingKakaoBuildSettings.joined(separator: ", ")
        return "\(Self.kakaoKeysConfigRelativePath)에서 \(missingKeys) 값을 채우면 실지도와 원격 장소/주소 제안을 검증할 수 있습니다."
    }

    public var universalLinkHost: String? {
        compareShareBaseURL.host
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

import Foundation

public enum KakaoConfigurationSource: String, Sendable {
    case worktreeLocal = "worktree-local"
    case sharedGlobal = "shared-global"
    case buildSettings = "build-settings"

    public var description: String {
        switch self {
        case .worktreeLocal:
            return "현재 worktree 로컬 설정"
        case .sharedGlobal:
            return "공용 로컬 설정"
        case .buildSettings:
            return "빌드 설정"
        }
    }
}

public struct NativeAppConfiguration: Sendable {
    public static let kakaoKeysConfigRelativePath = "ios/WhereKindergartenNative/Config/KakaoKeys.local.xcconfig"
    public static let sharedKakaoKeysConfigPath = "~/.config/where-kindergarten/KakaoKeys.local.xcconfig"
    public static let kakaoNativeAppKeyBuildSetting = "WK_KAKAO_NATIVE_APP_KEY"
    public static let kakaoRESTAPIKeyBuildSetting = "WK_KAKAO_REST_API_KEY"
    public static let kakaoConfigSourceInfoKey = "KAKAO_CONFIG_SOURCE"

    public static let defaultKindergartensRemoteURL = URL(string: "https://where-kindergarden.vercel.app/data/kindergartens.json")!
    public static let defaultReviewsRemoteURL = URL(string: "https://where-kindergarden.vercel.app/data/reviews.json")!
    public static let defaultVacancyRemoteURL = URL(string: "https://where-kindergarden.vercel.app/data/vacancy.json")!
    public static let defaultCompareShareBaseURL = URL(string: "https://where-kindergarden.vercel.app/compare")!
    public static let defaultShareImageURL = URL(string: "https://where-kindergarden.vercel.app/og-image.png")!
    public static let shareDescription = "교육비, 교사 비율, 시설 등 한눈에 비교해봤어요!"

    public let kakaoAppKey: String?
    public let kakaoRESTAPIKey: String?
    public let kakaoConfigurationSource: KakaoConfigurationSource?
    public let mixpanelToken: String?
    public let kindergartensRemoteURL: URL
    public let reviewsRemoteURL: URL
    public let vacancyRemoteURL: URL
    public let compareShareBaseURL: URL
    public let kindergartensResourceName: String
    public let reviewsResourceName: String
    public let vacancyResourceName: String

    public init(
        kakaoAppKey: String?,
        kakaoRESTAPIKey: String? = nil,
        kakaoConfigurationSource: String? = nil,
        mixpanelToken: String? = nil,
        kindergartensRemoteURL: URL = NativeAppConfiguration.defaultKindergartensRemoteURL,
        reviewsRemoteURL: URL = NativeAppConfiguration.defaultReviewsRemoteURL,
        vacancyRemoteURL: URL = NativeAppConfiguration.defaultVacancyRemoteURL,
        compareShareBaseURL: URL = NativeAppConfiguration.defaultCompareShareBaseURL,
        kindergartensResourceName: String = "kindergartens",
        reviewsResourceName: String = "reviews",
        vacancyResourceName: String = "vacancy"
    ) {
        self.kakaoAppKey = Self.normalizedValue(kakaoAppKey)
        self.kakaoRESTAPIKey = Self.normalizedValue(kakaoRESTAPIKey)
        self.kakaoConfigurationSource = Self.normalizedValue(kakaoConfigurationSource)
            .flatMap(KakaoConfigurationSource.init(rawValue:))
        self.mixpanelToken = Self.normalizedValue(mixpanelToken)
        self.kindergartensRemoteURL = kindergartensRemoteURL
        self.reviewsRemoteURL = reviewsRemoteURL
        self.vacancyRemoteURL = vacancyRemoteURL
        self.compareShareBaseURL = compareShareBaseURL
        self.kindergartensResourceName = kindergartensResourceName
        self.reviewsResourceName = reviewsResourceName
        self.vacancyResourceName = vacancyResourceName
    }

    public static func live(bundle: Bundle = .main) -> NativeAppConfiguration {
        return NativeAppConfiguration(
            kakaoAppKey: bundle.object(forInfoDictionaryKey: "KAKAO_NATIVE_APP_KEY") as? String,
            kakaoRESTAPIKey: bundle.object(forInfoDictionaryKey: "KAKAO_REST_API_KEY") as? String,
            kakaoConfigurationSource: bundle.object(forInfoDictionaryKey: Self.kakaoConfigSourceInfoKey) as? String,
            mixpanelToken: bundle.object(forInfoDictionaryKey: "MIXPANEL_TOKEN") as? String
        )
    }

    public var hasKakaoMapKey: Bool {
        kakaoAppKey != nil
    }

    public var hasKakaoRESTAPIKey: Bool {
        kakaoRESTAPIKey != nil
    }

    public var kakaoConfigurationSourceDescription: String {
        kakaoConfigurationSource?.description ?? "미설정"
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
        return "\(Self.kakaoKeysConfigRelativePath) 또는 \(Self.sharedKakaoKeysConfigPath)에서 \(missingKeys) 값을 채우면 실지도와 원격 장소/주소 제안을 검증할 수 있습니다."
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

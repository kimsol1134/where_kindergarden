import Foundation
import Models

public enum KakaoLocalSearchError: LocalizedError, Equatable {
    case missingAPIKey
    case invalidRequest
    case invalidHTTPStatus(Int)

    public var errorDescription: String? {
        switch self {
        case .missingAPIKey:
            return "\(NativeAppConfiguration.kakaoKeysConfigRelativePath)에서 \(NativeAppConfiguration.kakaoRESTAPIKeyBuildSetting) 값을 채워야 주소와 장소 제안을 불러올 수 있습니다."
        case .invalidRequest:
            return "Kakao Local 요청을 생성하지 못했습니다."
        case let .invalidHTTPStatus(statusCode):
            return "Kakao Local 응답이 유효하지 않습니다. (\(statusCode))"
        }
    }
}

public struct KakaoLocalSearchMeta: Decodable, Equatable, Sendable {
    public let totalCount: Int
    public let pageableCount: Int?
    public let isEnd: Bool?

    enum CodingKeys: String, CodingKey {
        case totalCount = "total_count"
        case pageableCount = "pageable_count"
        case isEnd = "is_end"
    }
}

public struct KakaoAddressRegion: Decodable, Equatable, Sendable {
    public let addressName: String
    public let region1DepthName: String
    public let region2DepthName: String
    public let region3DepthName: String
    public let hCode: String?
    public let bCode: String?

    enum CodingKeys: String, CodingKey {
        case addressName = "address_name"
        case region1DepthName = "region_1depth_name"
        case region2DepthName = "region_2depth_name"
        case region3DepthName = "region_3depth_name"
        case hCode = "h_code"
        case bCode = "b_code"
    }
}

public struct KakaoRoadAddress: Decodable, Equatable, Sendable {
    public let addressName: String
    public let roadName: String
    public let region1DepthName: String
    public let region2DepthName: String
    public let region3DepthName: String

    enum CodingKeys: String, CodingKey {
        case addressName = "address_name"
        case roadName = "road_name"
        case region1DepthName = "region_1depth_name"
        case region2DepthName = "region_2depth_name"
        case region3DepthName = "region_3depth_name"
    }
}

public struct KakaoAddressDocument: Decodable, Equatable, Sendable {
    public let addressName: String
    public let x: String
    public let y: String
    public let address: KakaoAddressRegion?
    public let roadAddress: KakaoRoadAddress?

    public var coordinates: Coordinates? {
        guard let latitude = Double(y), let longitude = Double(x) else {
            return nil
        }
        return Coordinates(lat: latitude, lng: longitude)
    }

    enum CodingKeys: String, CodingKey {
        case addressName = "address_name"
        case x
        case y
        case address
        case roadAddress = "road_address"
    }
}

public struct KakaoAddressSearchResponse: Decodable, Equatable, Sendable {
    public let documents: [KakaoAddressDocument]
    public let meta: KakaoLocalSearchMeta
}

public struct KakaoKeywordSameName: Decodable, Equatable, Sendable {
    public let keyword: String
    public let selectedRegion: String
    public let region: [String]

    enum CodingKeys: String, CodingKey {
        case keyword
        case selectedRegion = "selected_region"
        case region
    }
}

public struct KakaoKeywordSearchMeta: Decodable, Equatable, Sendable {
    public let totalCount: Int
    public let pageableCount: Int
    public let isEnd: Bool
    public let sameName: KakaoKeywordSameName

    enum CodingKeys: String, CodingKey {
        case totalCount = "total_count"
        case pageableCount = "pageable_count"
        case isEnd = "is_end"
        case sameName = "same_name"
    }
}

public struct KakaoKeywordDocument: Decodable, Equatable, Sendable {
    public let id: String
    public let placeName: String
    public let categoryName: String
    public let categoryGroupCode: String
    public let categoryGroupName: String
    public let phone: String
    public let addressName: String
    public let roadAddressName: String
    public let x: String
    public let y: String
    public let placeURL: String
    public let distance: String

    public var coordinates: Coordinates? {
        guard let latitude = Double(y), let longitude = Double(x) else {
            return nil
        }
        return Coordinates(lat: latitude, lng: longitude)
    }

    enum CodingKeys: String, CodingKey {
        case id
        case placeName = "place_name"
        case categoryName = "category_name"
        case categoryGroupCode = "category_group_code"
        case categoryGroupName = "category_group_name"
        case phone
        case addressName = "address_name"
        case roadAddressName = "road_address_name"
        case x
        case y
        case placeURL = "place_url"
        case distance
    }
}

public struct KakaoKeywordSearchResponse: Decodable, Equatable, Sendable {
    public let documents: [KakaoKeywordDocument]
    public let meta: KakaoKeywordSearchMeta
}

public struct KakaoAddressSearchRequest: Equatable, Sendable {
    public let query: String
    public let page: Int
    public let size: Int

    public init(query: String, page: Int = 1, size: Int = 5) {
        self.query = query
        self.page = page
        self.size = size
    }

    public func makeURLRequest(baseURL: URL, apiKey: String) throws -> URLRequest {
        try buildKakaoLocalURLRequest(
            baseURL: baseURL,
            path: "/v2/local/search/address.json",
            queryItems: [
                URLQueryItem(name: "query", value: query),
                URLQueryItem(name: "page", value: String(page)),
                URLQueryItem(name: "size", value: String(size)),
            ],
            apiKey: apiKey
        )
    }
}

public struct KakaoKeywordSearchRequest: Equatable, Sendable {
    public let query: String
    public let page: Int
    public let size: Int
    public let origin: Coordinates?
    public let radiusMeters: Int?

    public init(
        query: String,
        page: Int = 1,
        size: Int = 5,
        origin: Coordinates? = nil,
        radiusMeters: Int? = nil
    ) {
        self.query = query
        self.page = page
        self.size = size
        self.origin = origin
        self.radiusMeters = radiusMeters
    }

    public func makeURLRequest(baseURL: URL, apiKey: String) throws -> URLRequest {
        var queryItems = [
            URLQueryItem(name: "query", value: query),
            URLQueryItem(name: "page", value: String(page)),
            URLQueryItem(name: "size", value: String(size)),
        ]

        if let origin {
            queryItems.append(URLQueryItem(name: "x", value: String(origin.lng)))
            queryItems.append(URLQueryItem(name: "y", value: String(origin.lat)))
        }

        if let radiusMeters {
            queryItems.append(URLQueryItem(name: "radius", value: String(radiusMeters)))
        }

        return try buildKakaoLocalURLRequest(
            baseURL: baseURL,
            path: "/v2/local/search/keyword.json",
            queryItems: queryItems,
            apiKey: apiKey
        )
    }
}

private func buildKakaoLocalURLRequest(
    baseURL: URL,
    path: String,
    queryItems: [URLQueryItem],
    apiKey: String
) throws -> URLRequest {
    guard var components = URLComponents(
        url: baseURL.appending(path: path),
        resolvingAgainstBaseURL: false
    ) else {
        throw KakaoLocalSearchError.invalidRequest
    }

    components.queryItems = queryItems

    guard let url = components.url else {
        throw KakaoLocalSearchError.invalidRequest
    }

    var request = URLRequest(url: url)
    request.timeoutInterval = 5
    request.setValue("KakaoAK \(apiKey)", forHTTPHeaderField: "Authorization")
    return request
}

public protocol KakaoLocalSearching: Sendable {
    var isConfigured: Bool { get }
    func addressSearch(_ request: KakaoAddressSearchRequest) async throws -> KakaoAddressSearchResponse
    func keywordSearch(_ request: KakaoKeywordSearchRequest) async throws -> KakaoKeywordSearchResponse
}

public struct KakaoLocalAPIClient: KakaoLocalSearching {
    public let isConfigured: Bool

    private let apiKey: String?
    private let session: URLSession
    private let baseURL: URL
    private let decoder: JSONDecoder

    public init(
        apiKey: String?,
        session: URLSession = .shared,
        baseURL: URL = URL(string: "https://dapi.kakao.com")!,
        decoder: JSONDecoder = JSONDecoder()
    ) {
        self.apiKey = apiKey?.trimmingCharacters(in: .whitespacesAndNewlines)
        self.session = session
        self.baseURL = baseURL
        self.decoder = decoder
        self.isConfigured = !(self.apiKey?.isEmpty ?? true)
    }

    public func addressSearch(_ request: KakaoAddressSearchRequest) async throws -> KakaoAddressSearchResponse {
        let urlRequest = try request.makeURLRequest(baseURL: baseURL, apiKey: try resolvedAPIKey())
        return try await execute(urlRequest)
    }

    public func keywordSearch(_ request: KakaoKeywordSearchRequest) async throws -> KakaoKeywordSearchResponse {
        let urlRequest = try request.makeURLRequest(baseURL: baseURL, apiKey: try resolvedAPIKey())
        return try await execute(urlRequest)
    }

    private func resolvedAPIKey() throws -> String {
        guard let apiKey, !apiKey.isEmpty else {
            throw KakaoLocalSearchError.missingAPIKey
        }
        return apiKey
    }

    private func execute<Response: Decodable>(_ request: URLRequest) async throws -> Response {
        let (data, response) = try await session.data(for: request)

        if let httpResponse = response as? HTTPURLResponse,
           !(200 ... 299).contains(httpResponse.statusCode) {
            throw KakaoLocalSearchError.invalidHTTPStatus(httpResponse.statusCode)
        }

        return try decoder.decode(Response.self, from: data)
    }
}

public struct RemoteLocationSearchResult: Equatable, Sendable {
    public let suggestions: [SearchSuggestion]
    public let message: String?

    public init(suggestions: [SearchSuggestion], message: String? = nil) {
        self.suggestions = suggestions
        self.message = message
    }
}

public protocol RemoteLocationSuggesting: Sendable {
    var isConfigured: Bool { get }
    var unavailableMessage: String { get }
    func suggestions(for query: String, near origin: Coordinates?) async -> RemoteLocationSearchResult
}

public struct KakaoLocalSuggestionService: RemoteLocationSuggesting {
    public let unavailableMessage: String

    private let client: any KakaoLocalSearching

    public var isConfigured: Bool {
        client.isConfigured
    }

    public init(
        client: any KakaoLocalSearching,
        unavailableMessage: String = "\(NativeAppConfiguration.kakaoKeysConfigRelativePath)에서 \(NativeAppConfiguration.kakaoRESTAPIKeyBuildSetting) 값을 채우기 전까지 주소와 장소 제안은 비활성화됩니다. 유치원명과 최근 검색은 계속 사용할 수 있습니다."
    ) {
        self.client = client
        self.unavailableMessage = unavailableMessage
    }

    public func suggestions(for query: String, near origin: Coordinates?) async -> RemoteLocationSearchResult {
        let trimmedQuery = query.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmedQuery.isEmpty else {
            return RemoteLocationSearchResult(suggestions: [])
        }

        guard client.isConfigured else {
            return RemoteLocationSearchResult(suggestions: [], message: unavailableMessage)
        }

        async let addressFetch = fetchAddressSuggestions(for: trimmedQuery)
        async let placeFetch = fetchPlaceSuggestions(for: trimmedQuery, near: origin)

        let (addressResult, placeResult) = await (addressFetch, placeFetch)
        let mergedSuggestions = deduplicated(addressResult.suggestions + placeResult.suggestions)

        if addressResult.didSucceed || placeResult.didSucceed {
            return RemoteLocationSearchResult(suggestions: mergedSuggestions)
        }

        return RemoteLocationSearchResult(
            suggestions: [],
            message: "주소와 장소 제안을 불러오지 못했습니다. 유치원명 검색과 최근 검색은 계속 사용할 수 있습니다."
        )
    }

    private static func makeAddressSuggestion(from document: KakaoAddressDocument) -> SearchSuggestion? {
        guard let coordinates = document.coordinates else {
            return nil
        }

        let title = document.roadAddress?.addressName ?? document.addressName
        let subtitle: String?
        if let roadAddress = document.roadAddress?.addressName, roadAddress != document.addressName {
            subtitle = document.addressName
        } else {
            subtitle = document.address?.addressName
        }

        return SearchSuggestion(
            id: "address:\(title):\(coordinates.lat):\(coordinates.lng)",
            kind: .address,
            title: title,
            subtitle: subtitle,
            coordinates: coordinates
        )
    }

    private static func makePlaceSuggestion(from document: KakaoKeywordDocument) -> SearchSuggestion? {
        guard let coordinates = document.coordinates else {
            return nil
        }

        let preferredAddress = document.roadAddressName.isEmpty ? document.addressName : document.roadAddressName
        let detailParts = [preferredAddress, document.categoryGroupName]
            .filter { !$0.isEmpty }
        let subtitle = detailParts.isEmpty ? nil : detailParts.joined(separator: " · ")

        return SearchSuggestion(
            id: "place:\(document.id)",
            kind: .place,
            title: document.placeName,
            subtitle: subtitle,
            coordinates: coordinates
        )
    }

    private func deduplicated(_ suggestions: [SearchSuggestion]) -> [SearchSuggestion] {
        var seen = Set<String>()
        var unique: [SearchSuggestion] = []

        for suggestion in suggestions {
            let key = "\(suggestion.kind.rawValue)|\(suggestion.title)|\(suggestion.coordinates.lat)|\(suggestion.coordinates.lng)"
            if seen.contains(key) {
                continue
            }

            seen.insert(key)
            unique.append(suggestion)
        }

        return unique
    }

    private func fetchAddressSuggestions(for query: String) async -> (suggestions: [SearchSuggestion], didSucceed: Bool) {
        do {
            let response = try await client.addressSearch(KakaoAddressSearchRequest(query: query))
            return (response.documents.compactMap(Self.makeAddressSuggestion), true)
        } catch {
            return ([], false)
        }
    }

    private func fetchPlaceSuggestions(
        for query: String,
        near origin: Coordinates?
    ) async -> (suggestions: [SearchSuggestion], didSucceed: Bool) {
        do {
            let response = try await client.keywordSearch(
                KakaoKeywordSearchRequest(
                    query: query,
                    origin: origin,
                    radiusMeters: 20_000
                )
            )
            return (response.documents.compactMap(Self.makePlaceSuggestion), true)
        } catch {
            return ([], false)
        }
    }
}

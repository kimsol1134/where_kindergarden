import Foundation
import Models

public struct SearchUseCase: Sendable {
    private static let searchLocale = Locale(identifier: "ko_KR")

    private let searchEngine: KindergartenSearchEngine
    private let distanceCalculator: DistanceCalculator

    public init(
        searchEngine: KindergartenSearchEngine = KindergartenSearchEngine(),
        distanceCalculator: DistanceCalculator = DistanceCalculator()
    ) {
        self.searchEngine = searchEngine
        self.distanceCalculator = distanceCalculator
    }

    /// 카탈로그에서 필터 + 위치 + 쿼리 기반으로 결과를 검색
    public func search(
        catalog: [KindergartenRaw],
        location: Coordinates,
        filters: SearchFilters,
        query: String
    ) -> [Kindergarten] {
        searchEngine.search(raws: catalog, location: location, filters: filters, query: query)
    }

    /// 로컬 유치원명/주소 자동완성 제안
    public func localSuggestions(
        query: String,
        catalog: [KindergartenRaw],
        userLocation: Coordinates,
        limit: Int = 6
    ) -> [SearchSuggestion] {
        let normalizedQuery = normalizedSearchText(query)

        let rankedMatches = catalog.compactMap { raw -> (priority: Int, distance: Double, raw: KindergartenRaw)? in
            let normalizedName = normalizedSearchText(raw.name)
            let normalizedAddress = normalizedSearchText(raw.address)

            let priority: Int?
            if normalizedName == normalizedQuery {
                priority = 0
            } else if normalizedName.hasPrefix(normalizedQuery) {
                priority = 1
            } else if normalizedName.localizedCaseInsensitiveContains(normalizedQuery) {
                priority = 2
            } else if normalizedAddress.localizedCaseInsensitiveContains(normalizedQuery) {
                priority = 3
            } else {
                priority = nil
            }

            guard let priority else {
                return nil
            }

            let distance = distanceCalculator.kilometers(
                from: userLocation,
                to: Coordinates(lat: raw.lat, lng: raw.lng)
            )

            return (priority, distance, raw)
        }

        return rankedMatches
            .sorted { lhs, rhs in
                if lhs.priority != rhs.priority {
                    return lhs.priority < rhs.priority
                }

                if lhs.distance != rhs.distance {
                    return lhs.distance < rhs.distance
                }

                return lhs.raw.name.localizedCompare(rhs.raw.name) == .orderedAscending
            }
            .prefix(limit)
            .map { match in
                SearchSuggestion(
                    id: "kindergarten:\(match.raw.kindercode)",
                    kind: .kindergarten,
                    title: match.raw.name,
                    subtitle: match.raw.address,
                    coordinates: Coordinates(lat: match.raw.lat, lng: match.raw.lng),
                    kindercode: match.raw.kindercode
                )
            }
    }

    /// 검색 결과가 비어있을 때 반경 자동 확장
    public func expandedRadiusIfNeeded(
        currentRadius: Double,
        results: [Kindergarten]
    ) -> Double? {
        guard results.isEmpty, currentRadius < 5 else { return nil }
        let candidates: [Double] = [2, 5]
        return candidates.first { $0 > currentRadius }
    }

    /// KindergartenRaw -> Kindergarten 변환 (거리 계산 포함)
    public func makeKindergarten(
        from raw: KindergartenRaw,
        relativeTo location: Coordinates
    ) -> Kindergarten {
        searchEngine.makeKindergartens(raws: [raw], relativeTo: location).first
            ?? Kindergarten(raw: raw, distance: -1)
    }

    // MARK: - Private

    private func normalizedSearchText(_ text: String) -> String {
        text.trimmingCharacters(in: .whitespacesAndNewlines)
            .folding(options: [.diacriticInsensitive, .caseInsensitive], locale: Self.searchLocale)
    }
}

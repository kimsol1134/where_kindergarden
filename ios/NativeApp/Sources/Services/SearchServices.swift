import Foundation
import Models

public struct DistanceCalculator {
    public init() {}

    public func kilometers(from start: Coordinates, to end: Coordinates) -> Double {
        let earthRadius = 6_371.0
        let dLat = (end.lat - start.lat) * .pi / 180
        let dLng = (end.lng - start.lng) * .pi / 180
        let startLat = start.lat * .pi / 180
        let endLat = end.lat * .pi / 180

        let a = sin(dLat / 2) * sin(dLat / 2)
            + sin(dLng / 2) * sin(dLng / 2) * cos(startLat) * cos(endLat)
        let c = 2 * atan2(sqrt(a), sqrt(1 - a))
        return earthRadius * c
    }
}

public struct KindergartenSearchEngine {
    private let distanceCalculator: DistanceCalculator

    public init(distanceCalculator: DistanceCalculator = DistanceCalculator()) {
        self.distanceCalculator = distanceCalculator
    }

    public func search(
        raws: [KindergartenRaw],
        location: Coordinates,
        filters: SearchFilters
    ) -> [Kindergarten] {
        let visible = raws.compactMap { raw -> Kindergarten? in
            let distance = distanceCalculator.kilometers(from: location, to: Coordinates(lat: raw.lat, lng: raw.lng))
            guard distance <= filters.radiusKM else { return nil }
            return Kindergarten(raw: raw, distance: (distance * 100).rounded() / 100)
        }

        return sort(
            filter(kindergartens: visible, filters: filters),
            by: filters.sort
        )
    }

    public func makeKindergartens(raws: [KindergartenRaw], relativeTo location: Coordinates?) -> [Kindergarten] {
        raws.map { raw in
            let distance = location.map {
                let kilometers = distanceCalculator.kilometers(from: $0, to: Coordinates(lat: raw.lat, lng: raw.lng))
                return (kilometers * 100).rounded() / 100
            } ?? -1
            return Kindergarten(raw: raw, distance: distance)
        }
    }

    private func filter(kindergartens: [Kindergarten], filters: SearchFilters) -> [Kindergarten] {
        kindergartens.filter { kindergarten in
            if filters.type != .all && kindergarten.type.rawValue != filters.type.rawValue {
                return false
            }
            if let hasBus = filters.hasBus, kindergarten.hasBus != hasBus {
                return false
            }
            if let hasVacancy = filters.hasVacancy,
               hasVacancy,
               kindergarten.currentCount >= kindergarten.capacity {
                return false
            }
            if let hasAfterSchool = filters.hasAfterSchool,
               kindergarten.hasAfterSchool != hasAfterSchool {
                return false
            }
            if let hasIndoorPlayground = filters.hasIndoorPlayground,
               hasIndoorPlayground,
               kindergarten.indoorPlaygroundArea <= 0 {
                return false
            }
            if let hasLargeSpace = filters.hasLargeSpace,
               hasLargeSpace,
               kindergarten.areaPerChild < 5 {
                return false
            }
            if let hasModernBuilding = filters.hasModernBuilding,
               hasModernBuilding,
               (kindergarten.buildingYear ?? 0) < 2010 {
                return false
            }
            return true
        }
    }

    private func sort(_ kindergartens: [Kindergarten], by option: SortOption) -> [Kindergarten] {
        kindergartens.sorted { lhs, rhs in
            switch option {
            case .distance:
                return lhs.distance < rhs.distance
            case .capacity:
                return lhs.capacity > rhs.capacity
            case .areaPerChild:
                return lhs.areaPerChild > rhs.areaPerChild
            }
        }
    }
}

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

public struct DeepLinkParser {
    public init() {}

    public func destination(for url: URL) -> DeepLinkDestination? {
        let components = URLComponents(url: url, resolvingAgainstBaseURL: false)
        let ids = components?.queryItems?
            .first(where: { $0.name == "ids" })?
            .value?
            .split(separator: ",")
            .map(String.init)
            .filter { !$0.isEmpty } ?? []

        if url.host == "compare" || url.path == "/compare" {
            return .compare(ids: ids)
        }

        if url.host == "search" || url.path == "/search" {
            let query = components?.queryItems?.first(where: { $0.name == "q" })?.value
            return .search(query: query)
        }

        return nil
    }
}

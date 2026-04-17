import Foundation
import Models

public struct KindergartenSearchEngine: Sendable {
    private let distanceCalculator: DistanceCalculator

    public init(distanceCalculator: DistanceCalculator = DistanceCalculator()) {
        self.distanceCalculator = distanceCalculator
    }

    public func search(
        raws: [KindergartenRaw],
        location: Coordinates?,
        filters: SearchFilters,
        query: String? = nil
    ) -> [Kindergarten] {
        let visible = raws.compactMap { raw -> Kindergarten? in
            let distance = location.map {
                distanceCalculator.kilometers(from: $0, to: Coordinates(lat: raw.lat, lng: raw.lng))
            }

            if let distance, distance > filters.radiusKM {
                return nil
            }

            let roundedDistance = distance.map { ($0 * 100).rounded() / 100 } ?? -1
            return Kindergarten(raw: raw, distance: roundedDistance)
        }

        return sort(
            filter(kindergartens: filter(kindergartens: visible, query: query), filters: filters),
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

    public func filter(kindergartens: [Kindergarten], query: String?) -> [Kindergarten] {
        let trimmedQuery = query?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        guard !trimmedQuery.isEmpty else {
            return kindergartens
        }

        return kindergartens.filter { kindergarten in
            kindergarten.name.localizedCaseInsensitiveContains(trimmedQuery)
                || kindergarten.address.localizedCaseInsensitiveContains(trimmedQuery)
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
        if option == .distance, kindergartens.contains(where: { $0.distance < 0 }) {
            return kindergartens
        }

        return kindergartens.sorted { lhs, rhs in
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

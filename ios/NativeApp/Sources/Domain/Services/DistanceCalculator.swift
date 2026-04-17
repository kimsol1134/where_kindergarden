import Foundation
import Models

public struct DistanceCalculator: Sendable {
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

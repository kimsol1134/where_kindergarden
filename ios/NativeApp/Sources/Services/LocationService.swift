import CoreLocation
import Foundation
import Models

public enum LocationServiceError: LocalizedError, Equatable {
    case servicesDisabled
    case authorizationDenied
    case unavailable
    case unknown

    public var errorDescription: String? {
        switch self {
        case .servicesDisabled:
            return "위치 서비스를 켜면 가까운 유치원을 더 쉽게 찾을 수 있어요."
        case .authorizationDenied:
            return "위치 권한이 꺼져 있어요. 주소나 기관 이름으로도 찾을 수 있어요."
        case .unavailable:
            return "현재 위치를 다시 확인해 주세요."
        case .unknown:
            return "위치를 불러오지 못했어요. 잠시 후 다시 시도해 주세요."
        }
    }
}

public protocol CurrentLocationProviding: AnyObject {
    func requestCurrentLocation() async throws -> Coordinates
}

public final class CurrentLocationService: NSObject, CurrentLocationProviding {
    private let manager: CLLocationManager
    private var continuation: CheckedContinuation<Coordinates, Error>?

    public init(manager: CLLocationManager = CLLocationManager()) {
        self.manager = manager
        super.init()
        self.manager.desiredAccuracy = kCLLocationAccuracyBest
        self.manager.delegate = self
    }

    public func requestCurrentLocation() async throws -> Coordinates {
        guard CLLocationManager.locationServicesEnabled() else {
            throw LocationServiceError.servicesDisabled
        }

        if continuation != nil {
            throw LocationServiceError.unknown
        }

        return try await withCheckedThrowingContinuation { continuation in
            self.continuation = continuation
            handleAuthorization(status: manager.authorizationStatus)
        }
    }

    private func handleAuthorization(status: CLAuthorizationStatus) {
        switch status {
        case .authorizedAlways, .authorizedWhenInUse:
            manager.requestLocation()
        case .notDetermined:
            manager.requestWhenInUseAuthorization()
        case .restricted, .denied:
            finish(with: .failure(LocationServiceError.authorizationDenied))
        @unknown default:
            finish(with: .failure(LocationServiceError.unknown))
        }
    }

    private func finish(with result: Result<Coordinates, Error>) {
        guard let continuation else { return }
        self.continuation = nil

        switch result {
        case let .success(coordinates):
            continuation.resume(returning: coordinates)
        case let .failure(error):
            continuation.resume(throwing: error)
        }
    }
}

extension CurrentLocationService: CLLocationManagerDelegate {
    public func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        handleAuthorization(status: manager.authorizationStatus)
    }

    public func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let location = locations.first else {
            finish(with: .failure(LocationServiceError.unavailable))
            return
        }

        finish(with: .success(Coordinates(lat: location.coordinate.latitude, lng: location.coordinate.longitude)))
    }

    public func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        finish(with: .failure(error))
    }
}

public final class PreviewLocationProvider: CurrentLocationProviding {
    private let coordinates: Coordinates

    public init(coordinates: Coordinates) {
        self.coordinates = coordinates
    }

    public func requestCurrentLocation() async throws -> Coordinates {
        coordinates
    }
}

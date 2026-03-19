import AppTrackingTransparency
import Foundation

public enum TrackingTransparencyService {
    public static func requestIfNeeded() async -> ATTrackingManager.AuthorizationStatus {
        let currentStatus = ATTrackingManager.trackingAuthorizationStatus
        guard currentStatus == .notDetermined else {
            return currentStatus
        }

        return await ATTrackingManager.requestTrackingAuthorization()
    }
}

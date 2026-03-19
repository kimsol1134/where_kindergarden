#if canImport(GoogleMobileAds)
import Foundation
import GoogleMobileAds

public enum AdMobService {
    public static func configure() {
        MobileAds.shared.start()
    }
}
#endif

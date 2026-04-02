#if canImport(GoogleMobileAds)
import Foundation
import GoogleMobileAds

public enum AdMobService {
    public static func configure() {
        let config = MobileAds.shared.requestConfiguration
        config.tagForChildDirectedTreatment = false
        config.tagForUnderAgeOfConsent = false
        MobileAds.shared.start()
    }
}
#endif

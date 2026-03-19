#if canImport(GoogleMobileAds)
import GoogleMobileAds
import SwiftUI
import UIKit

public struct NativeAdBanner: View {
    private let adUnitID: String

    public init(adUnitID: String) {
        self.adUnitID = adUnitID
    }

    public var body: some View {
        AdBannerRepresentable(adUnitID: adUnitID)
            .frame(height: 50)
            .frame(maxWidth: .infinity)
    }
}

private struct AdBannerRepresentable: UIViewRepresentable {
    let adUnitID: String

    func makeUIView(context: Context) -> BannerView {
        let bannerView = BannerView()
        bannerView.adUnitID = adUnitID

        if let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
           let rootVC = windowScene.windows.first?.rootViewController {
            bannerView.rootViewController = rootVC
            let width = windowScene.screen.bounds.width
            bannerView.adSize = currentOrientationAnchoredAdaptiveBanner(width: width)
        }

        bannerView.load(Request())
        return bannerView
    }

    func updateUIView(_ uiView: BannerView, context: Context) {}
}
#endif

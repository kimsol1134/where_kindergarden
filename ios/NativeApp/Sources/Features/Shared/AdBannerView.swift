#if canImport(GoogleMobileAds)
import GoogleMobileAds
import SwiftUI
import UIKit

public struct NativeAdBanner: View {
    private let adUnitID: String
    @State private var adLoaded = false
    @State private var adHeight: CGFloat = 0

    public init(adUnitID: String) {
        self.adUnitID = adUnitID
    }

    public var body: some View {
        AdBannerRepresentable(adUnitID: adUnitID, adLoaded: $adLoaded, adHeight: $adHeight)
            .frame(height: adLoaded ? adHeight : 0)
            .frame(maxWidth: .infinity)
            .clipped()
            .animation(.easeInOut(duration: 0.25), value: adLoaded)
    }
}

private struct AdBannerRepresentable: UIViewRepresentable {
    let adUnitID: String
    @Binding var adLoaded: Bool
    @Binding var adHeight: CGFloat

    func makeCoordinator() -> Coordinator {
        Coordinator(adLoaded: $adLoaded, adHeight: $adHeight)
    }

    func makeUIView(context: Context) -> BannerView {
        let bannerView = BannerView()
        bannerView.adUnitID = adUnitID
        bannerView.delegate = context.coordinator

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

    final class Coordinator: NSObject, BannerViewDelegate {
        @Binding var adLoaded: Bool
        @Binding var adHeight: CGFloat

        init(adLoaded: Binding<Bool>, adHeight: Binding<CGFloat>) {
            _adLoaded = adLoaded
            _adHeight = adHeight
        }

        func bannerViewDidReceiveAd(_ bannerView: BannerView) {
            adHeight = bannerView.adSize.size.height
            adLoaded = true
        }

        func bannerView(_ bannerView: BannerView, didFailToReceiveAdWithError error: Error) {
            adLoaded = false
        }
    }
}
#endif

import Features
import Models
import Services
import SwiftUI

public struct NativeRootView: View {
    @StateObject private var model: NativeAppModel
    @State private var showSplash = true
    @State private var showOnboarding = false
    @AppStorage("native.hasSeenOnboarding") private var hasSeenOnboarding = false

    public init(model: NativeAppModel) {
        _model = StateObject(wrappedValue: model)
    }

    @MainActor public init() {
        _model = StateObject(wrappedValue: .live())
    }

    public var body: some View {
        ZStack {
            mistWhite
                .ignoresSafeArea()

            TabView(selection: $model.selectedTab) {
                SearchHomeView(model: model)
                    .tabItem {
                        Label("탐색", systemImage: "magnifyingglass")
                    }
                    .tag(NativeTab.search)

                CompareView(model: model)
                    .tabItem {
                        Label("비교", systemImage: "square.split.2x2")
                    }
                    .tag(NativeTab.compare)

                SavedView(model: model)
                    .tabItem {
                        Label("찜한곳", systemImage: "heart")
                    }
                    .tag(NativeTab.saved)

                MoreView(model: model)
                    .tabItem {
                        Label("더보기", systemImage: "ellipsis.circle")
                    }
                    .tag(NativeTab.more)
            }
        }
        .task {
            async let services: Void = initializeServices()
            async let bootstrap: Void = model.bootstrapIfNeeded()
            _ = await (services, bootstrap)
        }
        .onAppear {
            #if canImport(UIKit)
            configureNativeTabBarAppearance()
            #endif
        }
        .onOpenURL { url in
            #if canImport(KakaoSDKShare)
            if url.scheme?.hasPrefix("kakao") == true {
                return
            }
            #endif
            model.applyDeepLink(url)
        }
        .onContinueUserActivity(NSUserActivityTypeBrowsingWeb) { userActivity in
            model.applyUniversalLink(userActivity)
        }
        .tint(leafGreen)
        .preferredColorScheme(.light)
        .toast(
            isPresented: model.compareToastBinding,
            message: model.compareToast?.message ?? "",
            icon: model.compareToast?.icon ?? "checkmark.circle.fill"
        )
        .sensoryFeedback(
            model.compareToast?.isWarning == true ? .warning : .success,
            trigger: model.compareToast?.id
        )
        .overlay {
            if showSplash {
                SplashView {
                    withAnimation(.easeInOut(duration: 0.3)) {
                        showSplash = false
                        if !hasSeenOnboarding {
                            showOnboarding = true
                        }
                    }
                }
                .transition(.opacity)
            }
        }
        .overlay {
            if showOnboarding {
                OnboardingOverlay(isPresented: $showOnboarding)
                    .transition(.opacity)
            }
        }
        .onChange(of: showOnboarding) { _, isPresented in
            if !isPresented {
                hasSeenOnboarding = true
            }
        }
    }

    private func initializeServices() async {
        #if canImport(GoogleMobileAds)
        AdMobService.configure()
        #endif

        #if canImport(KakaoSDKShare)
        if let appKey = model.configuration.kakaoAppKey {
            KakaoShareService.initializeSDK(appKey: appKey)
        }
        #endif
    }
}

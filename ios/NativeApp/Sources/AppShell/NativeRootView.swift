import Domain
import Features
import Models
import Services
import SwiftUI

@MainActor
public struct NativeRootView: View {
    @State private var router: AppRouter
    @State private var searchVM: SearchViewModel
    @State private var compareVM: CompareViewModel
    @State private var savedVM: SavedViewModel
    @State private var showSplash = true
    @State private var showOnboarding = false
    @AppStorage("native.hasSeenOnboarding") private var hasSeenOnboarding = false

    private let configuration: NativeAppConfiguration

    public init() {
        // --- DI Assembly ---
        let config = NativeAppConfiguration.live(bundle: .main)
        let persistence = NativeAppPersistence(store: UserDefaults.standard)
        let bundledLoader = BundledJSONResourceLoader(bundle: .main)
        let remoteLoader = RemoteJSONLoader(session: .shared)

        // Repositories (shared instances)
        let kindergartenRepo = KindergartenRepository(
            remoteLoader: { try await remoteLoader.data(from: config.kindergartensRemoteURL) },
            localLoader: { try bundledLoader.data(named: config.kindergartensResourceName) }
        )
        let reviewRepo = ReviewRepository(
            remoteLoader: { try await remoteLoader.data(from: config.reviewsRemoteURL) },
            localLoader: { try bundledLoader.data(named: config.reviewsResourceName) }
        )
        let vacancyRepo = VacancyRepository(
            remoteLoader: { try await remoteLoader.data(from: config.vacancyRemoteURL) },
            localLoader: { try bundledLoader.data(named: config.vacancyResourceName) }
        )
        let compareRepo = CompareRepository(persistence: persistence)
        let favoriteRepo = FavoriteRepository(persistence: persistence)
        let recentSearchRepo = RecentSearchRepository(persistence: persistence)

        // UseCases
        let searchUseCase = SearchUseCase()
        let compareUseCase = CompareUseCase()
        let fitReasonBuilder = FitReasonBuilder()

        // Services
        let locationProvider = CurrentLocationService()
        let remoteSearch = KakaoLocalSuggestionService(
            client: KakaoLocalAPIClient(apiKey: config.kakaoRESTAPIKey, session: .shared)
        )
        let analytics: any AnalyticsTracking = config.mixpanelToken != nil
            ? MixpanelAnalytics.shared
            : OSLogAnalytics()
        let router = AppRouter()
        // 검색·비교 두 경로가 같은 이력을 공유해야 세션당 한 번만 요청된다.
        let reviewPrompt = ReviewPromptCoordinator(
            prompter: StoreKitReviewPrompter(),
            store: persistence,
            analytics: analytics
        )

        // Store config for service init
        self.configuration = config

        // ViewModels
        _router = State(initialValue: router)
        _searchVM = State(initialValue: SearchViewModel(
            kindergartenRepo: kindergartenRepo,
            reviewRepo: reviewRepo,
            vacancyRepo: vacancyRepo,
            compareRepo: compareRepo,
            favoriteRepo: favoriteRepo,
            recentSearchRepo: recentSearchRepo,
            searchUseCase: searchUseCase,
            fitReasonBuilder: fitReasonBuilder,
            locationProvider: locationProvider,
            remoteSearchService: remoteSearch,
            analytics: analytics,
            router: router,
            persistence: persistence,
            configuration: config,
            reviewPrompt: reviewPrompt
        ))
        _compareVM = State(initialValue: CompareViewModel(
            compareRepo: compareRepo,
            kindergartenRepo: kindergartenRepo,
            reviewRepo: reviewRepo,
            vacancyRepo: vacancyRepo,
            compareUseCase: compareUseCase,
            analytics: analytics,
            router: router,
            configuration: config,
            reviewPrompt: reviewPrompt
        ))
        _savedVM = State(initialValue: SavedViewModel(
            favoriteRepo: favoriteRepo,
            recentSearchRepo: recentSearchRepo,
            kindergartenRepo: kindergartenRepo,
            compareRepo: compareRepo,
            reviewRepo: reviewRepo,
            vacancyRepo: vacancyRepo,
            analytics: analytics,
            router: router
        ))
    }

    public var body: some View {
        ZStack {
            mistWhite
                .ignoresSafeArea()

            TabView(selection: $router.activeTab) {
                SearchHomeView(viewModel: searchVM)
                    .tabItem {
                        Label("탐색", systemImage: "magnifyingglass")
                    }
                    .tag(NativeTab.search)

                CompareView(viewModel: compareVM)
                    .tabItem {
                        Label("비교", systemImage: "square.split.2x2")
                    }
                    .tag(NativeTab.compare)

                SavedView(viewModel: savedVM)
                    .tabItem {
                        Label("찜한곳", systemImage: "heart")
                    }
                    .tag(NativeTab.saved)

                MoreView(viewModel: searchVM)
                    .tabItem {
                        Label("더보기", systemImage: "ellipsis.circle")
                    }
                    .tag(NativeTab.more)
            }
        }
        .task {
            async let services: Void = initializeServices()
            async let bootstrap: Void = searchVM.bootstrapIfNeeded()
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
            searchVM.applyDeepLink(url)
        }
        .onContinueUserActivity(NSUserActivityTypeBrowsingWeb) { userActivity in
            searchVM.applyUniversalLink(userActivity)
        }
        .tint(leafGreen)
        .preferredColorScheme(.light)
        .toast(
            isPresented: Binding(
                get: { router.toast != nil },
                set: { if !$0 { router.dismissToast() } }
            ),
            message: router.toast?.message ?? "",
            icon: router.toast?.icon ?? "checkmark.circle.fill"
        )
        .sensoryFeedback(
            router.toast?.isWarning == true ? .warning : .success,
            trigger: router.toast?.id
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
        .onChange(of: router.activeTab) { oldTab, newTab in
            searchVM.trackTabChanged(from: oldTab, to: newTab)
        }
    }

    private func initializeServices() async {
        #if canImport(KakaoSDKShare)
        if let appKey = configuration.kakaoAppKey {
            KakaoShareService.initializeSDK(appKey: appKey)
        }
        #endif
    }
}

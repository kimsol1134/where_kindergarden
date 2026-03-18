import Features
import SwiftUI

public struct NativeRootView: View {
    @StateObject private var model: NativeAppModel

    public init(model: NativeAppModel) {
        _model = StateObject(wrappedValue: model)
    }

    @MainActor public init() {
        _model = StateObject(wrappedValue: .live())
    }

    public var body: some View {
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
                    Label("보관함", systemImage: "heart")
                }
                .tag(NativeTab.saved)

            MoreView()
                .tabItem {
                    Label("더보기", systemImage: "ellipsis.circle")
                }
                .tag(NativeTab.more)
        }
        .task {
            await model.bootstrapIfNeeded()
        }
        .onOpenURL { url in
            model.applyDeepLink(url)
        }
        .onContinueUserActivity(NSUserActivityTypeBrowsingWeb) { userActivity in
            model.applyUniversalLink(userActivity)
        }
        .tint(leafGreen)
    }
}

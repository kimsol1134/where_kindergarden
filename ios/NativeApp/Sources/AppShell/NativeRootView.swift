import Features
import SwiftUI

public struct NativeRootView: View {
    public init() {}

    public var body: some View {
        TabView {
            SearchHomeView()
                .tabItem {
                    Label("탐색", systemImage: "magnifyingglass")
                }

            CompareView()
                .tabItem {
                    Label("비교", systemImage: "square.split.2x2")
                }

            SavedView()
                .tabItem {
                    Label("보관함", systemImage: "heart")
                }

            MoreView()
                .tabItem {
                    Label("더보기", systemImage: "ellipsis.circle")
                }
        }
        .tint(Color(red: 0.31, green: 0.68, blue: 0.43))
    }
}

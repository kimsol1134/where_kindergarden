import Features
import Models
import SwiftUI

public struct NativeRootView: View {
    @StateObject private var searchModel: SearchFeatureModel
    @State private var compareSelection = CompareSelection()
    @State private var selectedTab: NativeTab = .search

    public init() {
        _searchModel = StateObject(wrappedValue: SearchFeatureModel())
    }

    public var body: some View {
        TabView(selection: $selectedTab) {
            SearchHomeView(
                model: searchModel,
                compareSelection: compareSelection,
                onToggleCompare: toggleCompare(for:),
                onOpenCompare: openCompare
            )
                .tag(NativeTab.search)
                .tabItem {
                    Label("탐색", systemImage: "magnifyingglass")
                }

            CompareView(
                items: searchModel.kindergartens(for: compareSelection.ids),
                onRemove: toggleCompare(for:)
            )
                .tag(NativeTab.compare)
                .tabItem {
                    Label("비교", systemImage: "square.split.2x2")
                }

            SavedView()
                .tag(NativeTab.saved)
                .tabItem {
                    Label("보관함", systemImage: "heart")
                }

            MoreView()
                .tag(NativeTab.more)
                .tabItem {
                    Label("더보기", systemImage: "ellipsis.circle")
                }
        }
        .tint(Color(red: 0.31, green: 0.68, blue: 0.43))
    }

    private func toggleCompare(for kindergarten: Kindergarten) {
        compareSelection.toggle(id: kindergarten.kindercode)
    }

    private func openCompare() {
        selectedTab = .compare
    }
}

private enum NativeTab: Hashable {
    case search
    case compare
    case saved
    case more
}

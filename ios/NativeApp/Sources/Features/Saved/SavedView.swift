import Models
import SwiftUI

public struct SavedView: View {
    @ObservedObject private var model: NativeAppModel
    @State private var pendingUndo: SavedUndoState?
    @State private var isRecentClearConfirmationPresented = false

    public init(model: NativeAppModel) {
        self.model = model
    }

    @MainActor public init() {
        self.model = .preview()
    }

    public var body: some View {
        NavigationStack {
            ZStack {
                NativeScreenBackground(topTintOpacity: 0.16)

                List {
                    Section {
                        NativeScreenHeader(
                            eyebrow: "보관함",
                            title: "다시 볼 곳과 최근 기준",
                            subtitle: "찜한 기관 \(model.favorites.count)곳 · 최근 검색 \(model.recentSearches.count)건"
                        )
                        .listRowInsets(EdgeInsets(top: 12, leading: 0, bottom: 14, trailing: 0))
                        .listRowBackground(Color.clear)
                    }

                    Section {
                        if model.favorites.isEmpty {
                            EmptyStateView(
                                icon: "heart",
                                title: "찜한 기관이 없습니다",
                                message: "검색 화면에서 찜한 기관을 담아두면 여기서 다시 열 수 있습니다."
                            )
                            .listRowInsets(EdgeInsets())
                            .listRowBackground(Color.clear)
                        } else {
                            ForEach(model.favoriteKindergartens()) { kindergarten in
                                Button {
                                    model.openKindergartenDetail(kindercode: kindergarten.kindercode)
                                } label: {
                                    FavoriteSavedCard(
                                        kindergarten: kindergarten,
                                        reviewCount: model.reviews(for: kindergarten.kindercode).count
                                    )
                                }
                                .buttonStyle(.plain)
                                .listRowInsets(EdgeInsets(top: 4, leading: 0, bottom: 4, trailing: 0))
                                .listRowBackground(Color.clear)
                                .swipeActions(edge: .leading, allowsFullSwipe: false) {
                                    Button {
                                        model.openKindergartenDetail(kindercode: kindergarten.kindercode)
                                    } label: {
                                        Label("열기", systemImage: "arrow.up.forward.app")
                                    }
                                    .tint(jadeGreen)
                                }
                                .swipeActions {
                                    Button(role: .destructive) {
                                        guard let removed = model.takeFavorite(kindercode: kindergarten.kindercode) else {
                                            return
                                        }
                                        stageUndo(.favorites([removed]))
                                    } label: {
                                        Label("삭제", systemImage: "trash")
                                    }
                                }
                            }
                            .onDelete { offsets in
                                let removed = model.takeFavorites(atOffsets: offsets)
                                stageUndo(.favorites(removed))
                            }
                        }
                    } header: {
                        SavedSectionHeader(title: "찜한 기관", subtitle: "상세를 다시 열고 비교 흐름으로 이어집니다.")
                    } footer: {
                        if !model.favorites.isEmpty {
                            Text("왼쪽으로 밀어 상세로 열고, 오른쪽으로 밀어 삭제할 수 있습니다.")
                                .foregroundStyle(slateSoft)
                        }
                    }

                    Section {
                        if model.recentSearches.isEmpty {
                            EmptyStateView(
                                icon: "clock.arrow.circlepath",
                                title: "최근 검색이 없습니다",
                                message: "현재 위치 또는 주소 기반 검색을 하면 최근 검색이 여기에 남습니다."
                            )
                            .listRowInsets(EdgeInsets())
                            .listRowBackground(Color.clear)
                        } else {
                            ForEach(model.recentSearches) { item in
                                Button {
                                    model.restoreRecentSearch(item)
                                } label: {
                                    RecentSavedCard(item: item)
                                }
                                .buttonStyle(.plain)
                                .listRowInsets(EdgeInsets(top: 4, leading: 0, bottom: 4, trailing: 0))
                                .listRowBackground(Color.clear)
                                .swipeActions(edge: .leading, allowsFullSwipe: false) {
                                    Button {
                                        model.restoreRecentSearch(item)
                                    } label: {
                                        Label("복원", systemImage: "arrow.counterclockwise")
                                    }
                                    .tint(jadeGreen)
                                }
                                .swipeActions {
                                    Button(role: .destructive) {
                                        guard let removed = model.takeRecentSearch(item) else {
                                            return
                                        }
                                        stageUndo(.recents([removed]))
                                    } label: {
                                        Label("삭제", systemImage: "trash")
                                    }
                                }
                            }
                            .onDelete { offsets in
                                let removed = model.takeRecentSearches(atOffsets: offsets)
                                stageUndo(.recents(removed))
                            }
                        }
                    } header: {
                        HStack {
                            SavedSectionHeader(title: "최근 검색", subtitle: "검색 기준 위치만 복원되고 실제 기기 위치는 바뀌지 않습니다.")
                            Spacer()
                            if !model.recentSearches.isEmpty {
                                Button("전체 삭제", role: .destructive) {
                                    isRecentClearConfirmationPresented = true
                                }
                                .font(.caption.weight(.semibold))
                            }
                        }
                    }
                }
                .listStyle(.plain)
                .scrollContentBackground(.hidden)
                .background(Color.clear)
            }
            .confirmationDialog(
                "최근 검색을 모두 삭제할까요?",
                isPresented: $isRecentClearConfirmationPresented,
                titleVisibility: .visible
            ) {
                Button("전체 삭제", role: .destructive) {
                    let removed = model.takeAllRecentSearches()
                    stageUndo(.recents(removed))
                }
                Button("취소", role: .cancel) {}
            } message: {
                Text("삭제 후에는 하단 배너에서 바로 복원할 수 있습니다.")
            }
            .safeAreaInset(edge: .bottom) {
                if let pendingUndo {
                    UndoBanner(message: pendingUndo.message) {
                        pendingUndo.restore(model)
                        self.pendingUndo = nil
                    } onDismiss: {
                        self.pendingUndo = nil
                    }
                    .padding(.horizontal, 16)
                    .padding(.bottom, 8)
                }
            }
        }
    }

    private func stageUndo(_ undoState: SavedUndoState?) {
        guard let undoState else { return }
        pendingUndo = undoState
    }
}

private struct UndoBanner: View {
    let message: String
    let onUndo: () -> Void
    let onDismiss: () -> Void

    var body: some View {
        HStack(spacing: 12) {
            ZStack {
                Circle()
                    .fill(jadeGreen.opacity(0.18))
                    .frame(width: 34, height: 34)
                Image(systemName: "arrow.uturn.backward.circle.fill")
                    .foregroundStyle(jadeDeep)
            }

            Text(message)
                .font(.footnote.weight(.semibold))
                .foregroundStyle(inkBlack)

            Spacer(minLength: 8)

            Button("복원", action: onUndo)
                .font(.footnote.weight(.bold))
                .buttonStyle(.plain)
                .foregroundStyle(jadeDeep)

            Button(action: onDismiss) {
                Image(systemName: "xmark")
                    .font(.footnote.weight(.bold))
            }
            .buttonStyle(.plain)
            .foregroundStyle(slateSoft)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 14)
        .glassPanel(cornerRadius: 24)
    }
}

private struct SavedSectionHeader: View {
    let title: String
    let subtitle: String

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title)
                .font(.headline.weight(.bold))
                .foregroundStyle(inkBlack)
            Text(subtitle)
                .font(.caption)
                .foregroundStyle(slateSoft)
        }
        .textCase(nil)
    }
}

private struct FavoriteSavedCard: View {
    let kindergarten: Kindergarten
    let reviewCount: Int

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 6) {
                    HStack(spacing: 8) {
                        NativeBadge(kindergarten.type.label)
                        if reviewCount > 0 {
                            NativeBadge("후기 \(reviewCount)건", tone: .sun)
                        }
                    }

                    Text(kindergarten.name)
                        .font(.headline.weight(.bold))
                        .foregroundStyle(inkBlack)

                    Text(kindergarten.address)
                        .font(.footnote)
                        .foregroundStyle(slateBlue)
                        .lineLimit(2)
                }

                Spacer(minLength: 12)

                Image(systemName: "chevron.right")
                    .font(.caption.weight(.bold))
                    .foregroundStyle(slateSoft)
            }

            HStack(spacing: 8) {
                if kindergarten.distance >= 0 {
                    NativeBadge(String(format: "%.1fkm", kindergarten.distance), tone: .slate)
                }
                if kindergarten.hasBus {
                    NativeBadge("셔틀 \(kindergarten.busCount)대")
                }
                if kindergarten.hasAfterSchool {
                    NativeBadge("방과후", tone: .slate)
                }
            }
        }
        .padding(18)
        .solidPanel(cornerRadius: 28, tint: paperWhite.opacity(0.94))
    }
}

private struct RecentSavedCard: View {
    let item: RecentSearch

    var body: some View {
        HStack(spacing: 12) {
            ZStack {
                Circle()
                    .fill(jadeGreen.opacity(0.16))
                    .frame(width: 38, height: 38)
                Image(systemName: recentSearchIcon(for: item.searchType))
                    .foregroundStyle(jadeDeep)
            }

            VStack(alignment: .leading, spacing: 4) {
                Text(item.label)
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(inkBlack)
                Text(item.resolvedDisplayName)
                    .font(.caption)
                    .foregroundStyle(slateBlue)
                    .lineLimit(2)
            }

            Spacer()

            if let createdAt = item.createdAt {
                Text(relativeDate(createdAt))
                    .font(.caption2.weight(.semibold))
                    .foregroundStyle(slateSoft)
            }
        }
        .padding(16)
        .solidPanel(cornerRadius: 24, tint: paperWhite.opacity(0.94))
    }
}

@MainActor
private struct SavedUndoState: Identifiable {
    let id = UUID()
    let message: String
    let restore: @MainActor (NativeAppModel) -> Void

    static func favorites(_ items: [IndexedFavoriteItem]) -> SavedUndoState? {
        guard !items.isEmpty else { return nil }
        let message = items.count == 1 ? "찜한 기관을 삭제했습니다." : "찜한 기관 \(items.count)곳을 삭제했습니다."
        return SavedUndoState(message: message) { model in
            model.restoreFavorites(items)
        }
    }

    static func recents(_ items: [IndexedRecentSearch]) -> SavedUndoState? {
        guard !items.isEmpty else { return nil }
        let message = items.count == 1 ? "최근 검색을 삭제했습니다." : "최근 검색 \(items.count)건을 삭제했습니다."
        return SavedUndoState(message: message) { model in
            model.restoreRecentSearches(items)
        }
    }
}

private func recentSearchIcon(for searchType: SearchType?) -> String {
    switch searchType {
    case .currentLocation: return "location.fill"
    case .address: return "mappin.and.ellipse"
    case .place: return "sparkle.magnifyingglass"
    case .kindergarten: return "building.2.fill"
    case nil: return "clock.arrow.circlepath"
    }
}

private let sharedRelativeDateFormatter: RelativeDateTimeFormatter = {
    let formatter = RelativeDateTimeFormatter()
    formatter.locale = Locale(identifier: "ko_KR")
    formatter.unitsStyle = .short
    return formatter
}()

private func relativeDate(_ date: Date) -> String {
    sharedRelativeDateFormatter.localizedString(for: date, relativeTo: Date())
}

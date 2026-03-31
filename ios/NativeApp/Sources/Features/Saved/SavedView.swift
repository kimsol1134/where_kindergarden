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
            List {
                    Section {
                        NativeScreenHeader(
                            eyebrow: "보관함",
                            title: "저장한 곳",
                            subtitle: "찜한 기관 \(model.favorites.count)곳 · 최근 검색 \(model.recentSearches.count)건"
                        )
                        .listRowInsets(EdgeInsets(top: 16, leading: 20, bottom: 14, trailing: 20))
                        .listRowBackground(Color.clear)
                    }

                    Section {
                        if model.favorites.isEmpty {
                            EmptyStateView(
                                icon: "heart",
                                title: "찜한 곳이 아직 없어요",
                                message: "마음에 드는 유치원을 저장해 두면 여기서 다시 볼 수 있어요.",
                                ctaLabel: "유치원 찾아보기",
                                ctaAction: { model.selectedTab = .search }
                            )
                            .listRowInsets(EdgeInsets(top: 0, leading: 20, bottom: 0, trailing: 20))
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
                                .buttonStyle(PressableCardStyle())
                                .listRowInsets(EdgeInsets(top: 4, leading: 20, bottom: 4, trailing: 20))
                                .listRowBackground(Color.clear)
                                .accessibilityLabel("\(kindergarten.name), \(kindergarten.type.label)")
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
                                .contextMenu {
                                    Button {
                                        model.openKindergartenDetail(kindercode: kindergarten.kindercode)
                                    } label: {
                                        Label("열기", systemImage: "arrow.up.forward.app")
                                    }
                                    Button(role: .destructive) {
                                        guard let removed = model.takeFavorite(kindercode: kindergarten.kindercode) else { return }
                                        stageUndo(.favorites([removed]))
                                    } label: {
                                        Label("삭제", systemImage: "trash")
                                    }
                                }
                            }
                        }
                    } header: {
                        SavedSectionHeader(title: "찜한 곳", subtitle: "눌러서 다시 보고 비교할 수 있어요.")
                    } footer: {
                        if !model.favorites.isEmpty {
                            Text("밀어서 열거나 삭제할 수 있어요.")
                                .foregroundStyle(slateSoft)
                        }
                    }

                    Section {
                        if model.recentSearches.isEmpty {
                            EmptyStateView(
                                icon: "clock.arrow.circlepath",
                                title: "최근 찾은 곳이 없어요",
                                message: "동네 이름이나 현재 위치로 찾으면 여기에 남아요.",
                                ctaLabel: "유치원 찾아보기",
                                ctaAction: { model.selectedTab = .search }
                            )
                            .listRowInsets(EdgeInsets(top: 0, leading: 20, bottom: 0, trailing: 20))
                            .listRowBackground(Color.clear)
                        } else {
                            ForEach(model.recentSearches) { item in
                                Button {
                                    model.restoreRecentSearch(item)
                                } label: {
                                    RecentSavedCard(item: item)
                                }
                                .buttonStyle(PressableCardStyle())
                                .listRowInsets(EdgeInsets(top: 4, leading: 20, bottom: 4, trailing: 20))
                                .listRowBackground(Color.clear)
                                .accessibilityLabel("\(item.label), \(item.resolvedDisplayName)")
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
                        }
                    } header: {
                        HStack {
                            SavedSectionHeader(title: "최근 검색", subtitle: "선택했던 동네나 위치로 다시 돌아갈 수 있어요.")
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
            .background { NativeScreenBackground(topTintOpacity: 0.16) }
            .confirmationDialog(
                "최근 검색을 모두 지울까요?",
                isPresented: $isRecentClearConfirmationPresented,
                titleVisibility: .visible
            ) {
                Button("전체 삭제", role: .destructive) {
                    let removed = model.takeAllRecentSearches()
                    stageUndo(.recents(removed))
                }
                Button("취소", role: .cancel) {}
            } message: {
                Text("필요하면 바로 되돌릴 수 있어요.")
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
                    .animation(.spring(duration: 0.35), value: pendingUndo.id)
                }
            }
            .task(id: pendingUndo?.id) {
                guard pendingUndo != nil else { return }
                try? await Task.sleep(for: .seconds(6))
                guard !Task.isCancelled else { return }
                withAnimation(.spring(duration: 0.3)) {
                    pendingUndo = nil
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

            Button("되돌리기", action: onUndo)
                .font(.footnote.weight(.bold))
                .buttonStyle(.plain)
                .foregroundStyle(jadeDeep)

            Button(action: onDismiss) {
                Image(systemName: "xmark")
                    .font(.footnote.weight(.bold))
                    .frame(width: 44, height: 44)
                    .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .foregroundStyle(slateSoft)
            .accessibilityLabel("알림 닫기")
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 14)
        .glassPanel(cornerRadius: CornerRadius.medium)
        .transition(.asymmetric(
            insertion: .move(edge: .bottom).combined(with: .opacity),
            removal: .opacity
        ))
        .sensoryFeedback(.success, trigger: message)
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

                VStack(spacing: 8) {
                    Image(systemName: "heart.fill")
                        .font(.caption.weight(.bold))
                        .foregroundStyle(sunYellow)
                    Image(systemName: "chevron.right")
                        .font(.caption.weight(.bold))
                        .foregroundStyle(slateSoft)
                }
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
        .solidPanel(cornerRadius: CornerRadius.large, tint: paperWhite.opacity(0.94))
    }
}

private struct RecentSavedCard: View {
    let item: RecentSearch

    var body: some View {
        HStack(spacing: 12) {
            ZStack {
                Circle()
                    .fill(jadeGreen.opacity(0.16))
                    .frame(width: 36, height: 36)
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
        .solidPanel(cornerRadius: CornerRadius.medium, tint: paperWhite.opacity(0.94))
    }
}

@MainActor
private struct SavedUndoState: Identifiable {
    let id = UUID()
    let message: String
    let restore: @MainActor (NativeAppModel) -> Void

    static func favorites(_ items: [IndexedFavoriteItem]) -> SavedUndoState? {
        guard !items.isEmpty else { return nil }
        let message = items.count == 1 ? "찜한 곳을 삭제했어요." : "찜한 곳 \(items.count)곳을 삭제했어요."
        return SavedUndoState(message: message) { model in
            model.restoreFavorites(items)
        }
    }

    static func recents(_ items: [IndexedRecentSearch]) -> SavedUndoState? {
        guard !items.isEmpty else { return nil }
        let message = items.count == 1 ? "최근 검색을 삭제했어요." : "최근 검색 \(items.count)건을 삭제했어요."
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

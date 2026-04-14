import Models
import SwiftUI
#if canImport(UIKit)
import UIKit
#endif

public struct SavedView: View {
    var viewModel: SavedViewModel
    @Environment(\.openURL) private var openURL
    @State private var pendingUndo: SavedUndoState?
    @State private var isRecentClearConfirmationPresented = false
    @State private var selectedKindergarten: Kindergarten?
    @AppStorage("native.hasSeenSwipeHint") private var hasSeenSwipeHint = false

    public init(viewModel: SavedViewModel) {
        self.viewModel = viewModel
    }

    public var body: some View {
        NavigationStack {
            List {
                    Section {
                        if viewModel.favorites.isEmpty {
                            EmptyStateView(
                                icon: "heart",
                                title: "찜한곳이 아직 없어요",
                                message: "마음에 드는 유치원을 저장해 두면 여기서 다시 볼 수 있어요.",
                                ctaLabel: "유치원 찾아보기",
                                ctaAction: { viewModel.navigateToSearch() }
                            )
                            .listRowInsets(EdgeInsets(top: 0, leading: 20, bottom: 0, trailing: 20))
                            .listRowBackground(Color.clear)
                            .listRowSeparator(.hidden)
                        } else {
                            let favoriteItems = viewModel.favoriteKindergartens
                            ForEach(favoriteItems) { kindergarten in
                                let isCompared = viewModel.isCompared(kindergarten)
                                Button {
                                    selectedKindergarten = kindergarten
                                } label: {
                                    FavoriteSavedCard(
                                        kindergarten: kindergarten,
                                        reviewCount: viewModel.reviews(for: kindergarten.kindercode).count,
                                        onCall: kindergarten.phone.map { phone in
                                            {
                                                if let url = URL(string: "tel://\(phone.filter(\.isNumber))") {
                                                    openURL(url)
                                                }
                                            }
                                        }
                                    )
                                }
                                .buttonStyle(PressableCardStyle())
                                .listRowInsets(EdgeInsets(top: 4, leading: 20, bottom: 4, trailing: 20))
                                .listRowBackground(Color.clear)
                                .listRowSeparator(.hidden)
                                .accessibilityLabel("\(kindergarten.name), \(kindergarten.type.label)")
                                .overlay(alignment: .trailing) {
                                    if kindergarten.id == favoriteItems.first?.id, !hasSeenSwipeHint {
                                        SwipeHintBadge()
                                            .task {
                                                try? await Task.sleep(for: .seconds(4))
                                                guard !Task.isCancelled else { return }
                                                withAnimation(.easeOut(duration: 0.3)) {
                                                    hasSeenSwipeHint = true
                                                }
                                            }
                                    }
                                }
                                .swipeActions(edge: .leading, allowsFullSwipe: false) {
                                    Button {
                                        viewModel.toggleCompare(for: kindergarten)
                                    } label: {
                                        Label(
                                            isCompared ? "비교 빼기" : "비교 추가",
                                            systemImage: isCompared ? "minus.square" : "plus.square.on.square"
                                        )
                                    }
                                    .tint(isCompared ? .orange : jadeGreen)
                                }
                                .swipeActions {
                                    Button(role: .destructive) {
                                        guard let removed = viewModel.takeFavorite(kindercode: kindergarten.kindercode) else {
                                            return
                                        }
                                        stageUndo(.favorites([removed]))
                                    } label: {
                                        Label("삭제", systemImage: "trash")
                                    }
                                }
                                .contextMenu {
                                    Button {
                                        selectedKindergarten = kindergarten
                                    } label: {
                                        Label("열기", systemImage: "arrow.up.forward.app")
                                    }

                                    Button {
                                        viewModel.toggleCompare(for: kindergarten)
                                    } label: {
                                        Label(
                                            isCompared ? "비교에서 빼기" : "비교에 추가",
                                            systemImage: isCompared ? "minus.square" : "plus.square.on.square"
                                        )
                                    }

                                    if let phone = kindergarten.phone {
                                        Button {
                                            if let url = URL(string: "tel://\(phone.filter(\.isNumber))") {
                                                openURL(url)
                                            }
                                        } label: {
                                            Label("전화 걸기", systemImage: "phone")
                                        }
                                    }

                                    Button {
                                        #if canImport(UIKit)
                                        UIPasteboard.general.string = kindergarten.address
                                        #endif
                                    } label: {
                                        Label("주소 복사", systemImage: "doc.on.doc")
                                    }

                                    Divider()

                                    Button(role: .destructive) {
                                        guard let removed = viewModel.takeFavorite(kindercode: kindergarten.kindercode) else { return }
                                        stageUndo(.favorites([removed]))
                                    } label: {
                                        Label("삭제", systemImage: "trash")
                                    }
                                }
                            }
                        }
                    } header: {
                        SavedSectionHeader(title: "\(viewModel.favorites.count)곳 저장됨", subtitle: "")
                    }

                    Section {
                        if viewModel.recentSearches.isEmpty {
                            EmptyStateView(
                                icon: "clock.arrow.circlepath",
                                title: "최근 찾은 곳이 없어요",
                                message: "동네 이름이나 현재 위치로 찾으면 여기에 남아요.",
                                ctaLabel: "유치원 찾아보기",
                                ctaAction: { viewModel.navigateToSearch() }
                            )
                            .listRowInsets(EdgeInsets(top: 0, leading: 20, bottom: 0, trailing: 20))
                            .listRowBackground(Color.clear)
                            .listRowSeparator(.hidden)
                        } else {
                            ForEach(viewModel.recentSearches) { item in
                                Button {
                                    viewModel.restoreRecentSearch(item)
                                } label: {
                                    RecentSavedCard(item: item)
                                }
                                .buttonStyle(PressableCardStyle())
                                .listRowInsets(EdgeInsets(top: 4, leading: 20, bottom: 4, trailing: 20))
                                .listRowBackground(Color.clear)
                                .listRowSeparator(.hidden)
                                .accessibilityLabel("\(item.label), \(item.resolvedDisplayName)")
                                .swipeActions {
                                    Button(role: .destructive) {
                                        guard let removed = viewModel.takeRecentSearch(item) else {
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
                            SavedSectionHeader(title: "최근 검색", subtitle: "\(viewModel.recentSearches.count)건")
                            Spacer()
                            if !viewModel.recentSearches.isEmpty {
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
            .navigationTitle("찜한곳")
            .navigationBarTitleDisplayMode(.large)
            .sheet(item: $selectedKindergarten) { kindergarten in
                viewModel.makeDetailSheet(for: kindergarten)
                    .presentationDetents([.medium, .large])
                    .presentationDragIndicator(.visible)
                    .toast(
                        isPresented: Binding(
                            get: { viewModel.toast != nil },
                            set: { if !$0 { viewModel.dismissToast() } }
                        ),
                        message: viewModel.toast?.message ?? "",
                        icon: viewModel.toast?.icon ?? "checkmark.circle.fill"
                    )
            }
            .confirmationDialog(
                "최근 검색을 모두 지울까요?",
                isPresented: $isRecentClearConfirmationPresented,
                titleVisibility: .visible
            ) {
                Button("전체 삭제", role: .destructive) {
                    let removed = viewModel.takeAllRecentSearches()
                    stageUndo(.recents(removed))
                }
                Button("취소", role: .cancel) {}
            } message: {
                Text("필요하면 바로 되돌릴 수 있어요.")
            }
            .safeAreaInset(edge: .bottom) {
                if let pendingUndo {
                    UndoBanner(message: pendingUndo.message) {
                        pendingUndo.restore(viewModel)
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
            if !subtitle.isEmpty {
                Text(subtitle)
                    .font(.caption)
                    .foregroundStyle(slateSoft)
            }
        }
        .textCase(nil)
    }
}

private struct FavoriteSavedCard: View {
    let kindergarten: Kindergarten
    let reviewCount: Int
    let onCall: (() -> Void)?

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(alignment: .center) {
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

                HStack(spacing: 12) {
                    if let onCall {
                        Button {
                            onCall()
                        } label: {
                            Image(systemName: "phone.circle.fill")
                                .font(.title3)
                                .foregroundStyle(jadeGreen)
                        }
                        .buttonStyle(.plain)
                    }

                    Image(systemName: "chevron.right")
                        .font(.footnote.weight(.semibold))
                        .foregroundStyle(slateSoft.opacity(0.6))
                }
            }

            HStack(spacing: 8) {
                NativeBadge("현원 \(kindergarten.currentCount)/\(kindergarten.capacity)명", tone: .slate)
                if kindergarten.teacherCount > 0 {
                    NativeBadge("교사 1:\(kindergarten.currentCount / max(kindergarten.teacherCount, 1))", tone: .slate)
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
        .padding(16)
        .solidPanel(cornerRadius: CornerRadius.large, tint: paperWhite.opacity(0.95))
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
    let restore: @MainActor (SavedViewModel) -> Void

    static func favorites(_ items: [IndexedFavoriteItem]) -> SavedUndoState? {
        guard !items.isEmpty else { return nil }
        let message = items.count == 1 ? "찜한곳을 삭제했어요." : "찜한곳 \(items.count)곳을 삭제했어요."
        return SavedUndoState(message: message) { viewModel in
            viewModel.restoreFavorites(items)
        }
    }

    static func recents(_ items: [IndexedRecentSearch]) -> SavedUndoState? {
        guard !items.isEmpty else { return nil }
        let message = items.count == 1 ? "최근 검색을 삭제했어요." : "최근 검색 \(items.count)건을 삭제했어요."
        return SavedUndoState(message: message) { viewModel in
            viewModel.restoreRecentSearches(items)
        }
    }
}

private func recentSearchIcon(for searchType: SearchType?) -> String {
    switch searchType {
    case .currentLocation: return "location.fill"
    case .address: return "mappin.and.ellipse"
    case .place: return "sparkle.magnifyingglass"
    case .kindergarten: return "teddybear.fill"
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

private struct SwipeHintBadge: View {
    @State private var offsetX: CGFloat = 0

    var body: some View {
        HStack(spacing: 4) {
            Image(systemName: "arrow.left")
                .font(.caption2.weight(.bold))
            Text("스와이프")
                .font(.caption2.weight(.bold))
        }
        .foregroundStyle(.white)
        .padding(.horizontal, 10)
        .padding(.vertical, 6)
        .background(jadeDeep.opacity(0.85), in: Capsule())
        .offset(x: offsetX - 8)
        .onAppear {
            withAnimation(.easeInOut(duration: 1.0).repeatCount(2, autoreverses: true)) {
                offsetX = -12
            }
        }
    }
}

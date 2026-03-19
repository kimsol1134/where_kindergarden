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
                    if model.favorites.isEmpty {
                        EmptyStateView(
                            icon: "heart",
                            title: "아직 찜한 유치원이 없어요",
                            message: "마음에 드는 유치원을 찜해두면 여기에서 다시 볼 수 있어요."
                        )
                        .listRowInsets(EdgeInsets())
                        .listRowBackground(Color.clear)
                    } else {
                        ForEach(model.favoriteKindergartens()) { kindergarten in
                            Button {
                                model.openKindergartenDetail(kindercode: kindergarten.kindercode)
                            } label: {
                                VStack(alignment: .leading, spacing: 8) {
                                    HStack {
                                        Text(kindergarten.name)
                                            .font(.headline)
                                        Spacer()
                                        Text(kindergarten.type.label)
                                            .font(.caption.weight(.semibold))
                                            .foregroundStyle(leafGreen)
                                    }

                                    Text(kindergarten.address)
                                        .font(.footnote)
                                        .foregroundStyle(.secondary)

                                    HStack(spacing: 12) {
                                        if kindergarten.distance >= 0 {
                                            Label(String(format: "%.1fkm", kindergarten.distance), systemImage: "location")
                                        }
                                        Label("후기 \(model.reviews(for: kindergarten.kindercode).count)", systemImage: "bubble.left.and.text.bubble.right")
                                    }
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                                }
                                .padding(.vertical, 4)
                            }
                            .buttonStyle(.plain)
                            .swipeActions(edge: .leading, allowsFullSwipe: false) {
                                Button {
                                    model.openKindergartenDetail(kindercode: kindergarten.kindercode)
                                } label: {
                                    Label("열기", systemImage: "arrow.up.forward.app")
                                }
                                .tint(leafGreen)
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
                    Text("찜한 유치원")
                } footer: {
                    if !model.favorites.isEmpty {
                        Text("왼쪽으로 밀어 상세로 열고, 오른쪽으로 밀어 삭제할 수 있습니다.")
                    }
                }

                Section {
                    if model.recentSearches.isEmpty {
                        EmptyStateView(
                            icon: "clock.arrow.circlepath",
                            title: "최근 검색이 없습니다",
                            message: "현재 위치 또는 주소 기반 검색을 하면 최근 검색이 남습니다."
                        )
                        .listRowInsets(EdgeInsets())
                        .listRowBackground(Color.clear)
                    } else {
                        ForEach(model.recentSearches) { item in
                            Button {
                                model.restoreRecentSearch(item)
                            } label: {
                                HStack(spacing: 12) {
                                    Image(systemName: recentSearchIcon(for: item.searchType))
                                        .foregroundStyle(leafGreen)
                                        .frame(width: 24)
                                    VStack(alignment: .leading, spacing: 4) {
                                        Text(item.label)
                                            .font(.subheadline.weight(.semibold))
                                        Text(item.resolvedDisplayName)
                                            .font(.caption)
                                            .foregroundStyle(.secondary)
                                    }
                                    Spacer()
                                    if let createdAt = item.createdAt {
                                        Text(relativeDate(createdAt))
                                            .font(.caption2)
                                            .foregroundStyle(.tertiary)
                                    }
                                }
                            }
                            .buttonStyle(.plain)
                            .swipeActions(edge: .leading, allowsFullSwipe: false) {
                                Button {
                                    model.restoreRecentSearch(item)
                                } label: {
                                    Label("복원", systemImage: "arrow.counterclockwise")
                                }
                                .tint(leafGreen)
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
                        Text("최근 검색")
                        Spacer()
                        if !model.recentSearches.isEmpty {
                            Button("전체 삭제", role: .destructive) {
                                isRecentClearConfirmationPresented = true
                            }
                                .font(.caption.weight(.semibold))
                        }
                    }
                } footer: {
                    if !model.recentSearches.isEmpty {
                        Text("최근 검색을 복원해도 실제 기기 위치는 바뀌지 않고 검색 기준 위치만 다시 적용됩니다.")
                    }
                }
            }
            .navigationTitle("보관함")
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
            Image(systemName: "arrow.uturn.backward.circle.fill")
                .foregroundStyle(leafGreen)

            Text(message)
                .font(.footnote.weight(.semibold))
                .foregroundStyle(.primary)

            Spacer(minLength: 8)

            Button("복원", action: onUndo)
                .font(.footnote.weight(.bold))
                .buttonStyle(.plain)

            Button(action: onDismiss) {
                Image(systemName: "xmark")
                    .font(.footnote.weight(.bold))
            }
            .buttonStyle(.plain)
            .foregroundStyle(.secondary)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 14)
        .background(.white.opacity(0.96), in: RoundedRectangle(cornerRadius: 20, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 20, style: .continuous)
                .stroke(warmSand.opacity(0.24), lineWidth: 1)
        )
        .shadow(color: warmSand.opacity(0.18), radius: 18, y: 8)
    }
}

@MainActor
private struct SavedUndoState: Identifiable {
    let id = UUID()
    let message: String
    let restore: @MainActor (NativeAppModel) -> Void

    static func favorites(_ items: [IndexedFavoriteItem]) -> SavedUndoState? {
        guard !items.isEmpty else { return nil }
        let message = items.count == 1 ? "찜한 유치원을 삭제했어요." : "찜한 유치원 \(items.count)곳을 삭제했어요."
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

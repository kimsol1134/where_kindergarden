import SwiftUI

public struct SavedView: View {
    @ObservedObject private var model: NativeAppModel

    public init(model: NativeAppModel) {
        self.model = model
    }

    @MainActor public init() {
        self.model = .preview()
    }

    public var body: some View {
        NavigationStack {
            List {
                Section("찜한 기관") {
                    if model.favorites.isEmpty {
                        Text("검색 화면에서 찜한 기관이 여기에 저장됩니다.")
                            .foregroundStyle(.secondary)
                    } else {
                        ForEach(model.favoriteKindergartens()) { kindergarten in
                            VStack(alignment: .leading, spacing: 4) {
                                Text(kindergarten.name)
                                    .font(.headline)
                                Text(kindergarten.address)
                                    .font(.footnote)
                                    .foregroundStyle(.secondary)
                            }
                        }
                    }
                }

                Section {
                    if model.recentSearches.isEmpty {
                        Text("현재 위치 또는 주소 기반 검색을 하면 최근 검색이 남습니다.")
                            .foregroundStyle(.secondary)
                    } else {
                        ForEach(model.recentSearches) { item in
                            Button {
                                model.restoreRecentSearch(item)
                            } label: {
                                VStack(alignment: .leading, spacing: 4) {
                                    Label(item.label, systemImage: "clock.arrow.circlepath")
                                    if let coordinates = item.coordinates {
                                        Text(String(format: "%.4f, %.4f", coordinates.lat, coordinates.lng))
                                            .font(.caption)
                                            .foregroundStyle(.secondary)
                                    }
                                }
                            }
                            .buttonStyle(.plain)
                        }
                        .onDelete(perform: model.deleteRecentSearches)
                    }
                } header: {
                    HStack {
                        Text("최근 검색")
                        Spacer()
                        if !model.recentSearches.isEmpty {
                            Button("전체 삭제", role: .destructive, action: model.clearRecentSearches)
                                .font(.caption.weight(.semibold))
                        }
                    }
                }
            }
            .navigationTitle("보관함")
        }
    }
}

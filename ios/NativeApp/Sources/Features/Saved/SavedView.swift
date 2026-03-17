import Models
import SwiftUI

public struct SavedView: View {
    private let favorites: [FavoriteItem]
    private let recentSearches: [RecentSearch]

    public init(
        favorites: [FavoriteItem] = [
            FavoriteItem(kindercode: "A001", name: "역삼유치원", address: "서울 강남구 역삼로 123", type: .public),
            FavoriteItem(kindercode: "A002", name: "해맑은유치원", address: "서울 강남구 도곡로 47", type: .private),
        ],
        recentSearches: [RecentSearch] = [
            RecentSearch(label: "서울 강남구 역삼동", coordinates: Coordinates(lat: 37.4981, lng: 127.0276)),
            RecentSearch(label: "서울 서초구 서초동", coordinates: Coordinates(lat: 37.4901, lng: 127.0078)),
        ]
    ) {
        self.favorites = favorites
        self.recentSearches = recentSearches
    }

    public var body: some View {
        NavigationStack {
            List {
                Section("찜한 기관") {
                    ForEach(favorites) { item in
                        VStack(alignment: .leading, spacing: 4) {
                            Text(item.name)
                                .font(.headline)
                            Text(item.address)
                                .font(.footnote)
                                .foregroundStyle(.secondary)
                        }
                    }
                }

                Section("최근 검색") {
                    ForEach(recentSearches) { item in
                        Label(item.label, systemImage: "clock.arrow.circlepath")
                    }
                }
            }
            .navigationTitle("보관함")
        }
    }
}

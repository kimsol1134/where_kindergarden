import Foundation
import Models
import SwiftUI

public struct SearchHomeView: View {
    @ObservedObject private var model: NativeAppModel
    @State private var mapRuntimeMessage: String?
    @State private var isSearchPanelPresented = false

    public init(model: NativeAppModel) {
        self.model = model
    }

    @MainActor public init() {
        self.model = .preview()
    }

    private var sheetSelection: Binding<Kindergarten?> {
        Binding(
            get: { model.selectedKindergarten },
            set: { selection in
                if selection == nil {
                    model.dismissDetail()
                }
            }
        )
    }

    private var mapMarkers: [SearchMapMarker] {
        model.results.map { kindergarten in
            SearchMapMarker(
                id: kindergarten.kindercode,
                title: kindergarten.name,
                coordinates: kindergarten.location,
                compareOrder: model.compareOrder(for: kindergarten.kindercode)
            )
        }
    }

    public var body: some View {
        NavigationStack {
            ZStack(alignment: .top) {
                KakaoSearchMapSurface(
                    appKey: model.configuration.kakaoAppKey,
                    center: model.userLocation,
                    currentLocation: model.userLocation,
                    markers: mapMarkers,
                    selectedKindergartenID: model.selectedKindergarten?.kindercode,
                    runtimeMessage: $mapRuntimeMessage
                ) { kindercode in
                    guard let kindergarten = model.results.first(where: { $0.kindercode == kindercode }) else {
                        return
                    }
                    model.select(kindergarten: kindergarten)
                }
                .ignoresSafeArea()

                if isSearchPanelPresented {
                    Color.black.opacity(0.08)
                        .ignoresSafeArea()
                        .contentShape(Rectangle())
                        .onTapGesture {
                            isSearchPanelPresented = false
                        }
                        .transition(.opacity)
                }

                VStack(spacing: 14) {
                    SearchChrome(
                        model: model,
                        isSuggestionPanelPresented: $isSearchPanelPresented
                    )
                    Spacer()
                }
            }
            .animation(.easeInOut(duration: 0.18), value: isSearchPanelPresented)
            .task {
                await model.bootstrapIfNeeded()
            }
            .safeAreaInset(edge: .bottom) {
                if !isSearchPanelPresented {
                    ResultSheet(
                        results: model.results,
                        comparedIDs: Set(model.compareSelection.ids),
                        favoriteIDs: Set(model.favorites.map(\.kindercode)),
                        reviewCounts: Dictionary(
                            uniqueKeysWithValues: model.results.map { ($0.kindercode, model.reviews(for: $0.kindercode).count) }
                        ),
                        onSelect: { model.select(kindergarten: $0) },
                        onToggleCompare: { model.toggleCompare(for: $0) },
                        onToggleFavorite: { model.toggleFavorite(for: $0) }
                    )
                }
            }
            .safeAreaInset(edge: .bottom) {
                if !isSearchPanelPresented, !model.compareSelection.ids.isEmpty {
                    Button {
                        model.selectedTab = .compare
                    } label: {
                        PersistentCompareBar(count: model.compareSelection.ids.count)
                            .padding(.horizontal, 16)
                            .padding(.bottom, 6)
                    }
                    .accessibilityIdentifier("search.compareBarButton")
                    .buttonStyle(.plain)
                }
            }
            .sheet(item: sheetSelection) { kindergarten in
                KindergartenDetailSheet(
                    kindergarten: kindergarten,
                    reviews: model.reviews(for: kindergarten.kindercode),
                    isCompared: model.isCompared(kindergarten),
                    isFavorite: model.isFavorite(kindergarten),
                    onToggleCompare: { model.toggleCompare(for: kindergarten) },
                    onToggleFavorite: { model.toggleFavorite(for: kindergarten) }
                )
                .presentationDetents([.medium, .large])
                .presentationDragIndicator(.visible)
            }
        }
    }
}

private struct SearchChrome: View {
    @ObservedObject var model: NativeAppModel
    @Binding var isSuggestionPanelPresented: Bool
    @FocusState private var isSearchFieldFocused: Bool

    private var trimmedSearchText: String {
        model.searchText.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    private var shouldShowSuggestionPanel: Bool {
        isSearchFieldFocused
    }

    private var hasSuggestionContent: Bool {
        isSearchFieldFocused
            || !model.recentSearchSuggestions.isEmpty
            || !model.localSearchSuggestions.isEmpty
            || !model.remoteSearchSuggestions.isEmpty
            || model.isSearchSuggestionsLoading
            || model.searchSuggestionMessage != nil
    }

    private var primarySuggestion: SearchSuggestion? {
        model.localSearchSuggestions.first
            ?? model.remoteSearchSuggestions.first
            ?? model.recentSearchSuggestions.first
    }

    var body: some View {
        VStack(spacing: 12) {
            HStack(spacing: 12) {
                VStack(alignment: .leading, spacing: 4) {
                    Label("우리동네 유치원 탐색", systemImage: "sparkles")
                        .font(.footnote.weight(.semibold))
                        .foregroundStyle(leafGreen)
                    Text(model.locationLabel)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                Spacer()
                Button {
                    Task {
                        await model.centerOnCurrentLocation()
                    }
                } label: {
                    Label("현위치", systemImage: "location.fill")
                        .font(.footnote.weight(.semibold))
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
                        .background(.white.opacity(0.84), in: Capsule())
            }

            VStack(spacing: 0) {
                HStack(spacing: 10) {
                    Image(systemName: "magnifyingglass")
                        .foregroundStyle(leafGreen)
                    TextField(
                        "주소, 장소명, 유치원명으로 검색",
                        text: Binding(
                            get: { model.searchText },
                            set: { model.updateSearchText($0) }
                        )
                    )
                    .accessibilityIdentifier("search.queryField")
                    .focused($isSearchFieldFocused)
                    .textFieldStyle(.plain)
                    .submitLabel(.search)
                    .onSubmit {
                        if let primarySuggestion {
                            model.selectSearchSuggestion(primarySuggestion)
                        }
                        isSearchFieldFocused = false
                    }

                    Button {
                        model.clearSearchText()
                    } label: {
                        Image(systemName: "xmark.circle.fill")
                            .foregroundStyle(.secondary)
                    }
                    .accessibilityIdentifier("search.clearQuery")
                    .opacity(model.searchText.isEmpty ? 0 : 1)
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 15)

                if shouldShowSuggestionPanel && hasSuggestionContent {
                    Divider()
                        .padding(.horizontal, 16)

                    ScrollView(showsIndicators: false) {
                        SearchSuggestionPanel(
                            searchText: trimmedSearchText,
                            recentSuggestions: model.recentSearchSuggestions,
                            localSuggestions: model.localSearchSuggestions,
                            remoteSuggestions: model.remoteSearchSuggestions,
                            isLoading: model.isSearchSuggestionsLoading,
                            message: model.searchSuggestionMessage,
                            onClearRecentSearches: model.clearRecentSearches
                        ) { suggestion in
                            model.selectSearchSuggestion(suggestion)
                            isSearchFieldFocused = false
                        }
                        .padding(16)
                    }
                    .frame(maxHeight: 280)
                }
            }
            .background(.white.opacity(0.88), in: RoundedRectangle(cornerRadius: 24, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 24, style: .continuous)
                    .stroke(Color.white.opacity(0.8), lineWidth: 1)
            )
            .shadow(color: warmSand.opacity(0.22), radius: 24, y: 10)
            .onChange(of: isSearchFieldFocused) { _, isFocused in
                isSuggestionPanelPresented = isFocused
            }
            .onChange(of: isSuggestionPanelPresented) { _, isPresented in
                if !isPresented, isSearchFieldFocused {
                    isSearchFieldFocused = false
                }
            }

            if !shouldShowSuggestionPanel {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 10) {
                        FilterChip(label: "반경 \(Int(model.filters.radiusKM))km", isActive: true) {
                            let nextRadius: Double = model.filters.radiusKM == 1 ? 2 : model.filters.radiusKM == 2 ? 5 : 1
                            model.updateRadius(to: nextRadius)
                        }
                        FilterChip(label: "셔틀", isActive: model.filters.hasBus == true) {
                            model.toggleBusFilter()
                        }
                        FilterChip(label: "넓은 공간", isActive: model.filters.hasLargeSpace == true) {
                            model.toggleLargeSpaceFilter()
                        }
                        FilterChip(label: model.filters.sort == .distance ? "거리순" : "정원순", isActive: true) {
                            let next: SortOption = model.filters.sort == .distance ? .capacity : .distance
                            model.updateSort(to: next)
                        }
                    }
                    .padding(.horizontal, 2)
                }

                if model.isCatalogLoading || model.isReviewsLoading {
                    HStack(spacing: 8) {
                        ProgressView()
                            .controlSize(.small)
                        Text("공용 JSON 데이터를 불러오는 중")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }

                if let locationError = model.locationError {
                    InlineNotice(message: locationError)
                } else if let catalogError = model.catalogError {
                    InlineNotice(message: catalogError)
                } else if let reviewsError = model.reviewsError {
                    InlineNotice(message: reviewsError)
                }
            }
        }
        .padding(.horizontal, 16)
        .padding(.top, 8)
    }
}

private struct SearchSuggestionPanel: View {
    let searchText: String
    let recentSuggestions: [SearchSuggestion]
    let localSuggestions: [SearchSuggestion]
    let remoteSuggestions: [SearchSuggestion]
    let isLoading: Bool
    let message: String?
    let onClearRecentSearches: () -> Void
    let onSelect: (SearchSuggestion) -> Void

    private var shouldShowEmptyState: Bool {
        !searchText.isEmpty
            && localSuggestions.isEmpty
            && remoteSuggestions.isEmpty
            && !isLoading
            && message == nil
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            if searchText.isEmpty {
                if recentSuggestions.isEmpty {
                    Text("주소나 장소를 검색하면 최근 검색이 여기에 저장됩니다.")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                } else {
                    VStack(alignment: .leading, spacing: 10) {
                        HStack {
                            Text("최근 검색")
                                .font(.caption.weight(.semibold))
                                .foregroundStyle(.secondary)
                            Spacer()
                            Button("전체 삭제", role: .destructive, action: onClearRecentSearches)
                                .font(.caption.weight(.semibold))
                                .buttonStyle(.plain)
                        }

                        VStack(spacing: 10) {
                            ForEach(recentSuggestions) { suggestion in
                                Button {
                                    onSelect(suggestion)
                                } label: {
                                    SearchSuggestionRow(suggestion: suggestion)
                                }
                                .buttonStyle(.plain)
                            }
                        }
                    }
                }
            } else {
                if !localSuggestions.isEmpty {
                    SearchSuggestionSection(
                        title: "유치원 바로가기",
                        suggestions: localSuggestions,
                        onSelect: onSelect
                    )
                }

                if !remoteSuggestions.isEmpty {
                    SearchSuggestionSection(
                        title: "주소 / 장소",
                        suggestions: remoteSuggestions,
                        onSelect: onSelect
                    )
                }

                if isLoading {
                    HStack(spacing: 8) {
                        ProgressView()
                            .controlSize(.small)
                        Text("Kakao Local 제안을 불러오는 중")
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                    }
                }

                if let message {
                    HStack(spacing: 8) {
                        Image(systemName: "info.circle.fill")
                            .foregroundStyle(sunYellow)
                        Text(message)
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                    }
                }

                if shouldShowEmptyState {
                    Text("일치하는 제안을 찾지 못했습니다. 다른 주소나 장소명을 입력해 보세요.")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

private struct SearchSuggestionSection: View {
    let title: String
    let suggestions: [SearchSuggestion]
    let onSelect: (SearchSuggestion) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(title)
                .font(.caption.weight(.semibold))
                .foregroundStyle(.secondary)

            VStack(spacing: 10) {
                ForEach(suggestions) { suggestion in
                    Button {
                        onSelect(suggestion)
                    } label: {
                        SearchSuggestionRow(suggestion: suggestion)
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }
}

private struct SearchSuggestionRow: View {
    let suggestion: SearchSuggestion

    private var iconName: String {
        switch suggestion.kind {
        case .recent:
            return "clock.arrow.circlepath"
        case .kindergarten:
            return "building.2.fill"
        case .address:
            return "mappin.and.ellipse"
        case .place:
            return "sparkle.magnifyingglass"
        }
    }

    private var badgeLabel: String {
        switch suggestion.kind {
        case .recent:
            return "최근"
        case .kindergarten:
            return "기관"
        case .address:
            return "주소"
        case .place:
            return "장소"
        }
    }

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: iconName)
                .font(.title3)
                .foregroundStyle(leafGreen)
                .frame(width: 28)

            VStack(alignment: .leading, spacing: 4) {
                Text(suggestion.title)
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(.primary)
                    .lineLimit(1)

                if let subtitle = suggestion.subtitle, !subtitle.isEmpty {
                    Text(subtitle)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .lineLimit(2)
                }
            }

            Spacer(minLength: 12)

            Text(badgeLabel)
                .font(.caption2.weight(.semibold))
                .foregroundStyle(leafGreen)
                .padding(.horizontal, 8)
                .padding(.vertical, 5)
                .background(leafGreen.opacity(0.12), in: Capsule())
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(.white.opacity(0.86), in: RoundedRectangle(cornerRadius: 20, style: .continuous))
    }
}

private struct ResultSheet: View {
    let results: [Kindergarten]
    let comparedIDs: Set<String>
    let favoriteIDs: Set<String>
    let reviewCounts: [String: Int]
    let onSelect: (Kindergarten) -> Void
    let onToggleCompare: (Kindergarten) -> Void
    let onToggleFavorite: (Kindergarten) -> Void

    var body: some View {
        VStack(spacing: 12) {
            Capsule()
                .fill(Color.secondary.opacity(0.22))
                .frame(width: 42, height: 5)
                .padding(.top, 8)

            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("탐색 결과")
                        .font(.headline.weight(.bold))
                    Text("\(results.count)개 기관")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                        .accessibilityIdentifier("search.resultCountLabel")
                }
                Spacer()
            }

            ScrollView {
                if results.isEmpty {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("선택한 위치 주변에 표시할 기관이 없습니다.")
                            .font(.subheadline.weight(.semibold))
                        Text("반경을 넓히거나 다른 주소, 장소, 유치원명을 선택해 보세요.")
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(18)
                    .background(.white.opacity(0.82), in: RoundedRectangle(cornerRadius: 22, style: .continuous))
                } else {
                    LazyVStack(spacing: 12) {
                        ForEach(results.prefix(10)) { kindergarten in
                            SearchResultCard(
                                kindergarten: kindergarten,
                                isCompared: comparedIDs.contains(kindergarten.kindercode),
                                isFavorite: favoriteIDs.contains(kindergarten.kindercode),
                                reviewCount: reviewCounts[kindergarten.kindercode] ?? 0,
                                onTap: { onSelect(kindergarten) },
                                onToggleCompare: { onToggleCompare(kindergarten) },
                                onToggleFavorite: { onToggleFavorite(kindergarten) }
                            )
                        }
                    }
                    .padding(.bottom, 8)
                }
            }
            .frame(maxHeight: 360)
        }
        .padding(.horizontal, 16)
        .padding(.bottom, 16)
        .background(.ultraThinMaterial)
        .background(
            RoundedRectangle(cornerRadius: 30, style: .continuous)
                .fill(.white.opacity(0.84))
        )
        .overlay(
            RoundedRectangle(cornerRadius: 30, style: .continuous)
                .stroke(Color.white.opacity(0.8), lineWidth: 1)
        )
    }
}

private struct SearchResultCard: View {
    let kindergarten: Kindergarten
    let isCompared: Bool
    let isFavorite: Bool
    let reviewCount: Int
    let onTap: () -> Void
    let onToggleCompare: () -> Void
    let onToggleFavorite: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Button(action: onTap) {
                VStack(alignment: .leading, spacing: 6) {
                    Text(kindergarten.name)
                        .font(.headline.weight(.semibold))
                        .foregroundStyle(.primary)
                    HStack(spacing: 8) {
                        Text(kindergarten.type.label)
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(leafGreen)
                            .padding(.horizontal, 10)
                            .padding(.vertical, 5)
                            .background(leafGreen.opacity(0.12), in: Capsule())
                        Text(String(format: "%.1fkm", kindergarten.distance))
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }

                    Text(kindergarten.address)
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                        .lineLimit(2)

                    HStack(spacing: 14) {
                        Label("정원 \(kindergarten.capacity)", systemImage: "person.3.fill")
                        Label(kindergarten.hasBus ? "셔틀 \(kindergarten.busCount)대" : "셔틀 없음", systemImage: "bus")
                        Label("후기 \(reviewCount)", systemImage: "bubble.left.and.text.bubble.right")
                    }
                    .font(.caption)
                    .foregroundStyle(.secondary)
                }
                .accessibilityIdentifier("search.resultCard.\(kindergarten.kindercode)")
                .frame(maxWidth: .infinity, alignment: .leading)
            }
            .buttonStyle(.plain)

            HStack {
                Button(action: onToggleFavorite) {
                    Image(systemName: isFavorite ? "heart.fill" : "heart")
                        .font(.title3)
                        .foregroundStyle(isFavorite ? sunYellow : warmSand)
                }
                .buttonStyle(.plain)

                Spacer()
                Button(action: onToggleCompare) {
                    Label(
                        isCompared ? "비교중" : "비교 추가",
                        systemImage: isCompared ? "checkmark.circle.fill" : "plus.circle"
                    )
                    .font(.footnote.weight(.semibold))
                    .padding(.horizontal, 12)
                    .padding(.vertical, 8)
                    .background(isCompared ? leafGreen.opacity(0.14) : warmSand.opacity(0.12), in: Capsule())
                    .foregroundStyle(isCompared ? leafGreen : .primary)
                }
                .accessibilityIdentifier("search.compareToggle.\(kindergarten.kindercode)")
                .buttonStyle(.plain)
            }
        }
        .padding(16)
        .background(.white.opacity(0.92), in: RoundedRectangle(cornerRadius: 24, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 24, style: .continuous)
                .stroke(Color.white.opacity(0.76), lineWidth: 1)
        )
    }
}

private struct KindergartenDetailSheet: View {
    let kindergarten: Kindergarten
    let reviews: [ReviewLink]
    let isCompared: Bool
    let isFavorite: Bool
    let onToggleCompare: () -> Void
    let onToggleFavorite: () -> Void

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                VStack(alignment: .leading, spacing: 8) {
                    Text(kindergarten.name)
                        .font(.title2.weight(.bold))
                    Text(kindergarten.address)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }

                HStack(spacing: 12) {
                    MetricPill(label: "거리", value: String(format: "%.1fkm", kindergarten.distance))
                    MetricPill(label: "1인당 면적", value: String(format: "%.1f㎡", kindergarten.areaPerChild))
                    MetricPill(label: "정원", value: "\(kindergarten.capacity)명")
                }

                HStack(spacing: 10) {
                    Button(action: onToggleFavorite) {
                        Label(
                            isFavorite ? "찜 해제" : "찜하기",
                            systemImage: isFavorite ? "heart.slash.fill" : "heart.fill"
                        )
                        .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.bordered)
                    .tint(sunYellow)

                    Button(action: onToggleCompare) {
                        Label(
                            isCompared ? "비교 해제" : "비교 추가",
                            systemImage: isCompared ? "checkmark.circle.fill" : "plus.circle.fill"
                        )
                        .frame(maxWidth: .infinity)
                    }
                    .accessibilityIdentifier("search.detailCompareToggle.\(kindergarten.kindercode)")
                    .buttonStyle(.borderedProminent)
                    .tint(leafGreen)
                }

                VStack(alignment: .leading, spacing: 10) {
                    Text("후기")
                        .font(.headline.weight(.semibold))

                    if reviews.isEmpty {
                        Text("원격 리뷰를 우선 조회했고, 현재 보여줄 후기가 없습니다.")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    } else {
                        ForEach(reviews.prefix(3)) { review in
                            VStack(alignment: .leading, spacing: 6) {
                                Text(review.title)
                                    .font(.subheadline.weight(.semibold))
                                Text(review.snippet)
                                    .font(.footnote)
                                    .foregroundStyle(.secondary)
                                HStack(spacing: 8) {
                                    Text(review.sourceName ?? review.source)
                                    if let date = review.date {
                                        Text(date)
                                    }
                                }
                                .font(.caption)
                                .foregroundStyle(.secondary)
                            }
                            .padding(14)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .background(.white, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
                        }
                    }
                }
            }
            .padding(24)
        }
        .background(mistWhite)
    }
}

private struct PersistentCompareBar: View {
    let count: Int

    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text("비교할 기관 \(count)개")
                    .font(.subheadline.weight(.bold))
                Text("딥링크와 재실행 이후에도 유지됩니다.")
                    .font(.caption)
                    .foregroundStyle(.white.opacity(0.82))
            }
            Spacer()
            Image(systemName: "arrow.right.circle.fill")
                .font(.title2)
        }
        .padding(.horizontal, 18)
        .padding(.vertical, 14)
        .background(leafGreen, in: Capsule())
        .foregroundStyle(.white)
        .shadow(color: leafGreen.opacity(0.24), radius: 18, y: 8)
        .accessibilityIdentifier("search.compareBar")
    }
}

private struct FilterChip: View {
    let label: String
    let isActive: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(label)
                .font(.footnote.weight(.semibold))
                .padding(.horizontal, 14)
                .padding(.vertical, 10)
                .background(isActive ? leafGreen.opacity(0.14) : .white.opacity(0.82), in: Capsule())
                .foregroundStyle(isActive ? leafGreen : .primary)
                .overlay(
                    Capsule()
                        .stroke(isActive ? leafGreen.opacity(0.25) : warmSand.opacity(0.28), lineWidth: 1)
                )
        }
        .buttonStyle(.plain)
    }
}

private struct MetricPill: View {
    let label: String
    let value: String

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label)
                .font(.caption)
                .foregroundStyle(.secondary)
            Text(value)
                .font(.subheadline.weight(.semibold))
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(.white, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
    }
}

private struct InlineNotice: View {
    let message: String

    var body: some View {
        HStack(spacing: 8) {
            Image(systemName: "info.circle.fill")
                .foregroundStyle(sunYellow)
            Text(message)
                .font(.caption)
                .foregroundStyle(.secondary)
            Spacer()
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 10)
        .background(.white.opacity(0.86), in: RoundedRectangle(cornerRadius: 18, style: .continuous))
    }
}

public enum NativePreviewFixtures {
    public static let kindergartens: [KindergartenRaw] = [
        KindergartenRaw(
            kindercode: "A001",
            name: "역삼유치원",
            address: "서울 강남구 역삼로 123",
            lat: 37.4981,
            lng: 127.0276,
            type: .public,
            phone: "02-1234-5678",
            homepage: "https://example.com",
            operationHours: "09:00-17:00",
            sidoCode: "11",
            sigunguCode: "11680",
            capacity: 40,
            currentCount: 32,
            classCountAge3: 1,
            classCountAge4: 1,
            classCountAge5: 1,
            capacityAge3: 12,
            capacityAge4: 14,
            capacityAge5: 14,
            currentAge3: 10,
            currentAge4: 10,
            currentAge5: 12,
            classCountMix: 0,
            capacityMix: 0,
            currentMix: 0,
            capacitySpecial: 0,
            currentSpecial: 0,
            establishDate: "20160302",
            hasBus: true,
            busCount: 1,
            mealType: .direct,
            hasAfterSchool: true,
            areaPerChild: 4.9,
            hasPlayground: true,
            buildingYear: 2016,
            floorInfo: "지상 3층",
            classroomArea: 180,
            indoorPlaygroundArea: 36,
            outdoorPlaygroundArea: 82,
            teacherCount: 8,
            seniorTeacherCount: 2,
            cctvCount: 12
        ),
        KindergartenRaw(
            kindercode: "A002",
            name: "해맑은유치원",
            address: "서울 강남구 도곡로 47",
            lat: 37.4922,
            lng: 127.0411,
            type: .private,
            phone: "02-9876-5432",
            homepage: nil,
            operationHours: "09:00-18:00",
            sidoCode: "11",
            sigunguCode: "11680",
            capacity: 48,
            currentCount: 41,
            classCountAge3: 1,
            classCountAge4: 1,
            classCountAge5: 2,
            capacityAge3: 10,
            capacityAge4: 12,
            capacityAge5: 20,
            currentAge3: 9,
            currentAge4: 11,
            currentAge5: 18,
            classCountMix: 0,
            capacityMix: 0,
            currentMix: 0,
            capacitySpecial: 0,
            currentSpecial: 0,
            establishDate: "20110302",
            hasBus: true,
            busCount: 2,
            mealType: .outsourced,
            hasAfterSchool: true,
            areaPerChild: 5.8,
            hasPlayground: true,
            buildingYear: 2012,
            floorInfo: "지상 4층",
            classroomArea: 210,
            indoorPlaygroundArea: 44,
            outdoorPlaygroundArea: 66,
            teacherCount: 10,
            seniorTeacherCount: 3,
            cctvCount: 16
        ),
        KindergartenRaw(
            kindercode: "A003",
            name: "도담유치원",
            address: "서울 서초구 서운로 31",
            lat: 37.4915,
            lng: 127.0177,
            type: .public,
            phone: "02-5555-1111",
            homepage: "https://example.com/dodam",
            operationHours: "09:00-17:00",
            sidoCode: "11",
            sigunguCode: "11650",
            capacity: 36,
            currentCount: 24,
            classCountAge3: 1,
            classCountAge4: 1,
            classCountAge5: 1,
            capacityAge3: 12,
            capacityAge4: 12,
            capacityAge5: 12,
            currentAge3: 8,
            currentAge4: 8,
            currentAge5: 8,
            classCountMix: 0,
            capacityMix: 0,
            currentMix: 0,
            capacitySpecial: 0,
            currentSpecial: 0,
            establishDate: "20190304",
            hasBus: false,
            busCount: 0,
            mealType: .direct,
            hasAfterSchool: false,
            areaPerChild: 6.2,
            hasPlayground: true,
            buildingYear: 2019,
            floorInfo: "지상 2층",
            classroomArea: 190,
            indoorPlaygroundArea: 28,
            outdoorPlaygroundArea: 74,
            teacherCount: 7,
            seniorTeacherCount: 2,
            cctvCount: 10
        ),
    ]
}

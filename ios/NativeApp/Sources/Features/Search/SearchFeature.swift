import Foundation
import Models
import Services
import SwiftUI

public struct SearchHomeView: View {
    @ObservedObject private var model: NativeAppModel
    @State private var mapRuntimeMessage: String?
    @State private var isSearchPanelPresented = false
    private let bottomStackSpacing: CGFloat = 12

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

    private var trimmedSearchQuery: String {
        model.searchText.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    private var resultSummaryText: String {
        [
            "\(model.results.count)개 기관",
            "반경 \(Int(model.filters.radiusKM))km",
            model.filters.sort.label,
        ].joined(separator: " · ")
    }

    private var resultDegradedMessage: String? {
        if let reviewsError = model.reviewsError {
            return "후기 데이터를 불러오지 못해 후기 수가 비어 있을 수 있습니다. \(reviewsError)"
        }

        guard !model.configuration.hasKakaoRESTAPIKey else {
            return nil
        }

        return "원격 주소/장소 제안은 현재 비활성화되어 유치원명과 최근 검색 중심으로 탐색 중입니다."
    }

    private var mapStatusMessage: String? {
        if let mapRuntimeMessage {
            return mapRuntimeMessage
        }

        if !model.configuration.hasKakaoMapKey {
            return "Kakao Maps 설정이 없어 지도 대신 안전한 배경 상태를 표시합니다."
        }

        return nil
    }

    public var body: some View {
        NavigationStack {
            ZStack(alignment: .top) {
                KakaoSearchMapSurface(
                    appKey: model.configuration.kakaoAppKey,
                    center: model.userLocation,
                    currentLocation: model.currentDeviceLocation,
                    markers: mapMarkers,
                    selectedKindergartenID: model.selectedKindergarten?.kindercode,
                    runtimeMessage: $mapRuntimeMessage,
                    showsStatusCard: true
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
                        isSuggestionPanelPresented: $isSearchPanelPresented,
                        mapStatusMessage: mapStatusMessage
                    )
                    Spacer()
                }
            }
            .animation(.easeInOut(duration: 0.18), value: isSearchPanelPresented)
            .task {
                if model.isFirstLaunch {
                    await model.centerOnCurrentLocation()
                    model.completeFirstLaunch()
                }
                await model.bootstrapIfNeeded()
            }
            .safeAreaInset(edge: .bottom) {
                if !isSearchPanelPresented {
                    VStack(spacing: bottomStackSpacing) {
                        if !model.compareSelection.ids.isEmpty {
                            CompareFloatingBar(
                                count: model.compareSelection.ids.count,
                                names: model.comparedKindergartenNames(),
                                onNavigateToCompare: { model.selectedTab = .compare },
                                onRemoveAt: { model.removeCompare(at: $0) }
                            )
                            .animation(.spring(duration: 0.35), value: model.compareSelection.ids.count)
                        }

                        ResultSheet(
                            model: model,
                            summaryText: resultSummaryText,
                            degradedMessage: resultDegradedMessage,
                            trimmedSearchQuery: trimmedSearchQuery,
                            adUnitID: model.configuration.adMobBannerUnitID
                        )
                    }
                    .padding(.bottom, 6)
                }
            }
            .sheet(item: sheetSelection) { kindergarten in
                KindergartenDetailSheet(
                    kindergarten: kindergarten,
                    reviews: model.reviews(for: kindergarten.kindercode),
                    reviewsVersion: model.reviewsData?.version,
                    isCompared: model.isCompared(kindergarten),
                    isFavorite: model.isFavorite(kindergarten),
                    onToggleCompare: { model.toggleCompare(for: kindergarten) },
                    onToggleFavorite: { model.toggleFavorite(for: kindergarten) }
                )
                .presentationDetents([.large, .medium])
                .presentationDragIndicator(.visible)
            }
        }
    }
}

private struct SearchChrome: View {
    @ObservedObject var model: NativeAppModel
    @Binding var isSuggestionPanelPresented: Bool
    let mapStatusMessage: String?
    @FocusState private var isSearchFieldFocused: Bool
    @State private var isAdvancedFilterPresented = false

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

    private var advancedFilterChipLabel: String {
        let count = model.activeAdvancedFilterCount
        return count > 0 ? "필터 +\(count)" : "필터"
    }

    private var headerTitle: String {
        let label = model.locationLabel.trimmingCharacters(in: .whitespacesAndNewlines)
        return label.isEmpty ? "우리동네 기준 탐색" : "\(label) 기준 탐색"
    }

    private var headerSubtitle: String {
        if model.currentDeviceLocation != nil {
            return "실제 기기 위치는 저장하지 않고 검색 기준으로만 사용합니다."
        }

        if model.locationError != nil {
            return "위치 권한 없이도 주소나 장소명 기준으로 탐색할 수 있습니다."
        }

        if !model.recentSearches.isEmpty {
            return "위치 저장 안 함 · 최근 검색 기준을 바로 복원할 수 있어요."
        }

        return "위치 저장 안 함 · 현재 위치 또는 주소 기준으로 탐색하세요."
    }

    var body: some View {
        VStack(spacing: 12) {
            VStack(spacing: 0) {
                NativeScreenHeader(
                    eyebrow: "우리동네 유치원 탐색",
                    title: headerTitle,
                    subtitle: headerSubtitle
                ) {
                    Button {
                        Task {
                            await model.centerOnCurrentLocation()
                        }
                    } label: {
                        HStack(spacing: 7) {
                            Image(systemName: "location.fill")
                                .font(.caption.weight(.bold))
                            Text("현위치")
                                .font(.footnote.weight(.semibold))
                        }
                        .foregroundStyle(inkBlack)
                        .padding(.horizontal, 14)
                        .padding(.vertical, 10)
                        .background(jadeGreen.opacity(0.20), in: Capsule())
                        .overlay(
                            Capsule()
                                .stroke(jadeGreen.opacity(0.18), lineWidth: 1)
                        )
                    }
                    .buttonStyle(.plain)
                }
                .padding(.horizontal, 18)
                .padding(.top, 40)
                .padding(.bottom, 10)

                VStack(spacing: 0) {
                    HStack(spacing: 12) {
                        ZStack {
                            Circle()
                                .fill(jadeGreen.opacity(0.16))
                                .frame(width: 34, height: 34)
                            Image(systemName: "magnifyingglass")
                                .foregroundStyle(jadeDeep)
                        }

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
                        .foregroundStyle(inkBlack)
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
                                .font(.body)
                                .foregroundStyle(model.searchText.isEmpty ? slateSoft.opacity(0.45) : slateBlue)
                        }
                        .accessibilityIdentifier("search.clearQuery")
                        .opacity(model.searchText.isEmpty ? 0 : 1)
                    }
                    .padding(.horizontal, 18)
                    .padding(.vertical, 16)
                    .background(
                        RoundedRectangle(cornerRadius: 24, style: .continuous)
                            .fill(paperWhite.opacity(0.88))
                    )

                    if shouldShowSuggestionPanel && hasSuggestionContent {
                        Divider()
                            .overlay(lineSoft)
                            .padding(.horizontal, 18)
                            .padding(.top, 14)

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
                            .padding(.horizontal, 18)
                            .padding(.vertical, 18)
                        }
                        .frame(maxHeight: 280)
                    }
                }
                .padding(.horizontal, 18)
                .padding(.bottom, 14)
            }
            .glassPanel(cornerRadius: 32)
            .onChange(of: isSearchFieldFocused) { _, isFocused in
                isSuggestionPanelPresented = isFocused
            }
            .onChange(of: isSuggestionPanelPresented) { _, isPresented in
                if !isPresented, isSearchFieldFocused {
                    isSearchFieldFocused = false
                }
            }
            .onChange(of: model.shouldFocusSearchField) { _, shouldFocus in
                if shouldFocus {
                    isSearchFieldFocused = true
                    model.shouldFocusSearchField = false
                }
            }

            if !shouldShowSuggestionPanel {
                VStack(spacing: 8) {
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 10) {
                            FilterChip(label: "반경 \(Int(model.filters.radiusKM))km", isActive: true) {
                                let nextRadius: Double = model.filters.radiusKM == 1 ? 2 : model.filters.radiusKM == 2 ? 5 : 1
                                model.updateRadius(to: nextRadius)
                            }
                            .sensoryFeedback(.selection, trigger: model.filters.radiusKM)
                            FilterChip(label: model.filters.sort.label, isActive: true) {
                                let next: SortOption = model.filters.sort == .distance ? .capacity : model.filters.sort == .capacity ? .areaPerChild : .distance
                                model.updateSort(to: next)
                            }
                            .sensoryFeedback(.selection, trigger: model.filters.sort)
                            FilterChip(label: "셔틀", isActive: model.filters.hasBus == true) {
                                model.toggleBusFilter()
                            }
                            FilterChip(label: advancedFilterChipLabel, isActive: model.activeAdvancedFilterCount > 0) {
                                isAdvancedFilterPresented = true
                            }
                        }
                        .padding(.horizontal, 2)
                    }

                    if !model.activeAdvancedFilterDescriptions.isEmpty {
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 8) {
                                ForEach(Array(model.activeAdvancedFilterDescriptions.enumerated()), id: \.offset) { _, desc in
                                    Button {
                                        desc.reset()
                                    } label: {
                                        HStack(spacing: 4) {
                                            Text(desc.label)
                                                .font(.caption2.weight(.semibold))
                                            Image(systemName: "xmark")
                                                .font(.system(size: 8, weight: .bold))
                                        }
                                        .padding(.horizontal, 10)
                                        .padding(.vertical, 6)
                                        .background(jadeGreen.opacity(0.12), in: Capsule())
                                        .overlay(
                                            Capsule()
                                                .stroke(jadeGreen.opacity(0.18), lineWidth: 1)
                                        )
                                        .foregroundStyle(jadeDeep)
                                    }
                                    .buttonStyle(.plain)
                                }
                            }
                            .padding(.horizontal, 2)
                        }
                    }
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

                if let mapStatusMessage {
                    CompactMapStatusCard(message: mapStatusMessage)
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
        .sheet(isPresented: $isAdvancedFilterPresented) {
            AdvancedFilterSheet(model: model)
                .presentationDetents([.medium])
        }
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
                .font(.caption.weight(.heavy))
                .foregroundStyle(slateSoft)
                .textCase(.uppercase)

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
            ZStack {
                Circle()
                    .fill(jadeGreen.opacity(0.16))
                    .frame(width: 36, height: 36)
                Image(systemName: iconName)
                    .font(.callout.weight(.bold))
                    .foregroundStyle(jadeDeep)
            }

            VStack(alignment: .leading, spacing: 4) {
                Text(suggestion.title)
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(inkBlack)
                    .lineLimit(1)

                if let subtitle = suggestion.subtitle, !subtitle.isEmpty {
                    Text(subtitle)
                        .font(.caption)
                        .foregroundStyle(slateBlue)
                        .lineLimit(2)
                }
            }

            Spacer(minLength: 12)

            NativeBadge(badgeLabel, tone: suggestion.kind == .place ? .sun : .jade)
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .solidPanel(cornerRadius: 22, tint: paperWhite.opacity(0.88))
    }
}

private struct ResultSheet: View {
    @ObservedObject var model: NativeAppModel
    let summaryText: String
    let degradedMessage: String?
    let trimmedSearchQuery: String
    let adUnitID: String

    private var results: [Kindergarten] { model.results }
    private var isLoading: Bool { model.isCatalogLoading || model.isReviewsLoading }
    private var comparedIDs: Set<String> { Set(model.compareSelection.ids) }
    private var favoriteIDs: Set<String> { Set(model.favorites.map(\.kindercode)) }
    private var sectionTitle: String {
        guard !results.isEmpty else { return "탐색 결과" }
        let count = min(results.count, 3)
        return "\(model.locationLabel)에서 우선 볼 \(count)곳"
    }

    @ViewBuilder
    private var emptyContent: some View {
        if isLoading && results.isEmpty {
            VStack(spacing: 12) {
                SkeletonCard()
                SkeletonCard()
                SkeletonCard()
            }
        } else if let catalogError = model.catalogError {
            EmptyStateView(
                icon: "exclamationmark.triangle",
                title: "데이터를 불러올 수 없습니다",
                message: catalogError,
                ctaLabel: "다시 시도"
            ) {
                Task { await model.loadCatalog() }
            }
        } else if results.isEmpty && trimmedSearchQuery.isEmpty && !model.hasActiveAdvancedFilters && model.catalogError == nil {
            if model.locationError != nil {
                EmptyStateView(
                    icon: "location.slash",
                    title: "위치 권한이 필요합니다",
                    message: "주소를 입력하면 주변 유치원을 찾을 수 있어요"
                )
            } else if model.currentDeviceLocation != nil || !model.recentSearches.isEmpty {
                EmptyStateView(
                    icon: "map",
                    title: "반경 \(Int(model.filters.radiusKM))km 내 유치원이 없습니다",
                    message: "반경을 넓히면 더 많은 유치원을 찾을 수 있습니다.",
                    ctaLabel: "반경 넓히기"
                ) {
                    model.updateRadius(to: model.nextRadius)
                }
            } else {
                EmptyStateView(
                    icon: "magnifyingglass",
                    title: "주변 유치원을 찾아보세요",
                    message: "현재 위치 또는 주소를 검색하면 주변 유치원 목록이 나타납니다.",
                    ctaLabel: "현재 위치로 검색"
                ) {
                    Task { await model.centerOnCurrentLocation() }
                }
            }
        } else if results.isEmpty && !trimmedSearchQuery.isEmpty {
            EmptyStateView(
                icon: "magnifyingglass",
                title: "'\(trimmedSearchQuery)' 검색 결과 없음",
                message: "반경을 넓히거나 다른 주소, 장소, 유치원명을 선택해 보세요."
            )
        } else if results.isEmpty && model.hasActiveAdvancedFilters {
            EmptyStateView(
                icon: "line.3.horizontal.decrease.circle",
                title: "조건에 맞는 유치원이 없습니다",
                message: "필터 조건을 줄이거나 초기화해 보세요.",
                ctaLabel: "필터 초기화"
            ) {
                model.resetFilters()
            }
        }
    }

    var body: some View {
        VStack(spacing: 12) {
            Capsule()
                .fill(slateSoft.opacity(0.26))
                .frame(width: 42, height: 5)
                .padding(.top, 8)

            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 4) {
                    NativeBadge(results.isEmpty ? "탐색 결과" : "먼저 볼 이유", tone: .slate)

                    Text(sectionTitle)
                        .font(.title3.weight(.bold))
                        .foregroundStyle(inkBlack)
                    Text(summaryText)
                        .font(.footnote)
                        .foregroundStyle(slateBlue)
                        .accessibilityIdentifier("search.resultCountLabel")
                }
                Spacer()
            }

            if let degradedMessage {
                InlineNotice(message: degradedMessage)
            }

            ScrollView {
                if results.isEmpty {
                    emptyContent
                } else {
                    LazyVStack(spacing: 12) {
                        ForEach(results) { kindergarten in
                            SearchResultCard(
                                kindergarten: kindergarten,
                                isCompared: comparedIDs.contains(kindergarten.kindercode),
                                isFavorite: favoriteIDs.contains(kindergarten.kindercode),
                                reviewCount: model.reviews(for: kindergarten.kindercode).count,
                                onTap: { model.select(kindergarten: kindergarten) },
                                onToggleCompare: { model.toggleCompare(for: kindergarten) },
                                onToggleFavorite: { model.toggleFavorite(for: kindergarten) },
                                reviewsVersion: model.reviewsData?.version
                            )
                        }

                        #if canImport(GoogleMobileAds)
                        NativeAdBanner(adUnitID: adUnitID)
                            .padding(.top, 4)
                        #endif
                    }
                    .padding(.bottom, 8)
                }
            }
            #if canImport(UIKit)
            .frame(maxHeight: UIScreen.main.bounds.height * 0.45)
            #else
            .frame(maxHeight: 420)
            #endif
        }
        .padding(.horizontal, 16)
        .padding(.bottom, 16)
        .glassPanel(cornerRadius: 34)
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

    @ScaledMetric(relativeTo: .body) private var cardPadding: CGFloat = 16

    private var distanceText: String {
        kindergarten.distance >= 0 ? String(format: "%.1fkm", kindergarten.distance) : "거리 미확인"
    }

    private var trustSummary: String {
        var items: [String] = []

        if kindergarten.homepage?.isEmpty == false {
            items.append("공식 웹사이트 확인 가능")
        }

        if kindergarten.hasBus {
            items.append("셔틀 \(kindergarten.busCount)대")
        }

        if kindergarten.hasAfterSchool {
            items.append("방과후 운영")
        }

        if items.isEmpty {
            items.append("교육부 공식 데이터 기준")
        }

        return items.prefix(2).joined(separator: " · ")
    }

    private var supportLine: String {
        var items: [String] = []

        if kindergarten.currentCount < kindergarten.capacity {
            items.append("정원 여유 \(kindergarten.capacity - kindergarten.currentCount)명")
        }

        if kindergarten.areaPerChild > 0 {
            items.append(String(format: "1인당 %.1f㎡", kindergarten.areaPerChild))
        }

        if reviewCount > 0 {
            items.append("후기 \(reviewCount)건")
        }

        return items.prefix(3).joined(separator: " · ")
    }

    private var trustItems: [String] {
        var items = ["공식 데이터"]

        if let reviewsVersion, !reviewsVersion.isEmpty {
            items.append("업데이트 \(reviewsVersion)")
        }

        if kindergarten.indoorPlaygroundArea > 0 {
            items.append("실내놀이 \(Int(kindergarten.indoorPlaygroundArea))㎡")
        } else if kindergarten.areaPerChild > 0 {
            items.append(String(format: "공간 %.1f㎡", kindergarten.areaPerChild))
        }

        return Array(items.prefix(3))
    }

    let reviewsVersion: String?

    var body: some View {
        HStack(alignment: .top, spacing: 14) {
            VStack(alignment: .leading, spacing: 12) {
                HStack(alignment: .top) {
                    HStack(spacing: 8) {
                        NativeBadge(kindergarten.type.label)
                        if reviewCount > 0 {
                            NativeBadge("후기 \(reviewCount)건", tone: .sun)
                        }
                    }
                    Spacer(minLength: 12)
                    Text(distanceText)
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(slateBlue)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 6)
                        .background(slateBlue.opacity(0.08), in: Capsule())
                }

                VStack(alignment: .leading, spacing: 6) {
                    Text(kindergarten.name)
                        .font(.headline.weight(.bold))
                        .foregroundStyle(inkBlack)
                        .lineLimit(1)

                    Text(trustSummary)
                        .font(.subheadline)
                        .foregroundStyle(slateBlue)
                }

                HStack(spacing: 8) {
                    if kindergarten.hasBus {
                        NativeBadge("셔틀 \(kindergarten.busCount)대")
                    }
                    if kindergarten.hasAfterSchool {
                        NativeBadge("방과후", tone: .slate)
                    }
                    if kindergarten.areaPerChild >= 5 {
                        NativeBadge("넓은 공간", tone: .sun)
                    }
                }

                if !supportLine.isEmpty {
                    Text(supportLine)
                        .font(.caption)
                        .foregroundStyle(slateSoft)
                }

                HStack(spacing: 8) {
                    ForEach(trustItems, id: \.self) { item in
                        Text(item)
                            .font(.caption2.weight(.semibold))
                            .foregroundStyle(slateBlue)
                    }
                }
            }

            VStack(spacing: 10) {
                Button(action: onToggleCompare) {
                    Image(systemName: isCompared ? "checkmark" : "plus")
                        .font(.system(size: 14, weight: .black))
                        .foregroundStyle(isCompared ? inkBlack : jadeDeep)
                        .frame(width: 38, height: 38)
                        .background(
                            Circle()
                                .fill(isCompared ? jadeGreen.opacity(0.90) : jadeGreen.opacity(0.16))
                        )
                }
                .accessibilityIdentifier("search.compareToggle.\(kindergarten.kindercode)")
                .buttonStyle(.plain)
                .sensoryFeedback(.impact(flexibility: .soft), trigger: isCompared)

                Button(action: onToggleFavorite) {
                    Image(systemName: isFavorite ? "heart.fill" : "heart")
                        .font(.system(size: 14, weight: .black))
                        .foregroundStyle(isFavorite ? inkBlack : sandDeep)
                        .frame(width: 38, height: 38)
                        .background(
                            Circle()
                                .fill(isFavorite ? sunYellow.opacity(0.92) : warmSand.opacity(0.30))
                        )
                }
                .buttonStyle(.plain)
                .sensoryFeedback(.impact(flexibility: .solid, intensity: 0.6), trigger: isFavorite)
            }
        }
        .padding(cardPadding)
        .solidPanel(cornerRadius: 30, tint: paperWhite.opacity(0.95))
        .contentShape(RoundedRectangle(cornerRadius: 30, style: .continuous))
        .onTapGesture(perform: onTap)
        .accessibilityIdentifier("search.resultCard.\(kindergarten.kindercode)")
    }
}

private struct KindergartenDetailSheet: View {
    let kindergarten: Kindergarten
    let reviews: [ReviewLink]
    let reviewsVersion: String?
    let isCompared: Bool
    let isFavorite: Bool
    let onToggleCompare: () -> Void
    let onToggleFavorite: () -> Void

    private var homepageURL: URL? {
        guard let homepage = kindergarten.homepage?.trimmingCharacters(in: .whitespacesAndNewlines),
              !homepage.isEmpty else {
            return nil
        }

        if let url = URL(string: homepage), url.scheme != nil {
            return url
        }

        return URL(string: "https://\(homepage)")
    }

    private var phoneURL: URL? {
        guard let phone = kindergarten.phone?.filter(\.isNumber), !phone.isEmpty else {
            return nil
        }

        return URL(string: "tel://\(phone)")
    }

    private var mapURL: URL? {
        var components = URLComponents(string: "http://maps.apple.com/")
        components?.queryItems = [
            URLQueryItem(name: "ll", value: "\(kindergarten.location.lat),\(kindergarten.location.lng)"),
            URLQueryItem(name: "q", value: kindergarten.name)
        ]
        return components?.url
    }

    private var formattedEstablishDate: String? {
        guard kindergarten.establishDate.count == 8 else {
            return nil
        }

        let year = kindergarten.establishDate.prefix(4)
        let monthStart = kindergarten.establishDate.index(kindergarten.establishDate.startIndex, offsetBy: 4)
        let dayStart = kindergarten.establishDate.index(kindergarten.establishDate.startIndex, offsetBy: 6)
        let month = kindergarten.establishDate[monthStart..<dayStart]
        let day = kindergarten.establishDate.suffix(2)
        return "\(year).\(month).\(day)"
    }

    private var mealTypeLabel: String {
        switch kindergarten.mealType {
        case .direct:
            return "직영"
        case .outsourced:
            return "위탁"
        case .none:
            return "정보 없음"
        }
    }

    private var buildingSummary: String {
        let year = kindergarten.buildingYear.map { "\($0)년" } ?? "연도 정보 없음"
        if let floorInfo = kindergarten.floorInfo, !floorInfo.isEmpty {
            return "\(year) · \(floorInfo)"
        }
        return year
    }

    private var playgroundSummary: String {
        guard kindergarten.hasPlayground else {
            return "없음"
        }

        let indoor = kindergarten.indoorPlaygroundArea > 0 ? "실내 \(Int(kindergarten.indoorPlaygroundArea))㎡" : nil
        let outdoor = kindergarten.outdoorPlaygroundArea > 0 ? "실외 \(Int(kindergarten.outdoorPlaygroundArea))㎡" : nil
        let details = [indoor, outdoor].compactMap { $0 }
        return details.isEmpty ? "있음" : details.joined(separator: " · ")
    }

    private var homepageSubtitle: String {
        guard let homepageURL else {
            return kindergarten.homepage ?? ""
        }

        return homepageURL.host(percentEncoded: false) ?? homepageURL.absoluteString
    }

    private var summaryTags: [(label: String, icon: String)] {
        var tags: [(String, String)] = []
        if kindergarten.distance < 0.5 {
            tags.append(("도보 5분", "figure.walk"))
        }
        if kindergarten.hasBus {
            tags.append(("셔틀 운영", "bus.fill"))
        }
        if kindergarten.hasAfterSchool {
            tags.append(("방과후", "clock.badge.checkmark"))
        }
        if kindergarten.areaPerChild >= 5 {
            tags.append(("넓은 공간", "arrow.up.left.and.arrow.down.right"))
        }
        if kindergarten.currentCount < Int(Double(kindergarten.capacity) * 0.9) {
            tags.append(("여유 정원", "person.badge.plus"))
        }
        return tags
    }

    private var hasContactInfo: Bool {
        mapURL != nil || homepageURL != nil || phoneURL != nil
    }

    private var distanceLabel: String {
        kindergarten.distance >= 0 ? String(format: "%.1fkm", kindergarten.distance) : "거리 미확인"
    }

    private var heroBadges: [(String, NativeBadge.Tone)] {
        var items: [(String, NativeBadge.Tone)] = [("공식 데이터", .slate)]

        if reviews.count > 0 {
            items.append(("후기 \(reviews.count)건", .sun))
        }

        if phoneURL != nil {
            items.append(("전화 가능", .jade))
        }

        if homepageURL != nil {
            items.append(("웹사이트 있음", .jade))
        }

        return Array(items.prefix(3))
    }

    private var recommendationSummary: String {
        var reasons: [String] = []

        if kindergarten.distance < 1.0 {
            reasons.append("등하원 동선이 짧고")
        }

        if kindergarten.hasBus {
            reasons.append("셔틀 운영 여부를 바로 확인할 수 있으며")
        }

        if homepageURL != nil {
            reasons.append("공식 웹사이트를 함께 검토할 수 있습니다")
        } else if reviews.count > 0 {
            reasons.append("후기 출처가 있어 추가 판단 근거를 확보할 수 있습니다")
        }

        if reasons.isEmpty {
            reasons.append("공식 데이터 기준으로 핵심 운영 지표를 빠르게 검토할 수 있습니다")
        }

        return reasons.joined(separator: " ")
    }

    private var lifestyleSummary: String {
        [
            kindergarten.operationHours.map { "운영시간 \($0)" },
            kindergarten.hasBus ? "셔틀 \(kindergarten.busCount)대" : "셔틀 정보 없음",
            kindergarten.hasAfterSchool ? "방과후 운영" : "방과후 미운영",
        ]
        .compactMap { $0 }
        .joined(separator: " · ")
    }

    private var reviewSignalSummary: String {
        guard !reviews.isEmpty else {
            return "아직 수집된 후기가 없어 공식 데이터와 운영 지표를 먼저 확인하는 편이 안전합니다."
        }

        let sources = Set(reviews.compactMap { $0.sourceName ?? $0.source }).sorted()
        let latestDate = reviews.compactMap(\.date).max() ?? "날짜 미확인"
        let sourceText = sources.isEmpty ? "후기 출처 확인" : sources.prefix(2).joined(separator: ", ")
        return "\(sourceText) 기준 후기 \(reviews.count)건을 확인할 수 있고 최신 날짜는 \(latestDate)입니다."
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                HStack(spacing: 8) {
                    ForEach(Array(heroBadges.enumerated()), id: \.offset) { _, item in
                        NativeBadge(item.0, tone: item.1)
                    }
                }

                VStack(alignment: .leading, spacing: 18) {
                    Capsule()
                        .fill(slateSoft.opacity(0.24))
                        .frame(width: 46, height: 5)
                        .frame(maxWidth: .infinity)
                        .padding(.bottom, 4)

                    VStack(alignment: .leading, spacing: 8) {
                        Text(kindergarten.name)
                            .font(.title2.weight(.bold))
                            .foregroundStyle(inkBlack)
                        Text("\(kindergarten.address)\n\(kindergarten.type.label) · \(distanceLabel)")
                            .font(.subheadline)
                            .foregroundStyle(slateBlue)
                    }

                    if !summaryTags.isEmpty {
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 8) {
                                ForEach(Array(summaryTags.enumerated()), id: \.offset) { _, tag in
                                    SummaryTag(label: tag.label, icon: tag.icon)
                                }
                            }
                        }
                    }

                    LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 10) {
                        NativeMetricTile(label: "거리", value: distanceLabel)
                        NativeMetricTile(label: "후기", value: "\(reviews.count)건", accent: sunYellow)
                        NativeMetricTile(label: "1인당 면적", value: String(format: "%.1f㎡", kindergarten.areaPerChild))
                        NativeMetricTile(label: "현원 / 정원", value: "\(kindergarten.currentCount) / \(kindergarten.capacity)명")
                    }

                    HStack(spacing: 10) {
                        DetailActionButton(
                            title: isFavorite ? "찜 해제" : "찜하기",
                            systemImage: isFavorite ? "heart.slash.fill" : "heart.fill",
                            tone: .sun,
                            action: onToggleFavorite
                        )

                        DetailActionButton(
                            title: isCompared ? "비교 해제" : "비교 추가",
                            systemImage: isCompared ? "checkmark.circle.fill" : "plus.circle.fill",
                            tone: .jade,
                            action: onToggleCompare
                        )

                        if let phoneURL {
                            Link(destination: phoneURL) {
                                DetailActionButtonLabel(
                                    title: "전화",
                                    systemImage: "phone.fill",
                                    tone: .slate
                                )
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }
                .padding(22)
                .glassPanel(cornerRadius: 34)

                NativeFactSummaryCard(
                    title: "왜 먼저 볼 만한가",
                    message: recommendationSummary
                )

                NativeFactSummaryCard(
                    title: "생활 리듬",
                    message: lifestyleSummary
                )

                NativeFactSummaryCard(
                    title: "후기 신호",
                    message: reviewSignalSummary
                )

                DetailSectionCard(title: "운영 정보") {
                    LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 10) {
                        DetailFactCard(title: "유형", value: kindergarten.type.label)
                        DetailFactCard(title: "운영시간", value: kindergarten.operationHours ?? "정보 없음")
                        DetailFactCard(title: "방과후", value: kindergarten.hasAfterSchool ? "운영" : "미운영")
                        DetailFactCard(title: "셔틀", value: kindergarten.hasBus ? "\(kindergarten.busCount)대" : "없음")
                        DetailFactCard(title: "교사", value: "\(kindergarten.teacherCount)명 (경력 \(kindergarten.seniorTeacherCount)명)")
                        DetailFactCard(title: "급식", value: mealTypeLabel)
                    }
                }

                DetailSectionCard(title: "시설 정보") {
                    LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 10) {
                        DetailFactCard(title: "놀이공간", value: playgroundSummary)
                        DetailFactCard(title: "건물", value: buildingSummary)
                        DetailFactCard(title: "설립일", value: formattedEstablishDate ?? kindergarten.establishDate)
                        DetailFactCard(title: "교실 면적", value: "\(Int(kindergarten.classroomArea))m2")
                        DetailFactCard(title: "CCTV", value: "\(kindergarten.cctvCount)대")
                        DetailFactCard(title: "실내 놀이", value: kindergarten.indoorPlaygroundArea > 0 ? "\(Int(kindergarten.indoorPlaygroundArea))m2" : "없음")
                    }
                }

                DetailSectionCard(title: "후기에서 확인할 수 있는 출처") {
                    VStack(alignment: .leading, spacing: 10) {
                        if reviews.isEmpty {
                            Text("수집된 후기가 없습니다.")
                                .font(.subheadline)
                                .foregroundStyle(slateBlue)
                        } else {
                            ForEach(reviews.prefix(3)) { review in
                                if let url = URL(string: review.url) {
                                    Link(destination: url) {
                                        ReviewCard(review: review)
                                    }
                                    .buttonStyle(.plain)
                                } else {
                                    ReviewCard(review: review)
                                }
                            }

                            if reviews.count > 3 {
                                Text("상위 3건만 표시 중입니다.")
                                    .font(.caption)
                                    .foregroundStyle(slateSoft)
                            }
                        }
                    }
                }

                if hasContactInfo {
                    DetailSectionCard(title: "연락처와 추가 정보") {
                        VStack(spacing: 10) {
                            if let mapURL {
                                Link(destination: mapURL) {
                                    DetailLinkRow(
                                        title: "지도에서 보기",
                                        subtitle: kindergarten.address,
                                        systemImage: "map.fill"
                                    )
                                }
                                .buttonStyle(.plain)
                            }

                            if let homepageURL {
                                Link(destination: homepageURL) {
                                    DetailLinkRow(
                                        title: "홈페이지 열기",
                                        subtitle: homepageSubtitle,
                                        systemImage: "globe"
                                    )
                                }
                                .buttonStyle(.plain)
                            }

                            if let phoneURL, let phone = kindergarten.phone {
                                Link(destination: phoneURL) {
                                    DetailLinkRow(
                                        title: "전화하기",
                                        subtitle: phone,
                                        systemImage: "phone.fill"
                                    )
                                }
                                .buttonStyle(.plain)
                            }
                        }
                    }
                }

                Text("출처: 교육부 유치원 알리미 · 데이터 갱신: \(reviewsVersion ?? "미확인")")
                    .font(.caption2)
                    .foregroundStyle(slateSoft)
                    .frame(maxWidth: .infinity, alignment: .center)
                    .padding(.top, 8)
            }
            .padding(24)
        }
        .background {
            NativeScreenBackground(topTintOpacity: 0.14)
        }
    }
}

private struct SummaryTag: View {
    let label: String
    let icon: String

    var body: some View {
        Label(label, systemImage: icon)
            .font(.caption.weight(.semibold))
            .foregroundStyle(jadeDeep)
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .background(jadeGreen.opacity(0.12), in: Capsule())
            .overlay(
                Capsule()
                    .stroke(jadeGreen.opacity(0.18), lineWidth: 1)
            )
    }
}

private struct DetailActionButton: View {
    let title: String
    let systemImage: String
    let tone: NativeBadge.Tone
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            DetailActionButtonLabel(
                title: title,
                systemImage: systemImage,
                tone: tone
            )
        }
        .buttonStyle(.plain)
    }
}

private struct DetailActionButtonLabel: View {
    let title: String
    let systemImage: String
    let tone: NativeBadge.Tone

    var body: some View {
        HStack(spacing: 8) {
            Image(systemName: systemImage)
            Text(title)
                .lineLimit(1)
        }
        .font(.subheadline.weight(.semibold))
        .foregroundStyle(inkBlack)
        .frame(maxWidth: .infinity)
        .padding(.vertical, 14)
        .background(backgroundColor, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .stroke(strokeColor, lineWidth: 1)
        )
    }

    private var backgroundColor: Color {
        switch tone {
        case .jade:
            return jadeGreen.opacity(0.92)
        case .sun:
            return sunYellow.opacity(0.92)
        case .slate:
            return slateBlue.opacity(0.14)
        case .sand:
            return warmSand.opacity(0.30)
        }
    }

    private var strokeColor: Color {
        switch tone {
        case .jade:
            return jadeGreen.opacity(0.22)
        case .sun:
            return sunYellow.opacity(0.36)
        case .slate:
            return slateBlue.opacity(0.18)
        case .sand:
            return warmSand.opacity(0.36)
        }
    }
}

private struct DetailSectionCard<Content: View>: View {
    let title: String
    @ViewBuilder let content: Content

    init(title: String, @ViewBuilder content: () -> Content) {
        self.title = title
        self.content = content()
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(title)
                .font(.headline.weight(.semibold))
                .foregroundStyle(inkBlack)
            content
        }
        .nativeSectionPanel()
    }
}

private struct NativeFactSummaryCard: View {
    let title: String
    let message: String

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(.headline.weight(.semibold))
                .foregroundStyle(inkBlack)
            Text(message)
                .font(.subheadline)
                .foregroundStyle(slateBlue)
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding(18)
        .solidPanel(cornerRadius: 28, tint: paperWhite.opacity(0.94))
    }
}

private struct DetailLinkRow: View {
    let title: String
    let subtitle: String
    let systemImage: String

    var body: some View {
        HStack(spacing: 12) {
            ZStack {
                Circle()
                    .fill(jadeGreen.opacity(0.16))
                    .frame(width: 36, height: 36)
                Image(systemName: systemImage)
                    .font(.callout.weight(.bold))
                    .foregroundStyle(jadeDeep)
            }

            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(inkBlack)
                Text(subtitle)
                    .font(.caption)
                    .foregroundStyle(slateBlue)
                    .lineLimit(2)
            }

            Spacer()
            Image(systemName: "arrow.up.right.square")
                .foregroundStyle(slateSoft)
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .solidPanel(cornerRadius: 22, tint: paperWhite)
    }
}

private struct DetailFactCard: View {
    let title: String
    let value: String

    var body: some View {
        NativeMetricTile(label: title, value: value)
    }
}

private struct ReviewCard: View {
    let review: ReviewLink

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(review.title)
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(inkBlack)
            Text(review.snippet)
                .font(.footnote)
                .foregroundStyle(slateBlue)
            HStack(spacing: 8) {
                Text(review.sourceName ?? review.source)
                if let date = review.date {
                    Text(date)
                }
            }
            .font(.caption)
            .foregroundStyle(slateSoft)
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .solidPanel(cornerRadius: 22, tint: paperWhite)
    }
}

private struct AdvancedFilterSheet: View {
    @ObservedObject var model: NativeAppModel
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            List {
                Section("기관 유형") {
                    Picker("유형", selection: $model.filters.type) {
                        ForEach(InstitutionFilter.allCases, id: \.self) { filter in
                            Text(filter.label).tag(filter)
                        }
                    }
                    .pickerStyle(.segmented)
                }

                Section("조건 필터") {
                    Toggle("방과후 운영", isOn: Binding(
                        get: { model.filters.hasAfterSchool == true },
                        set: { model.filters.hasAfterSchool = $0 ? true : nil }
                    ))
                    Toggle("여유 정원", isOn: Binding(
                        get: { model.filters.hasVacancy == true },
                        set: { model.filters.hasVacancy = $0 ? true : nil }
                    ))
                    Toggle("넓은 공간 (5m2 이상)", isOn: Binding(
                        get: { model.filters.hasLargeSpace == true },
                        set: { model.filters.hasLargeSpace = $0 ? true : nil }
                    ))
                    Toggle("실내 놀이터", isOn: Binding(
                        get: { model.filters.hasIndoorPlayground == true },
                        set: { model.filters.hasIndoorPlayground = $0 ? true : nil }
                    ))
                    Toggle("최신 건물 (2015년 이후)", isOn: Binding(
                        get: { model.filters.hasModernBuilding == true },
                        set: { model.filters.hasModernBuilding = $0 ? true : nil }
                    ))
                }
            }
            .navigationTitle("고급 필터")
            #if os(iOS)
            .navigationBarTitleDisplayMode(.inline)
            #endif
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("초기화") {
                        model.resetFilters()
                    }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("적용") {
                        dismiss()
                    }
                    .fontWeight(.semibold)
                }
            }
        }
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
                .background(isActive ? jadeGreen.opacity(0.16) : paperWhite.opacity(0.82), in: Capsule())
                .foregroundStyle(isActive ? jadeDeep : inkBlack)
                .overlay(
                    Capsule()
                        .stroke(isActive ? jadeGreen.opacity(0.26) : warmSand.opacity(0.28), lineWidth: 1)
                )
        }
        .buttonStyle(.plain)
    }
}

private struct MetricPill: View {
    let label: String
    let value: String

    var body: some View {
        NativeMetricTile(label: label, value: value)
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
                .foregroundStyle(slateBlue)
            Spacer()
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 10)
        .solidPanel(cornerRadius: 20, tint: paperWhite.opacity(0.88))
    }
}

private struct CompactMapStatusCard: View {
    let message: String

    var body: some View {
        HStack(spacing: 10) {
            ZStack {
                Circle()
                    .fill(jadeGreen.opacity(0.16))
                    .frame(width: 30, height: 30)
                Image(systemName: "map.circle.fill")
                    .font(.system(size: 13, weight: .bold))
                    .foregroundStyle(jadeDeep)
            }

            VStack(alignment: .leading, spacing: 4) {
                Text("지도 상태")
                    .font(.caption2.weight(.heavy))
                    .foregroundStyle(slateSoft)
                Text(message)
                    .font(.footnote)
                    .foregroundStyle(slateBlue)
                    .lineLimit(2)
            }

            Spacer()
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 10)
        .solidPanel(cornerRadius: 22, tint: paperWhite.opacity(0.88))
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

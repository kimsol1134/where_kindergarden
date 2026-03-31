import Foundation
import Models
import Services
import SwiftUI
#if canImport(UIKit)
import UIKit
#endif

public struct SearchHomeView: View {
    @Environment(\.scenePhase) private var scenePhase
    @ObservedObject private var model: NativeAppModel
    @State private var mapRuntimeMessage: String?
    @State private var isSearchPanelPresented = false
    @State private var screenHeight: CGFloat = 800
    @State private var sheetFraction: CGFloat = 0.38
    @State private var dragOffset: CGFloat = 0
    private let bottomStackSpacing: CGFloat = 12
    private let sheetSnaps: [CGFloat] = [0.32, 0.55, 0.88]

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
        if model.isCatalogLoading && model.results.isEmpty {
            return "유치원 알리미 공개 데이터를 불러오는 중이에요"
        }

        if model.catalogError != nil {
            return "유치원 데이터를 다시 확인해 주세요"
        }

        if model.results.isEmpty {
            if trimmedSearchQuery.isEmpty,
               model.currentDeviceLocation == nil,
               model.recentSearches.isEmpty,
               model.locationError == nil {
                return "현재 위치나 주소를 확인하면 주변 유치원이 보여요"
            }

            return [
                "주변 유치원",
                "반경 \(Int(model.filters.radiusKM))km",
                model.filters.sort.label,
            ].joined(separator: " · ")
        }

        return [
            "\(model.results.count)곳 유치원",
            "반경 \(Int(model.filters.radiusKM))km",
            model.filters.sort.label,
        ].joined(separator: " · ")
    }

    private var resultDegradedMessage: String? {
        if model.reviewsError != nil {
            return "후기 정보를 불러오지 못했어요. 일부 정보가 비어 보일 수 있어요."
        }

        guard !model.configuration.hasKakaoRESTAPIKey else {
            return nil
        }

        return "주소나 장소 추천이 잠시 쉬고 있어요. 기관 이름이나 최근 검색으로 찾아보세요."
    }

    private var mapStatusMessage: String? {
        if let mapRuntimeMessage {
            return mapRuntimeMessage
        }

        if !model.configuration.hasKakaoMapKey {
            return "지도를 불러오지 못했어요. 아래 목록으로 먼저 둘러보세요."
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
            }
            .overlay(alignment: .top) {
                VStack(spacing: 16) {
                    SearchChrome(
                        model: model,
                        isSuggestionPanelPresented: $isSearchPanelPresented,
                        mapStatusMessage: mapStatusMessage
                    )
                    Spacer()
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
            .background(
                GeometryReader { proxy in
                    mistWhite.ignoresSafeArea()
                        .onAppear { screenHeight = proxy.size.height }
                        .onChange(of: proxy.size.height) { _, h in screenHeight = h }
                }
            )
            .animation(.spring(duration: 0.3, bounce: 0.12), value: isSearchPanelPresented)
            .task {
                model.refreshLocationPermissionState()
                await model.bootstrapIfNeeded()
            }
            .onChange(of: scenePhase) { _, nextPhase in
                guard nextPhase == .active else { return }
                model.refreshLocationPermissionState()
            }
            .overlay(alignment: .bottom) {
                if !isSearchPanelPresented {
                    let sheetHeight = min(
                        max(screenHeight * sheetFraction - dragOffset, screenHeight * sheetSnaps[0]),
                        screenHeight * sheetSnaps[2]
                    )

                    VStack(spacing: 0) {
                        // 드래그 핸들
                        Capsule()
                            .fill(slateSoft.opacity(0.35))
                            .frame(width: 40, height: 5)
                            .padding(.top, 10)
                            .padding(.bottom, 8)
                            .frame(maxWidth: .infinity)
                            .contentShape(Rectangle())
                            .gesture(
                                DragGesture()
                                    .onChanged { value in
                                        dragOffset = value.translation.height
                                    }
                                    .onEnded { value in
                                        let projected = sheetFraction - value.predictedEndTranslation.height / screenHeight
                                        let clamped = min(max(projected, sheetSnaps[0]), sheetSnaps[2])
                                        let nearest = sheetSnaps.min(by: { abs($0 - clamped) < abs($1 - clamped) }) ?? sheetFraction
                                        dragOffset = 0
                                        withAnimation(.spring(duration: 0.35, bounce: 0.12)) {
                                            sheetFraction = nearest
                                        }
                                    }
                            )

                        if !model.compareSelection.ids.isEmpty {
                            CompareFloatingBar(
                                count: model.compareSelection.ids.count,
                                names: model.comparedKindergartenNames(),
                                onNavigateToCompare: { model.selectedTab = .compare },
                                onRemoveAt: { model.removeCompare(at: $0) }
                            )
                            .animation(.spring(duration: 0.35), value: model.compareSelection.ids.count)
                            .padding(.horizontal, 20)
                            .padding(.bottom, bottomStackSpacing)
                        }

                        ResultSheet(
                            model: model,
                            summaryText: resultSummaryText,
                            degradedMessage: resultDegradedMessage,
                            trimmedSearchQuery: trimmedSearchQuery,
                            adUnitID: model.configuration.adMobBannerUnitID
                        )
                    }
                    .frame(height: sheetHeight)
                    .background(
                        RoundedRectangle(cornerRadius: 24, style: .continuous)
                            .fill(paperWhite.opacity(0.97))
                            .shadow(color: .black.opacity(0.08), radius: 12, y: -4)
                    )
                    .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
                    .animation(.spring(duration: 0.3, bounce: 0.12), value: dragOffset)
                    .transition(.move(edge: .bottom))
                }
            }
            .sheet(item: sheetSelection) { kindergarten in
                KindergartenDetailSheet(
                    kindergarten: kindergarten,
                    reviews: model.reviews(for: kindergarten.kindercode),
                    reviewsVersion: model.reviewsData?.version,
                    vacancySummary: model.vacancy(for: kindergarten.kindercode),
                    vacancyDatasetVersion: model.vacancyData?.version,
                    isVacancyLoading: model.isVacancyLoading,
                    vacancyError: model.vacancyError,
                    isCompared: model.isCompared(kindergarten),
                    isFavorite: model.isFavorite(kindergarten),
                    onToggleCompare: { model.toggleCompare(for: kindergarten) },
                    onToggleFavorite: { model.toggleFavorite(for: kindergarten) }
                )
                .presentationDetents([.medium, .large])
                .presentationDragIndicator(.visible)
            }
        }
        .navigationTitle("탐색")
        .toolbar(.hidden, for: .navigationBar)
    }
}

private struct SearchChrome: View {
    @Environment(\.openURL) private var openURL
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

    private var locationNoticeActionLabel: String? {
        if model.shouldShowLocationSettingsCTA {
            return "설정 열기"
        }

        if model.shouldShowLocationRetryCTA {
            return "다시 시도"
        }

        return nil
    }

    private func handleLocationNoticeAction() {
        if model.shouldShowLocationSettingsCTA {
            #if canImport(UIKit)
            if let settingsURL = URL(string: UIApplication.openSettingsURLString) {
                openURL(settingsURL)
            }
            #endif
            return
        }

        if model.shouldShowLocationRetryCTA {
            Task { await model.centerOnCurrentLocation() }
        }
    }

    var body: some View {
        VStack(spacing: 10) {
            VStack(spacing: 0) {
                HStack(spacing: 10) {
                    ZStack {
                        Circle()
                            .fill(jadeGreen.opacity(0.16))
                            .frame(width: 34, height: 34)
                        Image(systemName: "magnifyingglass")
                            .foregroundStyle(jadeDeep)
                    }

                    TextField(
                        "유치원 이름, 동네, 장소로 검색",
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

                    if !model.searchText.isEmpty {
                        Button {
                            model.clearSearchText()
                        } label: {
                            Image(systemName: "xmark.circle.fill")
                                .font(.body)
                                .foregroundStyle(slateBlue)
                                .frame(width: 44, height: 44)
                                .contentShape(Circle())
                        }
                        .accessibilityIdentifier("search.clearQuery")
                        .accessibilityLabel("검색어 지우기")
                    }

                    Button {
                        Task { await model.centerOnCurrentLocation() }
                    } label: {
                        Image(systemName: "location.fill")
                            .font(.caption.weight(.bold))
                            .foregroundStyle(jadeDeep)
                            .frame(width: 38, height: 38)
                            .background(jadeGreen.opacity(0.16), in: Circle())
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel("내 위치로 찾기")
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 12)
                .background(
                    RoundedRectangle(cornerRadius: CornerRadius.medium, style: .continuous)
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
            .padding(.horizontal, 14)
            .padding(.vertical, 8)
            .solidPanel(cornerRadius: CornerRadius.xlarge, tint: paperWhite.opacity(0.96))
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
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 10) {
                        Menu {
                            ForEach([1.0, 2.0, 5.0], id: \.self) { radius in
                                Button("반경 \(Int(radius))km") {
                                    model.updateRadius(to: radius)
                                }
                            }
                        } label: {
                            FilterChip(label: "반경 \(Int(model.filters.radiusKM))km", isActive: true, variant: .selector, action: {})
                        }
                        .sensoryFeedback(.selection, trigger: model.filters.radiusKM)
                        Menu {
                            ForEach(SortOption.allCases, id: \.self) { option in
                                Button(option.label) {
                                    model.updateSort(to: option)
                                }
                            }
                        } label: {
                            FilterChip(label: model.filters.sort.label, isActive: true, variant: .selector, action: {})
                        }
                        .sensoryFeedback(.selection, trigger: model.filters.sort)
                        Menu {
                            ForEach(InstitutionFilter.allCases, id: \.self) { filterType in
                                Button(filterType.label) {
                                    model.filters.type = filterType
                                }
                            }
                        } label: {
                            FilterChip(
                                label: model.filters.type == .all ? "유형" : model.filters.type.label,
                                isActive: model.filters.type != .all,
                                variant: .selector,
                                action: {}
                            )
                        }
                        .sensoryFeedback(.selection, trigger: model.filters.type)
                        FilterChip(label: "셔틀", isActive: model.filters.hasBus == true) {
                            model.toggleBusFilter()
                        }
                        .sensoryFeedback(.selection, trigger: model.filters.hasBus)
                        FilterChip(label: advancedFilterChipLabel, isActive: model.activeAdvancedFilterCount > 0) {
                            isAdvancedFilterPresented = true
                        }
                    }
                    .padding(.horizontal, 2)
                }
            }
        }
        .padding(.horizontal, 20)
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
                    Text("최근 찾은 곳을 다시 볼 수 있어요.")
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
                        title: "기관 이름",
                        suggestions: localSuggestions,
                        onSelect: onSelect
                    )
                }

                if !remoteSuggestions.isEmpty {
                    SearchSuggestionSection(
                        title: "주소·장소",
                        suggestions: remoteSuggestions,
                        onSelect: onSelect
                    )
                }

                if isLoading {
                    HStack(spacing: 8) {
                        ProgressView()
                            .controlSize(.small)
                        Text("추천 결과를 찾는 중")
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
                    Text("입력한 내용과 맞는 결과가 없어요.")
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
            return "유치원"
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
        .solidPanel(cornerRadius: CornerRadius.medium, tint: paperWhite.opacity(0.88))
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
        guard !results.isEmpty else {
            switch model.searchHomePresentationState {
            case .firstVisit:
                return "내 위치나 동네 이름으로 시작해 보세요"
            case .permissionRecovery:
                return "검색 시작하기"
            case .normal:
                return "검색 결과"
            }
        }
        return "\(model.locationLabel) 근처 \(results.count)곳"
    }

    @ViewBuilder
    private var emptyContent: some View {
        if isLoading && results.isEmpty {
            VStack(spacing: 12) {
                SkeletonCard()
                SkeletonCard()
                SkeletonCard()
            }
        } else if model.catalogError != nil {
            EmptyStateView(
                icon: "exclamationmark.triangle",
                title: "정보를 불러오지 못했어요",
                message: "잠시 후 다시 시도해 주세요.",
                ctaLabel: "다시 불러오기"
            ) {
                Task { await model.loadCatalog() }
            }
        } else if results.isEmpty && trimmedSearchQuery.isEmpty && !model.hasActiveAdvancedFilters && model.catalogError == nil {
            if model.searchHomePresentationState == .firstVisit {
                EmptyStateView(
                    icon: "sparkles",
                    title: "내 위치나 동네 이름으로 시작해 보세요",
                    message: "위에서 현재 위치를 선택하거나 기관명으로 검색할 수 있어요.",
                    ctaLabel: "검색으로 찾기"
                ) {
                    model.focusSearchField()
                }
            } else if model.searchHomePresentationState == .permissionRecovery {
                EmptyStateView(
                    icon: "location.slash",
                    title: "위치 없이도 검색할 수 있어요",
                    message: "동네 이름이나 기관명으로 원하는 유치원을 찾아보세요.",
                    ctaLabel: model.shouldShowLocationSettingsCTA ? "설정 열기" : nil
                ) {
                    #if canImport(UIKit)
                    if let settingsURL = URL(string: UIApplication.openSettingsURLString) {
                        UIApplication.shared.open(settingsURL)
                    }
                    #endif
                }
            } else if model.currentDeviceLocation != nil || !model.recentSearches.isEmpty {
                EmptyStateView(
                    icon: "map",
                    title: "이 근처에서는 찾지 못했어요",
                    message: "범위를 넓혀서 다시 찾아보세요.",
                    ctaLabel: "범위 넓히기"
                ) {
                    model.updateRadius(to: model.nextRadius)
                }
            } else {
                EmptyStateView(
                    icon: "magnifyingglass",
                    title: "유치원을 찾아보세요",
                    message: "현재 위치나 동네 이름으로 바로 찾을 수 있어요.",
                    ctaLabel: "내 위치로 찾기"
                ) {
                    Task { await model.centerOnCurrentLocation() }
                }
            }
        } else if results.isEmpty && !trimmedSearchQuery.isEmpty {
            EmptyStateView(
                icon: "magnifyingglass",
                title: "'\(trimmedSearchQuery)' 결과가 없어요",
                message: "다른 이름이나 동네로 다시 찾아보세요."
            )
        } else if results.isEmpty && model.hasActiveAdvancedFilters {
            EmptyStateView(
                icon: "line.3.horizontal.decrease.circle",
                title: "조건에 맞는 곳이 없어요",
                message: "필터를 조금 줄이면 더 많이 볼 수 있어요.",
                ctaLabel: "필터 초기화"
            ) {
                model.resetFilters()
            }
        }
    }

    var body: some View {
        VStack(spacing: 12) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 4) {
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

            if results.isEmpty {
                emptyContent
            } else {
                ScrollView {
                    LazyVStack(spacing: 12) {
                        ForEach(results) { kindergarten in
                            SearchResultCard(
                                kindergarten: kindergarten,
                                isCompared: comparedIDs.contains(kindergarten.kindercode),
                                isFavorite: favoriteIDs.contains(kindergarten.kindercode),
                                reviewCount: model.reviews(for: kindergarten.kindercode).count,
                                vacancyCount: model.vacancyCount(for: kindergarten.kindercode),
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
        }
        .padding(.horizontal, 20)
    }
}

private struct SearchResultCard: View {
    let kindergarten: Kindergarten
    let isCompared: Bool
    let isFavorite: Bool
    let reviewCount: Int
    let vacancyCount: Int
    let onTap: () -> Void
    let onToggleCompare: () -> Void
    let onToggleFavorite: () -> Void

    @ScaledMetric(relativeTo: .body) private var cardPadding: CGFloat = 16

    private var distanceText: String {
        kindergarten.distance >= 0 ? String(format: "%.1fkm", kindergarten.distance) : "거리 확인 전"
    }

    private var supportLine: String {
        var items: [String] = []

        items.append(kindergarten.address)

        if kindergarten.currentCount < kindergarten.capacity {
            items.append("정원 여유 \(kindergarten.capacity - kindergarten.currentCount)명")
        }

        if kindergarten.areaPerChild > 0 {
            items.append(String(format: "1인당 %.1f㎡", kindergarten.areaPerChild))
        }

        return items.prefix(3).joined(separator: " · ")
    }

    private var highlightItems: [(title: String, tone: NativeBadge.Tone)] {
        var items: [(String, NativeBadge.Tone)] = []

        if reviewCount > 0 {
            items.append(("후기 \(reviewCount)건", .sun))
        }
        if kindergarten.hasBus {
            items.append(("셔틀", .jade))
        }
        if kindergarten.hasAfterSchool {
            items.append(("방과후", .slate))
        }
        if kindergarten.areaPerChild >= 5 {
            items.append(("넓은 공간", .sun))
        }

        return Array(items.prefix(2))
    }

    let reviewsVersion: String?

    var body: some View {
        Button(action: onTap) {
            HStack(alignment: .top, spacing: 14) {
                VStack(alignment: .leading, spacing: 10) {
                    HStack(alignment: .top) {
                        NativeBadge(kindergarten.type.label)
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
                            .lineLimit(2)

                        Text(supportLine)
                            .font(.footnote)
                            .foregroundStyle(slateBlue)
                            .lineLimit(2)
                    }

                    if !highlightItems.isEmpty {
                        HStack(spacing: 8) {
                            ForEach(highlightItems, id: \.title) { item in
                                NativeBadge(item.title, tone: item.tone)
                            }
                        }
                    }
                }

                VStack(spacing: 12) {
                    Button(action: onToggleCompare) {
                        Image(systemName: isCompared ? "checkmark" : "plus")
                            .font(.system(size: 14, weight: .black))
                            .foregroundStyle(isCompared ? inkBlack : jadeDeep)
                            .frame(width: 44, height: 44)
                            .background(
                                Circle()
                                    .fill(isCompared ? jadeGreen.opacity(0.90) : jadeGreen.opacity(0.16))
                            )
                    }
                    .accessibilityIdentifier("search.compareToggle.\(kindergarten.kindercode)")
                    .accessibilityLabel(isCompared ? "비교에서 빼기" : "비교에 담기")
                    .buttonStyle(.borderless)
                    .sensoryFeedback(.impact(flexibility: .soft), trigger: isCompared)
                    .contentTransition(.symbolEffect(.replace))

                    Button(action: onToggleFavorite) {
                        Image(systemName: isFavorite ? "heart.fill" : "heart")
                            .font(.system(size: 14, weight: .black))
                            .foregroundStyle(isFavorite ? inkBlack : slateBlue)
                            .frame(width: 44, height: 44)
                            .background(
                                Circle()
                                    .fill(isFavorite ? sunYellow.opacity(0.92) : warmSand.opacity(0.50))
                            )
                    }
                    .accessibilityLabel(isFavorite ? "찜 취소" : "찜하기")
                    .buttonStyle(.borderless)
                    .sensoryFeedback(.impact(flexibility: .solid, intensity: 0.6), trigger: isFavorite)
                    .contentTransition(.symbolEffect(.replace))
                }
            }
        }
        .buttonStyle(PressableCardStyle())
        .padding(cardPadding)
        .solidPanel(cornerRadius: CornerRadius.large, tint: paperWhite.opacity(0.95))
        .accessibilityIdentifier("search.resultCard.\(kindergarten.kindercode)")
        .accessibilityElement(children: .combine)
    }
}

private struct AdvancedFilterSheet: View {
    @ObservedObject var model: NativeAppModel
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            List {
                Section("기관 유형") {
                    Picker("유치원 유형", selection: $model.filters.type) {
                        ForEach(InstitutionFilter.allCases, id: \.self) { filter in
                            Text(filter.label).tag(filter)
                        }
                    }
                    .pickerStyle(.segmented)
                }

                Section("원하는 조건") {
                    Toggle("방과후 운영", isOn: Binding(
                        get: { model.filters.hasAfterSchool == true },
                        set: { model.filters.hasAfterSchool = $0 ? true : nil }
                    ))
                    Toggle("여유 정원", isOn: Binding(
                        get: { model.filters.hasVacancy == true },
                        set: { model.filters.hasVacancy = $0 ? true : nil }
                    ))
                    Toggle("넓은 공간 (5㎡ 이상)", isOn: Binding(
                        get: { model.filters.hasLargeSpace == true },
                        set: { model.filters.hasLargeSpace = $0 ? true : nil }
                    ))
                    Toggle("실내 놀이터", isOn: Binding(
                        get: { model.filters.hasIndoorPlayground == true },
                        set: { model.filters.hasIndoorPlayground = $0 ? true : nil }
                    ))
                    Toggle("최근 지은 건물 (2015년 이후)", isOn: Binding(
                        get: { model.filters.hasModernBuilding == true },
                        set: { model.filters.hasModernBuilding = $0 ? true : nil }
                    ))
                }
            }
            .navigationTitle("상세 필터")
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
                    Button("완료") {
                        dismiss()
                    }
                    .fontWeight(.semibold)
                }
            }
        }
    }
}

private struct FilterChip: View {
    enum Variant {
        case selector
        case activeFilter
    }

    let label: String
    let isActive: Bool
    var variant: Variant = .activeFilter
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 6) {
                Text(label)
                    .font(.footnote.weight(.semibold))

                if variant == .selector {
                    Image(systemName: "chevron.down")
                        .font(.caption2.weight(.bold))
                }
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 10)
            .background(backgroundColor, in: Capsule())
            .foregroundStyle(foregroundColor)
            .overlay(
                Capsule()
                    .stroke(borderColor, lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
    }

    private var foregroundColor: Color {
        switch variant {
        case .selector:
            return inkBlack
        case .activeFilter:
            return isActive ? jadeDeep : inkBlack
        }
    }

    private var backgroundColor: Color {
        switch variant {
        case .selector:
            return paperWhite.opacity(0.92)
        case .activeFilter:
            return isActive ? jadeGreen.opacity(0.16) : paperWhite.opacity(0.82)
        }
    }

    private var borderColor: Color {
        switch variant {
        case .selector:
            return warmSand.opacity(0.28)
        case .activeFilter:
            return isActive ? jadeGreen.opacity(0.26) : warmSand.opacity(0.28)
        }
    }
}

private struct InlineNotice: View {
    let message: String
    var actionLabel: String? = nil
    var action: (() -> Void)? = nil

    var body: some View {
        HStack(spacing: 8) {
            Image(systemName: "info.circle.fill")
                .foregroundStyle(sunYellow)
            Text(message)
                .font(.caption)
                .foregroundStyle(slateBlue)
            Spacer()
            if let actionLabel, let action {
                Button(actionLabel, action: action)
                    .font(.caption.weight(.semibold))
                    .buttonStyle(.plain)
                    .foregroundStyle(jadeDeep)
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 10)
        .solidPanel(cornerRadius: CornerRadius.medium, tint: paperWhite.opacity(0.88))
    }
}

private struct SearchWelcomeCard: View {
    let onUseCurrentLocation: () -> Void
    let onSearchManually: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            NativeBadge("바로 시작하기", tone: .slate)

            Text("가까운 유치원을 빠르게 찾고, 저장하고, 비교해 보세요.")
                .font(.headline.weight(.bold))
                .foregroundStyle(inkBlack)

            Text("현재 위치로 찾거나 동네 이름과 기관명으로 바로 검색할 수 있어요.")
                .font(.subheadline)
                .foregroundStyle(slateBlue)
                .fixedSize(horizontal: false, vertical: true)

            HStack(spacing: 10) {
                Button(action: onUseCurrentLocation) {
                    HStack(spacing: 6) {
                        Image(systemName: "location.fill")
                        Text("내 위치로 찾기")
                    }
                    .font(.footnote.weight(.semibold))
                    .foregroundStyle(inkBlack)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 11)
                    .background(jadeGreen.opacity(0.22), in: Capsule())
                }
                .buttonStyle(.plain)

                Button("검색으로 찾기", action: onSearchManually)
                    .font(.footnote.weight(.semibold))
                    .buttonStyle(.plain)
                    .foregroundStyle(jadeDeep)
            }

            Text("현재 위치는 찾을 때만 사용돼요.")
                .font(.caption)
                .foregroundStyle(slateSoft)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(18)
        .solidPanel(cornerRadius: CornerRadius.large, tint: paperWhite.opacity(0.96))
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
                    .font(.footnote.weight(.bold))
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
        .solidPanel(cornerRadius: CornerRadius.medium, tint: paperWhite.opacity(0.88))
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

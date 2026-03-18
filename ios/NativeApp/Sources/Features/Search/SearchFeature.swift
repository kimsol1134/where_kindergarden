import Foundation
import Models
import Services
import SwiftUI

@MainActor
public final class SearchFeatureModel: ObservableObject {
    @Published public var query: String = "" {
        didSet {
            guard query != oldValue else { return }
            refresh()
        }
    }
    @Published public var filters: SearchFilters
    @Published public var userLocation: Coordinates?
    @Published public private(set) var results: [Kindergarten]
    @Published public var selectedKindergarten: Kindergarten?
    @Published public private(set) var recentSearches: [RecentSearch]

    private let allKindergartens: [KindergartenRaw]
    private let searchEngine: KindergartenSearchEngine

    public init(
        allKindergartens: [KindergartenRaw] = NativePreviewFixtures.kindergartens,
        filters: SearchFilters = SearchFilters(),
        recentSearches: [RecentSearch] = [],
        searchEngine: KindergartenSearchEngine = KindergartenSearchEngine()
    ) {
        self.allKindergartens = allKindergartens
        self.filters = filters
        self.recentSearches = recentSearches
        self.searchEngine = searchEngine
        self.results = searchEngine.search(raws: allKindergartens, location: nil, filters: filters)
    }

    public func setLocation(_ coordinates: Coordinates, label: String) {
        userLocation = coordinates
        recentSearches = [RecentSearch(label: label, coordinates: coordinates)] + recentSearches.filter { $0.label != label }
        recentSearches = Array(recentSearches.prefix(5))
        refresh()
    }

    public func updateRadius(to radius: Double) {
        filters.radiusKM = radius
        refresh()
    }

    public func updateSort(to sort: SortOption) {
        filters.sort = sort
        refresh()
    }

    public func toggleBusFilter() {
        filters.hasBus = filters.hasBus == true ? nil : true
        refresh()
    }

    public func toggleLargeSpaceFilter() {
        filters.hasLargeSpace = filters.hasLargeSpace == true ? nil : true
        refresh()
    }

    public func select(kindergarten: Kindergarten) {
        selectedKindergarten = kindergarten
    }

    public func refresh() {
        results = searchEngine.search(
            raws: allKindergartens,
            location: userLocation,
            filters: filters,
            query: query
        )
    }

    public func kindergartens(for ids: [String]) -> [Kindergarten] {
        let byID = Dictionary(uniqueKeysWithValues: searchEngine.makeKindergartens(raws: allKindergartens, relativeTo: userLocation).map {
            ($0.kindercode, $0)
        })

        return ids.compactMap { byID[$0] }
    }
}

@MainActor
public struct SearchHomeView: View {
    @ObservedObject private var model: SearchFeatureModel
    private let compareSelection: CompareSelection
    private let onToggleCompare: (Kindergarten) -> Void
    private let onOpenCompare: () -> Void
    @State private var showDetail = false

    public init() {
        _model = ObservedObject(wrappedValue: SearchFeatureModel())
        self.compareSelection = CompareSelection()
        self.onToggleCompare = { _ in }
        self.onOpenCompare = {}
    }

    public init(
        model: SearchFeatureModel,
        compareSelection: CompareSelection = CompareSelection(),
        onToggleCompare: @escaping (Kindergarten) -> Void = { _ in },
        onOpenCompare: @escaping () -> Void = {}
    ) {
        _model = ObservedObject(wrappedValue: model)
        self.compareSelection = compareSelection
        self.onToggleCompare = onToggleCompare
        self.onOpenCompare = onOpenCompare
    }

    public var body: some View {
        NavigationStack {
            ZStack(alignment: .top) {
                NativeMapSurface()
                    .ignoresSafeArea()

                VStack(spacing: 14) {
                    SearchChrome(model: model)
                    Spacer()
                }
            }
            .safeAreaInset(edge: .bottom) {
                ResultSheet(
                    results: model.results,
                    comparedIDs: Set(compareSelection.ids),
                    onSelect: { kindergarten in
                        model.select(kindergarten: kindergarten)
                        showDetail = true
                    },
                    onToggleCompare: onToggleCompare
                )
            }
            .sheet(isPresented: $showDetail) {
                if let selectedKindergarten = model.selectedKindergarten {
                    KindergartenDetailSheet(
                        kindergarten: selectedKindergarten,
                        isCompared: compareSelection.contains(selectedKindergarten.kindercode),
                        onToggleCompare: { onToggleCompare(selectedKindergarten) }
                    )
                    .presentationDetents([.medium, .large])
                    .presentationDragIndicator(.visible)
                }
            }
            .safeAreaInset(edge: .bottom) {
                if !compareSelection.ids.isEmpty {
                    Button(action: onOpenCompare) {
                        PersistentCompareBar(count: compareSelection.ids.count)
                    }
                    .accessibilityIdentifier("search.compareBarButton")
                    .buttonStyle(.plain)
                        .padding(.horizontal, 16)
                        .padding(.bottom, 6)
                }
            }
        }
    }
}

private struct SearchChrome: View {
    @ObservedObject var model: SearchFeatureModel

    var body: some View {
        VStack(spacing: 12) {
            HStack(spacing: 12) {
                Label("우리동네 유치원 탐색", systemImage: "sparkles")
                    .font(.footnote.weight(.semibold))
                    .foregroundStyle(leafGreen)
                Spacer()
                Button("현위치") {
                    model.setLocation(Coordinates(lat: 37.4981, lng: 127.0276), label: "서울 강남구 역삼동")
                }
                .font(.footnote.weight(.semibold))
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
                .background(.white.opacity(0.84), in: Capsule())
            }

            HStack(spacing: 10) {
                Image(systemName: "magnifyingglass")
                    .foregroundStyle(leafGreen)
                TextField("주소, 유치원, 아파트 이름 검색", text: $model.query)
                    .textFieldStyle(.plain)
                    .accessibilityIdentifier("search.queryField")
                Button {
                    model.query = ""
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundStyle(.secondary)
                }
                .accessibilityIdentifier("search.clearQuery")
                .opacity(model.query.isEmpty ? 0 : 1)
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 15)
            .background(.white.opacity(0.88), in: RoundedRectangle(cornerRadius: 24, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 24, style: .continuous)
                    .stroke(Color.white.opacity(0.8), lineWidth: 1)
            )
            .shadow(color: sand.opacity(0.22), radius: 24, y: 10)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 10) {
                    FilterChip(label: "반경 \(Int(model.filters.radiusKM))km", isActive: true) {
                        let nextRadius: Double = model.filters.radiusKM == 1 ? 2 : 5
                        model.updateRadius(to: nextRadius)
                    }
                    FilterChip(label: "셔틀", isActive: model.filters.hasBus == true) {
                        model.toggleBusFilter()
                    }
                    FilterChip(label: "넓은 공간", isActive: model.filters.hasLargeSpace == true) {
                        model.toggleLargeSpaceFilter()
                    }
                    FilterChip(label: "거리순", isActive: model.filters.sort == .distance) {
                        let next: SortOption = model.filters.sort == .distance ? .capacity : .distance
                        model.updateSort(to: next)
                    }
                }
                .padding(.horizontal, 2)
            }
        }
        .padding(.horizontal, 16)
        .padding(.top, 8)
    }
}

private struct NativeMapSurface: View {
    var body: some View {
        ZStack {
            LinearGradient(
                colors: [Color(red: 0.97, green: 0.96, blue: 0.94), Color.white, Color(red: 0.94, green: 0.98, blue: 0.95)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            Circle()
                .fill(Color(red: 0.97, green: 0.84, blue: 0.42).opacity(0.28))
                .frame(width: 240, height: 240)
                .offset(x: -110, y: 120)
            Circle()
                .fill(Color(red: 0.36, green: 0.73, blue: 0.48).opacity(0.22))
                .frame(width: 280, height: 280)
                .offset(x: 110, y: -180)

            VStack(spacing: 16) {
                Image(systemName: "map.circle.fill")
                    .font(.system(size: 72))
                    .foregroundStyle(leafGreen)
                Text("KakaoMap UIViewRepresentable 자리")
                    .font(.headline.weight(.semibold))
                    .foregroundStyle(.primary)
                Text("실제 네이티브 앱에서는 Kakao 지도 SDK 브리지가 이 자리를 대체합니다.")
                    .font(.subheadline)
                    .multilineTextAlignment(.center)
                    .foregroundStyle(.secondary)
                    .frame(maxWidth: 280)
            }
        }
    }
}

private struct ResultSheet: View {
    let results: [Kindergarten]
    let comparedIDs: Set<String>
    let onSelect: (Kindergarten) -> Void
    let onToggleCompare: (Kindergarten) -> Void

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
                    Text("\(results.count)개 기관을 iPhone 하단 sheet로 요약")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                        .accessibilityIdentifier("search.resultCountLabel")
                }
                Spacer()
            }

            ScrollView {
                LazyVStack(spacing: 12) {
                    ForEach(results.prefix(6)) { kindergarten in
                        SearchResultCard(
                            kindergarten: kindergarten,
                            isCompared: comparedIDs.contains(kindergarten.kindercode),
                            onTap: { onSelect(kindergarten) },
                            onToggleCompare: { onToggleCompare(kindergarten) }
                        )
                    }
                }
                .padding(.bottom, 8)
            }
            .frame(maxHeight: 320)
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
    let onTap: () -> Void
    let onToggleCompare: () -> Void

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
                    }
                    .font(.caption)
                    .foregroundStyle(.secondary)
                }
                .accessibilityIdentifier("search.resultCard.\(kindergarten.kindercode)")
                .frame(maxWidth: .infinity, alignment: .leading)
            }
            .buttonStyle(.plain)

            HStack {
                Spacer()
                Button(action: onToggleCompare) {
                    Label(
                        isCompared ? "비교중" : "비교 추가",
                        systemImage: isCompared ? "checkmark.circle.fill" : "plus.circle"
                    )
                    .font(.footnote.weight(.semibold))
                    .padding(.horizontal, 12)
                    .padding(.vertical, 8)
                    .background(isCompared ? leafGreen.opacity(0.14) : sand.opacity(0.12), in: Capsule())
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
    let isCompared: Bool
    let onToggleCompare: () -> Void

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                Text(kindergarten.name)
                    .font(.title2.weight(.bold))

                HStack(spacing: 12) {
                    MetricPill(label: "거리", value: String(format: "%.1fkm", kindergarten.distance))
                    MetricPill(label: "1인당 면적", value: String(format: "%.1f㎡", kindergarten.areaPerChild))
                    MetricPill(label: "정원", value: "\(kindergarten.capacity)명")
                }

                VStack(alignment: .leading, spacing: 8) {
                    Text("후기 프리뷰")
                        .font(.headline.weight(.semibold))
                    Text("네이티브 앱에서는 원격 리뷰 JSON을 우선 조회하고, 실패 시 번들 데이터를 즉시 fallback 합니다.")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }

                Button(action: onToggleCompare) {
                    Label(
                        isCompared ? "비교 목록에서 제거" : "비교 목록에 추가",
                        systemImage: isCompared ? "checkmark.circle.fill" : "plus.circle.fill"
                    )
                    .frame(maxWidth: .infinity)
                }
                .accessibilityIdentifier("search.detailCompareToggle.\(kindergarten.kindercode)")
                .buttonStyle(.borderedProminent)
                .tint(leafGreen)
            }
            .padding(24)
        }
        .background(Color(red: 0.97, green: 0.96, blue: 0.94))
    }
}

private struct PersistentCompareBar: View {
    let count: Int

    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text("비교할 기관 \(count)개")
                    .font(.subheadline.weight(.bold))
                Text("상세 화면과 탭 전환을 넘나들며 유지됩니다.")
                    .font(.caption)
                    .foregroundStyle(.secondary)
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
                        .stroke(isActive ? leafGreen.opacity(0.25) : sand.opacity(0.28), lineWidth: 1)
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

private let leafGreen = Color(red: 0.31, green: 0.68, blue: 0.43)
private let sand = Color(red: 0.77, green: 0.71, blue: 0.64)

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
            capacity: 60,
            currentCount: 58,
            classCountAge3: 2,
            classCountAge4: 2,
            classCountAge5: 2,
            capacityAge3: 20,
            capacityAge4: 20,
            capacityAge5: 20,
            currentAge3: 19,
            currentAge4: 19,
            currentAge5: 20,
            classCountMix: 0,
            capacityMix: 0,
            currentMix: 0,
            capacitySpecial: 0,
            currentSpecial: 0,
            establishDate: "20110302",
            hasBus: false,
            busCount: 0,
            mealType: .outsourced,
            hasAfterSchool: true,
            areaPerChild: 5.4,
            hasPlayground: true,
            buildingYear: 2011,
            floorInfo: "지상 2층",
            classroomArea: 220,
            indoorPlaygroundArea: 48,
            outdoorPlaygroundArea: 60,
            teacherCount: 10,
            seniorTeacherCount: 1,
            cctvCount: 16
        ),
        KindergartenRaw(
            kindercode: "A003",
            name: "꿈나무유치원",
            address: "서울 강남구 테헤란로 77",
            lat: 37.5019,
            lng: 127.0396,
            type: .private,
            phone: nil,
            homepage: nil,
            operationHours: "08:30-17:30",
            sidoCode: "11",
            sigunguCode: "11680",
            capacity: 48,
            currentCount: 33,
            classCountAge3: 1,
            classCountAge4: 2,
            classCountAge5: 1,
            capacityAge3: 12,
            capacityAge4: 24,
            capacityAge5: 12,
            currentAge3: 10,
            currentAge4: 15,
            currentAge5: 8,
            classCountMix: 0,
            capacityMix: 0,
            currentMix: 0,
            capacitySpecial: 0,
            currentSpecial: 0,
            establishDate: "20200302",
            hasBus: true,
            busCount: 2,
            mealType: .direct,
            hasAfterSchool: false,
            areaPerChild: 4.3,
            hasPlayground: false,
            buildingYear: 2020,
            floorInfo: "지상 4층",
            classroomArea: 160,
            indoorPlaygroundArea: 22,
            outdoorPlaygroundArea: 0,
            teacherCount: 7,
            seniorTeacherCount: 1,
            cctvCount: 10
        ),
    ]
}

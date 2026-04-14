# iOS Native App — 3-Tier Layered Architecture 설계서

> 우리동네 유치원 iOS 네이티브 앱의 클린 아키텍처 리팩토링 설계
> 작성일: 2026-04-14

---

## 1. 설계 목표

**핵심 원칙**: 한 기능을 수정하거나 디버깅할 때, 다른 기능에 영향이 없어야 한다.

이를 달성하기 위한 구체적 목표:
- 기능별 상태 격리 — Search 버그가 Compare를 깨뜨리지 않음
- 단방향 의존성 — 컴파일러가 레이어 위반을 차단
- 단일 진실 소스 — 같은 데이터를 두 곳에서 관리하지 않음
- 비즈니스 로직 테스트 가능 — UI 없이 로직만 검증 가능

---

## 2. 현재 상태 (AS-IS)

### 수치

| 항목 | 값 |
|------|-----|
| Swift 파일 | 34개 |
| 총 코드 | ~9,900줄 |
| SPM 타겟 | 4개 (Models, Services, Features, AppShell) |
| 테스트 파일 | 3개 |
| iOS 최소 타겟 | 17.0 |

### 현재 모듈 의존성

```
AppShell → Features → Services → Models
```

### 핵심 문제

#### 2.1 God ViewModel

`NativeAppModel.swift` (1,265줄)이 앱의 모든 상태와 로직을 단독 관리한다.

```
NativeAppModel 책임 목록:
├── 검색 텍스트, 필터, 결과 관리
├── 위치 권한 + GPS 좌표
├── 카카오 API 검색 제안
├── 유치원 카탈로그 로딩
├── 리뷰 데이터 로딩
├── 현원 데이터 로딩
├── 비교 선택 (최대 3곳)
├── 즐겨찾기 CRUD + Undo
├── 최근검색 CRUD + Undo
├── 딥링크 파싱 + 라우팅
├── 탭 네비게이션
├── 토스트 알림
├── 분석 이벤트 추적
└── 첫 실행 / 온보딩 상태
```

**문제**: "비교 점수가 이상해요" 버그를 잡으려면 1,265줄 파일에서 관련 부분을 찾아야 한다.

#### 2.2 레이어 위반

| 위치 | 위반 내용 |
|------|-----------|
| `CompareView.swift:134` | `calculateScores()` — 8개 메트릭 점수 계산이 View 안에 존재 |
| `SearchFitPresentation.swift` | `KindergartenFitSummaryBuilder` — 적합도 비즈니스 규칙이 Presentation에 존재 |
| `CompareView.swift:188` | `KakaoShareService.shareCompare()` 직접 호출 — View가 외부 서비스에 직접 접근 |

#### 2.3 Logic Layer 부재

Models(데이터)와 Services(인프라)는 분리되어 있지만, 비즈니스 로직을 담당하는 독립 레이어가 없다. 로직이 ViewModel과 View에 분산되어 있어 테스트와 추적이 어렵다.

---

## 3. 목표 구조 (TO-BE)

### 3-Tier 레이어 + 보조 레이어

```
┌─────────────────────────────────────────────────────────────────┐
│  AppShell                                                       │
│  앱 진입점, DI 조립, 생명주기                                      │
│  NativeAppPrototype.swift, NativeRootView.swift, SplashView     │
└───────────────────────────────┬─────────────────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────────┐
│  Presentation Layer  (Features 타겟)                             │
│                                                                 │
│  ┌──────────────┐  ┌───────────────┐  ┌──────────────┐          │
│  │SearchViewModel│  │CompareViewModel│  │SavedViewModel │          │
│  └──────┬───────┘  └──────┬────────┘  └──────┬───────┘          │
│         │                 │                  │                   │
│  SearchHomeView     CompareView         SavedView    MoreView   │
│  DetailSheet        CompareMatrix                               │
│  KakaoMapBridge     (정적 View)                                   │
│  BottomSheet                                                    │
│                                                                 │
│  Shared: BrandTokens, NativeTheme, AdBanner, Toast, Skeleton    │
│  Navigation: AppRouter                                          │
└───────────────────────────────┬─────────────────────────────────┘
                                │ calls
┌───────────────────────────────▼─────────────────────────────────┐
│  Logic Layer  (Domain 타겟)                                      │
│                                                                 │
│  UseCases:                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │ SearchUseCase │  │CompareUseCase│  │DeepLinkUseCase│           │
│  └──────────────┘  └──────────────┘  └──────────────┘           │
│                                                                 │
│  Domain Services:                                               │
│  ┌───────────────────┐  ┌───────────────────────────┐           │
│  │FitReasonBuilder   │  │DistanceCalculator (기존)    │           │
│  └───────────────────┘  └───────────────────────────┘           │
│                                                                 │
│  Repository Protocols:                                          │
│  KindergartenProviding, ReviewProviding, VacancyProviding,      │
│  CompareStoring, FavoriteStoring, RecentSearchStoring           │
└───────────────────────────────┬─────────────────────────────────┘
                                │ implements
┌───────────────────────────────▼─────────────────────────────────┐
│  Data Layer  (Services 타겟)                                     │
│                                                                 │
│  Repositories (@Observable, 단일 진실 소스):                       │
│  ┌─────────────────────┐  ┌──────────────────┐                  │
│  │KindergartenRepository│  │ReviewRepository  │                  │
│  └─────────────────────┘  └──────────────────┘                  │
│  ┌─────────────────────┐  ┌──────────────────┐                  │
│  │VacancyRepository    │  │CompareRepository │                  │
│  └─────────────────────┘  └──────────────────┘                  │
│  ┌─────────────────────┐  ┌──────────────────┐                  │
│  │FavoriteRepository   │  │RecentSearchRepo  │                  │
│  └─────────────────────┘  └──────────────────┘                  │
│                                                                 │
│  External Services:                                             │
│  LocationService, KakaoLocalSearchService, KakaoShareService,   │
│  AdMobService, Analytics, TrackingTransparency                  │
│                                                                 │
│  Infrastructure:                                                │
│  NativeAppConfiguration, NativeAppPersistence,                  │
│  BundledJSONResourceLoader, RemoteJSONLoader                    │
└───────────────────────────────┬─────────────────────────────────┘
                                │ uses
┌───────────────────────────────▼─────────────────────────────────┐
│  Models 타겟                                                     │
│                                                                 │
│  Entities: Kindergarten, KindergartenRaw, ReviewLink,           │
│            VacancySummary, Coordinates                           │
│  Value Objects: SearchFilters, CompareSelection, FavoriteItem,  │
│                 RecentSearch, SearchSuggestion                  │
│  Enums: InstitutionType, SortOption, MealType, SearchType,      │
│         DeepLinkDestination, NativeTab                          │
└─────────────────────────────────────────────────────────────────┘
```

### 의존성 방향 (단방향 강제)

```
Models  ←  Domain  ←  Services  ←  Features  ←  AppShell
  ↑                      ↑            ↑
  └──────────────────────┘            │
  └───────────────────────────────────┘
  (Features, Services 모두 Models를 직접 참조 가능)
```

**Domain은 Services를 모른다.** UseCase가 Repository를 사용하지만, Domain 타겟에 정의된 프로토콜을 통해서만 참조한다. 구체 구현체(Services)는 AppShell에서 주입한다.

---

## 4. SPM Package.swift (목표)

```swift
// swift-tools-version: 5.10
import PackageDescription

let package = Package(
    name: "NativeApp",
    platforms: [.iOS(.v17)],
    products: [
        .library(name: "Models", targets: ["Models"]),
        .library(name: "Domain", targets: ["Domain"]),
        .library(name: "Services", targets: ["Services"]),
        .library(name: "Features", targets: ["Features"]),
        .library(name: "AppShell", targets: ["AppShell"]),
    ],
    dependencies: [
        .package(url: "https://github.com/kakao-mapsSDK/KakaoMapsSDK-SPM.git",
                 revision: "cc073a32729b7f545cca49f96d0b859fa3a0d5db"),
        .package(url: "https://github.com/googleads/swift-package-manager-google-mobile-ads.git",
                 from: "12.0.0"),
        .package(url: "https://github.com/kakao/kakao-ios-sdk.git",
                 from: "2.25.0"),
    ],
    targets: [
        // Layer 0: 순수 데이터 모델
        .target(name: "Models"),

        // Layer 1: 비즈니스 로직 (Models만 의존)
        .target(
            name: "Domain",
            dependencies: ["Models"]
        ),

        // Layer 2: 데이터 소스 + 외부 서비스 (Models, Domain 의존)
        .target(
            name: "Services",
            dependencies: [
                "Models",
                "Domain",
                .product(name: "GoogleMobileAds",
                         package: "swift-package-manager-google-mobile-ads"),
                .product(name: "KakaoSDKCommon", package: "kakao-ios-sdk"),
                .product(name: "KakaoSDKShare", package: "kakao-ios-sdk"),
                .product(name: "KakaoSDKTemplate", package: "kakao-ios-sdk"),
            ]
        ),

        // Layer 3: UI (Models, Domain, Services 의존)
        .target(
            name: "Features",
            dependencies: [
                "Models",
                "Domain",
                "Services",
                .product(name: "KakaoMapsSDK-SPM", package: "KakaoMapsSDK-SPM",
                         condition: .when(platforms: [.iOS])),
                .product(name: "GoogleMobileAds",
                         package: "swift-package-manager-google-mobile-ads"),
            ]
        ),

        // App Shell: 조립 + 진입점
        .target(
            name: "AppShell",
            dependencies: ["Models", "Domain", "Services", "Features"]
        ),

        // 테스트
        .testTarget(
            name: "DomainTests",
            dependencies: ["Models", "Domain"]
        ),
        .testTarget(
            name: "ServicesTests",
            dependencies: ["Models", "Domain", "Services"]
        ),
        .testTarget(
            name: "FeaturesTests",
            dependencies: ["Models", "Domain", "Services", "Features"]
        ),
    ]
)
```

---

## 5. 레이어별 상세 설계

### 5.1 Models (변경 최소)

기존 Models 타겟을 거의 그대로 유지한다. 변경 사항:

- `NativeTab` enum을 `NativeAppModel.swift`에서 Models로 이동 (여러 레이어에서 참조)
- `CompareToast`, `SearchHomePresentationState`를 Models로 이동
- `SearchLens` enum을 `SearchFitPresentation.swift`에서 Models로 이동

```
Sources/Models/
├── KindergartenModels.swift     (기존 유지, ~576줄)
├── SearchModels.swift           (기존 유지, ~34줄)
├── VacancyModels.swift          (기존 유지, ~101줄)
├── AppModels.swift              (신규, ~40줄)
│   ├── NativeTab
│   ├── CompareToast
│   └── SearchHomePresentationState
└── SearchLens.swift             (SearchFitPresentation에서 enum만 이동, ~30줄)
```

### 5.2 Domain (신규 타겟)

비즈니스 로직만 담는 레이어. UI 프레임워크(SwiftUI)를 import하지 않는다.

#### 5.2.1 Repository 프로토콜

Domain이 Services를 모르게 하는 인터페이스. UseCase는 이 프로토콜만 참조한다.

```swift
// Sources/Domain/Protocols/KindergartenProviding.swift

import Models

public protocol KindergartenProviding: AnyObject, Sendable {
    var kindergartens: [KindergartenRaw] { get }
    var isLoading: Bool { get }
    var error: String? { get }
    func load() async
}
```

```swift
// Sources/Domain/Protocols/ReviewProviding.swift

public protocol ReviewProviding: AnyObject, Sendable {
    var reviewsData: ReviewsData? { get }
    var isLoading: Bool { get }
    func load() async
    func reviews(for kindercode: String) -> [ReviewLink]
}
```

```swift
// Sources/Domain/Protocols/VacancyProviding.swift

public protocol VacancyProviding: AnyObject, Sendable {
    var vacancyData: VacancyDataset? { get }
    var isLoading: Bool { get }
    func load() async
    func vacancy(for kindercode: String) -> VacancySummary?
    func vacancyCount(for kindercode: String) -> Int
}
```

```swift
// Sources/Domain/Protocols/CompareStoring.swift

public protocol CompareStoring: AnyObject, Sendable {
    var selection: CompareSelection { get }
    func toggle(id: String) -> CompareToggleResult
    func remove(at index: Int)
    func replace(with selection: CompareSelection)
    func contains(_ kindercode: String) -> Bool
    func order(for kindercode: String) -> Int?
}

public enum CompareToggleResult: Equatable {
    case added
    case removed
    case limitReached
}
```

```swift
// Sources/Domain/Protocols/FavoriteStoring.swift

public protocol FavoriteStoring: AnyObject, Sendable {
    var favorites: [FavoriteItem] { get }
    func toggle(for kindergarten: Kindergarten)
    func isFavorite(_ kindercode: String) -> Bool
    func delete(atOffsets: IndexSet) -> [IndexedFavoriteItem]
    func restore(_ items: [IndexedFavoriteItem])
}
```

```swift
// Sources/Domain/Protocols/RecentSearchStoring.swift

public protocol RecentSearchStoring: AnyObject, Sendable {
    var recentSearches: [RecentSearch] { get }
    func record(_ search: RecentSearch)
    func delete(atOffsets: IndexSet) -> [IndexedRecentSearch]
    func deleteAll() -> [IndexedRecentSearch]
    func restore(_ items: [IndexedRecentSearch])
}
```

#### 5.2.2 UseCases

**SearchUseCase** — 검색 로직을 NativeAppModel에서 추출

```swift
// Sources/Domain/UseCases/SearchUseCase.swift

import Models

public struct SearchUseCase: Sendable {
    private let searchEngine: KindergartenSearchEngine
    private let distanceCalculator: DistanceCalculator

    public init(
        searchEngine: KindergartenSearchEngine = KindergartenSearchEngine(),
        distanceCalculator: DistanceCalculator = DistanceCalculator()
    ) {
        self.searchEngine = searchEngine
        self.distanceCalculator = distanceCalculator
    }

    /// 카탈로그에서 필터 + 위치 + 쿼리 기반으로 결과를 검색
    public func search(
        catalog: [KindergartenRaw],
        location: Coordinates,
        filters: SearchFilters,
        query: String
    ) -> [Kindergarten] {
        searchEngine.search(raws: catalog, location: location, filters: filters, query: query)
    }

    /// 로컬 유치원명/주소 자동완성 제안
    public func localSuggestions(
        query: String,
        catalog: [KindergartenRaw],
        userLocation: Coordinates,
        limit: Int = 6
    ) -> [SearchSuggestion] {
        // NativeAppModel.makeLocalSearchSuggestions() 로직 이관
        ...
    }

    /// 검색 결과가 비어있을 때 반경 자동 확장
    public func expandedRadiusIfNeeded(
        currentRadius: Double,
        results: [Kindergarten]
    ) -> Double? {
        guard results.isEmpty, currentRadius < 5 else { return nil }
        let candidates: [Double] = [2, 5]
        return candidates.first { $0 > currentRadius }
    }

    /// KindergartenRaw → Kindergarten 변환 (거리 계산 포함)
    public func makeKindergarten(
        from raw: KindergartenRaw,
        relativeTo location: Coordinates
    ) -> Kindergarten {
        searchEngine.makeKindergartens(raws: [raw], relativeTo: location).first
            ?? Kindergarten(raw: raw, distance: -1)
    }
}
```

**CompareUseCase** — CompareView.calculateScores()에서 추출

```swift
// Sources/Domain/UseCases/CompareUseCase.swift

import Models

public struct CompareUseCase: Sendable {

    public init() {}

    /// 8개 메트릭 기반 비교 점수 계산
    /// 반환: 각 유치원의 우세 항목 수 배열
    public func calculateScores(for items: [Kindergarten]) -> [Int] {
        guard items.count >= 2 else { return Array(repeating: 0, count: items.count) }
        var scores = Array(repeating: 0, count: items.count)

        // 교사 대 아동 비율: 낮을수록 좋음
        let ratios = items.map {
            $0.teacherCount > 0
                ? Double($0.currentCount) / Double($0.teacherCount)
                : Double.infinity
        }
        applyHighest(scores: &scores, values: ratios, lowerIsBetter: true)

        // 1인당 면적: 높을수록 좋음
        applyHighest(scores: &scores, values: items.map(\.areaPerChild), lowerIsBetter: false)

        // CCTV: 많을수록 좋음
        applyHighest(scores: &scores, values: items.map { Double($0.cctvCount) }, lowerIsBetter: false)

        // 방과후: 있으면 좋음
        applyBoolean(scores: &scores, values: items.map(\.hasAfterSchool))

        // 놀이터: 있으면 좋음
        applyBoolean(scores: &scores, values: items.map(\.hasPlayground))

        // 급식: 직영이면 좋음
        let meals = items.map(\.mealType)
        if Set(meals).count > 1 {
            for (i, item) in items.enumerated() where item.mealType == .direct {
                scores[i] += 1
            }
        }

        // 통학버스: 많을수록 좋음
        let buses = items.map { $0.hasBus ? Double($0.busCount) : 0 }
        applyHighest(scores: &scores, values: buses, lowerIsBetter: false)

        return scores
    }

    /// 우승자 요약 문자열
    public func winnerSummary(items: [Kindergarten], scores: [Int]) -> String? {
        guard let maxScore = scores.max(), maxScore > 0 else { return nil }
        let winners = scores.enumerated().filter { $0.element == maxScore }
        guard winners.count == 1, let winner = winners.first else { return nil }
        return "\(items[winner.offset].name)이 \(maxScore)개 항목에서 우세"
    }

    /// 비교 공유 URL 생성
    public func shareURL(ids: [String], baseURL: URL) -> URL? {
        guard !ids.isEmpty,
              var components = URLComponents(url: baseURL, resolvingAgainstBaseURL: false)
        else { return nil }
        components.queryItems = [URLQueryItem(name: "ids", value: ids.joined(separator: ","))]
        return components.url
    }

    // MARK: - Private

    private func applyHighest(scores: inout [Int], values: [Double], lowerIsBetter: Bool) {
        let validValues = values.filter { $0.isFinite && $0 > 0 }
        guard let target = lowerIsBetter ? validValues.min() : validValues.max(),
              Set(values).count > 1 else { return }
        for (i, v) in values.enumerated() where v == target { scores[i] += 1 }
    }

    private func applyBoolean(scores: inout [Int], values: [Bool]) {
        guard Set(values).count > 1 else { return }
        for (i, v) in values.enumerated() where v { scores[i] += 1 }
    }
}
```

**FitReasonBuilder** — SearchFitPresentation.swift에서 비즈니스 로직 추출

```swift
// Sources/Domain/UseCases/FitReasonBuilder.swift

import Models

public struct KindergartenFitReason: Hashable, Sendable {
    public let icon: String
    public let text: String
    public let priority: Int

    public init(icon: String, text: String, priority: Int) {
        self.icon = icon; self.text = text; self.priority = priority
    }
}

public struct FitReasonBuilder: Sendable {

    public init() {}

    /// 필터와 유치원 속성을 기반으로 적합도 이유 목록 생성 (최대 3개)
    public func reasons(
        for kindergarten: Kindergarten,
        filters: SearchFilters,
        reviewCount: Int,
        vacancyCount: Int
    ) -> [KindergartenFitReason] {
        // SearchFitPresentation.KindergartenFitSummaryBuilder.reasons() 로직 이관
        ...
    }
}
```

**DeepLinkUseCase** — 딥링크 파싱과 라우팅 결정

```swift
// Sources/Domain/UseCases/DeepLinkUseCase.swift

import Models

public struct DeepLinkUseCase: Sendable {
    private let parser: DeepLinkParser

    public init(parser: DeepLinkParser = DeepLinkParser()) {
        self.parser = parser
    }

    public func resolve(_ url: URL) -> DeepLinkDestination? {
        parser.destination(for: url)
    }
}
```

#### 5.2.3 기존 서비스 이동

`DistanceCalculator`와 `KindergartenSearchEngine`은 순수 로직이므로 Domain으로 이동한다.
`DeepLinkParser`, `DeepLinkBuilder`도 Models/Foundation만 사용하므로 Domain으로 이동한다.

```
Sources/Domain/
├── Protocols/
│   ├── KindergartenProviding.swift
│   ├── ReviewProviding.swift
│   ├── VacancyProviding.swift
│   ├── CompareStoring.swift
│   ├── FavoriteStoring.swift
│   └── RecentSearchStoring.swift
├── UseCases/
│   ├── SearchUseCase.swift
│   ├── CompareUseCase.swift
│   ├── FitReasonBuilder.swift
│   └── DeepLinkUseCase.swift
└── Services/
    ├── DistanceCalculator.swift      (Services에서 이동)
    ├── KindergartenSearchEngine.swift (Services에서 이동)
    ├── DeepLinkParser.swift          (Services에서 이동)
    └── DeepLinkBuilder.swift         (Services에서 이동)
```

### 5.3 Services (Data Layer)

Repository를 `@Observable` 클래스로 전환하여 단일 진실 소스로 만든다. 여러 ViewModel이 동일한 Repository 인스턴스를 공유하면, 한쪽에서 변경하면 다른 쪽이 자동 감지한다.

#### 5.3.1 @Observable Repository 예시

**CompareRepository** — 현재 NativeAppModel에 흩어진 비교 로직을 통합

```swift
// Sources/Services/Repositories/CompareRepository.swift

import Foundation
import Observation
import Models
import Domain

@Observable
public final class CompareRepository: CompareStoring, @unchecked Sendable {
    public private(set) var selection: CompareSelection
    private let persistence: NativeAppPersistence

    public init(persistence: NativeAppPersistence) {
        self.selection = persistence.restore().compareSelection
        self.persistence = persistence
    }

    public func toggle(id: String) -> CompareToggleResult {
        if selection.contains(id) {
            selection.toggle(id: id)
            persistence.saveCompareSelection(selection)
            return .removed
        }
        guard selection.ids.count < CompareSelection.limit else {
            return .limitReached
        }
        selection.toggle(id: id)
        persistence.saveCompareSelection(selection)
        return .added
    }

    public func remove(at index: Int) {
        guard selection.ids.indices.contains(index) else { return }
        selection.remove(at: index)
        persistence.saveCompareSelection(selection)
    }

    public func replace(with newSelection: CompareSelection) {
        selection = newSelection
        persistence.saveCompareSelection(selection)
    }

    public func contains(_ kindercode: String) -> Bool {
        selection.contains(kindercode)
    }

    public func order(for kindercode: String) -> Int? {
        selection.ids.firstIndex(of: kindercode).map { $0 + 1 }
    }
}
```

**FavoriteRepository** — 현재 NativeAppModel의 favorites 관련 로직 통합

```swift
// Sources/Services/Repositories/FavoriteRepository.swift

@Observable
public final class FavoriteRepository: FavoriteStoring, @unchecked Sendable {
    public private(set) var favorites: [FavoriteItem]
    private let persistence: NativeAppPersistence

    public init(persistence: NativeAppPersistence) {
        self.favorites = persistence.restore().favorites
        self.persistence = persistence
    }

    public func toggle(for kindergarten: Kindergarten) {
        if let index = favorites.firstIndex(where: { $0.kindercode == kindergarten.kindercode }) {
            favorites.remove(at: index)
        } else {
            favorites.insert(
                FavoriteItem(
                    kindercode: kindergarten.kindercode,
                    name: kindergarten.name,
                    address: kindergarten.address,
                    type: kindergarten.type
                ),
                at: 0
            )
        }
        persistence.saveFavorites(favorites)
    }

    public func isFavorite(_ kindercode: String) -> Bool {
        favorites.contains { $0.kindercode == kindercode }
    }

    public func delete(atOffsets offsets: IndexSet) -> [IndexedFavoriteItem] {
        let removals = offsets.sorted().compactMap { offset -> IndexedFavoriteItem? in
            guard favorites.indices.contains(offset) else { return nil }
            return IndexedFavoriteItem(value: favorites[offset], index: offset)
        }
        for offset in offsets.sorted(by: >) where favorites.indices.contains(offset) {
            favorites.remove(at: offset)
        }
        persistence.saveFavorites(favorites)
        return removals
    }

    public func restore(_ items: [IndexedFavoriteItem]) {
        for item in items.sorted(by: { $0.index < $1.index }) {
            favorites.removeAll { $0.kindercode == item.value.kindercode }
            favorites.insert(item.value, at: min(item.index, favorites.count))
        }
        persistence.saveFavorites(favorites)
    }
}
```

**KindergartenRepository** — 기존 struct를 @Observable class로 전환

```swift
// Sources/Services/Repositories/KindergartenRepository.swift

@Observable
public final class KindergartenRepository: KindergartenProviding, @unchecked Sendable {
    public private(set) var kindergartens: [KindergartenRaw] = []
    public private(set) var isLoading = false
    public private(set) var error: String?

    /// kindercode → KindergartenRaw 빠른 조회용
    public private(set) var lookup: [String: KindergartenRaw] = [:]

    private let loader: @Sendable () throws -> Data

    public init(loader: @escaping @Sendable () throws -> Data) {
        self.loader = loader
    }

    public func load() async {
        guard !isLoading else { return }
        isLoading = true
        error = nil
        defer { isLoading = false }

        do {
            let data = try loader()
            let decoded = try JSONDecoder().decode([KindergartenRaw].self, from: data)
            kindergartens = decoded
            lookup = Dictionary(uniqueKeysWithValues: decoded.map { ($0.kindercode, $0) })
        } catch {
            self.error = error.localizedDescription
            kindergartens = []
            lookup = [:]
        }
    }
}
```

#### 5.3.2 기존 서비스 (변경 최소)

다음 파일들은 기존 위치에서 유지하되, Domain 프로토콜을 conform한다:

```
Sources/Services/
├── Repositories/
│   ├── KindergartenRepository.swift    (struct → @Observable class)
│   ├── ReviewRepository.swift          (struct → @Observable class)
│   ├── VacancyRepository.swift         (struct → @Observable class)
│   ├── CompareRepository.swift         (신규)
│   ├── FavoriteRepository.swift        (신규)
│   └── RecentSearchRepository.swift    (신규)
├── External/
│   ├── LocationService.swift           (기존 유지)
│   ├── KakaoLocalSearchService.swift   (기존 유지)
│   ├── KakaoShareService.swift         (기존 유지)
│   ├── AdMobService.swift              (기존 유지)
│   ├── Analytics.swift                 (기존 유지)
│   └── TrackingTransparencyService.swift (기존 유지)
└── Infrastructure/
    ├── NativeAppConfiguration.swift    (기존 유지)
    ├── NativeAppPersistence.swift      (기존 유지)
    ├── BundledJSONResourceLoader.swift (Configuration에서 분리 가능)
    └── RemoteJSONLoader.swift          (Configuration에서 분리 가능)
```

### 5.4 Features (Presentation Layer)

#### 5.4.1 AppRouter — 앱 전체 네비게이션 전용

```swift
// Sources/Features/Navigation/AppRouter.swift

import Observation
import Models

@Observable
@MainActor
public final class AppRouter {
    public var activeTab: NativeTab = .search
    public var pendingDeepLink: DeepLinkDestination?
    public var toast: CompareToast?

    public init() {}

    public func showToast(_ toast: CompareToast) {
        self.toast = toast
    }

    public func dismissToast() {
        toast = nil
    }
}
```

#### 5.4.2 SearchViewModel

현재 `NativeAppModel`에서 검색 관련 책임만 추출한다.

```swift
// Sources/Features/Search/SearchViewModel.swift

import Observation
import Models
import Domain
import Services

@Observable
@MainActor
public final class SearchViewModel {
    // --- 상태 (View가 관찰) ---
    public private(set) var searchText = ""
    public private(set) var results: [Kindergarten] = []
    public private(set) var activeSearchType: SearchType?
    public private(set) var userLocation = SearchViewModel.defaultCenter
    public private(set) var locationLabel = "서울 시청"
    public private(set) var currentDeviceLocation: Coordinates?
    public private(set) var isLocatingCurrentPosition = false
    public private(set) var localSearchSuggestions: [SearchSuggestion] = []
    public private(set) var remoteSearchSuggestions: [SearchSuggestion] = []
    public private(set) var isSearchSuggestionsLoading = false
    public private(set) var searchSuggestionMessage: String?
    public private(set) var locationPermissionState: LocationPermissionState
    public private(set) var locationError: String?
    public private(set) var selectedKindergarten: Kindergarten?
    public private(set) var isFirstLaunch: Bool
    public var shouldFocusSearchField = false
    public var filters: SearchFilters = SearchFilters()
    public var currentLocationRecenterRequestID = 0

    // --- 의존성 (생성 시 주입) ---
    private let kindergartenRepo: any KindergartenProviding
    private let reviewRepo: any ReviewProviding
    private let vacancyRepo: any VacancyProviding
    private let compareRepo: any CompareStoring
    private let favoriteRepo: any FavoriteStoring
    private let recentSearchRepo: any RecentSearchStoring
    private let searchUseCase: SearchUseCase
    private let fitReasonBuilder: FitReasonBuilder
    private let locationProvider: CurrentLocationProviding
    private let remoteSearchService: any RemoteLocationSuggesting
    private let analytics: AnalyticsTracking?
    private let router: AppRouter

    // --- 메서드 ---
    // NativeAppModel에서 검색 관련 public 메서드 이관:
    // updateSearchText(), clearSearchText(), selectSearchSuggestion(),
    // setLocation(), centerOnCurrentLocation(), recenterMapToCurrentLocation(),
    // primeCurrentDeviceLocationIfAuthorized(), select(kindergarten:),
    // dismissDetail(), toggleCompare(), toggleFavorite(),
    // bootstrapIfNeeded(), applySearchLens(), resetFilters() 등
    //
    // 핵심 변경: 비즈니스 로직은 searchUseCase에 위임
    // 상태 변경은 Repository에 위임 (compareRepo.toggle(), favoriteRepo.toggle())
    // 네비게이션은 router에 위임 (router.activeTab, router.showToast())
}
```

#### 5.4.3 CompareViewModel

```swift
// Sources/Features/Compare/CompareViewModel.swift

@Observable
@MainActor
public final class CompareViewModel {
    private let compareRepo: any CompareStoring
    private let kindergartenRepo: any KindergartenProviding
    private let reviewRepo: any ReviewProviding
    private let vacancyRepo: any VacancyProviding
    private let compareUseCase: CompareUseCase
    private let analytics: AnalyticsTracking?
    private let router: AppRouter
    private let configuration: NativeAppConfiguration

    // --- View가 관찰하는 computed properties ---
    // compareRepo.selection을 통해 비교 목록에 접근
    // 별도 @Published 필요 없음 — @Observable 체인이 자동 감지

    public var comparedKindergartens: [Kindergarten] {
        compareRepo.selection.ids.compactMap { id in
            guard let raw = kindergartenRepo.lookup[id] else { return nil }
            return Kindergarten(raw: raw, distance: -1)
        }
    }

    public var scores: [Int] {
        compareUseCase.calculateScores(for: comparedKindergartens)
    }

    public var winnerSummary: String? {
        compareUseCase.winnerSummary(items: comparedKindergartens, scores: scores)
    }

    public func remove(at index: Int) {
        let id = compareRepo.selection.ids[index]
        compareRepo.remove(at: index)
        analytics?.track(event: .compareToggled, properties: ["kindercode": id, "selected": "false"])
    }

    public func shareURL() -> URL? {
        compareUseCase.shareURL(ids: compareRepo.selection.ids, baseURL: configuration.compareShareBaseURL)
    }
}
```

#### 5.4.4 SavedViewModel

```swift
// Sources/Features/Saved/SavedViewModel.swift

@Observable
@MainActor
public final class SavedViewModel {
    private let favoriteRepo: any FavoriteStoring
    private let recentSearchRepo: any RecentSearchStoring
    private let kindergartenRepo: any KindergartenProviding
    private let compareRepo: any CompareStoring
    private let reviewRepo: any ReviewProviding
    private let searchUseCase: SearchUseCase
    private let analytics: AnalyticsTracking?
    private let router: AppRouter

    // --- Undo 상태 (이 ViewModel 로컬) ---
    public var undoState: SavedUndoState?

    // favorites, recentSearches는 Repository에서 직접 관찰
    public var favoriteKindergartens: [Kindergarten] { ... }
    public var recentSearches: [RecentSearch] { recentSearchRepo.recentSearches }

    public func deleteFavorite(atOffsets: IndexSet) { ... }
    public func undoDelete() { ... }
    public func restoreRecentSearch(_ search: RecentSearch) { ... }
}
```

#### 5.4.5 MoreView — ViewModel 없음

`MoreView`는 정적 링크와 시스템 정보만 표시하므로 ViewModel이 불필요하다. View에서 직접 `LocationService.permissionState()`와 `Bundle.main` 정보를 읽는다.

#### 5.4.6 파일 구조

```
Sources/Features/
├── Navigation/
│   └── AppRouter.swift                       (신규)
├── Search/
│   ├── SearchViewModel.swift                 (신규 — NativeAppModel에서 추출)
│   ├── SearchHomeView.swift                  (기존 SearchFeature.swift 리네임)
│   ├── KakaoMapBridge.swift                  (기존 유지)
│   ├── KindergartenDetailSheet.swift         (기존 유지)
│   ├── NativeBottomSheet.swift               (기존 유지)
│   ├── CompareFloatingBar.swift              (기존 유지)
│   └── SearchResultsSheetPresentation.swift  (기존 유지)
├── Compare/
│   ├── CompareViewModel.swift                (신규)
│   ├── CompareView.swift                     (기존, calculateScores 제거)
│   └── CompareMatrixView.swift               (기존 유지)
├── Saved/
│   ├── SavedViewModel.swift                  (신규)
│   └── SavedView.swift                       (기존 유지)
├── More/
│   └── MoreView.swift                        (기존 유지, ViewModel 없음)
└── Shared/
    ├── BrandTokens.swift                     (기존 유지)
    ├── NativeTheme.swift                     (기존 유지)
    ├── AdBannerView.swift                    (기존 유지)
    ├── OnboardingOverlay.swift               (기존 유지)
    ├── SkeletonCard.swift                    (기존 유지)
    ├── ToastOverlay.swift                    (기존 유지)
    └── EmptyStateView.swift                  (기존 유지)
```

**삭제되는 파일:**
- `Features/Shared/NativeAppModel.swift` — 3개 ViewModel + Repository로 분해됨
- `Features/Search/SearchFitPresentation.swift` — 비즈니스 로직은 Domain/FitReasonBuilder로, SearchLens enum은 Models로 이동

### 5.5 AppShell (DI 조립)

AppShell은 모든 의존성을 조립하여 주입하는 유일한 장소다.

```swift
// Sources/AppShell/NativeRootView.swift

@MainActor
public struct NativeRootView: View {
    @State private var router = AppRouter()
    @State private var searchVM: SearchViewModel
    @State private var compareVM: CompareViewModel
    @State private var savedVM: SavedViewModel
    @State private var showSplash = true
    @AppStorage("native.hasSeenOnboarding") private var hasSeenOnboarding = false

    public init() {
        // --- DI 조립 ---
        let config = NativeAppConfiguration.live(bundle: .main)
        let persistence = NativeAppPersistence(store: UserDefaults.standard)
        let bundledLoader = BundledJSONResourceLoader(bundle: .main)
        let remoteLoader = RemoteJSONLoader(session: .shared)

        // Repositories (공유 인스턴스)
        let kindergartenRepo = KindergartenRepository(loader: {
            try bundledLoader.data(named: config.kindergartensResourceName)
        })
        let reviewRepo = ReviewRepository(
            remoteLoader: { try await remoteLoader.data(from: config.reviewsRemoteURL) },
            localLoader: { try bundledLoader.data(named: config.reviewsResourceName) }
        )
        let vacancyRepo = VacancyRepository(
            remoteLoader: { try await remoteLoader.data(from: config.vacancyRemoteURL) },
            localLoader: { try bundledLoader.data(named: config.vacancyResourceName) }
        )
        let compareRepo = CompareRepository(persistence: persistence)
        let favoriteRepo = FavoriteRepository(persistence: persistence)
        let recentSearchRepo = RecentSearchRepository(persistence: persistence)

        // UseCases
        let searchUseCase = SearchUseCase()
        let compareUseCase = CompareUseCase()
        let fitReasonBuilder = FitReasonBuilder()

        // Services
        let locationProvider = CurrentLocationService()
        let remoteSearch = KakaoLocalSuggestionService(
            client: KakaoLocalAPIClient(apiKey: config.kakaoRESTAPIKey, session: .shared)
        )
        let analytics = OSLogAnalytics()
        let router = AppRouter()

        // ViewModels
        _router = State(initialValue: router)
        _searchVM = State(initialValue: SearchViewModel(
            kindergartenRepo: kindergartenRepo,
            reviewRepo: reviewRepo,
            vacancyRepo: vacancyRepo,
            compareRepo: compareRepo,
            favoriteRepo: favoriteRepo,
            recentSearchRepo: recentSearchRepo,
            searchUseCase: searchUseCase,
            fitReasonBuilder: fitReasonBuilder,
            locationProvider: locationProvider,
            remoteSearchService: remoteSearch,
            analytics: analytics,
            router: router,
            configuration: config
        ))
        _compareVM = State(initialValue: CompareViewModel(
            compareRepo: compareRepo,
            kindergartenRepo: kindergartenRepo,
            reviewRepo: reviewRepo,
            vacancyRepo: vacancyRepo,
            compareUseCase: compareUseCase,
            analytics: analytics,
            router: router,
            configuration: config
        ))
        _savedVM = State(initialValue: SavedViewModel(
            favoriteRepo: favoriteRepo,
            recentSearchRepo: recentSearchRepo,
            kindergartenRepo: kindergartenRepo,
            compareRepo: compareRepo,
            reviewRepo: reviewRepo,
            searchUseCase: searchUseCase,
            analytics: analytics,
            router: router
        ))
    }

    public var body: some View {
        TabView(selection: $router.activeTab) {
            Tab("검색", systemImage: "magnifyingglass", value: .search) {
                SearchHomeView(viewModel: searchVM)
            }
            Tab("비교", systemImage: "arrow.left.arrow.right", value: .compare) {
                CompareView(viewModel: compareVM)
            }
            Tab("저장", systemImage: "heart", value: .saved) {
                SavedView(viewModel: savedVM)
            }
            Tab("더보기", systemImage: "ellipsis", value: .more) {
                MoreView()
            }
        }
        .overlay { ... } // splash, onboarding, toast
        .onOpenURL { url in searchVM.applyDeepLink(url) }
    }
}
```

**핵심**: `compareRepo`, `favoriteRepo` 등의 같은 인스턴스가 여러 ViewModel에 주입된다. SearchViewModel에서 비교를 추가하면 CompareViewModel이 자동 감지한다.

---

## 6. 데이터 흐름 검증

### 시나리오: 검색 탭에서 비교 추가

```
1. 사용자가 SearchHomeView에서 "비교 담기" 탭
2. SearchViewModel.toggleCompare(kindergarten)
3.   → compareRepo.toggle(id: kindercode)     [CompareRepository 상태 변경]
4.   → router.showToast(.success("비교에 담았어요"))
5.   → analytics.track(.compareToggled)

6. CompareViewModel은 같은 compareRepo를 참조
7.   → compareRepo.selection이 변경됨
8.   → comparedKindergartens (computed property) 자동 갱신
9.   → CompareView가 @Observable 감지로 자동 리렌더
```

**동기화 코드 없음.** @Observable 체인이 자동으로 처리한다.

### 시나리오: 비교 점수 버그 디버깅

```
1. 사용자: "비교 점수가 이상해요"
2. CompareUseCase.calculateScores() 확인   ← Domain/UseCases/CompareUseCase.swift
3. 입력 데이터 확인: Kindergarten 모델의 값들
4. 끝. Features(UI) 코드를 볼 필요 없음.
```

### 시나리오: 즐겨찾기 영속성 버그

```
1. 사용자: "즐겨찾기가 재시작 후 사라져요"
2. FavoriteRepository.toggle() 확인         ← Services/Repositories/
3. NativeAppPersistence.saveFavorites() 확인 ← Services/Infrastructure/
4. 끝. ViewModel이나 View를 볼 필요 없음.
```

---

## 7. 파일 이동 매핑 (AS-IS → TO-BE)

### 삭제

| 파일 | 이유 |
|------|------|
| `Features/Shared/NativeAppModel.swift` (1,265줄) | 3개 ViewModel + 6개 Repository로 분해 |
| `Features/Search/SearchFitPresentation.swift` (247줄) | SearchLens → Models, FitReasonBuilder → Domain |

### 이동 (기존 파일 위치 변경)

| AS-IS | TO-BE | 이유 |
|-------|-------|------|
| `Services/SearchServices.swift` 내 `DistanceCalculator` | `Domain/Services/DistanceCalculator.swift` | 순수 로직, 외부 의존성 없음 |
| `Services/SearchServices.swift` 내 `KindergartenSearchEngine` | `Domain/Services/KindergartenSearchEngine.swift` | 순수 로직 |
| `Services/SearchServices.swift` 내 `DeepLinkParser`, `DeepLinkBuilder` | `Domain/Services/DeepLink.swift` | Models만 의존 |
| `Services/SearchServices.swift` 내 `KindergartenJSONRepository` | `Services/Repositories/KindergartenRepository.swift` | struct → @Observable class |
| `Services/SearchServices.swift` 내 `ReviewRepository` | `Services/Repositories/ReviewRepository.swift` | struct → @Observable class |

### 신규 파일

| 파일 | 줄 수 (예상) | 내용 |
|------|-------------|------|
| `Models/AppModels.swift` | ~40 | NativeTab, CompareToast, SearchHomePresentationState |
| `Models/SearchLens.swift` | ~30 | SearchLens enum |
| `Domain/Protocols/*.swift` (6개) | ~120 | Repository 프로토콜 |
| `Domain/UseCases/SearchUseCase.swift` | ~120 | 검색 로직 |
| `Domain/UseCases/CompareUseCase.swift` | ~90 | 비교 점수 로직 |
| `Domain/UseCases/FitReasonBuilder.swift` | ~80 | 적합도 로직 |
| `Domain/UseCases/DeepLinkUseCase.swift` | ~20 | 딥링크 라우팅 |
| `Services/Repositories/CompareRepository.swift` | ~60 | 비교 상태 관리 |
| `Services/Repositories/FavoriteRepository.swift` | ~70 | 즐겨찾기 관리 |
| `Services/Repositories/RecentSearchRepository.swift` | ~60 | 최근검색 관리 |
| `Features/Navigation/AppRouter.swift` | ~25 | 탭/딥링크/토스트 |
| `Features/Search/SearchViewModel.swift` | ~350 | 검색 상태 + 위임 |
| `Features/Compare/CompareViewModel.swift` | ~80 | 비교 상태 + 위임 |
| `Features/Saved/SavedViewModel.swift` | ~100 | 저장 상태 + Undo |

### 변경 없이 유지 (16개 파일)

| 파일 |
|------|
| `Models/KindergartenModels.swift` |
| `Models/SearchModels.swift` |
| `Models/VacancyModels.swift` |
| `Services/LocationService.swift` |
| `Services/KakaoLocalSearchService.swift` |
| `Services/KakaoShareService.swift` |
| `Services/AdMobService.swift` |
| `Services/Analytics.swift` |
| `Services/TrackingTransparencyService.swift` |
| `Services/NativeAppConfiguration.swift` |
| `Services/NativeAppPersistence.swift` |
| `Services/VacancyService.swift` |
| `Features/Search/KakaoMapBridge.swift` |
| `Features/Search/KindergartenDetailSheet.swift` |
| `Features/Search/NativeBottomSheet.swift` |
| 나머지 Shared UI 컴포넌트 (7개) |

---

## 8. 마이그레이션 계획

### Big Bang + 안전장치 전략

#### Phase 0: 안전장치 (1일)

1. feature 브랜치 생성
2. 현재 동작하는 코드에 핵심 경로 테스트 추가
   - 검색 실행 → 결과 반환 (SearchEngine 단위 테스트)
   - 비교 점수 계산 (calculateScores 단위 테스트)
   - 즐겨찾기 추가/제거/영속성 (Persistence 테스트)
   - 비교 추가/제거/한도 (CompareSelection 테스트)
   - 딥링크 파싱 (DeepLinkParser 테스트)
3. 이 테스트들이 리팩토링 후에도 통과해야 함

#### Phase 1: 기반 구조 (0.5일)

1. Package.swift에 Domain 타겟 추가
2. Models에 AppModels.swift, SearchLens.swift 추가
3. Domain/Protocols/ 에 6개 프로토콜 정의
4. 빌드 확인

#### Phase 2: Domain 레이어 구축 (1일)

1. `SearchServices.swift`에서 순수 로직을 Domain으로 이동
   - DistanceCalculator, KindergartenSearchEngine → `Domain/Services/`
   - DeepLinkParser, DeepLinkBuilder → `Domain/Services/`
2. UseCase 4개 작성
   - CompareUseCase ← `CompareView.calculateScores()` 추출
   - SearchUseCase ← `NativeAppModel.refresh()` + 관련 로직 추출
   - FitReasonBuilder ← `SearchFitPresentation.KindergartenFitSummaryBuilder` 추출
   - DeepLinkUseCase ← `NativeAppModel.applyDeepLink()` 추출
3. Phase 0 테스트가 Domain 타겟에서 통과하는지 확인

#### Phase 3: Repository @Observable 전환 (1일)

1. 기존 struct Repository를 @Observable class로 전환
   - KindergartenRepository, ReviewRepository, VacancyRepository
2. 신규 Repository 추가
   - CompareRepository, FavoriteRepository, RecentSearchRepository
3. 각 Repository가 Domain 프로토콜을 conform하는지 확인
4. Phase 0 테스트 통과 확인

#### Phase 4: ViewModel 분리 + View 연결 (1.5일)

1. SearchViewModel 작성 — NativeAppModel에서 검색 관련 코드 이관
2. CompareViewModel 작성 — 비교 관련 코드 이관
3. SavedViewModel 작성 — 저장 관련 코드 이관
4. AppRouter 작성
5. 각 View 파일에서 `model: NativeAppModel` → 해당 ViewModel로 변경
6. NativeRootView에서 DI 조립
7. NativeAppModel.swift 삭제
8. SearchFitPresentation.swift 삭제
9. 전체 빌드 + Phase 0 테스트 통과 확인

#### Phase 5: 검증 (0.5일)

1. 시뮬레이터에서 전체 플로우 수동 테스트
   - 검색 → 결과 → 상세 → 비교 추가
   - 비교 탭 → 점수 확인 → 공유
   - 즐겨찾기 추가/삭제 → Undo → 재시작 후 유지
   - 딥링크 → 올바른 화면 이동
   - 위치 권한 거부 → 주소 검색으로 전환
2. 테스트 보강 (UseCase, Repository 단위 테스트)
3. PR 생성

### 예상 일정

| Phase | 작업 | 기간 |
|-------|------|------|
| 0 | 안전장치 테스트 | 1일 |
| 1 | 기반 구조 | 0.5일 |
| 2 | Domain 레이어 | 1일 |
| 3 | Repository 전환 | 1일 |
| 4 | ViewModel + View | 1.5일 |
| 5 | 검증 | 0.5일 |
| **합계** | | **5.5일** |

---

## 9. 아키텍처 규칙 (리팩토링 후 유지)

### 컴파일 타임 규칙 (SPM이 강제)

1. **Domain은 Services를 import할 수 없다** — UseCase는 프로토콜만 참조
2. **Models는 아무것도 import하지 않는다** — Foundation만 허용
3. **Features는 Domain을 통해서만 비즈니스 로직에 접근** — 직접 계산 금지

### 코드 리뷰 규칙

4. **View 안에 비즈니스 로직 금지** — `if item.teacherCount > 0` 같은 판단은 UseCase로
5. **ViewModel에서 persistence 직접 호출 금지** — Repository에 위임
6. **ViewModel 간 직접 참조 금지** — 공유 상태는 Repository를 통해서만

### 테스트 규칙

7. **UseCase 테스트는 UI 없이 실행** — `DomainTests` 타겟
8. **Repository 테스트는 InMemory store 사용** — 실제 UserDefaults 불필요
9. **ViewModel 테스트는 Mock Repository 주입** — Domain 프로토콜 덕분에 가능

---

## 부록: @Observable 감지 동작 원리

현재 앱은 `ObservableObject` + `@Published`를 사용한다. 리팩토링 후 `@Observable` (Observation 프레임워크)로 전환한다.

### 차이점

```swift
// 기존: ObservableObject — 모든 @Published 변경이 모든 관찰자를 깨움
class NativeAppModel: ObservableObject {
    @Published var searchText = ""       // 변경 시
    @Published var compareSelection = ... // ← 이것과 무관한 View도 리렌더
}

// 신규: @Observable — 실제로 읽은 속성이 변경될 때만 해당 View를 깨움
@Observable class CompareRepository {
    var selection = CompareSelection()   // CompareView만 리렌더
}
```

### 체이닝

```swift
@Observable class CompareViewModel {
    private let compareRepo: CompareRepository

    var count: Int { compareRepo.selection.ids.count }
    //                ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    // SwiftUI가 이 접근 체인을 추적.
    // compareRepo.selection이 변경되면 이 View만 리렌더.
}

struct CompareView: View {
    var viewModel: CompareViewModel

    var body: some View {
        Text("\(viewModel.count)개 선택")
        // viewModel.count → compareRepo.selection.ids.count
        // 이 체인의 어느 지점이든 변경되면 이 View가 업데이트됨
    }
}
```

이 동작 덕분에 별도 동기화 코드 없이 Repository 공유만으로 기능 간 상태 동기화가 가능하다.

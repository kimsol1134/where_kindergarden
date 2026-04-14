# Phase 4: viewmodels

## 사전 준비

아래 문서를 반드시 읽어라:

- `docs/IOS_ARCHITECTURE.md` — 섹션 5.4(Features / Presentation Layer), 섹션 5.5(AppShell), 섹션 6(데이터 흐름 검증)

이전 phase의 작업물을 반드시 확인하라:

- `ios/NativeApp/Sources/Domain/UseCases/` — 4개 UseCase
- `ios/NativeApp/Sources/Domain/Protocols/` — 6개 프로토콜
- `ios/NativeApp/Sources/Domain/Services/` — SearchEngine, DistanceCalculator, DeepLink
- `ios/NativeApp/Sources/Services/Repositories/` — 6개 @Observable Repository
- `ios/NativeApp/Sources/Features/Shared/NativeAppModel.swift` — 현재 God ViewModel (이 파일의 모든 public 메서드와 프로퍼티를 완전히 이해하라)

반드시 `NativeAppModel.swift`를 전체 읽고, 각 메서드가 어느 ViewModel로 가야 하는지 판단한 후 작업하라.

## 작업 내용

### 1. AppRouter 생성

**`ios/NativeApp/Sources/Features/Navigation/AppRouter.swift` (신규)**

```swift
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

### 2. SearchViewModel 생성

**`ios/NativeApp/Sources/Features/Search/SearchViewModel.swift` (신규)**

`NativeAppModel`에서 검색 관련 책임을 추출한다. 다음 프로퍼티와 메서드를 이관하라:

**Published 프로퍼티 → @Observable 프로퍼티로 전환:**
- searchText, activeSearchType, isLocatingCurrentPosition, currentLocationRecenterRequestID
- filters, userLocation, currentDeviceLocation, locationLabel
- results, localSearchSuggestions, remoteSearchSuggestions
- isSearchSuggestionsLoading, searchSuggestionMessage
- selectedKindergarten, isCatalogLoading, isReviewsLoading, isVacancyLoading
- catalogError, reviewsError, vacancyError, locationError
- locationPermissionState, isFirstLaunch, shouldFocusSearchField

**의존성 (생성자 주입):**
- kindergartenRepo: any KindergartenProviding
- reviewRepo: any ReviewProviding
- vacancyRepo: any VacancyProviding
- compareRepo: any CompareStoring
- favoriteRepo: any FavoriteStoring
- recentSearchRepo: any RecentSearchStoring
- searchUseCase: SearchUseCase
- fitReasonBuilder: FitReasonBuilder
- deepLinkUseCase: DeepLinkUseCase
- locationProvider: CurrentLocationProviding
- remoteSearchService: any RemoteLocationSuggesting
- analytics: AnalyticsTracking?
- router: AppRouter
- configuration: NativeAppConfiguration

**이관할 메서드:**
- bootstrapIfNeeded(), loadCatalog(), loadReviews(), loadVacancy()
- updateSearchText(), clearSearchText(), selectSearchSuggestion()
- setLocation(), centerOnCurrentLocation(), recenterMapToCurrentLocation()
- primeCurrentDeviceLocationIfAuthorized(), refreshLocationPermissionState()
- select(kindergarten:), dismissDetail(), makeDetailSheet(for:)
- toggleCompare(for:), toggleFavorite(for:), isCompared(), isFavorite()
- compareOrder(for:), reviews(for:), vacancy(for:), vacancyCount(for:)
- fitReasons(for:), focusSearchField()
- applyDeepLink(), applyUniversalLink(), applySearchDeepLink()
- restoreRecentSearch(), openKindergartenDetail()
- updateRadius(), updateSort(), resetFilters(), toggleBusFilter(), toggleLargeSpaceFilter()
- applySearchLens(), activeSearchLens
- hasActiveAdvancedFilters, activeAdvancedFilterCount, activeAdvancedFilterDescriptions
- searchHomePresentationState, locationPermissionStatusText, locationPermissionMessage
- shouldShowLocationSettingsCTA, shouldShowLocationRetryCTA, nextRadius
- completeFirstLaunch()

**핵심 변경점:**
1. `@Published` → `@Observable` 클래스의 일반 프로퍼티
2. `ObservableObject` → `@Observable` macro
3. 비교/즐겨찾기 상태 변경은 Repository에 위임:
   - `self.compareSelection.toggle(id:)` → `compareRepo.toggle(id:)`
   - `self.favorites.removeAll(...)` → `favoriteRepo.toggle(for:)`
4. 토스트는 router에 위임: `self.compareToast = ...` → `router.showToast(...)`
5. 탭 전환은 router에 위임: `self.selectedTab = .search` → `router.activeTab = .search`
6. 검색 로직은 searchUseCase에 위임
7. 딥링크는 deepLinkUseCase에 위임

**`live()` 팩토리 메서드는 삭제.** DI 조립은 AppShell의 NativeRootView에서 수행한다.

### 3. CompareViewModel 생성

**`ios/NativeApp/Sources/Features/Compare/CompareViewModel.swift` (신규)**

```swift
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

    // Computed properties — @Observable 체이닝으로 자동 감지됨
    public var comparedKindergartens: [Kindergarten] { ... }
    public var scores: [Int] { ... }
    public var winnerSummary: String? { ... }

    public func remove(at index: Int) { ... }
    public func shareURL() -> URL? { ... }
    public func reviews(for kindercode: String) -> [ReviewLink] { ... }
    public func vacancyCount(for kindercode: String) -> Int { ... }
}
```

`comparedKindergartens`는 `compareRepo.selection.ids`를 순회하며 `kindergartenRepo.lookup[id]`에서 KindergartenRaw를 찾아 Kindergarten으로 변환한다. 거리 계산이 필요하면 `DistanceCalculator`를 사용하되, 비교 화면에서는 거리가 중요하지 않으므로 `distance: -1`로 설정해도 된다.

### 4. SavedViewModel 생성

**`ios/NativeApp/Sources/Features/Saved/SavedViewModel.swift` (신규)**

```swift
@Observable
@MainActor
public final class SavedViewModel {
    private let favoriteRepo: any FavoriteStoring
    private let recentSearchRepo: any RecentSearchStoring
    private let kindergartenRepo: any KindergartenProviding
    private let compareRepo: any CompareStoring
    private let reviewRepo: any ReviewProviding
    private let analytics: AnalyticsTracking?
    private let router: AppRouter

    // Undo 상태 (이 ViewModel 로컬)
    public var favoriteUndoItems: [IndexedFavoriteItem]?
    public var recentSearchUndoItems: [IndexedRecentSearch]?

    public var favoriteKindergartens: [Kindergarten] { ... }

    public func deleteFavorite(atOffsets: IndexSet) { ... }
    public func undoFavoriteDelete() { ... }
    public func deleteRecentSearch(_ search: RecentSearch) { ... }
    public func restoreRecentSearch(_ search: RecentSearch) { ... }
    public func toggleCompare(for kindergarten: Kindergarten) { ... }
    public func toggleFavorite(for kindergarten: Kindergarten) { ... }
}
```

## Acceptance Criteria

```bash
cd ios/WhereKindergartenNative && xcodebuild build \
  -scheme WhereKindergartenNative \
  -destination 'generic/platform=iOS Simulator' \
  -quiet 2>&1 | tail -5
```

빌드가 성공해야 한다. 이 phase에서는 새 ViewModel 파일들을 생성하지만, 기존 View들은 아직 NativeAppModel을 참조한다. **NativeAppModel.swift는 아직 삭제하지 않는다.** 새 ViewModel과 기존 NativeAppModel이 공존하는 상태에서 빌드가 되어야 한다.

## AC 검증 방법

위 xcodebuild 커맨드를 실행하라. `BUILD SUCCEEDED`가 출력되면 `/tasks/0-arch-refactor/index.json`의 phase 4 status를 `"completed"`로 변경하라.

## 주의사항

- **NativeAppModel.swift를 이 phase에서 삭제하지 마라.** Phase 5에서 View 연결과 함께 삭제한다.
- ViewModel의 init에서 Repository 프로토콜 타입(`any CompareStoring` 등)을 사용하라. 구체 타입(`CompareRepository`)을 직접 참조하면 Features가 Services에 불필요하게 결합된다. 단, Features 타겟이 이미 Services에 의존하므로 구체 타입 사용도 빌드는 된다. 아키텍처 원칙상 프로토콜을 사용하는 것을 권장한다.
- `compareToast` 관련 Binding은 AppRouter로 이동했으므로, SearchViewModel에서는 `router.showToast()`를 호출하라.
- `NativeAppModel`의 `preview()` 팩토리 메서드는 ViewModel별로 필요하면 만들되, 이 phase에서는 필수가 아니다.
- SearchViewModel이 가장 크다 (~350줄 예상). NativeAppModel의 private 메서드들(refresh, refreshSearchSuggestions, clearSearchSuggestions, setSearchText, applyCurrentLocationSearch 등)도 함께 이관해야 한다.
- `NativeAppModel`의 `deinit`에서 Task를 cancel하는 로직도 SearchViewModel로 이관하라.

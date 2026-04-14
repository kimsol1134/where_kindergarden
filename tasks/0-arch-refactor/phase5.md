# Phase 5: view-rewire

## 사전 준비

아래 문서를 반드시 읽어라:

- `docs/IOS_ARCHITECTURE.md` — 섹션 5.4(Presentation), 섹션 5.5(AppShell DI 조립), 섹션 6(데이터 흐름 검증)

이전 phase의 작업물을 **반드시 전체** 확인하라:

- `ios/NativeApp/Sources/Features/Search/SearchViewModel.swift` — 모든 public 메서드/프로퍼티
- `ios/NativeApp/Sources/Features/Compare/CompareViewModel.swift` — 모든 public 메서드/프로퍼티
- `ios/NativeApp/Sources/Features/Saved/SavedViewModel.swift` — 모든 public 메서드/프로퍼티
- `ios/NativeApp/Sources/Features/Navigation/AppRouter.swift`
- `ios/NativeApp/Sources/Services/Repositories/` — 6개 Repository 클래스
- `ios/NativeApp/Sources/Domain/UseCases/` — 4개 UseCase

**모든 ViewModel의 public API를 완전히 이해한 후 작업하라.** View에서 호출하는 메서드/프로퍼티가 ViewModel에 실제로 존재하는지 일일이 확인해야 한다.

그리고 기존 View 파일들을 전부 읽어라:

- `ios/NativeApp/Sources/Features/Search/SearchFeature.swift` (SearchHomeView)
- `ios/NativeApp/Sources/Features/Search/KindergartenDetailSheet.swift`
- `ios/NativeApp/Sources/Features/Search/CompareFloatingBar.swift`
- `ios/NativeApp/Sources/Features/Compare/CompareView.swift`
- `ios/NativeApp/Sources/Features/Compare/CompareMatrixView.swift`
- `ios/NativeApp/Sources/Features/Saved/SavedView.swift`
- `ios/NativeApp/Sources/Features/More/MoreView.swift`
- `ios/NativeApp/Sources/AppShell/NativeRootView.swift`

## 작업 내용

### 1. NativeRootView DI 조립 재작성

**`ios/NativeApp/Sources/AppShell/NativeRootView.swift` 수정**

`docs/IOS_ARCHITECTURE.md` 섹션 5.5의 NativeRootView 코드를 참고하라. 핵심 변경:

1. `@StateObject private var model: NativeAppModel` 제거
2. `@State private var router: AppRouter` 추가
3. `@State private var searchVM: SearchViewModel` 추가
4. `@State private var compareVM: CompareViewModel` 추가
5. `@State private var savedVM: SavedViewModel` 추가
6. `init()`에서 모든 Repository 인스턴스를 생성하고, UseCase를 만들고, ViewModel에 주입
7. body에서 각 Tab에 해당 ViewModel을 전달

**DI 조립 순서:**
```
1. Configuration, Persistence, Loaders
2. Repositories (공유 인스턴스)
3. UseCases
4. External Services (Location, KakaoSearch, Analytics)
5. AppRouter
6. ViewModels (Repository + UseCase + Service 주입)
```

**중요**: CompareRepository, FavoriteRepository 등의 같은 인스턴스가 여러 ViewModel에 주입되어야 한다. SearchViewModel과 CompareViewModel이 같은 `compareRepo`를 참조해야 기능 간 상태 동기화가 된다.

TabView의 `selection`은 `$router.activeTab`에 바인딩.
`onOpenURL`은 `searchVM.applyDeepLink(url)` 호출.
`onContinueUserActivity`도 `searchVM.applyUniversalLink(userActivity)` 호출.
Toast overlay는 `router.toast`를 감시.
서비스 초기화(AdMob, Kakao SDK)는 기존 로직 유지.

### 2. SearchHomeView 수정

**`ios/NativeApp/Sources/Features/Search/SearchFeature.swift` 수정**

- `@ObservedObject private var model: NativeAppModel` → ViewModel을 받는 방식으로 변경
- `@Observable` 기반이므로 `@ObservedObject`가 아닌 일반 프로퍼티로 받을 수 있다:
  ```swift
  var viewModel: SearchViewModel
  ```
- 모든 `model.` 참조를 `viewModel.`으로 변경
- `model.compareOrder(for:)` → `viewModel.compareOrder(for:)`
- `model.bootstrapIfNeeded()` → `viewModel.bootstrapIfNeeded()`
- 등등 — 기존 메서드명이 ViewModel에서 동일하게 유지되었다면 이름만 바꾸면 된다.
- `model.selectedTab = .search` → `viewModel.router.activeTab = .search` (또는 SearchViewModel이 이를 캡슐화했다면 해당 메서드 호출)

`SearchChrome` 등 내부 private View들도 `model` → `viewModel`으로 변경하라.

### 3. CompareView 수정

**`ios/NativeApp/Sources/Features/Compare/CompareView.swift` 수정**

- `@ObservedObject private var model: NativeAppModel` → `var viewModel: CompareViewModel`
- `model.comparedKindergartens()` → `viewModel.comparedKindergartens`
- `calculateScores()` 로컬 메서드 삭제 → `viewModel.scores` 사용
- `winnerSummary(scores:)` 로컬 메서드 삭제 → `viewModel.winnerSummary` 사용
- `model.compareShareURL()` → `viewModel.shareURL()`
- `model.removeCompare(at:)` → `viewModel.remove(at:)`
- `model.reviews(for:)` → `viewModel.reviews(for:)`
- `model.vacancyCount(for:)` → `viewModel.vacancyCount(for:)`
- `KakaoShareService.shareCompare(...)` 호출은 CompareViewModel 메서드로 캡슐화하거나, View에서 직접 호출 유지 (아키텍처상 View에서 외부 서비스 직접 호출은 지양하지만, 카카오 공유는 UI 동작이므로 허용 가능)

### 4. SavedView 수정

**`ios/NativeApp/Sources/Features/Saved/SavedView.swift` 수정**

- `@ObservedObject private var model: NativeAppModel` → `var viewModel: SavedViewModel`
- favorites/recentSearches 관련 호출을 viewModel로 변경
- Undo 로직이 SavedViewModel에 있으므로 해당 프로퍼티/메서드 사용

### 5. KindergartenDetailSheet 수정

현재 이 View는 NativeAppModel을 직접 참조하지 않고 데이터를 props로 받는다 (immutable). `onToggleCompare`, `onToggleFavorite` 클로저도 외부에서 주입받는다. **변경이 거의 없을 수 있다.**

SearchViewModel의 `makeDetailSheet(for:)` 메서드가 이 View를 생성한다면, 해당 메서드가 올바르게 작동하는지 확인하라.

### 6. MoreView 확인

MoreView는 ViewModel 없이 동작한다. NativeAppModel을 참조하는 부분이 있다면:
- `model.locationPermissionState` → LocationService에서 직접 조회하거나 Environment로 전달
- 최소한의 변경으로 처리하라

### 7. NativeAppModel.swift 삭제

모든 View가 새 ViewModel을 사용하도록 변경된 후, `NativeAppModel.swift`를 삭제하라.

만약 다른 파일에서 `NativeAppModel`을 아직 참조하고 있다면 (예: `CompareFloatingBar`, `SearchChrome` 등 내부 View), 해당 참조도 수정하라.

### 8. 기타 정리

- `SearchFitPresentation.swift`가 Phase 2에서 이미 비워졌다면 확인. 아직 남아있으면 삭제.
- `CompareView.swift`에서 `calculateScores()` 로컬 함수와 `winnerSummary()` 삭제 확인.
- 전역 함수 `shortenKindergartenName()`이 CompareView.swift에 있다면, CompareMatrixView에서도 사용하는지 확인. 사용한다면 적절한 위치(Shared 또는 ViewModel)로 이동.

## Acceptance Criteria

```bash
cd ios/WhereKindergartenNative && xcodebuild build \
  -scheme WhereKindergartenNative \
  -destination 'generic/platform=iOS Simulator' \
  -quiet 2>&1 | tail -5
```

빌드가 성공해야 한다 (`** BUILD SUCCEEDED **`).

추가로 NativeAppModel.swift가 삭제되었는지 확인:
```bash
test ! -f ios/NativeApp/Sources/Features/Shared/NativeAppModel.swift && echo "DELETED" || echo "STILL EXISTS"
```

## AC 검증 방법

위 두 커맨드를 모두 실행하라. 빌드 성공 + NativeAppModel 삭제 확인 시 `/tasks/0-arch-refactor/index.json`의 phase 5 status를 `"completed"`로 변경하라.
수정 3회 이상 시도해도 빌드 실패하면 status를 `"error"`로 변경하고 에러 메시지를 기록하라.

## 주의사항

- **이 phase가 가장 위험하다.** 모든 View 파일을 수정하고 NativeAppModel을 삭제한다. 빌드 에러가 연쇄적으로 발생할 수 있다. 차분하게 하나씩 해결하라.
- View에서 `model.` → `viewModel.` 치환 시, 메서드 시그니처가 바뀐 경우가 있을 수 있다. ViewModel의 actual API를 반드시 확인하라.
- `@ObservedObject` / `@StateObject` → `@Observable` 전환 시:
  - View의 프로퍼티에 `@ObservedObject`나 `@StateObject` wrapper를 제거하고 일반 `var`로 선언
  - `@State`는 View가 ViewModel을 소유(생성)할 때만 사용. 대부분의 하위 View는 부모에서 주입받으므로 `var`
  - NativeRootView에서 ViewModel을 생성하므로 `@State` 사용
- `CompareView`의 `shareActions`에서 `KakaoShareService.shareCompare()` 호출: CompareViewModel에 `shareViaKakao(names:url:)` 같은 메서드를 추가하거나, View에서 직접 호출을 유지하라. 둘 다 허용되지만, ViewModel 경유가 아키텍처상 더 깔끔하다.
- `fullScreenCover(item:)` 바인딩: `NativeAppModel`에서 `selectedKindergarten`을 `@Published`로 사용했다면, SearchViewModel에서는 `@Observable` 프로퍼티로 변경. `Binding`이 필요한 곳에서는 수동으로 만들어라.
- MoreView가 `model.configuration`을 참조했다면 → `NativeAppConfiguration.live(bundle: .main)` 직접 생성하거나 Environment로 주입.

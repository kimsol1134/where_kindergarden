---
stage: plan
run_id: 2026-04-17-1339-mixpanel-appstore-analytics
task_id: mixpanel-asc-analytics
phase: 4
name: "event-taxonomy-callsites"
created_at: 2026-04-17T15:10:00+09:00
---

# Phase 4: 누락 이벤트 호출 추가 + Event Taxonomy 완성 + ShareLink 교체

## 사전 준비

- 읽기:
  - `docs/ANALYTICS.md` — "섹션 4: Event Taxonomy + Data Dictionary" 전체 (13개 이벤트, required/optional properties 확인)
  - `ios/NativeApp/Sources/Services/Analytics.swift` — Phase 1 완료 후 (13개 enum case, AnalyticsProperties 타입)
  - `ios/NativeApp/Sources/Features/Search/SearchViewModel.swift` — 전체 파일 (bootstrapIfNeeded, select, toggleCompare, toggleFavorite, filters.didSet 위치)
  - `ios/NativeApp/Sources/Features/Compare/CompareViewModel.swift` — 전체 파일 (remove, shareURL 메서드)
  - `ios/NativeApp/Sources/Features/Compare/CompareView.swift` — 전체 파일 (shareActions @ViewBuilder, ShareLink 사용 위치, KakaoShareService 버튼)
  - `ios/NativeApp/Sources/Features/Saved/SavedViewModel.swift` — 전체 파일
  - `ios/NativeApp/Sources/AppShell/NativeRootView.swift` — TabView, router.activeTab 전환 패턴
  - `ios/NativeApp/Sources/Features/Navigation/AppRouter.swift` — NativeTab enum 확인 (탭 이름)
  - `ios/NativeApp/Sources/Services/KakaoShareService.swift` — shareCompare 시그니처 확인
  - `CLAUDE.md` — "console.log 절대 남기지 않기", "any 타입 사용 금지"
- 참조 artifact:
  - `.harness/runs/2026-04-17-1339-mixpanel-appstore-analytics/tasks/mixpanel-asc-analytics/phase3-output.md` — MixpanelAnalytics 최종 시그니처, NativeRootView DI 확인

## 지시

이 Phase는 Features 레이어 수정만 담당한다. 새 파일 생성 없음.

### 1. `SearchViewModel.swift` — Detail Opened 이벤트 추가

`select(kindergarten:)` 메서드 (현재 line ~465):
```swift
public func select(kindergarten: Kindergarten) {
    analytics?.track(event: .resultTapped, properties: ["kindercode": .string(kindergarten.kindercode)])
    // 추가: Detail Opened (상세 시트가 열리는 시점 = select 직후)
    analytics?.track(event: .detailOpened, properties: [
        "kindercode": .string(kindergarten.kindercode),
        "kindergarten_type": .string(kindergarten.raw.type.rawValue)  // type 필드명은 코드베이스 확인 후
    ])
    selectedKindergarten = kindergarten
}
```

`kindergarten.raw.type` 또는 이에 상응하는 type property를 코드베이스에서 확인 후 사용. `KindergartenModels.swift`에서 type 필드명 확인 필요.

### 2. `filters.didSet` — Filter Applied debounce/commit

현재 `filters.didSet`에서 즉시 `filterChanged` 이벤트 발생 → 슬라이더 드래그마다 발화. 변경 방법:

`SearchViewModel`에 debounce 타이머 추가:
```swift
private var filterAppliedTask: Task<Void, Never>?

// filters.didSet 내
filterAppliedTask?.cancel()
filterAppliedTask = Task { [weak self] in
    try? await Task.sleep(for: .milliseconds(500))
    guard !Task.isCancelled, let self else { return }
    await MainActor.run {
        self.analytics?.track(event: .filterApplied, properties: [
            "radius": .int(self.filters.radiusKM),
            "sort": .string(self.filters.sort.rawValue)
        ])
    }
}
```

500ms debounce: 슬라이더가 멈춘 뒤 500ms 후에만 이벤트 발행.

### 3. `NativeRootView.swift` — TabChanged 이벤트 추가

`TabView`의 `onChange(of: router.activeTab)` modifier 또는 동등한 메커니즘으로 탭 전환 추적:

```swift
.onChange(of: router.activeTab) { oldTab, newTab in
    searchVM.trackTabChanged(from: oldTab, to: newTab)
}
```

`SearchViewModel`에 메서드 추가:
```swift
public func trackTabChanged(from: NativeTab, to: NativeTab) {
    analytics?.track(event: .tabChanged, properties: [
        "from_tab": .string(from.rawValue),
        "to_tab": .string(to.rawValue)
    ])
}
```

`NativeTab.rawValue` 또는 이름 값이 적절한지 `AppRouter.swift`에서 확인 후 사용.

### 4. `CompareViewModel.swift` — Compare Viewed 이벤트 + shareKakao/shareSystem 메서드 추가

```swift
// CompareViewModel에 추가
public func trackCompareViewed() {
    analytics?.track(event: .compareViewed, properties: [
        "compare_count": .int(comparedKindergartens.count)
    ])
}

public func shareKakao(names: [String]) {
    // KakaoShareService.shareCompare 호출 (기존 CompareView에서 인라인 호출 대체)
    guard let url = shareURL() else { return }
    KakaoShareService.shareCompare(names: names, shareURL: url)
    analytics?.track(event: .compareShared, properties: [
        "method": .string("kakao"),
        "compare_count": .int(comparedKindergartens.count)
    ])
}

public func shareSystem() -> URL? {
    // UIActivityViewController에 넘길 URL을 반환. 이벤트는 사용자 확인 후 발행.
    // 단순히 URL을 반환하고 track은 CompareView에서 Button 탭 즉시 발행
    analytics?.track(event: .compareShared, properties: [
        "method": .string("system"),
        "compare_count": .int(comparedKindergartens.count)
    ])
    return shareURL()
}
```

### 5. `CompareView.swift` — ShareLink 제거 + Button + UIActivityViewController 교체

`shareActions` @ViewBuilder에서:
- `ShareLink(item: shareURL, ...)` 블록 전체 제거
- 대체: `Button { ... }` + `UIActivityViewController` 직접 호출

```swift
// ShareLink 제거 후 대체 패턴 (시그니처 수준)
Button {
    if let url = viewModel.shareSystem() {
        let vc = UIActivityViewController(
            activityItems: [url, NativeAppConfiguration.shareDescription],
            applicationActivities: nil
        )
        // presentingViewController 확인 (UIApplication.shared.connectedScenes 이용)
        // 기존 KakaoShareService 패턴 또는 앱 내 UIViewController 접근 방식 참조
        UIApplication.shared.topViewController?.present(vc, animated: true)
    }
} label: {
    Label("비교 링크 공유", systemImage: "square.and.arrow.up.fill")
        // 기존 ShareLink의 label 스타일 그대로 유지
}
.accessibilityIdentifier("compare.shareButton")
.buttonStyle(.plain)
```

`UIApplication.shared.topViewController` 확장 또는 `SceneDelegate` 방식으로 ViewController 접근. 기존 코드베이스에 유사한 패턴이 있으면 그것을 따름 (`KakaoShareService.swift` 또는 다른 UIKit bridge 참조).

카카오 버튼은 이미 `Button { KakaoShareService.shareCompare(...) }` 패턴이므로 `viewModel.shareKakao(names:)` 호출로 교체:

```swift
Button {
    viewModel.shareKakao(names: items.map(\.name))
} label: {
    Label("카카오톡으로 보내기", systemImage: "message.fill")
    // 기존 스타일 유지
}
```

### 6. `CompareView.swift` — Compare Viewed onAppear

```swift
// CompareView.body 또는 NavigationStack에 추가
.onAppear {
    viewModel.trackCompareViewed()
}
```

## 주의사항

- `ShareLink` 제거가 완전한지 grep으로 확인 필수. 이유: ShareLink 잔재가 남으면 `Compare Shared` 이벤트가 누락됨.
- `UIActivityViewController` present 시 iPad splitview 대응 필요. 이유: `popoverPresentationController.sourceView` 미설정 시 iPad에서 crash. 현재 앱이 iPhone 전용인지 확인 후, iPhone 전용이면 생략 가능.
- `filterApplied` debounce Task가 ViewModel dealloc 시 취소되어야 함. 이유: retain cycle 방지. `filterAppliedTask?.cancel()`을 `deinit`에도 추가.
- `Detail Opened`를 `resultTapped`와 동일 호출부에서 발행한다. 이유: `select(kindergarten:)`이 상세 시트를 여는 유일한 진입점이므로 여기서 2개 이벤트 발행이 맞음. 별도 시트 onAppear에서 발행하면 드릴다운 내비게이션에서 중복 호출 위험.
- `compareViewed`를 `CompareView.onAppear`에서만 발행한다. 이유: `CompareViewModel.init`에서 발행하면 앱 시작 시 항상 발행됨(비교탭을 열지 않아도).
- `console.log`/`print()` 남기지 않음.
- `any` 타입 사용 금지.
- `ios/App/` 수정 금지.

## AC (완료 기준)

```bash
# 1. Swift 빌드 성공
cd ios/NativeApp && swift build 2>&1 | tail -5
# 기대: Build complete.

# 2. ShareLink 제거 확인
grep -rn "ShareLink" ios/NativeApp/Sources --include="*.swift"
# 기대: 0건 (출력 없음)

# 3. 각 신규 이벤트 호출 ≥1건 확인
grep -rn '\.detailOpened' ios/NativeApp/Sources --include="*.swift"
# 기대: 1건 이상

grep -rn '\.compareViewed' ios/NativeApp/Sources --include="*.swift"
# 기대: 1건 이상

grep -rn '\.compareShared' ios/NativeApp/Sources --include="*.swift"
# 기대: 1건 이상 (shareKakao, shareSystem 각각)

grep -rn '\.tabChanged' ios/NativeApp/Sources --include="*.swift"
# 기대: 1건 이상

grep -rn '\.filterApplied' ios/NativeApp/Sources --include="*.swift"
# 기대: 1건 이상

# 4. 구 이벤트 case 참조 없음 재확인 (Phase 1 이후 유지)
grep -rn "filterChanged\|compareToggled\|favoriteToggled" ios/NativeApp/Sources --include="*.swift"
# 기대: 0건

# 5. shareKakao, shareSystem, trackCompareViewed 메서드 존재 확인
grep -q "shareKakao" ios/NativeApp/Sources/Features/Compare/CompareViewModel.swift && echo OK
grep -q "trackCompareViewed" ios/NativeApp/Sources/Features/Compare/CompareViewModel.swift && echo OK
# 기대: OK OK

# 6. filterApplied debounce 확인
grep -q "filterAppliedTask" ios/NativeApp/Sources/Features/Search/SearchViewModel.swift && echo OK
# 기대: OK

# 7. 전체 테스트 신규 실패 없음
cd ios/NativeApp && swift test 2>&1 | grep -E "^Test Suite" | tail -3
# 기대: Test Suite passed (기존 실패 외 신규 실패 없음)
```

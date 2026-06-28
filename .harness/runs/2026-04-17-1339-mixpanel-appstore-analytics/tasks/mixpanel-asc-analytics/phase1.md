---
stage: plan
run_id: 2026-04-17-1339-mixpanel-appstore-analytics
task_id: mixpanel-asc-analytics
phase: 1
name: "analytics-properties-type"
created_at: 2026-04-17T15:10:00+09:00
---

# Phase 1: AnalyticsProperties 타입 도입 + 프로토콜 재설계

## 사전 준비

- 읽기:
  - `docs/ANALYTICS.md` — Phase 0에서 작성한 Event Taxonomy, Data Dictionary, Super Properties 정의 (모든 이벤트 raw value, property 타입 확인)
  - `ios/NativeApp/Sources/Services/Analytics.swift` — 현재 전체 파일 (10개 이벤트 enum, `AnalyticsTracking` 프로토콜, `OSLogAnalytics`, `MockAnalytics`)
  - `ios/NativeApp/Sources/Features/Search/SearchViewModel.swift` — 현재 track 호출 위치 전체 (line 25, 277, 466, 497-518, 653-659)
  - `ios/NativeApp/Sources/Features/Compare/CompareViewModel.swift` — line 74 (`compareToggled` 호출)
  - `ios/NativeApp/Sources/Features/Saved/SavedViewModel.swift` — line 107-128 (`favoriteToggled`, `compareToggled` 호출)
  - `ios/NativeApp/Package.swift` — 타겟 구조 확인 (Services, Features 타겟)
  - `CLAUDE.md` — "any 타입 사용 금지" 절대 규칙
- 참조 artifact:
  - `.harness/runs/2026-04-17-1339-mixpanel-appstore-analytics/01-clarify.md` — A6 반전: `[String: String]` 유지 안 함, scope 증가 수용
  - `.harness/runs/2026-04-17-1339-mixpanel-appstore-analytics/tasks/mixpanel-asc-analytics/phase0.md` — AC 통과 후 진입

## 지시

`ios/NativeApp/Sources/Services/Analytics.swift`를 아래 시그니처 기준으로 수정한다.

### 1. `AnalyticsValue` enum 추가

```swift
// Analytics.swift 상단 (import 아래)
public enum AnalyticsValue: Sendable {
    case string(String)
    case int(Int)
    case double(Double)
    case bool(Bool)
}

public typealias AnalyticsProperties = [String: AnalyticsValue]
```

- `Sendable` 준수 필수. 이유: `@MainActor` ViewModel에서 호출되므로 concurrency 안전성 필요.
- `any` 타입 사용 금지. 이유: CLAUDE.md 절대 규칙.

### 2. `AnalyticsEvent` enum 재설계

기존 10개 case를 아래 13개로 교체. raw value를 Title Case 문자열로 설정:

```swift
public enum AnalyticsEvent: String, Sendable {
    case appLaunched       = "App Launched"
    case searchExecuted    = "Search Executed"
    case emptyStateShown   = "Empty State Shown"
    case resultTapped      = "Result Tapped"
    case detailOpened      = "Detail Opened"
    case favoriteAdded     = "Favorite Added"
    case favoriteRemoved   = "Favorite Removed"
    case comparisonAdded   = "Comparison Added"
    case comparisonRemoved = "Comparison Removed"
    case compareViewed     = "Compare Viewed"
    case compareShared     = "Compare Shared"
    case filterApplied     = "Filter Applied"
    case tabChanged        = "Tab Changed"
}
```

기존 `filterChanged`, `compareToggled`, `favoriteToggled` case 삭제.

### 3. `AnalyticsTracking` 프로토콜 업데이트

```swift
public protocol AnalyticsTracking: AnyObject {
    func track(event: AnalyticsEvent, properties: AnalyticsProperties)
    func updateSuperProperties(_ properties: AnalyticsProperties)
}

extension AnalyticsTracking {
    public func track(event: AnalyticsEvent) {
        track(event: event, properties: [:])
    }
}
```

### 4. `OSLogAnalytics` 업데이트

`track(event:properties:)` 시그니처를 새 타입으로 업데이트. `AnalyticsValue`를 문자열로 변환하는 private helper 추가:
- `.string(let s)` → s
- `.int(let i)` → String(i)
- `.double(let d)` → String(d)
- `.bool(let b)` → String(b)

`updateSuperProperties(_:)` 구현: `os_log`로 super properties를 로깅만 함 (실제 저장 불필요).

### 5. `MockAnalytics` 업데이트

```swift
public final class MockAnalytics: AnalyticsTracking {
    public struct RecordedEvent: Equatable {
        public let event: AnalyticsEvent
        public let properties: AnalyticsProperties
    }

    public private(set) var events: [RecordedEvent] = []
    public private(set) var superProperties: AnalyticsProperties = [:]

    public init() {}

    public func track(event: AnalyticsEvent, properties: AnalyticsProperties) {
        events.append(RecordedEvent(event: event, properties: properties))
    }

    public func updateSuperProperties(_ properties: AnalyticsProperties) {
        superProperties.merge(properties) { _, new in new }
    }
}
```

`RecordedEvent.Equatable` 구현 가능 여부 확인: `AnalyticsProperties` = `[String: AnalyticsValue]`이고 `AnalyticsValue`가 `Equatable`하려면 enum에 `Equatable` conformance 추가 필요.

### 6. ViewModel 호출부 전체 수정

`SearchViewModel.swift`, `CompareViewModel.swift`, `SavedViewModel.swift`에서 모든 `track(event:properties:)` 호출을 새 `AnalyticsProperties` 타입으로 수정.

변경 예시 (시그니처만 — 실제 구현은 AI 재량):
```swift
// 기존 (SearchViewModel.swift:25)
analytics?.track(event: .filterChanged, properties: ["radius": "\(filters.radiusKM)", "sort": filters.sort.rawValue])

// 변경 후 (임시로 filterApplied 사용, 최종 debounce 처리는 Phase 4)
analytics?.track(event: .filterApplied, properties: [
    "radius": .int(filters.radiusKM),
    "sort": .string(filters.sort.rawValue)
])
```

```swift
// 기존 (SearchViewModel.swift:497-499)
analytics?.track(event: .compareToggled, properties: ["kindercode": kindergarten.kindercode, "selected": "true"])

// 변경 후
analytics?.track(event: .comparisonAdded, properties: ["kindercode": .string(kindergarten.kindercode)])
```

```swift
// 기존 (SearchViewModel.swift:515-516)
analytics?.track(event: .favoriteToggled, properties: ["kindercode": kindergarten.kindercode, "favorited": "\(!wasFavorite)"])

// 변경 후 (wasFavorite 기반 분기)
if wasFavorite {
    analytics?.track(event: .favoriteRemoved, properties: ["kindercode": .string(kindergarten.kindercode)])
} else {
    analytics?.track(event: .favoriteAdded, properties: ["kindercode": .string(kindergarten.kindercode)])
}
```

`SearchViewModel.swift:655`의 `searchExecuted`에 `result_count` Int, `has_results` Bool, `radius` Int property 추가 (값은 현재 context에서 가져올 것):
```swift
analytics?.track(event: .searchExecuted, properties: [
    "result_count": .int(baseResults.count),
    "has_results": .bool(!baseResults.isEmpty),
    "radius": .int(filters.radiusKM)
])
```

`CompareViewModel.swift:74`, `SavedViewModel.swift:119-128`의 `compareToggled`도 `comparisonAdded`/`comparisonRemoved`로 분기 수정.
`SavedViewModel.swift:107-109`의 `favoriteToggled`도 `favoriteAdded`/`favoriteRemoved`로 분기 수정.

Phase 4에서 추가될 이벤트(`detailOpened`, `compareViewed`, `compareShared`, `tabChanged`)는 이 Phase에서 추가하지 않는다. 이유: Phase 1은 타입 레이어 수정만, 호출 추가는 Phase 4 scope.

## 주의사항

- `AnalyticsValue`에 `any` 케이스를 추가하지 마라. 이유: CLAUDE.md "any 타입 사용 금지" 절대 규칙. Mixpanel SDK의 `MixpanelType`과의 어댑터는 Phase 3에서만 구현.
- `MixpanelType` import를 이 파일에 추가하지 마라. 이유: Phase 1은 Services 내부 타입만 정의. Mixpanel SPM 의존성은 Phase 3에서 추가됨. 지금 추가하면 빌드 실패.
- `filterChanged`, `compareToggled`, `favoriteToggled` case를 그냥 두지 마라. 이유: 이 Phase에서 삭제해야 Phase 4 이후 코드가 새 case만 참조. 남겨두면 ViewModel 호출부도 수정이 불완전해진다.
- `NativeRootView.swift`는 이 Phase에서 수정하지 마라. 이유: DI 교체(`OSLogAnalytics` → `MixpanelAnalytics`)는 Phase 3 scope.
- `console.log` 남기지 않음. 이유: Swift이므로 `print()` 호출도 포함.

## AC (완료 기준)

```bash
# 1. 빌드 성공 (시뮬레이터용, 코드서명 없이)
cd ios/NativeApp && swift build 2>&1 | tail -5
# 기대: Build complete. (error 0건)

# 2. [String: String] 타입의 track 호출이 0건인지 확인
grep -rn '\["[^"]*": "[^"]*"\]' ios/NativeApp/Sources --include="*.swift" | grep "track(event"
# 기대: 0건 (출력 없음)

# 3. 삭제된 구 이벤트 case 참조 없음 확인
grep -rn "filterChanged\|compareToggled\|favoriteToggled" ios/NativeApp/Sources --include="*.swift"
# 기대: 0건 (출력 없음)

# 4. AnalyticsValue enum 존재 확인
grep -q "enum AnalyticsValue" ios/NativeApp/Sources/Services/Analytics.swift && echo OK
# 기대: OK

# 5. updateSuperProperties 프로토콜 메서드 존재 확인
grep -q "updateSuperProperties" ios/NativeApp/Sources/Services/Analytics.swift && echo OK
# 기대: OK

# 6. Title Case raw value 확인
grep -q '"App Launched"' ios/NativeApp/Sources/Services/Analytics.swift && echo OK
# 기대: OK

# 7. 기존 NativeAppTests 빌드 통과
cd ios/NativeApp && swift test --filter NativeAppTests 2>&1 | tail -10
# 기대: Test Suite passed (또는 기존 실패 테스트만 실패, 새 실패 없음)
```

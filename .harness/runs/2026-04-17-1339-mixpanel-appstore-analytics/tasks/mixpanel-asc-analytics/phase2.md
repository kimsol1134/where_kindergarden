---
stage: plan
run_id: 2026-04-17-1339-mixpanel-appstore-analytics
task_id: mixpanel-asc-analytics
phase: 2
name: "session-tracker-superprops"
created_at: 2026-04-17T15:10:00+09:00
---

# Phase 2: SessionTracker + DeviceInfo + Super Properties

## 사전 준비

- 읽기:
  - `docs/ANALYTICS.md` — "섹션 2: Identity & Session 정의", "섹션 3: Super Properties" 전체 (session boundary 30분, IDFV distinct_id, 7개 super property 정의)
  - `ios/NativeApp/Sources/Services/Analytics.swift` — Phase 1 완료 후 파일 (AnalyticsValue, AnalyticsProperties, updateSuperProperties 시그니처 확인)
  - `ios/NativeApp/Sources/Services/NativeAppConfiguration.swift` — `live(bundle:)` 패턴, `normalizedValue` 유틸, bundle key 로딩 방식
  - `ios/NativeApp/Sources/AppShell/NativeRootView.swift` — `initializeServices()` 메서드 구조 확인
  - `ios/NativeApp/Package.swift` — `NativeAppTests` 타겟 의존성 확인
  - `CLAUDE.md` — "새 기능에는 반드시 유닛 테스트 작성" TDD 원칙, "any 타입 사용 금지"
- 참조 artifact:
  - `.harness/runs/2026-04-17-1339-mixpanel-appstore-analytics/01-clarify.md` — A5: IDFV 사용, ATT 동의 시 IDFA 추가 수집
  - `.harness/runs/2026-04-17-1339-mixpanel-appstore-analytics/tasks/mixpanel-asc-analytics/phase1-output.md` — Phase 1 산출물 (Analytics.swift 최종 시그니처)

## 지시

### 1. `SessionTracker.swift` 신규 생성

경로: `ios/NativeApp/Sources/Services/SessionTracker.swift`

```swift
// 시그니처 수준 — 구현은 AI 재량
import Foundation

public final class SessionTracker: @unchecked Sendable {
    public static let sessionTimeoutInterval: TimeInterval = 30 * 60  // 30분

    public private(set) var currentSessionId: String
    public var onSessionChanged: ((String) -> Void)?

    public init()

    // applicationDidBecomeActive 시 호출 — 마지막 background 진입 후 30분 초과면 새 session_id 생성
    public func handleForeground()

    // applicationDidEnterBackground 시 호출 — backgroundEnteredAt 타임스탬프 저장
    public func handleBackground()
}
```

비즈니스 규칙:
- `backgroundEnteredAt`은 `UserDefaults.standard`에 저장 (key: `analytics.background_entered_at`)
- `currentSessionId`는 `UserDefaults.standard`에 저장 (key: `analytics.session_id`)
- 앱 최초 실행 시 새 session_id 생성
- foreground 복귀 시 `Date() - backgroundEnteredAt > sessionTimeoutInterval`이면 새 UUID 생성 + `onSessionChanged` 호출
- 30분 미만이면 기존 session_id 유지
- UUID는 `UUID().uuidString`

### 2. `DeviceInfo.swift` 신규 생성

경로: `ios/NativeApp/Sources/Services/DeviceInfo.swift`

```swift
import Foundation
import UIKit

public struct DeviceInfo: Sendable {
    public let appVersion: String        // CFBundleShortVersionString
    public let buildNumber: String       // CFBundleVersion
    public let osVersion: String         // UIDevice.current.systemVersion
    public let deviceModel: String       // UIDevice.current.model
    public let locale: String            // Locale.current.identifier
    public let isTestFlight: Bool        // sandboxReceipt 여부
    public let daysSinceInstall: Int     // first_launch_at 기준 계산

    public static func current(bundle: Bundle = .main) -> DeviceInfo
}
```

비즈니스 규칙:
- `isTestFlight`: `Bundle.main.appStoreReceiptURL?.lastPathComponent == "sandboxReceipt"`
- `daysSinceInstall`: `UserDefaults.standard`에서 `analytics.first_launch_at` (TimeInterval) 읽기. 없으면 현재 시각으로 저장 후 0 반환. 있으면 `Int((Date().timeIntervalSince1970 - firstLaunchAt) / 86400)` 계산.
- `deviceModel`: `UIDevice.current.model` — 상세 identifier (e.g. "iPhone15,4")를 `sysctlbyname("hw.machine")` 으로 읽는 것 권장. 불가 시 `UIDevice.current.model`로 fallback.
- `UIDevice` 접근은 `@MainActor` 또는 `DispatchQueue.main.sync` 필요 — 구현 시 thread safety 고려.

### 3. `Analytics.swift` 내 `OSLogAnalytics` 보완

Phase 1에서 추가된 `updateSuperProperties(_:)` 구현이 no-op이거나 logging만 하는 상태. Phase 2에서는 변경 없음. 이유: 실제 Super Properties 등록은 Phase 3 `MixpanelAnalytics`에서만 의미 있음.

### 4. 유닛 테스트 작성

경로: `ios/NativeApp/Tests/NativeAppTests/SessionTrackerTests.swift`

테스트 케이스 (시그니처 수준):

```swift
// SessionTracker 유닛 테스트
final class SessionTrackerTests: XCTestCase {
    func test_initialSessionId_isNotEmpty()
    func test_handleBackground_storesTimestamp()
    func test_handleForeground_withinTimeout_keepsSameSessionId()
    func test_handleForeground_afterTimeout_generatesNewSessionId()
    func test_handleForeground_callsOnSessionChanged_afterTimeout()
}
```

테스트에서 `UserDefaults` 격리: `UserDefaults(suiteName: "test.\(UUID().uuidString)")` 사용. `SessionTracker`의 `init`에 `UserDefaults` 주입 파라미터 추가 필요.

경로: `ios/NativeApp/Tests/NativeAppTests/DeviceInfoTests.swift`

```swift
final class DeviceInfoTests: XCTestCase {
    func test_current_appVersion_isNotEmpty()
    func test_current_isTestFlight_returnsBool()
    func test_daysSinceInstall_firstLaunch_returnsZero()
    func test_daysSinceInstall_existingInstall_returnsCorrectDays()
}
```

## 주의사항

- `any` 타입 사용 금지. 이유: CLAUDE.md 절대 규칙. `DeviceInfo`와 `SessionTracker` 모두 명시적 타입만 사용.
- `UIDevice.current` 접근을 백그라운드 스레드에서 하지 마라. 이유: UIKit API는 Main Thread 전용. `DeviceInfo.current()` 호출을 `@MainActor`로 보호하거나 테스트에서 mock 주입.
- `UserDefaults.standard`를 `SessionTracker.init()`에 하드코딩하지 마라. 이유: 유닛 테스트에서 격리된 `UserDefaults`를 주입할 수 없어 테스트 간 상태 오염 발생.
- 이 Phase에서 `NativeRootView.swift`를 수정하지 마라. 이유: `SessionTracker` 인스턴스 생성 및 앱 생명주기 연결은 Phase 3 scope (App struct init에서 처리).
- `ios/App/` 디렉토리(Capacitor 웹앱)는 건드리지 마라. 이유: CLAUDE.md에 명시된 레거시.

## AC (완료 기준)

```bash
# 1. 신규 파일 존재 확인
test -f ios/NativeApp/Sources/Services/SessionTracker.swift && echo OK
test -f ios/NativeApp/Sources/Services/DeviceInfo.swift && echo OK
# 기대: OK OK

# 2. Swift 빌드 성공
cd ios/NativeApp && swift build 2>&1 | tail -5
# 기대: Build complete.

# 3. SessionTracker 유닛 테스트 통과
cd ios/NativeApp && swift test --filter SessionTrackerTests 2>&1 | tail -10
# 기대: Executed N tests, with 0 failures

# 4. DeviceInfo 유닛 테스트 통과
cd ios/NativeApp && swift test --filter DeviceInfoTests 2>&1 | tail -10
# 기대: Executed N tests, with 0 failures

# 5. handleForeground, handleBackground 메서드 존재 확인
grep -q "handleForeground" ios/NativeApp/Sources/Services/SessionTracker.swift && echo OK
grep -q "handleBackground" ios/NativeApp/Sources/Services/SessionTracker.swift && echo OK
# 기대: OK OK

# 6. daysSinceInstall 계산 로직 존재 확인
grep -q "first_launch_at" ios/NativeApp/Sources/Services/DeviceInfo.swift && echo OK
# 기대: OK

# 7. 전체 테스트 이전 대비 신규 실패 없음 확인
cd ios/NativeApp && swift test 2>&1 | grep -E "failed|error" | grep -v "^Build"
# 기대: (기존 실패만, 신규 실패 없음)
```

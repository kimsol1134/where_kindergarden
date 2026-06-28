---
stage: plan
run_id: 2026-04-17-1339-mixpanel-appstore-analytics
task_id: mixpanel-asc-analytics
phase: 3
name: "mixpanel-sdk-integration"
created_at: 2026-04-17T15:10:00+09:00
---

# Phase 3: Mixpanel SDK 연동 + Dev/Prod 분리 + 싱글턴 초기화

## 사전 준비

- 읽기:
  - `docs/ANALYTICS.md` — "섹션 5: Dev/Prod 프로젝트 분리" xcconfig 분기 패턴, "섹션 3: Super Properties" 7개 항목, "섹션 2: Identity" IDFV 방식
  - `ios/NativeApp/Sources/Services/Analytics.swift` — Phase 1 완료 후 (AnalyticsValue, AnalyticsProperties, AnalyticsTracking 프로토콜 with updateSuperProperties)
  - `ios/NativeApp/Sources/Services/SessionTracker.swift` — Phase 2 완료 후 (SessionTracker 시그니처, onSessionChanged 콜백)
  - `ios/NativeApp/Sources/Services/DeviceInfo.swift` — Phase 2 완료 후 (DeviceInfo.current() 시그니처)
  - `ios/NativeApp/Sources/Services/NativeAppConfiguration.swift` — `live(bundle:)` 팩토리, `normalizedValue` 패턴
  - `ios/NativeApp/Config/NativeAppInfo.plist` — 기존 키 주입 패턴 (`KAKAO_NATIVE_APP_KEY`, `ADMOB_BANNER_UNIT_ID`)
  - `ios/WhereKindergartenNative/Config/WhereKindergartenNative.xcconfig` — 현재 xcconfig 구조 (`WK_ADMOB_BANNER_UNIT_ID`, `ADMOB_BANNER_UNIT_ID`)
  - `ios/WhereKindergartenNative/Config/KakaoKeys.example.xcconfig` — local override 파일 예시
  - `ios/NativeApp/Package.swift` — 현재 SPM 의존성 목록, Services 타겟 dependencies
  - `ios/NativeApp/Sources/AppShell/NativeRootView.swift` — `init()` 내 DI 조립 구조, `initializeServices()` 메서드
  - `ios/WhereKindergartenNative/Sources/WhereKindergartenNativeHostApp.swift` — `@main` App struct 전체 (현재 `init()` 없음)
  - `CLAUDE.md` — "API 키를 코드에 하드코딩 금지", "any 타입 사용 금지", "새 기능에는 반드시 유닛 테스트"
- 참조 artifact:
  - `.harness/runs/2026-04-17-1339-mixpanel-appstore-analytics/tasks/mixpanel-asc-analytics/phase2-output.md` — SessionTracker, DeviceInfo 최종 시그니처

## 지시

### 1. `ios/NativeApp/Package.swift` — Mixpanel SPM 추가

`dependencies` 배열에 추가:
```swift
.package(url: "https://github.com/mixpanel/mixpanel-swift", .upToNextMinor(from: "4.3.0"))
```

`Services` 타겟 `dependencies`에 추가:
```swift
.product(name: "Mixpanel", package: "mixpanel-swift")
```

### 2. `ios/WhereKindergartenNative/Config/WhereKindergartenNative.xcconfig` — 토큰 분기

파일 끝에 추가:
```
// Mixpanel — Debug(개발)/Release(프로덕션) 프로젝트 토큰 분리
WK_MIXPANEL_TOKEN_DEBUG =
WK_MIXPANEL_TOKEN_RELEASE =
MIXPANEL_TOKEN = $(WK_MIXPANEL_TOKEN_$(CONFIGURATION))
```

값은 비워둔다(placeholder). 실제 토큰은 `KakaoKeys.local.xcconfig` 패턴과 동일하게 로컬 override 파일에서 주입. 이유: API 키 하드코딩 금지 (CLAUDE.md 절대 규칙).

`ios/WhereKindergartenNative/Config/KakaoKeys.example.xcconfig`에 Mixpanel 예시 줄 추가:
```
WK_MIXPANEL_TOKEN_DEBUG =
WK_MIXPANEL_TOKEN_RELEASE =
```

### 3. `ios/NativeApp/Config/NativeAppInfo.plist` — MIXPANEL_TOKEN 키 추가

`KAKAO_NATIVE_APP_KEY` 패턴과 동일하게 추가:
```xml
<key>MIXPANEL_TOKEN</key>
<string>$(MIXPANEL_TOKEN)</string>
```

### 4. `ios/NativeApp/Sources/Services/NativeAppConfiguration.swift` — mixpanelToken 프로퍼티 추가

`NativeAppConfiguration` struct에 추가:
```swift
public let mixpanelToken: String?
```

`init`에 파라미터 추가 (기본값 nil). `live(bundle:)` 팩토리에서 로드:
```swift
mixpanelToken: bundle.object(forInfoDictionaryKey: "MIXPANEL_TOKEN") as? String
```

`normalizedValue` 통과시켜 `$(` prefix 필터링.

### 5. `ios/NativeApp/Sources/Services/MixpanelAnalytics.swift` — 싱글턴 구현

```swift
import Foundation
import Mixpanel
import UIKit

public final class MixpanelAnalytics: AnalyticsTracking {

    // 싱글턴 — configure(token:) 1회 호출 후 shared 사용
    public static let shared = MixpanelAnalytics()

    private var isConfigured = false
    private let sessionTracker: SessionTracker

    private init()

    // App struct init()에서 1회만 호출
    // idempotent guard: isConfigured == true면 즉시 return
    public func configure(token: String, sessionTracker: SessionTracker, deviceInfo: DeviceInfo)

    // MARK: - AnalyticsTracking
    public func track(event: AnalyticsEvent, properties: AnalyticsProperties)
    public func updateSuperProperties(_ properties: AnalyticsProperties)

    // MARK: - Private
    private func analyticsValueToMixpanel(_ value: AnalyticsValue) -> MixpanelType
}
```

비즈니스 규칙:
- `configure()` 내부:
  1. `guard !isConfigured else { return }` — 중복 초기화 방지
  2. `Mixpanel.initialize(token: token, trackAutomaticEvents: false)` 호출
  3. `identify(distinctId: UIDevice.current.identifierForVendor?.uuidString ?? UUID().uuidString)` 호출
  4. `DeviceInfo.current()`로 super properties 7개 일괄 등록 (`registerSuperProperties`)
  5. `SessionTracker.onSessionChanged` 콜백 등록 → session_id 변경 시 `registerSuperPropertiesOnce` 또는 `registerSuperProperties` 재호출
  6. `isConfigured = true`
- `track(event:properties:)`:
  - `Mixpanel.mainInstance().track(event: event.rawValue, properties: mixpanelProps)` 호출
  - `analyticsValueToMixpanel`로 변환 후 전달
- `analyticsValueToMixpanel(_:)`:
  - `.string(let s)` → `s as MixpanelType`
  - `.int(let i)` → `i as MixpanelType`
  - `.double(let d)` → `d as MixpanelType`
  - `.bool(let b)` → `b as MixpanelType`
- `updateSuperProperties(_:)`: `Mixpanel.mainInstance().registerSuperProperties(converted)` 호출

### 6. `ios/WhereKindergartenNative/Sources/WhereKindergartenNativeHostApp.swift` — App init에서 1회 초기화

```swift
import AppShell
import Services
import SwiftUI

@main
struct WhereKindergartenNativeHostApp: App {
    init() {
        // Mixpanel 1회 초기화 — NativeRootView body보다 앞에 실행됨
        let config = NativeAppConfiguration.live(bundle: .main)
        if let token = config.mixpanelToken {
            let sessionTracker = SessionTracker()
            let deviceInfo = DeviceInfo.current()
            MixpanelAnalytics.shared.configure(
                token: token,
                sessionTracker: sessionTracker,
                deviceInfo: deviceInfo
            )
        }
    }

    var body: some Scene {
        WindowGroup {
            NativeRootView()
                .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
    }
}
```

`NativeRootView`는 `MixpanelAnalytics.shared`를 주입받아 사용. `NativeRootView.init()`에서 `analytics = MixpanelAnalytics.shared`로 변경 (Phase 3에서 처리하거나 Phase 4에서 처리 중 택일).

### 7. 유닛 테스트

경로: `ios/NativeApp/Tests/NativeAppTests/MixpanelAnalyticsTests.swift`

```swift
final class MixpanelAnalyticsTests: XCTestCase {
    // configure가 idempotent한지 테스트 (빈 토큰으로 2회 호출해도 crash 없음)
    func test_configure_idempotent_doesNotCrash()

    // analyticsValueToMixpanel 변환 정확성 테스트 (직접 접근 불가 시 track 호출 결과 확인)
    // 가능하면 Mixpanel SDK 의존 없이 AnalyticsValue 변환 로직만 분리 테스트
    func test_analyticsValue_string_convertsCorrectly()
    func test_analyticsValue_int_convertsCorrectly()
    func test_analyticsValue_bool_convertsCorrectly()
}
```

테스트에서 실제 Mixpanel 네트워크 호출을 막기 위해 `Mixpanel.initialize(token: "test-token", trackAutomaticEvents: false)` 호출. 실제 이벤트는 서버에 전송되지 않음 (test token이므로).

## 주의사항

- `MixpanelAnalytics(token:)` 생성자를 `NativeRootView.body` 또는 `NativeRootView.init()` 내 `analytics = MixpanelAnalytics(token:)` 패턴으로 만들지 마라. 이유: SwiftUI body 재계산 시 `Mixpanel.initialize()` 중복 호출 위험. `@main` App `init()`에서 싱글턴 1회만 초기화.
- `MIXPANEL_TOKEN` 값을 소스 파일에 하드코딩하지 마라. 이유: CLAUDE.md "API 키 하드코딩 금지" 절대 규칙. 항상 xcconfig → Info.plist → NativeAppConfiguration.live()로 주입.
- `any` 타입 사용 금지. 이유: CLAUDE.md. Mixpanel SDK의 `[String: MixpanelType]`은 `MixpanelType`이 protocol이므로 `any MixpanelType` 사용 필요한지 확인. 필요하다면 SDK 실제 타입 확인 후 처리 방법 결정.
- `NativeRootView.body` 내부에서 `configure()`를 호출하지 마라. 이유: 위와 동일. `App.init()`이 body보다 앞에 실행됨을 이용.
- `.gitignore`에 `KakaoKeys.local.xcconfig` 외에 Mixpanel 토큰 로컬 파일이 추가되는 경우 해당 파일도 gitignore에 추가. 이유: CLAUDE.md ".env 파일 커밋 금지".
- `ios/App/` (Capacitor 레거시) 수정 금지.

## AC (완료 기준)

```bash
# 1. SPM 의존성 해소 확인
cd ios/NativeApp && swift package resolve 2>&1 | tail -5
# 기대: 오류 없이 완료

# 2. Swift 빌드 성공 (Mixpanel import 포함)
cd ios/NativeApp && swift build 2>&1 | tail -5
# 기대: Build complete.

# 3. Mixpanel import 확인
grep -q "import Mixpanel" ios/NativeApp/Sources/Services/MixpanelAnalytics.swift && echo OK
# 기대: OK

# 4. 싱글턴 패턴 확인
grep -q "static let shared" ios/NativeApp/Sources/Services/MixpanelAnalytics.swift && echo OK
# 기대: OK

# 5. idempotent guard 확인
grep -q "isConfigured" ios/NativeApp/Sources/Services/MixpanelAnalytics.swift && echo OK
# 기대: OK

# 6. App struct init에서 configure 호출 확인
grep -q "configure(" ios/WhereKindergartenNative/Sources/WhereKindergartenNativeHostApp.swift && echo OK
# 기대: OK

# 7. MIXPANEL_TOKEN이 Info.plist에 추가됨 확인
grep -q "MIXPANEL_TOKEN" ios/NativeApp/Config/NativeAppInfo.plist && echo OK
# 기대: OK

# 8. xcconfig에 Debug/Release 분기 확인
grep -q "WK_MIXPANEL_TOKEN_DEBUG" ios/WhereKindergartenNative/Config/WhereKindergartenNative.xcconfig && echo OK
grep -q "WK_MIXPANEL_TOKEN_RELEASE" ios/WhereKindergartenNative/Config/WhereKindergartenNative.xcconfig && echo OK
# 기대: OK OK

# 9. MixpanelAnalytics 유닛 테스트 통과
cd ios/NativeApp && swift test --filter MixpanelAnalyticsTests 2>&1 | tail -10
# 기대: Executed N tests, with 0 failures
```

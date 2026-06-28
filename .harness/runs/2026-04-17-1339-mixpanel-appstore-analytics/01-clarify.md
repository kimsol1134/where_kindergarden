---
stage: clarify
run_id: 2026-04-17-1339-mixpanel-appstore-analytics
task_summary: "Mixpanel + ASC 데이터 분석"
status: complete
critical_questions_open: 0
generated_at: 2026-04-17T14:05:00+09:00
upstream: [.harness/runs/2026-04-17-1339-mixpanel-appstore-analytics/00-task.md]
downstream: [.harness/runs/2026-04-17-1339-mixpanel-appstore-analytics/02-plan.md]
---

# Clarify: Mixpanel + ASC 데이터 분석

## 요청 분석

- 영역: iOS 네이티브 SwiftUI (Services 레이어), App Store Connect API 연동, 분석 인프라
- 예상 영향 범위:
  - `ios/NativeApp/Sources/Services/Analytics.swift` — 현재 `OSLogAnalytics`만 존재, Mixpanel 구현체 추가 필요
  - `ios/NativeApp/Sources/AppShell/NativeRootView.swift:52` — `analytics = OSLogAnalytics()` 하드코딩, DI 교체 필요
  - `ios/NativeApp/Sources/Services/NativeAppConfiguration.swift` — Mixpanel Token 관리 추가 가능성
  - `ios/NativeApp/Config/NativeAppInfo.plist` — Mixpanel Token Info.plist 주입 필요 가능성
  - `ios/NativeApp/Package.swift` — Mixpanel Swift SDK 의존성 추가
  - 신규 스크립트 또는 Fastlane lane — ASC Analytics API 데이터 수집용
- 모호성: 있음 (아래 4개 Critical Questions)

## Critical Questions (4)

### Q1. 이번 런의 최종 산출물 범위
- 맥락: "앱을 개선하고 싶다"는 최종 목표지만, 실제로 이번 런에서 만들어야 할 것이 무엇인지 범위가 열려 있다. 계측 코드 구현과 데이터 수집 인프라 완성이 선행되어야 하고, 그 이후에 분석·개선이 가능하다. 이번 런에 모두 포함할 것인지, 아니면 단계별로 나눌 것인지가 구현 방향을 완전히 바꾼다.
- 옵션:
  - A. **계측 인프라 구축만** (Mixpanel SDK 연동 + 이벤트 트래킹 코드 추가 + ASC 데이터 수집 스크립트) — 결과: 이번 런에서 코드 변경이 발생하고 TestFlight 배포가 필요. 데이터가 쌓이면 별도 런에서 분석·개선.
  - B. **인프라 + 분석 리포트까지** (A + 현재 이벤트 스펙 기반 퍼널 분석 설계 문서 작성) — 결과: 계측 코드 + 분석 설계까지 이번 런에서 완료. 실제 데이터는 배포 후 수집되므로 실데이터 분석은 다음 런.
  - C. **인프라 + 실코드 UX 개선까지** (A + B + 분석 결과 기반 UI 수정) — 결과: 데이터가 없는 상태에서 UX 개선 코드를 작성하는 것은 근거 없음. 현실적으로 불가.
- 추천: A (계측 인프라 구축 먼저. 데이터가 쌓인 후 분석 런을 별도로 진행하는 것이 합리적)
- status: resolved
- answer: A — 계측 인프라 구축만. 실제 분석/UX 개선은 데이터 축적 후 별도 런.

### Q2. Mixpanel 연동 대상 플랫폼
- 맥락: 현재 앱은 iOS 네이티브(메인)와 Next.js 웹(서브)으로 이원화되어 있다. Mixpanel은 멀티 플랫폼을 지원하지만, 프로젝트를 단일로 쓸지 분리할지, 웹을 연동할지 여부가 아키텍처를 결정한다. 웹에는 이미 `NEXT_PUBLIC_VERCEL_ANALYTICS_ID`만 있고, AdMob/ATT는 iOS 전용이다.
- 옵션:
  - A. **iOS 네이티브 앱만** — 결과: Mixpanel iOS SDK만 추가. 웹은 Vercel Analytics로 유지. 가장 단순.
  - B. **iOS 네이티브 + 웹(Next.js) 양쪽** — 결과: iOS는 Swift SDK, 웹은 Mixpanel JS SDK 추가. 단일 Mixpanel 프로젝트에서 cross-platform 퍼널 가능. 웹 코드 수정 추가 발생.
  - C. **iOS 네이티브 + 웹, 별도 Mixpanel 프로젝트** — 결과: 플랫폼별 독립 추적. 교차 분석은 수동.
- 추천: A (현재 웹은 레거시 Capacitor와 공존하며 주력이 iOS임. 웹 트래픽이 유의미하다면 B를 고려)
- status: resolved
- answer: A — iOS 네이티브 앱만. 웹은 Vercel Analytics로 유지.

### Q3. "앱스토어 데이터" 수집 범위
- 맥락: App Store Connect는 Analytics API(설치/세션/임프레션/매출), Feedback API(리뷰 텍스트), Crashes API 등을 제공한다. 기존 ASC API Key(`TW3Y8S4M9V`)는 Admin 권한으로 이미 `.env.testflight.local`에 있어 재사용 가능하지만, 어떤 지표를 수집하고 어디에 저장/교차 분석할지를 결정해야 한다.
- 옵션:
  - A. **설치/세션/임프레션 지표만** (Analytics API) — 결과: Mixpanel에 없는 획득 퍼널(App Store 노출→설치→앱 내 행동) 연결 가능. 스크립트로 주기적 수집.
  - B. **A + App Store 리뷰 텍스트** (Feedback API) — 결과: 앱 내 후기 수집 파이프라인과 별도로, ASC 리뷰를 텍스트 분석용으로 저장. 별도 처리 로직 필요.
  - C. **A + B + 크래시 리포트** (Crashes API / Xcode Organizer) — 결과: 풀 스택 데이터. 크래시는 Firebase Crashlytics/Xcode Organizer가 더 적합할 수 있음.
  - D. **수집 없이 ASC 대시보드 링크만 정리** — 결과: 코드 없음, 운영 가이드 문서만. 최소 공수.
- 추천: A 우선 (설치→행동 퍼널이 핵심. 리뷰는 기존 파이프라인과 중복되고, 크래시는 Xcode Organizer로 충분)
- status: resolved
- answer: A — App Store Connect Analytics API로 설치/세션/임프레션 지표만 수집. 리뷰/크래시는 향후 별도 런에서.

### Q4. ASC 데이터와 Mixpanel 교차 분석 방법
- 맥락: ASC Analytics 데이터(설치, 임프레션, 세션)는 집계 단위(날짜별 합산)로만 제공되며 개별 사용자 ID가 없다. Mixpanel은 사용자 단위 행동 로그다. 두 데이터를 교차 분석하려면 날짜 기준 합산 매칭 또는 별도 BI 도구가 필요하다. 어디서 교차 분석할지 결정해야 스크립트 산출 포맷이 달라진다.
- 옵션:
  - A. **Google Sheets / Notion** — 결과: ASC 스크립트가 CSV/JSON을 생성하고 수동으로 붙여넣기. 가장 단순하지만 지속성 없음.
  - B. **Mixpanel에 ASC 데이터 Import** (Mixpanel Events API) — 결과: 날짜별 "app_store_install" 이벤트 등을 Mixpanel에 인위적으로 주입. 집계 데이터를 이벤트로 보내는 방식이므로 개인 단위 매칭은 불가하나 대시보드 한 곳에서 조회 가능.
  - C. **별도 저장 없이 ASC 대시보드 + Mixpanel 대시보드 병렬 운영** — 결과: 추가 인프라 없음. 비교는 수동. 초기 단계에선 실용적.
- 추천: C (초기에는 두 대시보드 병렬 운영이 현실적. 데이터가 쌓이면 필요에 따라 B로 이행)
- status: resolved
- answer: C — ASC 대시보드 + Mixpanel 대시보드 병렬 운영. 데이터 축적 후 필요 시 B로 이행.

## Non-critical Assumptions

### A1. Mixpanel Project Token 관리 방식
- 가정: `NativeAppInfo.plist`에 `MIXPANEL_TOKEN` 키를 추가하고, xcconfig 빌드 설정에서 주입. 기존 `KAKAO_NATIVE_APP_KEY`, `ADMOB_BANNER_UNIT_ID`와 동일한 패턴 사용.
- 근거: `ios/NativeApp/Config/NativeAppInfo.plist`의 기존 키 주입 패턴, CLAUDE.md "API 키 하드코딩 금지" 규칙
- 뒤집기 가능: yes (환경변수 직접 읽기 또는 `NativeAppConfiguration.live()` 내부 처리도 가능)

### A2. Mixpanel Swift SDK 추가 방법
- 가정: `ios/NativeApp/Package.swift`의 `dependencies` 배열에 Mixpanel Swift SPM 패키지(`https://github.com/mixpanel/mixpanel-swift`) 추가. `Services` 타겟에 의존성 연결.
- 근거: 현재 GoogleMobileAds, KakaoSDK 모두 SPM으로 관리. 레이어 구조상 Services 타겟이 외부 SDK 의존성 담당.
- 뒤집기 가능: yes (CocoaPods 혼용 없이 SPM 전용이 현재 패턴)

### A3. MixpanelAnalytics 구현체 위치
- 가정: `ios/NativeApp/Sources/Services/Analytics.swift`에 `MixpanelAnalytics: AnalyticsTracking` 구현체 추가. 기존 `OSLogAnalytics`와 동일 파일 또는 `MixpanelAnalytics.swift` 별도 파일.
- 근거: `AnalyticsTracking` 프로토콜이 이미 정의되어 있어 (`Analytics.swift:17`) Mixpanel 구현체를 추가하면 나머지 코드 변경 없음. DI 교체는 `NativeRootView.swift:52`의 `OSLogAnalytics()` 한 줄만 수정.
- 뒤집기 가능: yes

### A4. `trackAutomaticEvents` 비활성화
- 가정: Mixpanel 초기화 시 `trackAutomaticEvents = false` 설정. 자동 이벤트(앱 열기 등) 대신 현재 이미 정의된 `AnalyticsEvent` 열거형 기반 명시적 트래킹만 사용.
- 근거: 앱에 이미 10개 이벤트가 정의되어 있고 명시적 트래킹 패턴이 확립되어 있음. 자동 이벤트는 중복 계측 위험.
- 뒤집기 가능: yes

### A5. ATT 연동 정책 (IDFV 사용, IDFA 선택적)
- 가정: Mixpanel은 IDFV 기반으로 식별자를 생성하되, ATT 동의 시 IDFA도 수집. 기존 `TrackingTransparencyService.requestIfNeeded()`가 첫 검색 결과 후 1.5초 딜레이로 호출되므로 현재 ATT 타이밍은 유지.
- 근거: `TrackingTransparencyService.swift:5`, `SearchViewModel.swift:663-670`. ATT 구문은 `NativeAppInfo.plist:23`에 이미 있음. CLAUDE.md AdMob 섹션에서 ATT 필수 명시.
- 뒤집기 가능: yes (Mixpanel을 ATT 없이 IDFV 전용으로만 쓰는 것도 가능)

### A6. 이벤트 Properties 타입 확장
- 가정: 현재 `AnalyticsTracking.track(event:properties:)`의 `[String: String]` 타입을 유지. Mixpanel은 `[String: MixpanelType]`이나 어댑터 레이어에서 변환 처리.
- 근거: 기존 프로토콜 시그니처 변경 시 `SearchViewModel`, `CompareViewModel`, `SavedViewModel` 전체 호출부 수정 필요. 어댑터 방식이 영향 최소화.
- 뒤집기 가능: yes (한 번에 리팩토링 가능하나 scope 증가)

### A7. 웹 측 분석 도구 현행 유지
- 가정: Next.js 웹의 Vercel Analytics는 그대로 유지. Mixpanel JS SDK는 이번 런에서 추가하지 않음.
- 근거: CLAUDE.md에 Capacitor 웹앱이 레거시임을 명시. 웹 주요 트래픽은 리뷰/비교 공유 링크 방문이며 iOS 앱 퍼널과 별개.
- 뒤집기 가능: yes (Q2 답변이 B/C이면 번복)

## 코드베이스 참고

- `ios/NativeApp/Sources/Services/Analytics.swift:4-57` — `AnalyticsEvent` enum (10개 이벤트), `AnalyticsTracking` 프로토콜, `OSLogAnalytics` 구현체, `MockAnalytics` 테스트용
- `ios/NativeApp/Sources/AppShell/NativeRootView.swift:52` — `analytics = OSLogAnalytics()` 하드코딩. Mixpanel 교체 시 이 한 줄 수정.
- `ios/NativeApp/Sources/Features/Search/SearchViewModel.swift:25,466,497-518,655-659` — `filterChanged`, `resultTapped`, `compareToggled`, `favoriteToggled`, `searchExecuted`, `emptyStateShown`, `appLaunched` 이벤트 호출 위치
- `ios/NativeApp/Sources/Features/Compare/CompareViewModel.swift:74` — `compareToggled` 이벤트 (비교 탭에서 제거 시)
- `ios/NativeApp/Sources/Features/Saved/SavedViewModel.swift:107,119-128` — `favoriteToggled`, `compareToggled` 이벤트 (찜한곳 탭에서)
- `ios/NativeApp/Sources/Services/TrackingTransparencyService.swift:5-13` — ATT 요청 로직
- `ios/NativeApp/Sources/Features/Search/SearchViewModel.swift:663-670` — `requestATTIfFirstResults()`: 첫 검색 결과 후 1.5초 딜레이로 ATT 요청
- `ios/NativeApp/Config/NativeAppInfo.plist:23-24` — `NSUserTrackingUsageDescription` 이미 설정됨
- `ios/NativeApp/Config/NativeAppInfo.plist:19-20` — 기존 API 키 주입 패턴 (`KAKAO_NATIVE_APP_KEY`)
- `ios/NativeApp/Package.swift:16-19` — 현재 SPM 의존성 (GoogleMobileAds, KakaoMapsSDK, KakaoSDK)
- `ios/NativeApp/Sources/Services/NativeAppConfiguration.swift:77-85` — `live(bundle:)` 팩토리: Info.plist에서 키 로드 패턴
- `ios/WhereKindergartenNative/fastlane/Fastfile:5-26` — 기존 `beta_with_api_key` lane, `APP_STORE_CONNECT_API_KEY_ID` 환경변수 사용

## Constraints / 주의

- CLAUDE.md 절대 규칙 적용:
  - "API 키를 코드에 하드코딩 금지" — Mixpanel Project Token은 xcconfig 또는 환경변수로 주입. 소스코드에 직접 삽입 금지.
  - "any 타입 사용 금지" — Mixpanel SDK의 `[String: Any]` 반환 타입을 래핑할 때 명시적 타입 정의 필수.
  - "main 브랜치 직접 작업 금지" — `feature/mixpanel-analytics` worktree 생성 후 작업.
  - "새 기능에는 반드시 유닛 테스트 작성" — `MixpanelAnalytics` 구현체 테스트 필요. 기존 `MockAnalytics`는 테스트 인프라로 재사용 가능.
- 건드리면 안 되는 파일: `next.config.ts` (보안 설정 포함)
- iOS 앱 Privacy 고려: App Privacy 섹션에 "데이터 수집 - Analytics" 추가 필요 여부 (App Store Connect에서 수동 업데이트)
- Mixpanel의 EU GDPR 대응: 기본 `api.mixpanel.com` 엔드포인트는 미국. EU 서버(`api-eu.mixpanel.com`) 필요 시 초기화 시 `serverURL` 설정 필요. 국내 서비스이므로 기본값으로 충분.

## Next Step Hint (for harness-plan)

- Phase 분할 제안:
  - **Phase 0**: 이벤트 스펙 확정 — 현재 10개 이벤트(`AnalyticsEvent`) 속성(properties) 상세화. 누락 이벤트(`detailOpened`, `compareViewed`, `compareShared`) 추가 여부 결정.
  - **Phase 1**: Mixpanel Swift SDK 연동 — SPM 추가, `MixpanelAnalytics` 구현체 작성, `NativeRootView` DI 교체, Token xcconfig 주입
  - **Phase 2**: ASC 데이터 수집 스크립트 — Q3/Q4 답변 기반으로 `scripts/collect-asc-analytics.ts` 또는 Fastlane lane 추가
  - **Phase 3**: (선택) 분석 설계 문서 — 퍼널 정의, Mixpanel 대시보드 설정 가이드
- 의존성:
  - Mixpanel 계정 및 Project Token (사용자가 사전 생성 필요)
  - ASC API Key는 기존 `.env.testflight.local`의 `APP_STORE_CONNECT_API_KEY_ID=TW3Y8S4M9V` 재사용 가능 (Admin 권한)
- 예상 테스트 범위:
  - `MixpanelAnalytics` 유닛 테스트 (MockMixpanel 주입 방식)
  - 기존 `MockAnalytics` 기반 ViewModel 이벤트 추적 테스트는 프로토콜 인터페이스가 바뀌지 않으면 그대로 유지
  - E2E 불필요 (계측 레이어 변경이므로 기능 플로우 변경 없음)
- 현재 누락된 이벤트 후보 (코드베이스 스캔 결과):
  - `detailOpened` — enum에 정의되어 있으나 실제 `.track(event: .detailOpened)` 호출 코드가 없음 (확인 필요)
  - `compareViewed` — enum에 정의되어 있으나 호출 없음
  - `compareShared` — `CompareView`에 공유 버튼이 있으나 `analytics?.track(event: .compareShared)` 호출 없음 (gap)
  - `onboardingCompleted` — 온보딩 완료 시 이벤트 없음
  - `tabChanged` — 탭 전환 추적 없음

---
stage: plan
run_id: 2026-04-17-1339-mixpanel-appstore-analytics
task_id: mixpanel-asc-analytics
phase_count: 7
status: complete
generated_at: 2026-04-17T15:10:00+09:00
upstream:
  - .harness/runs/2026-04-17-1339-mixpanel-appstore-analytics/00-task.md
  - .harness/runs/2026-04-17-1339-mixpanel-appstore-analytics/01-clarify.md
downstream:
  - .harness/runs/2026-04-17-1339-mixpanel-appstore-analytics/tasks/mixpanel-asc-analytics/phase0.md
  - .harness/runs/2026-04-17-1339-mixpanel-appstore-analytics/tasks/mixpanel-asc-analytics/phase1.md
  - .harness/runs/2026-04-17-1339-mixpanel-appstore-analytics/tasks/mixpanel-asc-analytics/phase2.md
  - .harness/runs/2026-04-17-1339-mixpanel-appstore-analytics/tasks/mixpanel-asc-analytics/phase3.md
  - .harness/runs/2026-04-17-1339-mixpanel-appstore-analytics/tasks/mixpanel-asc-analytics/phase4.md
  - .harness/runs/2026-04-17-1339-mixpanel-appstore-analytics/tasks/mixpanel-asc-analytics/phase5.md
  - .harness/runs/2026-04-17-1339-mixpanel-appstore-analytics/tasks/mixpanel-asc-analytics/phase6.md
---

# Plan: Mixpanel + ASC 분석 인프라 구축

## 사전 실행 지시 (Generate 시작 전 필수)

> harness-generate를 실행하기 전에 반드시 worktree를 먼저 생성해야 합니다.
> main 브랜치에서 직접 Generate 진입 시 CLAUDE.md 절대 규칙(main 브랜치 직접 작업 금지) 위반입니다.

```bash
# 1. worktree 생성 (프로젝트 루트에서 실행)
git worktree add ../where_kindergarden-mixpanel-analytics feature/mixpanel-analytics

# 2. worktree 디렉토리로 이동
cd ../where_kindergarden-mixpanel-analytics

# 3. harness resume으로 이어서 실행
# /harness resume 2026-04-17-1339-mixpanel-appstore-analytics
```

## 접근 방식

이번 런의 목표는 "계측 인프라 구축" (Q1 = A)입니다. 데이터 분석/UX 개선은 데이터 축적 후 별도 런에서 진행합니다. iOS 네이티브 앱(Q2 = A)에만 Mixpanel을 연동하고, ASC Analytics API로 설치/세션 지표를 수집하는 TypeScript 스크립트를 추가합니다(Q3 = A). 두 데이터는 병렬 대시보드로 운영합니다(Q4 = C).

이전 plan의 치명적 결함을 모두 수정합니다: (1) `AnalyticsValue` enum 도입으로 Numeric Aggregation 가능한 타입 체계, (2) `@main` App struct `init()`에서 싱글턴 1회 초기화, (3) `SessionTracker` + Super Properties로 코호트 분석 기반 마련, (4) NSM/Driver Metrics 문서화 선행, (5) `ShareLink` 제거 후 `UIActivityViewController` 직접 호출로 `Compare Shared` 이벤트 추적 보장, (6) Dev/Prod Mixpanel 프로젝트 토큰 xcconfig 분기.

## Phase 목록

| # | 이름 | Scope | 의존성 | 예상 변경 파일 | 예상 AC |
|---|------|-------|--------|--------------|---------|
| 0 | analytics-design-doc | 문서 (NSM, Taxonomy, Data Dictionary, Identity, Session, Cohort, QA) | - | `docs/ANALYTICS.md` | grep 8개 섹션 확인 |
| 1 | analytics-properties-type | iOS Services 레이어 — `AnalyticsValue` enum, 프로토콜 재설계, ViewModel 호출부 전체 수정 | P0 | `Analytics.swift`, `SearchViewModel.swift`, `CompareViewModel.swift`, `SavedViewModel.swift` | Swift 빌드, `[String: String]` track 호출 0건 |
| 2 | session-tracker-superprops | iOS Services 레이어 — `SessionTracker.swift`, `DeviceInfo.swift` 신규, 프로토콜 확장 | P1 | `SessionTracker.swift`, `DeviceInfo.swift`, `Analytics.swift` | Swift 빌드, 유닛 테스트 통과 |
| 3 | mixpanel-sdk-integration | iOS Services+AppShell — SPM 추가, xcconfig 분기, `MixpanelAnalytics.swift` 싱글턴, App init 연동 | P2 | `Package.swift`, `WhereKindergartenNative.xcconfig`, `KakaoKeys.example.xcconfig`, `NativeAppInfo.plist`, `NativeAppConfiguration.swift`, `MixpanelAnalytics.swift`, `WhereKindergartenNativeHostApp.swift` | Swift 빌드, 싱글턴 패턴 테스트 |
| 4 | event-taxonomy-callsites | iOS Features 레이어 — 이벤트 enum 재명명, Toggle 분리, 누락 호출 추가, ShareLink 제거 | P3 | `Analytics.swift`, `SearchViewModel.swift`, `CompareViewModel.swift`, `SavedViewModel.swift`, `CompareView.swift`, `NativeRootView.swift` | grep 각 이벤트 ≥1건, ShareLink 0건, Swift 빌드 |
| 5 | asc-analytics-script | TypeScript — `scripts/collect-asc-analytics.ts`, JWT + ASC API 3단계 흐름, JOIN 가능 출력 스키마 | P0 | `scripts/collect-asc-analytics.ts`, `package.json` | `pnpm type-check`, `pnpm lint`, `--dry-run` 실행, 유닛 테스트 |
| 6 | operations-privacy-handoff | 문서 운영 가이드 — `docs/ANALYTICS.md` 보완, `CLAUDE.md` 섹션 추가, `src/app/privacy/page.tsx` 업데이트, `HANDOFF.md` | P0~P5 | `docs/ANALYTICS.md`, `CLAUDE.md`, `src/app/privacy/page.tsx`, `HANDOFF.md` | grep 확인, `pnpm type-check` |

## 주요 결정 사항 (01-clarify.md 반영)

- **Q1 = A (계측 인프라만)**: Phase 0~6은 모두 계측/수집 인프라. 실데이터 분석은 별도 런.
- **Q2 = A (iOS만)**: Mixpanel 연동은 `ios/NativeApp/` 전용. `src/` (Next.js)는 Vercel Analytics 유지.
- **Q3 = A (설치/세션/임프레션)**: `scripts/collect-asc-analytics.ts`가 ASC Analytics Reports API 또는 Sales Reports API로 daily 지표를 수집. 리뷰/크래시는 제외.
- **Q4 = C (병렬 운영)**: ASC 스크립트 출력을 Mixpanel Export CSV와 동일 date 키로 정렬해 수동 Sheets JOIN 가능하게 설계. Mixpanel Import는 이번 런에서 구현 안 함.
- **A2 (SPM)**: `ios/NativeApp/Package.swift`에 Mixpanel Swift SPM 추가 (`https://github.com/mixpanel/mixpanel-swift`, `.upToNextMinor(from: "4.3.0")`).
- **A4 (trackAutomaticEvents = false)**: 중복 계측 방지. 명시적 이벤트만 사용.
- **A6 반전**: `[String: String]` 유지하지 않고 `AnalyticsValue` enum으로 변경. Numeric Aggregation 위해 scope 증가 수용.
- **싱글턴 초기화**: `WhereKindergartenNativeHostApp.init()`에서 `MixpanelAnalytics.shared.configure(token:)` 1회 호출. `NativeRootView.init()`은 주입만.

## 위험 요소

- **Mixpanel SPM 해상도 지연**: `ios/NativeApp/Package.swift`에 SPM 추가 시 첫 해상도가 느릴 수 있음. 완화: Phase 3 AC에 `xcodebuild -resolvePackageDependencies` 명령 포함.
- **`WhereKindergartenNativeHostApp` init 패턴 없음**: 현재 App struct에 `init()`이 없고 `body`만 있어 싱글턴 초기화를 어디서 할지 불명확. 완화: Phase 3에서 `init()` 추가 또는 `onAppear` + `task` 중 적합한 패턴 선택 지시.
- **ASC Analytics Reports API 가용성**: `POST /v1/analyticsReportRequests`는 비동기 처리(수분 대기)가 필요. 완화: Phase 5에서 Sales Reports API를 Primary로, Analytics Reports를 Optional로 설계.
- **`AnalyticsValue` → `MixpanelType` 어댑터**: Mixpanel SDK의 `MixpanelType` 프로토콜을 실제 import 전에 Phase 1에서 정의하면 Phase 3에서 충돌 가능. 완화: Phase 1에서는 `AnalyticsValue` 자체 타입만 정의하고, Mixpanel 어댑터 변환은 Phase 3 `MixpanelAnalytics.swift`에서만 구현.
- **`[String: String]` 호출부 대규모 수정**: SearchViewModel, CompareViewModel, SavedViewModel 전체 수정. Phase 1이 빌드 실패 없이 완료되어야 Phase 2 이후 진입 가능. 완화: Phase 1 AC를 Swift 빌드 기준으로 엄격하게 설정.

## Generate 준비 완료

- `tasks/mixpanel-asc-analytics/index.json` 생성됨
- Phase 파일 7개 (phase0.md ~ phase6.md) 생성됨
- 모든 iOS Phase AC는 `xcodebuild` 빌드 성공 기준으로 검증 가능
- 모든 TypeScript Phase AC는 `pnpm type-check` + `pnpm lint` + `pnpm test`로 자동 검증 가능

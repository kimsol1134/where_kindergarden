---
stage: plan
run_id: 2026-04-17-1339-mixpanel-appstore-analytics
task_id: mixpanel-asc-analytics
phase: 0
name: "analytics-design-doc"
created_at: 2026-04-17T15:10:00+09:00
---

# Phase 0: Analytics Design Doc

## 사전 준비

- 읽기:
  - `docs/IOS_ARCHITECTURE.md` — 현재 레이어 구조(Services/Domain/Features/AppShell) 파악
  - `ios/NativeApp/Sources/Services/Analytics.swift` — 현재 10개 이벤트 enum, `AnalyticsTracking` 프로토콜 시그니처 확인
  - `ios/NativeApp/Sources/Features/Search/SearchViewModel.swift:25,465,497-518,653-659` — 현재 track 호출 위치 파악
  - `ios/NativeApp/Sources/Features/Compare/CompareViewModel.swift:74` — compareToggled 호출
  - `ios/NativeApp/Sources/Features/Saved/SavedViewModel.swift:105-128` — favoriteToggled, compareToggled 호출
  - `src/app/privacy/page.tsx` — 현재 개인정보처리방침 내용 확인
  - `CLAUDE.md` — "any 타입 사용 금지", "console.log 절대 남기지 않기" 절대 규칙
- 참조 artifact:
  - `.harness/runs/2026-04-17-1339-mixpanel-appstore-analytics/01-clarify.md` — Q1=A(인프라만), Q2=A(iOS만), Q3=A(설치/세션), Q4=C(병렬 대시보드), A2(SPM), A4(trackAutomaticEvents=false) 결정 사항 확인

## 지시

`docs/ANALYTICS.md` 파일을 신규 생성한다. 이 문서는 Phase 1~5 generate 세션이 설계 기준으로 참조할 "Single Source of Truth"다.

아래 8개 섹션을 모두 포함해야 한다:

### 섹션 1: North Star Metric + Driver Metrics

NSM 1개를 명시:
- **NSM**: "주간 Comparison Completion" — 설치 후 7일 이내 비교표 공유까지 완료한 신규 유저 수 (기준: `days_since_install <= 7`, `Compare Shared` 이벤트 발생)

Driver Metrics 최소 3개 명시:
- Search Success Rate: `Search Executed` 중 `result_count > 0` 비율
- Compare Entry Rate: `Result Tapped` → `Comparison Added` 전환율
- Share Rate: `Compare Viewed` → `Compare Shared` 전환율
- D7 Retention: 설치 후 7일째 앱 재실행(App Launched) 유저 비율

### 섹션 2: Identity & Session 정의

Identity:
- `distinct_id = IDFV` (UIDevice.current.identifierForVendor)
- `Mixpanel.initialize()` 직후 `identify(distinctId:)` 호출
- 한계 사항 명시: 앱 재설치 시 IDFV 갱신됨 (→ 동일 유저가 신규로 집계될 수 있음)

Session:
- session boundary: `applicationDidEnterBackground` 진입 후 30분 초과 시 만료
- `session_id` = UUID 문자열, `applicationDidBecomeActive` 시 만료 확인 후 갱신
- 구현 위치: `ios/NativeApp/Sources/Services/SessionTracker.swift` (Phase 2에서 생성)

### 섹션 3: Super Properties (모든 이벤트에 자동 첨부)

아래 7개를 표 형태로 명시 (이름 / 타입 / 수집 방법 / 예시값):

| Property | 타입 | 수집 방법 | 예시 |
|----------|------|----------|------|
| `app_version` | String | Bundle CFBundleShortVersionString | "2.1.0" |
| `build_number` | String | Bundle CFBundleVersion | "42" |
| `os_version` | String | UIDevice.current.systemVersion | "18.3.1" |
| `device_model` | String | UIDevice.current.model | "iPhone" |
| `locale` | String | Locale.current.identifier | "ko_KR" |
| `is_testflight` | Bool | Bundle.main.appStoreReceiptURL?.lastPathComponent == "sandboxReceipt" | true |
| `days_since_install` | Int | UserDefaults first_launch_at 저장 후 계산 | 3 |
| `session_id` | String | SessionTracker에서 주입 | "uuid-string" |

### 섹션 4: Event Taxonomy + Data Dictionary

아래 11개 이벤트를 표 형태로 정의. 이벤트명은 Title Case (raw value 기준). Swift enum case 이름은 별도 컬럼:

| 이벤트명 (raw value) | Swift enum case | 발생 시점 | Required Properties | Optional Properties |
|---------------------|-----------------|----------|---------------------|---------------------|
| App Launched | appLaunched | bootstrapIfNeeded() 진입 시 | - | - |
| Search Executed | searchExecuted | 검색 결과 갱신 시 | `radius: Int`, `result_count: Int`, `has_results: Bool` | `sigungu_code: String` |
| Empty State Shown | emptyStateShown | 검색 결과 0건으로 전환 시 | `radius: Int` | `sigungu_code: String` |
| Result Tapped | resultTapped | 목록에서 유치원 선택 시 | `kindercode: String` | - |
| Detail Opened | detailOpened | 상세 시트 완전 표시 시 | `kindercode: String`, `kindergarten_type: String` | - |
| Favorite Added | favoriteAdded | 즐겨찾기 추가 시 | `kindercode: String` | - |
| Favorite Removed | favoriteRemoved | 즐겨찾기 해제 시 | `kindercode: String` | - |
| Comparison Added | comparisonAdded | 비교 추가 시 | `kindercode: String` | - |
| Comparison Removed | comparisonRemoved | 비교 해제 시 | `kindercode: String` | - |
| Compare Viewed | compareViewed | 비교탭 진입(onAppear) 시 | `compare_count: Int` | - |
| Compare Shared | compareShared | 공유 완료 시 | `method: String` (kakao\|system), `compare_count: Int` | - |
| Filter Applied | filterApplied | Apply 버튼 or 500ms debounce 후 | `radius: Int`, `sort: String` | - |
| Tab Changed | tabChanged | 탭 전환 시 | `from_tab: String`, `to_tab: String` | - |

각 property에 대해 type / required / example / description 열을 포함한 Data Dictionary 표를 별도로 작성.

기존 `filterChanged` 이벤트는 `filterApplied`로 재명명. `compareToggled`는 `comparisonAdded`/`comparisonRemoved`로 분리. `favoriteToggled`는 `favoriteAdded`/`favoriteRemoved`로 분리.

### 섹션 5: Dev/Prod 프로젝트 분리

xcconfig 분기 패턴 설명:
```
// ios/WhereKindergartenNative/Config/WhereKindergartenNative.xcconfig
WK_MIXPANEL_TOKEN_DEBUG = <Debug Mixpanel Project Token>
WK_MIXPANEL_TOKEN_RELEASE = <Release Mixpanel Project Token>
MIXPANEL_TOKEN = $(WK_MIXPANEL_TOKEN_$(CONFIGURATION))
```
- Debug 빌드 (시뮬레이터/개발): Dev Mixpanel 프로젝트 → 노이즈 격리
- Release 빌드 (TestFlight/AppStore): Prod Mixpanel 프로젝트 → 실데이터
- `is_testflight` Super Property로 TestFlight 배포분 필터링 추가 가능

### 섹션 6: Cohort 기반 교차 분석 방법론

ASC(설치 수집) ↔ Mixpanel(행동 로그) 직접 User-level JOIN은 불가 (ASC는 집계 단위).

대신 Cohort 기반 접근:
- ASC Installs(YYYY-MM-DD) = 해당 일 설치 추정값
- Mixpanel에서 `days_since_install = 0` AND `App Launched` 이벤트로 "설치 당일 첫 실행율" 계산
- JOIN key: `date` 필드 (YYYY-MM-DD)
- 도구: Google Sheets (ASC JSON 수동 붙여넣기 + Mixpanel Export CSV)

### 섹션 7: Mixpanel Lexicon 등록 가이드

Lexicon 등록 절차:
1. Mixpanel 프로젝트 → Lexicon → Events 탭
2. 각 이벤트 선택 → Description 입력 (Data Dictionary 내용 복사)
3. Property별 Type 지정 (Number/Boolean/String)
4. Hidden 이벤트 지정 불필요 (trackAutomaticEvents=false이므로)

### 섹션 8: Data QA 체크리스트 (배포 후 48시간)

배포 직후 확인 항목:
- [ ] Mixpanel Live Events에서 `App Launched` 수신 확인
- [ ] Super Properties 7개가 모든 이벤트에 첨부되는지 확인
- [ ] Debug 빌드 → Dev 프로젝트 수신, Release 빌드 → Prod 프로젝트 수신 확인
- [ ] `session_id`가 foreground/background 전환에 따라 갱신되는지 확인
- [ ] `days_since_install`이 첫 설치 후 올바르게 증가하는지 확인
- [ ] `Compare Shared`가 카카오/시스템 공유 양쪽에서 발생하는지 확인
- [ ] `Filter Applied`가 슬라이더 드래그마다가 아닌 commit 시점에만 발생하는지 확인
- [ ] `is_testflight = true`인 이벤트가 TestFlight 배포분에서 확인되는지

## 주의사항

- `next.config.ts` 수정 금지. 이유: 보안 설정 포함.
- 이 Phase는 문서 파일만 생성한다. 이유: 코드 변경은 Phase 1부터. Phase 0이 설계 기준이 되므로 Phase 1~5 generate 세션이 이 문서를 "사전 준비 읽기"에 포함할 것.
- 이벤트명 raw value를 Title Case로 명시한다. 이유: Mixpanel UI에서 사람이 읽을 때 가독성이 좋고, Lexicon 등록 시 표준 형식.
- `onboardingCompleted` 이벤트는 이번 런에서 제외한다. 이유: 온보딩 완료 후 행동 분석은 데이터 축적 후 결정할 사안이며, 현재 온보딩 UI가 단순함.

## AC (완료 기준)

```bash
# 1. 파일 존재 확인
test -f docs/ANALYTICS.md && echo OK
# 기대: OK

# 2. 8개 필수 섹션 존재 확인
grep -c "## " docs/ANALYTICS.md
# 기대: 8 이상

# 3. NSM 명시 확인
grep -q "North Star" docs/ANALYTICS.md && echo OK
# 기대: OK

# 4. Driver Metrics 3개 이상 확인
grep -c "Rate\|Retention" docs/ANALYTICS.md
# 기대: 3 이상

# 5. 이벤트 11개 이상 문서화 확인
grep -c "App Launched\|Search Executed\|Result Tapped\|Detail Opened\|Favorite Added\|Favorite Removed\|Comparison Added\|Comparison Removed\|Compare Viewed\|Compare Shared\|Filter Applied\|Tab Changed\|Empty State Shown" docs/ANALYTICS.md
# 기대: 11 이상

# 6. Super Properties 7개 확인
grep -q "days_since_install" docs/ANALYTICS.md && echo OK
# 기대: OK

# 7. Dev/Prod 분기 패턴 확인
grep -q "MIXPANEL_TOKEN" docs/ANALYTICS.md && echo OK
# 기대: OK

# 8. Data QA 체크리스트 확인
grep -q "48시간" docs/ANALYTICS.md && echo OK
# 기대: OK
```

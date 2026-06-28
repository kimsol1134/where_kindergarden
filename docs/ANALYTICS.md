# Analytics Design Document

> 우리동네 유치원 iOS 네이티브 앱 — Mixpanel 계측 설계 기준서
> 작성일: 2026-04-17
> 참조 런: 2026-04-17-1339-mixpanel-appstore-analytics
>
> **이 문서는 Phase 1~5 generate 세션이 설계 기준으로 참조하는 Single Source of Truth다.**

---

## 1. North Star Metric + Driver Metrics

### North Star Metric (NSM)

**주간 Comparison Completion**

설치 후 7일 이내에 비교표 공유까지 완료한 신규 유저 수.

- 기준: `days_since_install <= 7` AND `Compare Shared` 이벤트 발생
- 의미: 앱의 핵심 가치(주변 유치원 비교 후 공유)를 경험한 유저를 최단 시간 안에 측정. 설치→탐색→비교→공유 전체 퍼널을 대리하는 단일 지표.
- 집계 주기: 주간 (Monday 00:00 KST 기준)

### Driver Metrics

| 지표 | 정의 | 목표 방향 |
|------|------|----------|
| **Search Success Rate** | `Search Executed` 이벤트 중 `result_count > 0`인 비율 | 높을수록 좋음 |
| **Compare Entry Rate** | `Result Tapped` → `Comparison Added` 전환율 | 높을수록 좋음 |
| **Share Rate** | `Compare Viewed` → `Compare Shared` 전환율 | 높을수록 좋음 |
| **D7 Retention** | 설치 후 7일째 `App Launched` 이벤트가 발생한 유저 비율 | 높을수록 좋음 |

---

## 2. Identity & Session 정의

### Identity

- **distinct_id**: `IDFV` (UIDevice.current.identifierForVendor)
- **설정 방법**: `Mixpanel.initialize(token:)` 호출 직후 `identify(distinctId:)` 호출
- **한계 사항**: 앱 재설치 시 IDFV가 갱신되어 동일 유저가 신규 유저로 집계될 수 있음. 장기 유저 추적보다는 설치 코호트 분석에 집중.
- **ATT 연동**: ATT 동의 시 IDFA 추가 수집 가능하나, 기본적으로 IDFV로 충분.

### Session

- **세션 만료 기준**: `applicationDidEnterBackground` 진입 후 30분 초과 시 세션 만료
- **`session_id`**: UUID 문자열. `applicationDidBecomeActive` 시 만료 여부 확인 후 필요하면 새 UUID 생성
- **구현 위치**: `ios/NativeApp/Sources/Services/SessionTracker.swift` (Phase 2에서 생성)
- **생명주기**:
  1. 최초 실행: 새 `session_id` 생성, `session_start_time` = 현재 시각을 UserDefaults에 저장
  2. 백그라운드 진입: `background_time` 기록
  3. 포그라운드 복귀: `now - background_time > 1800초`이면 새 `session_id` 생성

---

## 3. Super Properties (모든 이벤트에 자동 첨부)

아래 8개 프로퍼티는 `Mixpanel.mainInstance().registerSuperProperties(_:)` 로 등록하여 모든 이벤트에 자동 첨부된다.

| Property | 타입 | 수집 방법 | 예시값 |
|----------|------|----------|--------|
| `app_version` | String | `Bundle.main.infoDictionary["CFBundleShortVersionString"]` | `"2.1.0"` |
| `build_number` | String | `Bundle.main.infoDictionary["CFBundleVersion"]` | `"42"` |
| `os_version` | String | `UIDevice.current.systemVersion` | `"18.3.1"` |
| `device_model` | String | `UIDevice.current.model` | `"iPhone"` |
| `locale` | String | `Locale.current.identifier` | `"ko_KR"` |
| `is_testflight` | Bool | `Bundle.main.appStoreReceiptURL?.lastPathComponent == "sandboxReceipt"` | `true` |
| `days_since_install` | Int | UserDefaults에 `first_launch_at` 저장 후 `Calendar.current.dateComponents([.day], from:to:).day` | `3` |
| `session_id` | String | SessionTracker에서 주입. 세션 갱신 시 `updateSuperProperty` 호출 | `"550e8400-e29b-41d4-a716-446655440000"` |

**등록 시점**: `MixpanelAnalytics.init()` 내부에서 `registerSuperProperties` 최초 1회. `session_id`와 `days_since_install`은 값 변경 시 `registerSuperPropertiesOnce` 또는 직접 갱신.

---

## 4. Event Taxonomy + Data Dictionary

### 4.1 이벤트 목록

이벤트명(raw value)은 Title Case. Swift enum case명은 camelCase.

| 이벤트명 (raw value) | Swift enum case | 발생 시점 | Required Properties | Optional Properties |
|---------------------|-----------------|-----------|---------------------|---------------------|
| `App Launched` | `appLaunched` | `bootstrapIfNeeded()` 진입 시 (앱 포그라운드 최초 진입) | - | - |
| `Search Executed` | `searchExecuted` | 검색 결과가 갱신될 때마다 | `radius: Int`, `result_count: Int`, `has_results: Bool`, `query_length: Int`, `search_query: String`, `query_type: String` | `sigungu_code: String` |
| `Empty State Shown` | `emptyStateShown` | 검색 결과가 0건으로 전환 시 | `radius: Int` | `sigungu_code: String` |
| `Result Tapped` | `resultTapped` | 검색 결과 목록에서 유치원 항목 선택 시 | `kindercode: String` | - |
| `Detail Opened` | `detailOpened` | 상세 시트가 완전히 표시된 시점(`onAppear`) | `kindercode: String`, `kindergarten_type: String` | - |
| `Favorite Added` | `favoriteAdded` | 즐겨찾기 추가 시 | `kindercode: String` | - |
| `Favorite Removed` | `favoriteRemoved` | 즐겨찾기 해제 시 | `kindercode: String` | - |
| `Comparison Added` | `comparisonAdded` | 비교 목록에 추가 시 | `kindercode: String` | - |
| `Comparison Removed` | `comparisonRemoved` | 비교 목록에서 제거 시 | `kindercode: String` | - |
| `Compare Viewed` | `compareViewed` | 비교 탭 진입(`onAppear`) 시 | `compare_count: Int` | - |
| `Compare Shared` | `compareShared` | 공유 완료 시 | `method: String`, `compare_count: Int` | - |
| `Filter Applied` | `filterApplied` | Apply 버튼 탭 또는 슬라이더 조작 완료(500ms debounce) 후 | `radius: Int`, `sort: String` | - |
| `Tab Changed` | `tabChanged` | 탭 바에서 탭 전환 시 | `from_tab: String`, `to_tab: String` | - |

**기존 이벤트 변경 사항:**
- `filterChanged` → `filterApplied` (슬라이더 드래그마다가 아닌 commit 시점에만 발생)
- `compareToggled` → `comparisonAdded` / `comparisonRemoved` (추가/제거 분리)
- `favoriteToggled` → `favoriteAdded` / `favoriteRemoved` (추가/제거 분리)
- `onboardingCompleted`: 이번 런 제외. 온보딩 UI가 단순하고 데이터 축적 후 결정.

### 4.2 Data Dictionary

| Property | 타입 | Required | 예시값 | 설명 |
|----------|------|----------|--------|------|
| `radius` | Number (Int) | 조건부 | `2` | 검색 반경(km). `Search Executed`, `Empty State Shown`, `Filter Applied`에서 필수 |
| `result_count` | Number (Int) | `Search Executed`에서 필수 | `15` | 검색 결과 유치원 수 |
| `has_results` | Boolean | `Search Executed`에서 필수 | `true` | 검색 결과 존재 여부 (`result_count > 0`) |
| `sigungu_code` | String | 선택 | `"11110"` | 검색 기준 시군구 코드 5자리. 위치 미확인 시 생략 |
| `kindercode` | String | 조건부 | `"D100000001"` | 유치원 고유 코드. 유치원 관련 이벤트에서 필수 |
| `kindergarten_type` | String | `Detail Opened`에서 필수 | `"private"` | `public` / `private` / `home` |
| `compare_count` | Number (Int) | 조건부 | `2` | 비교 목록 내 유치원 수. `Compare Viewed`, `Compare Shared`에서 필수 |
| `method` | String | `Compare Shared`에서 필수 | `"kakao"` | 공유 방식. `kakao` 또는 `system` |
| `sort` | String | `Filter Applied`에서 필수 | `"distance"` | 정렬 기준. `distance` / `name` 등 SortOption rawValue |
| `search_query` | String | `Search Executed`에서 필수 | `"강남"`, `"서울 ##"` | 검색어 원문(정제). `sanitizedSearchQuery()`로 숫자 연속 토큰은 `##` 마스킹, 30자 제한. 위치 기반 검색 시 빈 문자열 |
| `query_length` | Number (Int) | `Search Executed`에서 필수 | `2`, `0` | 정제 전 검색어 글자 수. 0이면 위치 검색, 짧을수록 지역명 탐색 |
| `query_type` | String | `Search Executed`에서 필수 | `"keyword"` / `"location"` | 검색 방식 구분. 빈 쿼리는 `location`, 그 외는 `keyword` |
| `from_tab` | String | `Tab Changed`에서 필수 | `"search"` | 이전 탭. `search` / `compare` / `saved` / `more` |
| `to_tab` | String | `Tab Changed`에서 필수 | `"compare"` | 이동한 탭. `search` / `compare` / `saved` / `more` |

---

## 5. Dev/Prod 프로젝트 분리

### xcconfig 분기 패턴

```
// ios/WhereKindergartenNative/Config/WhereKindergartenNative.xcconfig

WK_MIXPANEL_TOKEN_DEBUG = <Debug Mixpanel Project Token>
WK_MIXPANEL_TOKEN_RELEASE = <Release Mixpanel Project Token>
MIXPANEL_TOKEN = $(WK_MIXPANEL_TOKEN_$(CONFIGURATION))
```

- **Debug 빌드** (시뮬레이터/개발 디바이스): Dev Mixpanel 프로젝트로 전송 → 개발 노이즈와 실데이터 격리
- **Release 빌드** (TestFlight/App Store): Prod Mixpanel 프로젝트로 전송 → 실사용자 데이터만 포함
- `is_testflight` Super Property (`true`/`false`)로 TestFlight 배포분 추가 필터링 가능

### Info.plist 주입

기존 `KAKAO_NATIVE_APP_KEY` 주입 패턴과 동일:

```xml
<!-- ios/NativeApp/Config/NativeAppInfo.plist -->
<key>MIXPANEL_TOKEN</key>
<string>$(MIXPANEL_TOKEN)</string>
```

### NativeAppConfiguration 로드

```swift
// NativeAppConfiguration.live(bundle:) 내부에서 로드
let mixpanelToken = bundle.object(forInfoDictionaryKey: "MIXPANEL_TOKEN") as? String ?? ""
```

---

## 6. Cohort 기반 교차 분석 방법론

### 제약 사항

App Store Connect Analytics API는 **집계 단위(날짜별 합산)**로만 데이터를 제공한다. 개별 사용자 ID가 없으므로 ASC ↔ Mixpanel 간 User-level JOIN은 불가능하다.

### Cohort 기반 접근 방법

1. **획득 퍼널 분석**:
   - ASC Installs(`YYYY-MM-DD`) = 해당 날짜 설치 수 (ASC Analytics API)
   - Mixpanel에서 동일 날짜의 `App Launched` 이벤트 수 = "설치 당일 첫 실행율" 분자
   - JOIN key: `date` 필드 (YYYY-MM-DD 형식)

2. **D7 Retention 검증**:
   - Mixpanel Cohort: 특정 날짜에 `App Launched`한 유저 중 7일 후 재실행 비율
   - ASC와 대조하여 설치 코호트 품질 평가

3. **교차 분석 도구**:
   - **Google Sheets**: ASC 스크립트 JSON 출력 수동 붙여넣기 + Mixpanel Export CSV
   - 초기 단계에서 두 대시보드 병렬 운영. 데이터 축적 후 필요 시 Mixpanel Events API Import 방식으로 이행.

4. **ASC 데이터 수집 스크립트**: `scripts/collect-asc-analytics.ts` (Phase 5에서 구현)
   - 설치/세션/임프레션 지표만 수집
   - 출력: `scripts/data-output/asc-analytics-YYYY-MM-DD.json`

---

## 7. Mixpanel Lexicon 등록 가이드

Lexicon은 팀 전체가 이벤트를 일관되게 이해하기 위한 데이터 카탈로그다.

### 등록 절차

레포지토리 루트의 `docs/mixpanel-lexicon-events.csv` / `docs/mixpanel-lexicon-properties.csv`를
참조 데이터로 사용한다. (스크립트로 수정 후 수동 복제하는 것이 현재 권장 흐름 — Mixpanel
Lexicon 공식 bulk-import API는 아직 공개 안 됨.)

1. Mixpanel 프로젝트 접속 → 좌측 메뉴 **Data Management** → **Lexicon** → **Events** 탭
2. 각 이벤트 이름 클릭 → **Edit** → `docs/mixpanel-lexicon-events.csv`의 해당 행에서
   `display_name` / `description` / `category`를 그대로 복사해 입력.
3. **Properties** 탭으로 이동 → `docs/mixpanel-lexicon-properties.csv`의 각 행을 보며
   `display_name` / `type` / `description` 입력. 특히 **type**:
   - `radius`, `result_count`, `compare_count`, `query_length`, `days_since_install`: **Number**
   - `has_results`, `is_testflight`: **Boolean**
   - 나머지: **String**
4. Hidden 이벤트 지정: `trackAutomaticEvents=false`이므로 불필요. 모든 이벤트가 명시적.
5. **Prod 프로젝트**에만 Lexicon 등록. Dev 프로젝트는 생략 가능.
6. CSV 파일은 코드와 동기화 — 이벤트 변경 시 두 CSV 갱신을 PR에 포함.

### 등록 우선순위

핵심 퍼널 이벤트 우선 등록:
1. `App Launched`
2. `Search Executed`
3. `Comparison Added`
4. `Compare Viewed`
5. `Compare Shared`

### Lexicon 등록 후 체크리스트

- [ ] Events 탭: 13개 이벤트(`App Launched`, `Search Executed`, `Empty State Shown`, `Result Tapped`, `Detail Opened`, `Favorite Added`, `Favorite Removed`, `Comparison Added`, `Comparison Removed`, `Compare Viewed`, `Compare Shared`, `Filter Applied`, `Tab Changed`) 모두 설명 입력 완료
- [ ] Properties 탭: `result_count`, `compare_count`를 Number 타입으로 지정 (Numeric Aggregation 활성화 확인)
- [ ] Properties 탭: `has_results`, `is_testflight`를 Boolean 타입으로 지정
- [ ] Cohort Builder에서 `days_since_install` 기반 코호트 생성 예시 작성 — 예: "D0 cohort = `days_since_install = 0` AND `App Launched` 발생", "D7 retained = `App Launched` 발생 AND `days_since_install = 7`"

---

## 8. Data QA 체크리스트 (배포 후 48시간)

TestFlight 또는 App Store 배포 직후 48시간 이내에 아래 항목을 Mixpanel Live Events 화면에서 확인한다.

### 이벤트 수신

- [ ] `App Launched` 이벤트가 Mixpanel Live Events에서 실시간 수신되는지 확인
- [ ] `Search Executed` 이벤트가 검색 실행 시 정확히 1회 발생하는지 확인
- [ ] `Compare Shared` 이벤트가 카카오 공유/시스템 공유 양쪽에서 각각 `method=kakao`, `method=system`으로 발생하는지 확인
- [ ] `Filter Applied` 이벤트가 슬라이더 드래그마다가 아닌 commit(버튼 탭 또는 500ms 후) 시점에만 1회 발생하는지 확인

### Super Properties

- [ ] Super Properties 8개(`app_version`, `build_number`, `os_version`, `device_model`, `locale`, `is_testflight`, `days_since_install`, `session_id`)가 모든 이벤트에 첨부되는지 확인
- [ ] `days_since_install`이 설치 첫날 `0`, 다음날 `1`로 올바르게 증가하는지 확인
- [ ] `is_testflight = true`인 이벤트가 TestFlight 배포분에서만 확인되는지 확인

### Dev/Prod 분리

- [ ] Debug 빌드 이벤트가 Dev Mixpanel 프로젝트에만 수신되는지 확인 (Prod에 노출 없음)
- [ ] Release 빌드 이벤트가 Prod Mixpanel 프로젝트에만 수신되는지 확인

### Session

- [ ] 앱 백그라운드 30분 초과 후 포그라운드 복귀 시 `session_id`가 새 UUID로 갱신되는지 확인
- [ ] 짧은 백그라운드(30분 미만) 복귀 시 `session_id`가 유지되는지 확인

---

## 9. ASC Analytics 수집 운영 가이드

`scripts/collect-asc-analytics.ts`는 App Store Connect Sales Reports API에서 설치/세션 지표를 월 단위로 수집한다. `date`, `metric_name`, `value` 포맷으로 JSON을 출력하므로 Mixpanel Export CSV와 `date` 키로 JOIN 가능하다.

### 월별 ASC 데이터 수집 (전월)

```bash
# ASC API Key / Issuer / .p8 경로를 환경변수로 로드
source <(grep -v '^#' .env.testflight.local | grep -v '^$' | sed 's/^/export /')

# 전월 데이터 수집
pnpm collect:asc-analytics -- --month YYYY-MM

# 출력 파일 확인
ls -la scripts/data-output/asc-analytics-*.json

# dry-run 테스트 (API 호출 없이 JWT 구성만 확인)
pnpm collect:asc-analytics -- --dry-run
```

### 교차 분석 워크플로우 (Google Sheets)

1. `pnpm collect:asc-analytics -- --month YYYY-MM` 실행 → `scripts/data-output/asc-analytics-YYYY-MM.json` 생성
2. JSON 파일 열어 `date`, `metric_name`, `value` 컬럼을 Google Sheets 첫 시트에 붙여넣기
3. Mixpanel → Reports에서 날짜별 `App Launched`, `Compare Shared` 카운트를 CSV로 Export → 두 번째 시트에 붙여넣기
4. `=VLOOKUP(date, ASCSheet!A:C, 3, FALSE)` 또는 `INDEX/MATCH`로 ASC Installs ↔ Mixpanel App Launched 값을 `date` 키로 매칭
5. 설치 당일 실행율 = `Mixpanel App Launched / ASC Installs` 계산 → Cohort Retention 분자/분모 확보

### 실행 주의사항

- **Rate Limit**: ASC API는 IP당 200 req/min 제한. 월 1회 수집 기준이면 무관.
- **데이터 지연**: Sales Reports API는 보통 익일 06:00 KST 이후 전일 데이터 제공. 월 말일 데이터는 익월 1일에 수집.
- **비동기 Analytics Reports API**: 본 스크립트는 Sales Reports API(동기)를 Primary로 사용. Analytics Reports API는 수분 대기가 필요해 운영 스크립트에서는 사용하지 않는다.

---

## 10. App Store Connect Privacy 업데이트 체크리스트

Mixpanel SDK 탑재 빌드를 App Store Connect에 제출하기 전, App Privacy 섹션을 아래와 같이 갱신한다. **수동으로 반영**해야 하며 Fastlane은 이 데이터를 덮어쓰지 않는다.

### App Privacy 섹션

- [ ] **Data Used to Track You** → "Usage Data" (Analytics) 추가
- [ ] **Data Linked to You** → 해당 없음 (IDFV는 익명 식별자이며 실명/연락처와 연결되지 않음)
- [ ] **Data Not Linked to You** → "Usage Data - Analytics" 체크
- [ ] **Privacy Nutrition Label**에 Mixpanel SDK 언급 (Data Collection Partner로 Mixpanel Inc. 기재)

### Mixpanel 관련 고지 사항

- **Mixpanel 데이터 보존 정책**: Mixpanel 기본 설정은 5년. 프로젝트 Settings → Data Retention에서 단축 가능.
- **GDPR/개인정보보호법**: 현재 국내 서비스 전용. EU 서버(api-eu.mixpanel.com) 미사용, 기본 엔드포인트 `api.mixpanel.com` 사용.
- **ATT(App Tracking Transparency)**: IDFA는 수집하지 않고 광고 SDK를 사용하지 않으므로 ATT 프롬프트를 요청하지 않는다.
- **오픈소스 / 제3자 제공**: Mixpanel Swift SPM(MIT License) 사용. 제3자 제공 처리자는 Mixpanel Inc. (미국).

### 크로스체크

제출 전 아래 두 문서가 일치하는지 확인:
- App Store Connect → App Privacy
- `src/app/privacy/page.tsx` 개인정보처리방침 (Mixpanel 섹션)

---
stage: plan
run_id: 2026-04-17-1339-mixpanel-appstore-analytics
task_id: mixpanel-asc-analytics
phase: 5
name: "asc-analytics-script"
created_at: 2026-04-17T15:10:00+09:00
---

# Phase 5: ASC Analytics 수집 스크립트

## 사전 준비

- 읽기:
  - `docs/ANALYTICS.md` — "섹션 6: Cohort 기반 교차 분석 방법론" (JOIN key 설계, 출력 스키마)
  - `scripts/collect-reviews.ts` — 기존 스크립트 구조 참조 (process.argv 파싱 패턴, fs.readFileSync/writeFileSync, delay 헬퍼)
  - `scripts/sync-kindergartens.ts` — 환경변수 로딩 방식 (`dotenv/config`), 에러 핸들링 패턴
  - `package.json` — 현재 scripts 필드, dependencies 목록 (any 금지 맥락에서 타입 안전 패키지 확인)
  - `.env.local` 파일 목록 확인 (직접 수정 금지, 참조만)
  - `CLAUDE.md` — "any 타입 사용 금지", "console.log 절대 남기지 않기", "API 키 하드코딩 금지", "새 기능에는 반드시 유닛 테스트"
- 참조 artifact:
  - `.harness/runs/2026-04-17-1339-mixpanel-appstore-analytics/01-clarify.md` — Q3=A(설치/세션/임프레션만), Q4=C(병렬 운영), 기존 API Key `<ASC_API_KEY_ID>` 재사용 가능 (Admin 권한, `.env.testflight.local`)

## 지시

### 공식 문서 참고 링크 (구현 전 반드시 확인)

- ASC Analytics Reports API: https://developer.apple.com/documentation/appstoreconnectapi/analytics
- Analytics Report Requests: https://developer.apple.com/documentation/appstoreconnectapi/analyticsreportrequest
- Sales Reports API (fallback): https://developer.apple.com/documentation/appstoreconnectapi/download_sales_and_trends_reports

### 1. `jsonwebtoken` npm 패키지 추가

`package.json`의 `dependencies`에 추가:
```json
"jsonwebtoken": "^9.0.0"
```
TypeScript 타입 패키지:
```json
"@types/jsonwebtoken": "^9.0.0"
```

이유: ASC API는 ES256 서명 JWT 인증이 필요. `jsonwebtoken`은 표준 npm 패키지(의존성 1개 추가 수용).

### 2. `scripts/collect-asc-analytics.ts` 신규 생성

#### 타입 정의 (파일 상단)

```typescript
// 모든 타입에 any 금지 — CLAUDE.md 절대 규칙
interface AscApiConfig {
  keyId: string;       // APP_STORE_CONNECT_API_KEY_ID
  issuerId: string;    // APP_STORE_CONNECT_API_KEY_ISSUER_ID
  privateKey: string;  // .p8 파일 내용
  appId: string;       // APP_STORE_APP_ID
}

interface AscDailyMetric {
  date: string;         // YYYY-MM-DD (JOIN key)
  cohort_date: string;  // YYYY-MM-DD (= date for daily snapshot)
  metric_name: string;  // "installs" | "sessions" | "impressions" | "page_views"
  value: number;
  source: string;       // "asc_sales_report" | "asc_analytics_report"
}

interface AscCollectionResult {
  collected_at: string;         // ISO-8601
  period: { start: string; end: string };  // YYYY-MM-DD
  metrics: AscDailyMetric[];
  raw_header?: string[];        // Sales Report 헤더 (디버그용)
}
```

#### 함수 시그니처

```typescript
// JWT 생성 (ES256, 20분 만료)
function generateJwt(config: AscApiConfig): string

// Sales Reports API (Primary — 동기적, 간단)
// GET /v1/salesReports?filter[reportType]=SALES&filter[reportSubType]=SUMMARY&...
async function fetchSalesReport(
  config: AscApiConfig,
  year: number,
  month: number
): Promise<AscDailyMetric[]>

// Analytics Reports API (Optional — 3단계 비동기 흐름)
// Step 1: POST /v1/analyticsReportRequests
// Step 2: poll GET /v1/analyticsReportRequests/{id} until state == COMPLETED
// Step 3: GET /v1/analyticsReports/{id}/instances → download
async function fetchAnalyticsReport(
  config: AscApiConfig,
  startDate: string,  // YYYY-MM-DD
  endDate: string
): Promise<AscDailyMetric[]>

// Sales Report CSV 파싱 → AscDailyMetric[]
function parseSalesReportCsv(tsvContent: string, appId: string): AscDailyMetric[]

// 결과 저장
function saveResult(result: AscCollectionResult, outputDir: string): void

// 메인 엔트리포인트
async function main(): Promise<void>
```

#### 비즈니스 규칙

- **Primary 경로**: Sales Reports API (`filter[reportType]=SALES`, `filter[reportSubType]=SUMMARY`). 동기 응답, 전일/전월 데이터. `Units` 컬럼을 installs 근사치로 사용.
- **Optional 경로**: Analytics Reports API (`/v1/analyticsReportRequests`). 비동기라 polling 필요 (최대 10분 대기, 30초 간격). 실패 시 fallback 없이 경고 출력 후 종료.
- **출력 스키마**: `AscDailyMetric.date`가 JOIN key → Mixpanel Export CSV의 `time` 필드(YYYY-MM-DD)와 매칭 가능.
- **저장 경로**: `scripts/data-output/asc-analytics-YYYY-MM.json`
- **환경변수**: `.env.testflight.local` 또는 `.env.local`에서 로드:
  - `APP_STORE_CONNECT_API_KEY_ID` (= `<ASC_API_KEY_ID>`)
  - `APP_STORE_CONNECT_API_KEY_ISSUER_ID`
  - `APP_STORE_CONNECT_API_KEY_PATH` (.p8 파일 경로, 절대 경로)
  - `APP_STORE_APP_ID` (앱 ID)
- **--dry-run 플래그**: JWT 생성 + URL 구성까지 확인, 실제 API 호출 없음.
- **process.argv 파싱**: 기존 스크립트 패턴(`manual process.argv.slice(2)`)으로 구현. `--dry-run`, `--month YYYY-MM`, `--analytics` (Analytics Reports API 사용 플래그) 지원.
- **딜레이**: API 호출 간 최소 500ms.

#### curl 원시 테스트 명령 (AC 보완)

```bash
# JWT 생성 후 curl로 Sales Reports 접근 가능 여부 확인
# (스크립트 내 generateJwt를 CLI에서 직접 호출하거나 --dry-run으로 JWT만 출력하는 모드 추가)
JWT=$(pnpm tsx scripts/collect-asc-analytics.ts --dry-run --print-jwt 2>/dev/null)
curl -s -H "Authorization: Bearer $JWT" \
  "https://api.appstoreconnect.apple.com/v1/apps" | head -c 200
# 기대: {"data":[...]} 형태 (권한 있으면)
```

### 3. `package.json` scripts 추가

```json
"collect:asc-analytics": "tsx scripts/collect-asc-analytics.ts"
```

### 4. 유닛 테스트

경로: `src/__tests__/collect-asc-analytics.test.ts` 또는 `scripts/__tests__/collect-asc-analytics.test.ts`

테스트 케이스 (시그니처 수준):

```typescript
describe('generateJwt', () => {
  it('should generate a valid JWT with correct header and claims', () => {
    // 가짜 RSA 키로 JWT 생성 후 header/payload decode 확인
    // aud, iss, exp, kid 클레임 확인
  })
})

describe('parseSalesReportCsv', () => {
  it('should parse TSV correctly and extract daily Units as installs', () => {
    // 샘플 TSV 문자열 주입 → AscDailyMetric[] 검증
  })

  it('should return empty array for unrelated apps', () => {
    // 다른 appId 행만 있는 TSV → 빈 배열
  })
})

describe('AscDailyMetric schema', () => {
  it('should have date as JOIN-compatible YYYY-MM-DD format', () => {
    // 날짜 포맷 검증
  })
})
```

## 주의사항

- `any` 타입 사용 금지. 이유: CLAUDE.md 절대 규칙. `fetch` 응답 파싱 시 명시적 타입 단언 또는 타입 가드 함수 사용. `response.json() as UnknownType`처럼 즉시 단언 후 타입 가드 검증.
- `console.log` 대신 `process.stdout.write` 또는 조건부 로깅 사용. 이유: CLAUDE.md "console.log 절대 남기지 않기". 단, 스크립트 출력용 info 로깅은 `console.info`로 구분하거나 dry-run 플래그 기반.
- `.env.testflight.local`을 직접 수정하지 마라. 이유: CLAUDE.md ".env 파일 커밋 금지". 스크립트는 읽기만 한다.
- `APP_STORE_CONNECT_API_KEY_PATH`에서 .p8 파일을 읽을 때 경로를 소스에 하드코딩하지 마라. 이유: CLAUDE.md "API 키 하드코딩 금지".
- `next.config.ts` 수정 금지.
- Analytics Reports API 3단계 흐름의 polling 타임아웃을 10분으로 제한. 이유: 무한 대기 방지. 타임아웃 초과 시 명확한 에러 메시지와 함께 exit(1).

## AC (완료 기준)

```bash
# 1. 파일 존재 확인
test -f scripts/collect-asc-analytics.ts && echo OK
# 기대: OK

# 2. 타입 체크 (전체 프로젝트)
pnpm type-check
# 기대: 0 errors

# 3. 린트 통과
pnpm lint
# 기대: exit 0

# 4. dry-run 실행 (API 호출 없음)
pnpm collect:asc-analytics -- --dry-run 2>&1
# 기대: exit 0 (환경변수 없어도 dry-run은 JWT 구성까지만 확인하고 종료)

# 5. any 타입 사용 없음 확인
grep -n ": any\|as any\| any " scripts/collect-asc-analytics.ts
# 기대: 0건

# 6. console.log 없음 확인
grep -n "console\.log" scripts/collect-asc-analytics.ts
# 기대: 0건

# 7. 유닛 테스트 통과
pnpm test -- scripts/__tests__/collect-asc-analytics
# 기대: all pass (또는 해당 경로 파일의 테스트 통과)

# 8. package.json scripts 확인
grep -q "collect:asc-analytics" package.json && echo OK
# 기대: OK

# 9. jsonwebtoken 의존성 추가 확인
grep -q '"jsonwebtoken"' package.json && echo OK
# 기대: OK
```

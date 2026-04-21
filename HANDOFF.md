# HANDOFF.md

## 마지막 작업 일시
2026-04-21 (Mixpanel 검증 + Lexicon 등록 + ASC 자동화 배포 세션)

## 오늘 세션에서 완료한 작업

### Mixpanel 이벤트 검증 (Task 1)
- iOS 시뮬레이터에서 13개 이벤트 플로우 전체 실행
- Mixpanel `kindegarden` 프로젝트(ID 4014822) Live Events에서 35건 수신 확인
- 슈퍼 프로퍼티 8개(`app_version`, `build_number`, `days_since_install`, `device_model`, `is_testflight`, `locale`, `os_version`, `session_id`) 전량 부착 검증
- 이벤트 고유 속성: `search_query`, `query_length`, `query_type`, `result_count`, `compare_count`, `method` 등 모두 기대값으로 기록됨
- `session_id`가 App Launched/Search Executed 등 이벤트 간 동일 UUID 공유 → SessionTracker 정상 동작

### Mixpanel Lexicon 등록 (Task 2) — PR #68 머지됨
- `scripts/generate-mixpanel-lexicon.ts` 신규: `docs/mixpanel-lexicon-{events,properties}.csv`를 Mixpanel Export 포맷(24컬럼 단일 CSV)으로 변환
- 이벤트별로 슈퍼 프로퍼티 8개 + 이벤트 전용 프로퍼티 자동 부착 (13개 이벤트 × 평균 10개 속성 = 145행)
- `pnpm gen:mixpanel-lexicon` 실행 → 사용자가 Mixpanel UI에서 Import Schema → CSV 업로드 완료
- Favorite Removed (발화 전 이벤트)까지 선등록 성공
- 숫자 타입(Number) 자동 인식 확인: `result_count`, `compare_count`, `query_length`, `days_since_install`, `radius` / Boolean: `is_testflight`, `has_results`

### ASC Analytics 자동화 (Task 5) — PR #69, #70 머지됨
- `.github/workflows/daily-asc-analytics.yml` 신규: 매일 08:10 KST cron + workflow_dispatch
- `docs/ASC_ANALYTICS_CRON.md`: 가이드 + 필요한 Secrets 목록
- PR #70: Sales Report API 406 에러 핫픽스 (Accept 헤더 `application/a-gzip` + gzip decompress)
- GitHub Secrets 5개 모두 등록됨 (아래 "현재 설정된 Secrets" 섹션 참조)

### Worktree 정리 (Task 6)
- `where_kindergarden-mixpanel-analytics` 제거 (PR #67 머지됨)
- `where_kindergarden-lexicon-transform` 제거 (PR #68 머지됨)
- `where_kindergarden-asc-cron` 제거 (PR #69 머지됨)
- `where_kindergarden-asc-fix` 제거 (PR #70 머지됨)

---

## ⚠️ 다음 세션이 이어받을 작업 (우선순위 높음)

### ASC 수집 스크립트 pre-existing 버그 수정

**현 상태**: workflow infrastructure는 완성됐으나 script의 live API 호출이 두 군데 실패 중. Handoff 기록대로 원래 `--dry-run`까지만 검증됐던 스크립트라 실제 API 호출 시 드러난 버그.

#### 버그 A (Critical): Sales Report API 400 PARAMETER_ERROR
- **위치**: `scripts/collect-asc-analytics.ts` 이용 `fetchSalesReport` 함수
- **증상**: `filter[vendorNumber]=6737649116` 보내면 "A parameter has an invalid value" 400 에러
- **원인**: 스크립트가 `config.appId`(=App의 Apple ID `6737649116`)를 `vendorNumber`로 사용. **Apple의 `vendorNumber`는 앱 ID와 다른 계정 레벨 식별자**.
- **사용자가 확인한 올바른 값**:
  - App Store Connect → Sales and Trends → 우측 상단 계정 메뉴에 표시: `solkim|405788798|1`
  - **Vendor Number = `405788798`**
- **이미 등록됨**: GitHub Secret `APP_STORE_VENDOR_NUMBER=405788798`
- **필요한 수정**:
  1. `scripts/collect-asc-analytics.ts`
     - `AscApiConfig` 인터페이스에 `vendorNumber: string` 필드 추가
     - `loadConfig()`에서 `process.env.APP_STORE_VENDOR_NUMBER` 로드
     - `fetchSalesReport`에서 `filter[vendorNumber]`에 `config.vendorNumber` 사용 (기존 `config.appId` 대체)
     - `parseSalesReportCsv`는 Apple Identifier 필터링에 계속 `appId` 사용 (해당 로직은 그대로 유지)
  2. `.github/workflows/daily-asc-analytics.yml`
     - `Collect ASC analytics` step env에 `APP_STORE_VENDOR_NUMBER: ${{ secrets.APP_STORE_VENDOR_NUMBER }}` 추가
  3. `docs/ASC_ANALYTICS_CRON.md` Secrets 목록에 `APP_STORE_VENDOR_NUMBER` 추가
  4. 유닛 테스트 업데이트 (existing tests in `scripts/__tests__/collect-asc-analytics.test.ts` 중 `loadConfig` 관련이 있는지 확인)
- **검증**: 머지 후 `gh workflow run "Daily ASC Analytics Collection"` 수동 트리거 → 성공 artifact 확인

#### 버그 B (Non-Critical): Analytics Reports API 409 RELATIONSHIP.INVALID
- **증상**: `--analytics` 플래그 사용 시 409 ENTITY_ERROR.RELATIONSHIP.INVALID
- **원인 추정**: 앱에 analytics reports 접근권한이 없거나 요청 body relationships 잘못됨
- **우선순위**: 버그 A 해결되면 primary (Sales API)만으로 일단 충분. Analytics API 경로는 별도 이슈로 처리 가능
- **나중에 수정**: 필요 시 ASC → App → App Analytics 설정 확인 + API body 구조 재검토

### App Privacy 섹션 업데이트 (Task 4)
- ASC UI 수동 작업 (API 없음)
- 다음 App Store 제출 시점에 `docs/ANALYTICS.md` 섹션 10 체크리스트대로 진행
- 현재 세션에서는 작업 안 함 (지금 긴급 아님)

---

## 현재 설정된 GitHub Secrets (ASC 자동화용)

| 이름 | 값 출처 |
|------|---------|
| `APP_STORE_CONNECT_API_KEY_ID` | `TW3Y8S4M9V` |
| `APP_STORE_CONNECT_API_ISSUER_ID` | `f4843e26-5b1f-4b00-bd4a-d24ca4539774` |
| `APP_STORE_CONNECT_API_KEY_P8_B64` | `/Users/solkim/.private_keys/AuthKey_TW3Y8S4M9V.p8` base64 |
| `APP_STORE_APP_ID` | `6737649116` (앱의 Apple ID) |
| `APP_STORE_VENDOR_NUMBER` | `405788798` (계정 레벨 식별자, 버그 A 수정 시 사용) |

이 값들은 로컬 `.env.testflight.local`과 동기화됨 (단, `.env.testflight.local`에는 VENDOR_NUMBER 추가 안 됨 — 필요 시 추가).

---

## 현재 상태 요약

### Main HEAD
- `0f1cf06 fix(analytics): Sales Report API 406 에러 수정 (#70)`

### 남은 주요 머지 히스토리 (오늘)
- `0f1cf06` PR #70 — Sales Report gzip 핸들링
- `1a615ec` PR #69 — ASC cron workflow
- `260aba1` PR #68 — Lexicon transform script

### Worktree (`git worktree list`)
- `/Users/solkim/Dev/where_kindergarden` — main (메인)
- `/Users/solkim/Dev/where_kindergarden-naver-place-audit` — 별도 피처 브랜치 (이 작업과 무관)
- `.codex/worktrees/*` — Codex 세션 worktree (무관)
- `.claude/worktrees/breezy-churning-sparrow` — harness 스크래치 (무관)

### 미커밋 변경 (이번 커밋에 포함)
- `M CLAUDE.md` — "주석 처리된 코드 커밋 금지" 한 줄 제거 (세션 전부터 있던 변경, 기존 컨텍스트 요청에 따라 유지)

### Untracked (커밋 안 함 — 세션 스크래치)
- `.claude/agents/harness-*.md`, `.claude/skills/harness/`, `.harness/` — harness 시스템 상태
- `.xcodebuildmcp/` — xcodebuildmcp 세션 defaults

### 워크플로우 실행 이력
- Daily ASC Analytics Collection: 3회 실행 모두 실패
  - 1회차: 406 (fixed by PR #70)
  - 2회차: 400 (버그 A 때문)
  - 3회차: 409 (버그 B, `--analytics` 플래그 사용 시)

---

## 새 세션이 바로 시작할 수 있는 명령

```bash
# 상태 확인
cd /Users/solkim/Dev/where_kindergarden
git pull origin main --ff-only
gh workflow view "Daily ASC Analytics Collection"
gh run list --workflow="Daily ASC Analytics Collection" --limit 5

# 버그 A 수정 작업 시작 (worktree 생성)
git worktree add ../where_kindergarden-asc-vendor -b fix/asc-vendor-number
cd ../where_kindergarden-asc-vendor

# 수정 대상
# 1) scripts/collect-asc-analytics.ts: AscApiConfig에 vendorNumber 추가 + fetchSalesReport 수정
# 2) .github/workflows/daily-asc-analytics.yml: env에 APP_STORE_VENDOR_NUMBER 추가
# 3) docs/ASC_ANALYTICS_CRON.md: Secrets 목록 업데이트
# 4) scripts/__tests__/collect-asc-analytics.test.ts: loadConfig 테스트 업데이트

# 검증
pnpm test scripts/__tests__/collect-asc-analytics.test.ts
pnpm type-check

# 커밋 + PR + 머지 후 워크플로우 수동 트리거
gh workflow run "Daily ASC Analytics Collection"
```

## 참고 파일
- `docs/ANALYTICS.md` — Analytics 설계 전체 (NSM, 이벤트 카탈로그, QA 체크리스트)
- `docs/ASC_ANALYTICS_CRON.md` — 오늘 세션에서 생성, ASC cron 운영 가이드
- `docs/mixpanel-lexicon-events.csv` / `docs/mixpanel-lexicon-properties.csv` — Lexicon source
- `scripts/generate-mixpanel-lexicon.ts` — 오늘 세션에서 생성, Lexicon CSV 변환
- `scripts/collect-asc-analytics.ts` — ASC 수집 스크립트 (버그 A, B 수정 대상)
- `.github/workflows/daily-asc-analytics.yml` — 오늘 세션에서 생성

## 앱 레벨 메모
- Bundle ID: `com.solkim.kindergarden`
- App ID: `6737649116`
- Vendor Number: `405788798` (오늘 확인됨)
- Mixpanel Project: `kindegarden` (ID 4014822, workspace 4510961)
- iOS 네이티브 앱 시뮬레이터: iPhone 17 Pro (`87C67713-AC8B-48FC-AE92-397C04F5215E`)
- Xcode 프로젝트: `ios/WhereKindergartenNative/WhereKindergartenNative.xcodeproj` (scheme: `WhereKindergartenNative`)

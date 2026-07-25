# HANDOFF.md

## 마지막 작업 일시
2026-04-22 (ASC Sales Reports API 완전 동작 — Vendor Number 재확인 + App ID 수정)

## 🎉 이번 세션 최종 결과

### Daily ASC Analytics Collection workflow 정상 동작 확인
- **Workflow run 24783704565** (2026-03): **conclusion: success**, Total metrics: 9건 (127 installs, SKU/Country 조합별)
- artifact `asc-analytics-2026-03.json` 정상 생성
- 이제 매일 08:10 KST cron이 전일 데이터 자동 수집

### 핵심 발견: ASC 계정의 Vendor Number / App ID 재확인
- **Vendor Number (`filter[vendorNumber]`)**:
  - 잘못된 값: `<ASC_PROVIDER_NUMBER>` (이건 top-right drawer의 **Provider Number** — 계정 레벨 식별자, Sales API는 거부)
  - 올바른 값: **`<ASC_VENDOR_NUMBER>`** — ASC → 지불 및 재무 보고서 페이지의 "공급업체 #" (= Vendor/Supplier number)
- **App ID (`APP_STORE_APP_ID`, CSV Apple Identifier 필터)**:
  - 잘못된 값: `6737649116` (이 계정에 없음)
  - 올바른 값: **`6758149645`** — "유치원 알리미 - 우리동네 유치원" 앱의 Apple Identifier (ASC → 앱 목록에서 확인)
- **계정에 있는 전체 앱 목록**:
  - `6758149645` — 유치원 알리미 - 우리동네 유치원 (본 프로젝트)
  - `6760273514` — 별말 - 사라지기 전에 담는 아이의 말
  - `6756474655` — Pieceful - 3초 육아 기록

### 머지된 PR (이번 세션)
- **PR #72** — `fix(analytics): Sales Reports API vendorNumber 분리`
  - `AscApiConfig.vendorNumber` 신설, `filter[vendorNumber]`에 사용
  - 워크플로우 env / docs / tests 동기화
- **PR #73** — `chore(analytics): ASC error detail 1500자 확장`
  - 잘려 있던 Apple 에러 detail 복구 → "Invalid vendor number specified" 원문 확보
- **PR #74** — `docs: 2026-04-22 HANDOFF — ASC vendorNumber Invalid 원인 좁히기`
  - 그 시점 snapshot. 이후 이 세션에서 실제 원인 밝혀냄

### GitHub Secret 변경 이력 (이번 세션)
- `APP_STORE_VENDOR_NUMBER`: `<ASC_PROVIDER_NUMBER>` → `<ASC_VENDOR_NUMBER>` (공급업체 번호)
- `APP_STORE_APP_ID`: `6737649116` → `6758149645` (Apple Identifier)

---

## 현재 설정된 GitHub Secrets (ASC 자동화용)

| 이름 | 값 | 의미 |
|------|----|------|
| `APP_STORE_CONNECT_API_KEY_ID` | `<ASC_API_KEY_ID>` | ASC API Key ID (관리자 권한) |
| `APP_STORE_CONNECT_API_ISSUER_ID` | `<ASC_ISSUER_ID>` | Issuer ID |
| `APP_STORE_CONNECT_API_KEY_P8_B64` | `/Users/solkim/.private_keys/AuthKey_<ASC_API_KEY_ID>.p8` base64 | .p8 개인 키 |
| `APP_STORE_APP_ID` | **`6758149645`** | 유치원 알리미 앱의 Apple Identifier (CSV 필터) |
| `APP_STORE_VENDOR_NUMBER` | **`<ASC_VENDOR_NUMBER>`** | 공급업체 #(Sales Reports API filter[vendorNumber]) |

### 로컬 `.env.testflight.local` 동기화 필요 (선택)
로컬에서 ASC 데이터 수집 실행하려면 아래 두 줄 추가:
```env
APP_STORE_APP_ID=6758149645
APP_STORE_VENDOR_NUMBER=<ASC_VENDOR_NUMBER>
```

---

## 다음 세션에서 할 수 있는 일 (선택 사항, 우선순위 낮음)

### 1. MONTHLY → DAILY 전환 고려
- 현재 스크립트는 `filter[frequency]=MONTHLY`를 사용 → 모든 행의 BeginDate가 월 첫날로 동일
- daily cohort 분석이 목적이면 `DAILY` + `reportDate=YYYY-MM-DD`로 전환 필요
- T-2 일 이전 데이터는 확실하게 제공됨 (Apple 공식 레이턴시)

### 2. 여러 앱 동시 수집
- 현재 단일 `APP_STORE_APP_ID` 필터링 → 우리동네 유치원(6758149645)만 수집
- "별말"(6760273514), "Pieceful"(6756474655)도 같은 계정에 있으므로 확장 가능
- 단, Mixpanel 프로젝트도 앱별로 다를 수 있어 분석 전략 설계 필요

### 3. 버그 B (Analytics Reports API 409 RELATIONSHIP.INVALID)
- `--analytics` 플래그 사용 시 발생
- Sales Reports API 정상 동작했으므로 일단 대기 가능한 non-critical 이슈

### 4. App Privacy 섹션 업데이트 (기존 Task 4)
- ASC UI 수동 작업
- 다음 App Store 제출 시 `docs/ANALYTICS.md` 섹션 10 체크리스트대로 진행

---

## 현재 상태 요약

### Main HEAD
- `545429b docs: 2026-04-22 HANDOFF — ASC vendorNumber Invalid 원인 좁히기 (#74)`
  - 이번 HANDOFF 업데이트로 곧 새 커밋 추가 예정

### 최근 머지 히스토리
- `545429b` PR #74 — HANDOFF 중간 스냅샷
- `cdedc2c` PR #73 — 에러 로그 1500자 확장
- `2af3529` PR #72 — vendorNumber 분리

### Worktree
- `/Users/solkim/Dev/where_kindergarden` — main
- `/Users/solkim/Dev/where_kindergarden-naver-place-audit` — 별도 피처 (무관)

### Untracked (커밋 안 함 — 세션 스크래치)
- `.claude/agents/harness-*.md`, `.claude/skills/harness/`, `.harness/` — harness 시스템 상태
- `.xcodebuildmcp/` — xcodebuildmcp 세션 defaults

### 워크플로우 실행 이력 (이번 세션까지 누적)
- 1회차: 406 (fixed by PR #70)
- 2회차: 400 PARAMETER_ERROR (appId를 vendorNumber로 사용 — PR #72로 수정)
- 3회차: 409 RELATIONSHIP.INVALID (`--analytics` 플래그, 버그 B)
- 4회차 (24729576895): 400 Invalid vendor number (`<ASC_PROVIDER_NUMBER>`, 잘못된 값)
- 5회차 (24729655050): 400 같은 에러
- 6회차 (24729752598): 400 같은 에러 — 전체 detail 확보
- 7회차 (24729951853): 400 같은 에러 (clean secret 재등록해도 실패)
- 8회차 (24783606196): **success** metrics 0 (vendorNumber 수정 완료, appId가 CSV 필터 미스)
- 9회차 (24783704565): **success** metrics 9 ✅ (appId까지 수정 완료)

---

## 새 세션이 바로 시작할 수 있는 명령

```bash
# 최신 main 받기
git pull origin main --ff-only

# 현재 secret 상태 확인
gh secret list | grep APP_STORE

# 다음 cron 트리거 (또는 수동)
gh workflow run "Daily ASC Analytics Collection" -f month=2026-04
gh run list --workflow="Daily ASC Analytics Collection" --limit 3

# 최신 artifact 다운로드
LATEST_RUN=$(gh run list --workflow="Daily ASC Analytics Collection" --limit 1 --json databaseId -q '.[0].databaseId')
gh run download $LATEST_RUN -D /tmp/asc-artifact
ls /tmp/asc-artifact
```

## 참고 파일
- `docs/ANALYTICS.md` — Analytics 설계 전체
- `docs/ASC_ANALYTICS_CRON.md` — ASC cron 운영 가이드 (5개 Secret 목록)
- `scripts/collect-asc-analytics.ts` — ASC 수집 스크립트 (vendorNumber 필드 포함)
- `.github/workflows/daily-asc-analytics.yml` — 워크플로우

## 앱 레벨 메모
- Bundle ID: `com.solkim.kindergarden`
- App ID (Apple Identifier): **`6758149645`** (유치원 알리미 - 우리동네 유치원)
- Vendor Number (공급업체 #): **`<ASC_VENDOR_NUMBER>`** (Sales Reports API용)
- Provider Number (display only): `<ASC_PROVIDER_NUMBER>` (top-right drawer의 `sol kim|<ASC_PROVIDER_NUMBER>|1`)
- Mixpanel Project: `kindegarden` (ID 4014822, workspace 4510961)
- iOS 네이티브 앱 시뮬레이터: iPhone 17 Pro (`87C67713-AC8B-48FC-AE92-397C04F5215E`)
- Xcode 프로젝트: `ios/WhereKindergartenNative/WhereKindergartenNative.xcodeproj` (scheme: `WhereKindergartenNative`)

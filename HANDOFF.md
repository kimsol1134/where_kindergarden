# HANDOFF.md

## 마지막 작업 일시
2026-04-22 (ASC vendorNumber 분리 구현 + Apple 측 "Invalid vendor number" 원인 좁히기)

## 이번 세션에서 완료한 작업

### PR #72 — fix(analytics): Sales Reports API vendorNumber 분리 ✅ 머지됨
- `AscApiConfig`에 `vendorNumber: string` 필드 추가 (appId와 분리)
- `loadConfig()`가 `APP_STORE_VENDOR_NUMBER` 환경변수 로드
- `fetchSalesReport()`가 `filter[vendorNumber]`에 `config.vendorNumber` 사용
- `parseSalesReportCsv`는 그대로 `appId`로 Apple Identifier 필터
- Sales 모드에서 `vendorNumber` 필수 검증 + dry-run 출력 보강
- 워크플로우 env에 `APP_STORE_VENDOR_NUMBER` 주입
- docs 5개 Secret 표 + App ID vs Vendor Number 차이 설명
- 유닛 테스트 fixture 업데이트 (12/12 pass)

### PR #73 — chore(analytics): ASC error detail 1500자 확장 ✅ 머지됨
- 기존 `slice(0, 200)`에서 Apple 에러 detail이 잘려서 원인 파악 불가
- 1500자로 확장 → workflow run 24729752598에서 실제 detail 확인

### 확인된 현 상태
- **워크플로우 수동 트리거 3회 실행** (run 24729576895 / 24729655050 / 24729752598)
- 모두 `filter[vendorNumber]=***` (`405788798`으로 resolve)로 요청했지만 Apple이 아래와 같이 400 응답:
  ```
  "detail": "Invalid vendor number specified. Try again.",
  "source": { "parameter": "filter[vendorNumber]" }
  ```

---

## ⚠️ 다음 세션이 이어받을 작업 (우선순위 높음)

### 버그 A-2: GitHub Secret `APP_STORE_VENDOR_NUMBER` 값 검증

**상태**: 코드/워크플로우/문서/테스트 전부 올바름 — **Secret 값 자체**가 Apple 기준으로 유효하지 않음.

#### 원인 후보
1. **Secret 값에 트레일링 공백/개행 섞임**
   - `pbcopy`로 복사할 때 줄바꿈까지 포함됐을 가능성
   - GitHub Secret은 `***`로 마스킹되어 육안 확인 불가
   - **검증법**: Repo Settings → Secrets → `APP_STORE_VENDOR_NUMBER` 삭제 후 재등록할 때 순수 숫자만 입력
2. **실제 Vendor Number가 `405788798`이 아님**
   - ASC → **Payments and Financial Reports** → 우측 상단 계정 drawer에서 "Vendor #" 라벨 확인 (Sales and Trends보다 여기가 canonical)
   - 여러 Vendor를 가진 계정이면 기본 Vendor 외에 다른 번호일 수도 있음
3. **API Key에 Sales 권한 없음**
   - `TW3Y8S4M9V` Key가 Sales Reports 읽기 권한이 있는지 확인: ASC → Users and Access → Integrations → App Store Connect API → Key permissions
   - Admin 권한이면 기본 포함이지만, 혹시 모를 경우 확인 필요

#### 검증 순서 (우선순위)
1. ASC → Payments and Financial Reports 페이지에서 정확한 Vendor Number 확인
2. `.env.testflight.local`에 `APP_STORE_VENDOR_NUMBER` 추가 후 로컬 재현:
   ```bash
   source <(grep -v '^#' .env.testflight.local | grep -v '^$' | sed 's/^/export /')
   pnpm collect:asc-analytics -- --month 2026-03
   ```
3. 로컬에서 성공하면 → GitHub Secret 값이 문제 → Secret 삭제하고 순수 숫자만 재등록
4. 로컬에서도 실패하면 → Vendor Number 자체 또는 Key 권한 문제
5. 수정 후 `gh workflow run "Daily ASC Analytics Collection" -f month=2026-03` 재실행 → artifact에서 metrics 확보 확인

### 버그 B (Non-Critical): Analytics Reports API 409 RELATIONSHIP.INVALID
- `--analytics` 플래그 사용 시 발생
- 버그 A-2 해결 후 별도 이슈로 처리

### App Privacy 섹션 업데이트 (Task 4)
- ASC UI 수동 작업 (API 없음)
- 다음 App Store 제출 시점에 `docs/ANALYTICS.md` 섹션 10 체크리스트대로 진행

---

## 현재 설정된 GitHub Secrets (ASC 자동화용)

| 이름 | 값 출처 | 상태 |
|------|---------|------|
| `APP_STORE_CONNECT_API_KEY_ID` | `TW3Y8S4M9V` | ✅ 검증됨 (JWT 생성 성공) |
| `APP_STORE_CONNECT_API_ISSUER_ID` | `f4843e26-5b1f-4b00-bd4a-d24ca4539774` | ✅ 검증됨 |
| `APP_STORE_CONNECT_API_KEY_P8_B64` | `/Users/solkim/.private_keys/AuthKey_TW3Y8S4M9V.p8` base64 | ✅ 검증됨 |
| `APP_STORE_APP_ID` | `6737649116` | ✅ 정상 (App Identifier 필터링용) |
| `APP_STORE_VENDOR_NUMBER` | `405788798` (⚠️ **Apple이 거부**) | ❌ 값 재확인 필요 |

---

## 현재 상태 요약

### Main HEAD
- `cdedc2c chore(analytics): ASC error detail 1500자로 확장 (#73)`

### 이번 세션 머지 히스토리
- `cdedc2c` PR #73 — 에러 메시지 길이 확장 (1500자)
- `2af3529` PR #72 — vendorNumber 분리

### Worktree
- `/Users/solkim/Dev/where_kindergarden` — main
- `/Users/solkim/Dev/where_kindergarden-naver-place-audit` — 별도 피처 (무관)

### Untracked (커밋 안 함 — 세션 스크래치)
- `.claude/agents/harness-*.md`, `.claude/skills/harness/`, `.harness/` — harness 시스템 상태
- `.xcodebuildmcp/` — xcodebuildmcp 세션 defaults

### 워크플로우 실행 이력 (전체)
- Daily ASC Analytics Collection: 6회 실행 모두 실패
  - 1회차: 406 (fixed by PR #70)
  - 2회차: 400 PARAMETER_ERROR (appId를 vendorNumber로 사용 — PR #72로 수정)
  - 3회차: 409 RELATIONSHIP.INVALID (`--analytics` 플래그, 버그 B)
  - 4회차 (24729576895): 400 "Invalid vendor number specified" — 2026-04
  - 5회차 (24729655050): 400 같은 에러 — 2026-03
  - 6회차 (24729752598): 400 전체 detail 확보 — 값 자체가 Apple 기준 invalid

---

## 새 세션이 바로 시작할 수 있는 명령

```bash
# 1. 로컬 환경변수 확인 및 보강
cat .env.testflight.local | grep VENDOR  # 없으면 추가 필요
echo "APP_STORE_VENDOR_NUMBER=405788798" >> .env.testflight.local  # 임시 값

# 2. 로컬 재현
source <(grep -v '^#' .env.testflight.local | grep -v '^$' | sed 's/^/export /')
pnpm collect:asc-analytics -- --month 2026-03

# 3. 로컬 성공 시 → GitHub Secret 재등록 (순수 숫자만, 트레일링 개행 제거)
gh secret set APP_STORE_VENDOR_NUMBER --body "$(printf '%s' 405788798)"

# 4. 워크플로우 재트리거
gh workflow run "Daily ASC Analytics Collection" -f month=2026-03
gh run list --workflow="Daily ASC Analytics Collection" --limit 1
```

## 참고 파일
- `docs/ANALYTICS.md` — Analytics 설계 전체
- `docs/ASC_ANALYTICS_CRON.md` — ASC cron 운영 가이드 (5개 Secret 목록)
- `scripts/collect-asc-analytics.ts` — ASC 수집 스크립트 (vendorNumber 필드 포함)
- `.github/workflows/daily-asc-analytics.yml` — 워크플로우 (`APP_STORE_VENDOR_NUMBER` env 포함)

## 앱 레벨 메모
- Bundle ID: `com.solkim.kindergarden`
- App ID: `6737649116` (Apple Identifier, CSV 필터용)
- Vendor Number: `405788798` (⚠️ Apple 측에서 invalid 반환 — 재확인 필요)
- Mixpanel Project: `kindegarden` (ID 4014822, workspace 4510961)
- iOS 네이티브 앱 시뮬레이터: iPhone 17 Pro (`87C67713-AC8B-48FC-AE92-397C04F5215E`)
- Xcode 프로젝트: `ios/WhereKindergartenNative/WhereKindergartenNative.xcodeproj` (scheme: `WhereKindergartenNative`)

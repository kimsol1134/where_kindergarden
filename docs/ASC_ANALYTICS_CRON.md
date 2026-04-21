# ASC Analytics 일일 자동 수집

App Store Connect 분석 데이터를 매일 자동으로 수집하는 GitHub Actions 워크플로우.

## 워크플로우

`.github/workflows/daily-asc-analytics.yml`

- **스케줄**: 매일 08:10 KST (23:10 UTC 전일)
- **수동 실행**: GitHub → Actions → Daily ASC Analytics Collection → Run workflow
- **결과**: `scripts/data-output/asc-analytics-YYYY-MM.json`을 artifact로 업로드 (90일 보관)
- **토리거**: `schedule` + `workflow_dispatch`

## 필요한 GitHub Secrets

Repo Settings → Secrets and variables → Actions에 아래 5개 등록:

| 이름 | 설명 | 예시 |
|------|------|------|
| `APP_STORE_CONNECT_API_KEY_ID` | ASC API Key ID | `TW3Y8S4M9V` |
| `APP_STORE_CONNECT_API_ISSUER_ID` | ASC Issuer ID | `f4843e26-5b1f-4b00-bd4a-d24ca4539774` |
| `APP_STORE_CONNECT_API_KEY_P8_B64` | .p8 파일 내용을 base64로 인코딩한 문자열 | (아래 참조) |
| `APP_STORE_APP_ID` | Apple App ID (숫자, CSV Apple Identifier 필터용) | `6737649116` |
| `APP_STORE_VENDOR_NUMBER` | ASC Vendor Number (Sales Reports API 필수, 계정 레벨 식별자) | `405788798` |

> **주의**: `APP_STORE_APP_ID`와 `APP_STORE_VENDOR_NUMBER`는 서로 다른 값입니다.
> - **App ID**: 앱 단위 식별자, App Store URL에 노출됨 (`6737649116`)
> - **Vendor Number**: 계정 레벨 식별자, ASC → Sales and Trends 우측 상단 계정 메뉴에서 확인 (`solkim|405788798|1` 형식)

### .p8 파일 base64 인코딩

로컬에서 한 번만 실행:

```bash
base64 -i /Users/solkim/.private_keys/AuthKey_TW3Y8S4M9V.p8 | tr -d '\n' | pbcopy
```

클립보드에 복사된 값을 `APP_STORE_CONNECT_API_KEY_P8_B64` secret으로 등록.

### 값 레퍼런스 (.env.testflight.local과 동일)

이미 로컬에서 사용 중이면 해당 파일에서 값 그대로 가져다 쓰면 됨. `.p8` 경로만 base64 변환 필요.

## 수동 실행

```bash
# 현재 월 수집
gh workflow run "Daily ASC Analytics Collection"

# 특정 월 수집
gh workflow run "Daily ASC Analytics Collection" -f month=2026-03

# Analytics Reports API 사용 (비동기 3단계)
gh workflow run "Daily ASC Analytics Collection" -f use_analytics_api=true
```

## 데이터 다운로드

```bash
# 최근 실행 artifact 목록
gh run list --workflow="Daily ASC Analytics Collection" --limit 10

# 특정 run의 artifact 다운로드
gh run download <RUN_ID> -n asc-analytics-<RUN_ID>
```

## 향후 확장

- [ ] 누적 데이터를 `data/asc-analytics` 브랜치에 자동 커밋 (artifact 90일 제한 해결)
- [ ] Mixpanel daily data와 date 기준 JOIN하는 분석 스크립트 추가
- [ ] 실패 시 Slack/Email 알림

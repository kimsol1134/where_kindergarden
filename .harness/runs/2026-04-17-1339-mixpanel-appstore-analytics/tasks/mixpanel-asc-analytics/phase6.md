---
stage: plan
run_id: 2026-04-17-1339-mixpanel-appstore-analytics
task_id: mixpanel-asc-analytics
phase: 6
name: "operations-privacy-handoff"
created_at: 2026-04-17T15:10:00+09:00
---

# Phase 6: 운영 가이드 보완 + Privacy 업데이트 + HANDOFF

## 사전 준비

- 읽기:
  - `docs/ANALYTICS.md` — Phase 0에서 작성한 전체 내용 (보완할 섹션 파악)
  - `src/app/privacy/page.tsx` — 현재 개인정보처리방침 내용 (Mixpanel 미언급 상태)
  - `CLAUDE.md` — 현재 "분석 도구" 관련 섹션이 없음 (추가 필요)
  - `HANDOFF.md` — 현재 내용 (업데이트 필요)
  - `ios/NativeApp/Sources/Services/MixpanelAnalytics.swift` — Phase 3 완료 후 (운영 가이드 작성용 참조)
  - `ios/WhereKindergartenNative/Config/WhereKindergartenNative.xcconfig` — Phase 3 완료 후 (Mixpanel 토큰 분기 확인)
  - `scripts/collect-asc-analytics.ts` — Phase 5 완료 후 (운영 가이드 명령어 확인)
  - `CLAUDE.md` — "console.log 절대 남기지 않기", "any 타입 사용 금지"
- 참조 artifact:
  - `.harness/runs/2026-04-17-1339-mixpanel-appstore-analytics/01-clarify.md` — Q4=C(병렬 운영), ATT/Privacy 고려사항
  - `.harness/runs/2026-04-17-1339-mixpanel-appstore-analytics/tasks/mixpanel-asc-analytics/phase3-output.md` — Mixpanel 초기화 최종 위치 확인
  - `.harness/runs/2026-04-17-1339-mixpanel-appstore-analytics/tasks/mixpanel-asc-analytics/phase5-output.md` — ASC 스크립트 사용법 확인

## 지시

이 Phase는 문서 및 웹 UI 수정만 담당한다. Swift 파일과 `package.json`은 수정하지 않는다.

### 1. `docs/ANALYTICS.md` 보완 (Phase 0 내용에 추가)

Phase 0 내용을 유지하면서 아래 섹션을 추가 또는 보완한다:

#### 추가: "Mixpanel Lexicon 등록 절차" 섹션 보완

Lexicon 등록 후 체크리스트:
- Events 탭: 13개 이벤트 모두 설명 입력
- Properties 탭: `result_count`, `compare_count`를 Number 타입으로 지정 (Numeric Aggregation 활성화)
- Properties 탭: `has_results`, `is_testflight`를 Boolean 타입으로 지정
- Cohort Builder에서 `days_since_install` 기반 코호트 생성 예시

#### 추가: "ASC Analytics 수집 운영 가이드" 섹션

```bash
# 월별 ASC 데이터 수집 (전월)
source <(grep -v '^#' .env.testflight.local | grep -v '^$' | sed 's/^/export /')
pnpm collect:asc-analytics -- --month YYYY-MM

# 출력 파일 확인
ls -la scripts/data-output/asc-analytics-*.json

# dry-run 테스트 (API 호출 없이 JWT 구성 확인)
pnpm collect:asc-analytics -- --dry-run
```

교차 분석 워크플로우 (Google Sheets):
1. `pnpm collect:asc-analytics -- --month YYYY-MM` 실행
2. `scripts/data-output/asc-analytics-YYYY-MM.json` 열기
3. Google Sheets에 `date`, `metric_name`, `value` 컬럼 붙여넣기
4. Mixpanel Reports → Export CSV (날짜별 이벤트 수)
5. VLOOKUP(date) 또는 INDEX/MATCH로 ASC Installs ↔ Mixpanel App Launched 매칭

#### 추가: "App Store Connect Privacy 업데이트 체크리스트" 섹션

다음 AppStore Connect 제출 시 수동 반영:
- [ ] App Privacy → Data Used to Track You: "Usage Data" (Analytics) 추가
- [ ] App Privacy → Data Linked to You: 해당 없음 (IDFV는 익명 식별자)
- [ ] App Privacy → Data Not Linked to You: "Usage Data - Analytics" 선택
- [ ] Privacy Nutrition Label에 Mixpanel 언급 추가
- Mixpanel 데이터 보존 정책: 기본 5년 (Mixpanel 설정에서 변경 가능)
- GDPR/개인정보보호법: 국내 서비스, EU 서버 미사용 (기본 api.mixpanel.com)

### 2. `CLAUDE.md` — "분석 도구 (Mixpanel + ASC)" 섹션 추가

CLAUDE.md의 "환경 변수" 섹션 아래에 새 섹션 추가:

```markdown
## 분석 도구 (Mixpanel + ASC)

### Mixpanel iOS SDK

- **SDK**: Mixpanel Swift SPM (`ios/NativeApp/Package.swift`)
- **초기화**: `WhereKindergartenNativeHostApp.init()`에서 `MixpanelAnalytics.shared.configure(token:)` 1회 호출
- **토큰 관리**: `ios/WhereKindergartenNative/Config/WhereKindergartenNative.xcconfig`에서 Debug/Release 분기
  - `WK_MIXPANEL_TOKEN_DEBUG`: Dev 프로젝트 토큰 (로컬 xcconfig override)
  - `WK_MIXPANEL_TOKEN_RELEASE`: Prod 프로젝트 토큰 (로컬 xcconfig override)
- **이벤트 스펙**: `docs/ANALYTICS.md` 참조
- **중복 초기화 금지**: NativeRootView body 내에서 MixpanelAnalytics 인스턴스 생성 금지

### ASC Analytics 수집

- **스크립트**: `scripts/collect-asc-analytics.ts`
- **실행**: `pnpm collect:asc-analytics -- --month YYYY-MM`
- **환경변수**: `.env.testflight.local`에서 ASC API Key 로드
- **출력**: `scripts/data-output/asc-analytics-YYYY-MM.json`
- **교차 분석**: `docs/ANALYTICS.md` "Cohort 기반 교차 분석" 섹션 참조
```

### 3. `src/app/privacy/page.tsx` — Mixpanel 데이터 수집 고지 추가

현재 파일의 기존 개인정보처리방침 내용을 읽은 후, "수집하는 개인정보 항목" 또는 이에 상응하는 섹션에 아래 내용을 추가한다:

```
분석 서비스 (Mixpanel):
- 수집 항목: 앱 사용 행동 데이터 (화면 이동, 검색, 비교 기능 사용 등), 기기 정보 (iOS 버전, 앱 버전, 기기 모델), 익명 식별자 (IDFV — 앱 재설치 시 갱신되는 기기 고유 ID)
- 수집 목적: 앱 사용성 개선 및 서비스 품질 향상
- 보존 기간: 5년
- 제3자 제공: Mixpanel Inc. (미국) — https://mixpanel.com/legal/privacy-policy/
- 개인 식별 불가: 수집되는 식별자는 실명/연락처와 연결되지 않음
```

텍스트 포맷은 기존 `page.tsx`의 스타일(JSX 구조)에 맞게 작성. Tailwind 클래스는 기존 패턴 유지.

### 4. `HANDOFF.md` 업데이트

현재 내용을 유지하면서 아래 내용으로 업데이트:

```markdown
## 마지막 작업 일시
2026-04-17

## 완료된 작업
- [x] Mixpanel + ASC 분석 인프라 구축 (feature/mixpanel-analytics)
  - Phase 0: Analytics Design Doc (docs/ANALYTICS.md)
  - Phase 1: AnalyticsValue 타입 + 프로토콜 재설계 + ViewModel 호출부 수정
  - Phase 2: SessionTracker + DeviceInfo 서비스 + 유닛 테스트
  - Phase 3: Mixpanel Swift SPM + 싱글턴 초기화 + xcconfig Dev/Prod 분기
  - Phase 4: 누락 이벤트 추가 + ShareLink 교체 + 13개 이벤트 완성
  - Phase 5: scripts/collect-asc-analytics.ts (ASC API 3단계 흐름 + JOIN 가능 출력)
  - Phase 6: 운영 가이드 + Privacy 업데이트 + HANDOFF

## 다음에 할 작업
1. TestFlight 배포 → Mixpanel Dev 프로젝트에서 이벤트 수신 확인 (Data QA 48시간)
2. 배포 후 Mixpanel Lexicon 등록 (docs/ANALYTICS.md 섹션 7 참조)
3. App Store Connect App Privacy 섹션 업데이트 (docs/ANALYTICS.md 체크리스트)
4. 데이터 2~4주 축적 후 퍼널 분석 런 별도 진행

## 주의사항 / 알려진 이슈
- Mixpanel 토큰 미입력 시 SDK 초기화 건너뜀 (MixpanelAnalytics.shared.configure가 nil token guard로 처리)
- ASC Analytics Reports API는 비동기 처리 (수분 대기), Sales Reports API를 Primary로 사용
- reviewStore.test.ts, ReviewLinkList.test.tsx는 기존 실패 테스트 (이번 런과 무관)

## 현재 브랜치
feature/mixpanel-analytics (worktree: ../where_kindergarden-mixpanel-analytics)

## 참고 파일
- docs/ANALYTICS.md — Analytics 설계 전체
- CLAUDE.md — "분석 도구" 섹션 신규 추가됨
- ios/NativeApp/Sources/Services/Analytics.swift — AnalyticsValue, AnalyticsTracking
- ios/NativeApp/Sources/Services/MixpanelAnalytics.swift — 싱글턴 구현
- ios/NativeApp/Sources/Services/SessionTracker.swift — Session boundary 관리
- scripts/collect-asc-analytics.ts — ASC 수집 스크립트
```

## 주의사항

- `next.config.ts` 수정 금지. 이유: 보안 설정 포함, 변경 시 확인 필요.
- `src/app/privacy/page.tsx` 수정 시 기존 내용 삭제하지 마라. 이유: 추가만 할 것. 기존 섹션 구조 유지.
- `CLAUDE.md`의 "파일 보호" 섹션(`next.config.ts`, `.env.local`, `package.json engines`)은 수정하지 마라. 이유: 절대 규칙 섹션.
- `docs/ANALYTICS.md`의 Phase 0 내용을 덮어쓰지 마라. 이유: Phase 0 AC를 통과한 내용이므로 보존. 이 Phase는 추가/보완만.
- Swift 파일과 `package.json`은 이 Phase에서 수정하지 마라. 이유: Phase 6 scope는 문서 + 웹 UI만.

## AC (완료 기준)

```bash
# 1. ANALYTICS.md ASC 운영 가이드 섹션 확인
grep -q "collect:asc-analytics" docs/ANALYTICS.md && echo OK
# 기대: OK

# 2. ANALYTICS.md App Store Privacy 체크리스트 확인
grep -q "Privacy Nutrition Label" docs/ANALYTICS.md && echo OK
# 기대: OK

# 3. ANALYTICS.md Lexicon 등록 체크리스트 확인
grep -q "Lexicon" docs/ANALYTICS.md && echo OK
# 기대: OK

# 4. CLAUDE.md 분석 도구 섹션 추가 확인
grep -q "Mixpanel iOS SDK" CLAUDE.md && echo OK
grep -q "ASC Analytics" CLAUDE.md && echo OK
# 기대: OK OK

# 5. privacy 페이지 Mixpanel 언급 확인
grep -q "Mixpanel" src/app/privacy/page.tsx && echo OK
# 기대: OK

# 6. privacy 페이지 IDFV 언급 확인
grep -q "IDFV" src/app/privacy/page.tsx && echo OK
# 기대: OK

# 7. Next.js 타입 체크 (privacy 페이지 수정 후 타입 오류 없음)
pnpm type-check
# 기대: 0 errors

# 8. lint 통과
pnpm lint
# 기대: exit 0

# 9. HANDOFF.md 업데이트 확인
grep -q "feature/mixpanel-analytics" HANDOFF.md && echo OK
# 기대: OK
```

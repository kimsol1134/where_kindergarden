# HANDOFF.md

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
3. App Store Connect App Privacy 섹션 업데이트 (docs/ANALYTICS.md 섹션 10 체크리스트)
4. 데이터 2~4주 축적 후 퍼널 분석 런 별도 진행

## 이전 세션에서 이어서 작업할 미해결 버그 2개

### 버그 1 (Critical): 📍 버튼 탭 시 "'현재 위치' 결과가 없어요" 표시

**증상**: 📍 버튼을 누르면 검색바에 "현재 위치" 텍스트가 들어가고, 반경 5km까지 확대해도 "'현재 위치' 결과가 없어요"가 표시됨.

**근본 원인**: `centerOnCurrentLocation()`가 `searchText`를 "현재 위치"로 설정. ResultSheet empty state가 `trimmedSearchQuery` 기반이라 텍스트 검색 실패 상태로 오인됨.

**수정 방법 A (권장)**: `NativeAppModel.swift` `centerOnCurrentLocation()`에서 `setSearchText("", refreshSuggestions: false, applyAsResultQuery: false)`로 변경.

**관련 파일**:
- `ios/NativeApp/Sources/Features/Shared/NativeAppModel.swift` line 487-515
- `ios/NativeApp/Sources/Features/Search/SearchFeature.swift` line 47-49 (`trimmedSearchQuery`), line ~703 (empty state)

### 버그 2: 바텀시트 최소 높이에서 텍스트 잘림 + 드래그 핸들 안 보임

**증상**: 시트를 최소(32%)로 내리면 "검색 결과" 타이틀 상단이 잘리고, 드래그 핸들(Capsule)이 보이지 않음.

**수정 방법**:
1. `sheetSnaps` 첫 번째 값 0.32 → 0.35~0.38로 상향 또는
2. `sheetHeight` 하한선 추가: `max(screenHeight * fraction, 200)`

**관련 파일**: `ios/NativeApp/Sources/Features/Search/SearchFeature.swift`

## 주의사항 / 알려진 이슈
- Mixpanel 토큰 미입력 시 SDK 초기화 건너뜀 (`MixpanelAnalytics.shared.configure`가 nil/empty token guard로 처리)
- ASC Analytics Reports API는 비동기 처리(수분 대기), Sales Reports API를 Primary로 사용
- `reviewStore.test.ts`, `ReviewLinkList.test.tsx`는 기존 실패 테스트 (이번 런과 무관)

## 현재 브랜치
feature/mixpanel-analytics (worktree: ../where_kindergarden-mixpanel-analytics)

## 참고 파일
- `docs/ANALYTICS.md` — Analytics 설계 전체 (섹션 1~10)
- `CLAUDE.md` — "분석 도구 (Mixpanel + ASC)" 섹션 신규 추가됨
- `ios/NativeApp/Sources/Services/Analytics.swift` — AnalyticsValue, AnalyticsTracking
- `ios/NativeApp/Sources/Services/MixpanelAnalytics.swift` — 싱글턴 구현
- `ios/NativeApp/Sources/Services/SessionTracker.swift` — Session boundary 관리
- `ios/NativeApp/Sources/Services/DeviceInfo.swift` — 기기/앱 메타데이터
- `scripts/collect-asc-analytics.ts` — ASC 수집 스크립트
- `src/app/privacy/page.tsx` — 개인정보처리방침 (Mixpanel 섹션 추가됨)

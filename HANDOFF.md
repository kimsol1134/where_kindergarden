# HANDOFF.md

## 마지막 작업 일시
2026-03-15

## 완료된 작업
- [x] 랜딩 Hero CTA 우선순위 재정렬
- [x] 모바일 헤더 메뉴를 실제 네비게이션 시트로 교체
- [x] 검색 상태 모델을 `idle / locating / results / empty / filtered_empty / error`로 재구성
- [x] 검색 초기 가이드 카드, query 초기화, 검색 세션 초기화, 필터 초기화 UX 추가
- [x] 모바일 `목록 / 지도` 세그먼트 전환 적용
- [x] 모바일 compare bar를 요약형 + 확장형 구조로 재설계
- [x] 상세 화면을 모바일 시트형 레이아웃으로 재구성
- [x] 비교 페이지를 모바일 카드형 / 데스크톱 표형으로 분기
- [x] compare 공유 URL에 optional `lat/lng/address` 지원 추가
- [x] 성향 테스트 intro CTA 위치 조정 및 결과 → 추천 검색 연결
- [x] 공유/복사 피드백을 공통 토스트로 통일
- [x] 찜/후기 empty state 및 후기 제안 모달 톤 정리
- [x] 브라우저 확대 허용으로 접근성 개선

## 진행 중인 작업
- 없음

## 다음에 할 작업
1. 실제 디바이스 또는 TestFlight 빌드에서 Safari/Capacitor safe area 차이 추가 검증
2. 검색/비교/공유 이벤트 대시보드 연결 여부 확인
3. 필요하면 E2E 테스트에 `검색 시작 → 상세 → 비교` 모바일 시나리오 추가

## 검증 결과
- `pnpm type-check` 통과
- `pnpm test` 통과 (14 files, 184 tests)
- 변경 파일 대상 `eslint` 통과
- iOS Simulator Safari에서 랜딩 / 검색 초기 / 검색 결과 / 상세 / 비교 / 테스트 화면 수동 확인

## 주의사항 / 알려진 이슈
- worktree에서 `node_modules`를 symlink로 연결해 사용 중이라 `pnpm build`는 Turbopack의 symlink 제한 때문에 실패함
- 동일 브랜치를 원본 저장소에서 계속 작업하지 말고, 현재 worktree(`/tmp/where_kindergarden-ux-overhaul`)에서 이어서 작업하는 것이 안전함
- 전체 `pnpm lint`는 기존 `scripts/` 디렉터리의 선행 에러 때문에 여전히 실패할 수 있음. 이번 작업 변경 파일 자체는 별도 `eslint`로 확인 완료

## 현재 브랜치
codex/feature/ux-overhaul

## 참고 파일
- `src/stores/searchStore.ts` - 검색 상태 모델 및 필터/세션 로직
- `src/components/search/SearchHeader.tsx` - 검색 시작/필터/세션 초기화 UX
- `src/components/search/KindergartenDetailPanel.tsx` - 모바일 상세 시트
- `src/components/compare/CompareGrid.tsx` - 모바일/데스크톱 비교 UI 분기
- `src/app/test/_components/TestFlow.tsx` - 테스트 CTA/추천 검색 연결

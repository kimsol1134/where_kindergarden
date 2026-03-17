# HANDOFF.md

## 마지막 작업 일시
2026-03-17

## 완료된 작업
- [x] 공식 결원정보 타입 추가 (`src/types/vacancy.ts`)
- [x] 공식 결원정보 스토어 추가 (`src/stores/vacancyStore.ts`)
- [x] 결원 HTML 파서 추가 (`src/lib/vacancy/parser.ts`)
- [x] 결원 동기화 스크립트 추가 (`scripts/sync-vacancy.ts`)
- [x] 검색 카드에 `공식 결원 N명` 배지 노출
- [x] 상세 패널에 공식 결원정보 3상태 UI 추가
- [x] 파서/스토어/컴포넌트 테스트 추가
- [x] `pnpm test` 통과
- [x] `pnpm type-check` 통과

## 진행 중인 작업
- 전국 실데이터 동기화 완료
  - `pnpm sync:vacancy -- --year 2026` 실행 성공
  - 현재 `public/data/vacancy.json`은 전국 기준 실데이터 상태
  - 집계: 총 2,753건 / 양수 결원 2,115건 / 0명 등록 638건

## 다음에 할 작업
1. 생성된 전국 `public/data/vacancy.json`을 기준으로 앱 UI 수동 검수
2. 배포하여 원격 `/data/vacancy.json` 반영
3. 필요하면 정기 운영 루틴에 `pnpm sync:vacancy -- --year 2026` 추가

## 주의사항 / 알려진 이슈
- `scripts/sync-vacancy.ts`는 수집 결과가 0건이면 `vacancy.json`을 덮어쓰지 않고 실패 처리함
- 공식 결원정보는 `kindercode === ittId` 조인 전제
- live 사이트는 Node/undici 기준 `UNABLE_TO_VERIFY_LEAF_SIGNATURE`가 나서 sync 스크립트 프로세스 안에서만 TLS 검증 완화 적용
- live 사이트는 브라우저 세션 쿠키 없이 직접 POST하면 `Request Blocked`를 반환하므로 스크립트가 초기 GET 세션을 먼저 생성함
- 기존 `여유정원` 필터는 휴리스틱(`capacity > currentCount`)으로 유지되며 공식 결원 필터는 아직 없음

## 현재 브랜치
- `codex/feature-vacancy-integration`

## 참고 파일
- `scripts/sync-vacancy.ts` - 공식 결원정보 동기화
- `public/data/vacancy.json` - 앱 런타임에서 읽는 정적 결원 데이터
- `docs/DETAILED_SPEC.md` - 공식 결원정보 동기화 절차 추가

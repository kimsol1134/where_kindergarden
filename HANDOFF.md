# HANDOFF.md

## 마지막 작업 일시
2026-03-17

## 완료된 작업
- [x] 앱 아이콘 기준 브랜드 토큰 정의 및 웹 shell 리브랜딩 반영
- [x] SwiftUI 기반 네이티브 앱 스캐폴드 추가
- [x] 후기 검증 증분 파이프라인 및 CI 자동화 추가
- [x] 공식 결원정보 타입/스토어/파서/동기화 스크립트 추가
- [x] 검색 카드에 `공식 결원 N명` 배지 노출
- [x] 상세 패널에 공식 결원정보 3상태 UI 추가
- [x] 전국 실데이터 `public/data/vacancy.json` 생성 완료
- [x] `pnpm test`, `pnpm type-check`, `pnpm build` 통과

## 진행 중인 작업
- PR `#21` 배포 머지 과정에서 `origin/main` 병합 중
- 별도 Xcode iOS App target은 아직 생성하지 않음
- Kakao 지도 SDK 브리지와 native 실데이터 로더는 아직 mock/prototype 수준
- GitHub Actions 원격에서 review verification workflow 1회 실실행 확인 필요

## 다음에 할 작업
1. 현재 브랜치의 merge conflict 정리 후 PR `#21` 머지
2. Vercel production 배포 완료 여부 확인
3. 원격 `/data/vacancy.json`이 최신 전국 데이터로 노출되는지 확인
4. 필요하면 정기 운영 루틴에 `pnpm sync:vacancy -- --year 2026` 추가

## 주의사항 / 알려진 이슈
- 공식 결원정보는 `kindercode === ittId` 조인 전제
- live 사이트는 Node/undici 기준 `UNABLE_TO_VERIFY_LEAF_SIGNATURE`가 나서 sync 스크립트 프로세스 안에서만 TLS 검증 완화 적용
- live 사이트는 브라우저 세션 쿠키 없이 직접 POST하면 `Request Blocked`를 반환하므로 스크립트가 초기 GET 세션을 먼저 생성함
- 기존 `여유정원` 필터는 휴리스틱(`capacity > currentCount`)으로 유지되며 공식 결원 필터는 아직 없음

## 현재 브랜치
- `codex/feature-vacancy-integration`

## 참고 파일
- `scripts/sync-vacancy.ts`
- `public/data/vacancy.json`
- `docs/DETAILED_SPEC.md`
- `docs/brand/icon-brand-system.md`
- `.github/workflows/review-verification-incremental.yml`

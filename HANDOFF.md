# HANDOFF.md

## 마지막 작업 일시
2026-03-17

## 완료된 작업
- [x] 앱 아이콘 기준 브랜드 토큰 정의
- [x] 웹 shell 리브랜딩 적용
- [x] `manifest`, 메타데이터, structured data 로고 기준 통일
- [x] 별도 SwiftUI 네이티브 앱 소스 구조 추가
- [x] Swift 패키지 단위 테스트 작성 및 통과

## 이번 세션 변경 요약
- `src/app/globals.css`에 아이콘 기준 `Mist White / Leaf Green / Sun Yellow / Warm Sand` 토큰과 frosted surface 스타일을 추가함
- 랜딩, 검색 헤더, 비교 헤더, 서비스 소개/개인정보처리방침 상단 chrome을 새 브랜드 톤으로 교체함
- `src/app/manifest.ts`, `src/components/JsonLd.tsx`, `src/app/layout.tsx`를 통해 아이콘/메타데이터 기준을 앱 아이콘으로 통일함
- `docs/brand/icon-brand-system.md`, `docs/contracts/native-data-contracts.md`로 브랜드 원칙과 공용 계약을 문서화함
- `ios/NativeApp/` 아래에 `Models / Services / Features / AppShell / Config` 구조의 SwiftUI-first 네이티브 앱 스캐폴드를 추가함

## 진행 중인 작업
- 별도 Xcode iOS App target은 아직 생성하지 않음
- Kakao 지도 SDK 브리지와 실제 JSON 로더, 위치 권한 연동은 아직 mock/prototype 수준임

## 다음에 할 작업
1. `ios/NativeApp` 소스를 연결하는 실제 Xcode SwiftUI app project 생성
2. Kakao 지도 SDK `UIViewRepresentable` 브리지 추가
3. `/data/kindergartens.json`, `/data/reviews.json`를 실제로 읽는 native repository 구현
4. 찜/최근 검색 UserDefaults 저장과 compare deep link 복원 연결
5. 웹의 검색/비교 본문 카드까지 brand token을 더 깊게 적용할지 결정

## 주의사항 / 알려진 이슈
- 루트 `pnpm lint`는 이번 변경과 무관한 기존 `scripts/*`, `src/components/ads/AdContainer.tsx` 문제로 전체 통과하지 않음
- 이번 세션에서 수정한 React 파일들은 개별 eslint 검사 통과
- `swift test` 실행으로 `.clang-module-cache/`가 생성됨

## 검증 결과
- `pnpm type-check` 통과
- 변경 파일 대상 `pnpm eslint ...` 통과
- `swift test` 통과

## 현재 브랜치
codex/icon-brand-swiftui

## 참고 파일
- `docs/brand/icon-brand-system.md`
- `docs/contracts/native-data-contracts.md`
- `ios/NativeApp/README.md`

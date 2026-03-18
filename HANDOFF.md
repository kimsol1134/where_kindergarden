# HANDOFF.md

## 마지막 작업 일시
2026-03-18

## 완료된 작업
- [x] 앱 아이콘 기준 브랜드 토큰 정의 및 웹 shell 리브랜딩 반영
- [x] 후기 검증 증분 파이프라인 및 CI 자동화 추가
- [x] 공식 결원정보 타입/스토어/파서/동기화 스크립트 추가
- [x] 검색 카드에 `공식 결원 N명` 배지 노출
- [x] 상세 패널에 공식 결원정보 3상태 UI 추가
- [x] 전국 실데이터 `public/data/vacancy.json` 생성 완료
- [x] 웹 앱 기준 `pnpm test`, `pnpm type-check`, `pnpm build` 통과
- [x] `ios/NativeApp` Swift package 스캐폴드 및 별도 SwiftUI iPhone 앱 프로젝트 `ios/WhereKindergartenNative` 생성
- [x] `public/data/kindergartens.json` 번들 로딩 연결
- [x] 리뷰 원격 우선(`https://where-kindergarden.vercel.app/data/reviews.json`) + 로컬 fallback 연결
- [x] 찜 / 최근 검색 / 비교 선택 UserDefaults 영속 저장 및 복원 연결
- [x] compare custom URL scheme / universal link 라우팅 연결
- [x] Kakao Maps `UIViewRepresentable` 브리지 추가
- [x] Kakao Local REST 기반 네이티브 주소/장소 검색 서비스 추가
- [x] `KAKAO_REST_API_KEY` 런타임 설정 경로 추가 (`Info.plist` / `project.yml`)
- [x] 네이티브 검색 입력을 디바운스 + 로컬 기관 매치 + 원격 주소/장소 제안 + 최근 검색 섹션으로 확장
- [x] 최근 검색 전체 삭제 / 목록 삭제 UX 추가 및 관련 Swift 테스트 보강
- [x] `xcodegen generate` 기준으로 `project.yml`와 실제 `.xcodeproj` 재동기화
- [x] 네이티브 앱 `Info.plist`에 필수 bundle metadata를 보강해 실제 시뮬레이터 설치 가능 상태로 수정
- [x] 실데이터의 누락된 면적 필드를 0으로 fallback 하도록 `KindergartenRaw` 디코딩 보강
- [x] 누락 필드 디코딩 regression test 추가
- [x] no-key degraded path를 실제 iOS Simulator에서 재검증
- [x] 검색 중 suggestion panel / 결과 시트 / 필터가 동시에 겹치던 레이아웃을 정리하고 no-key map placeholder를 카드형으로 축소

## 현재 상황 요약

### 웹 / 결원정보 상태
- 공식 결원정보는 `public/data/vacancy.json`을 기준으로 서비스되고 있음
- 검색 리스트와 상세 패널 모두 공식 결원정보를 읽도록 연결됨
- 현재 `origin/main`에는 결원정보 파이프라인과 native follow-up이 함께 병합된 상태임

### 네이티브 앱 상태
- `ios/WhereKindergartenNative/project.yml`이 source of truth이며 `xcodegen generate` 결과 드리프트 없음
- 앱 타깃은 `ios/NativeApp` 패키지의 `Models / Services / Features / AppShell` 레이어를 그대로 사용함
- `FavoriteItem`, `RecentSearch`, `CompareSelection` 영속 저장 / 복원 흐름 유지
- compare custom URL scheme / universal link restore regression 징후 없음

### 이번 native follow-up에서 해결한 런타임 이슈
- 빌드는 되지만 simulator install이 실패하던 `.app` bundle metadata 누락 문제 해결
- 실제 `kindergartens.json` 일부 레코드의 면적 필드 누락 때문에 전체 카탈로그 디코딩이 깨지던 문제 해결
- 검색 중 suggestion panel, filter chip, result sheet, placeholder가 한 화면에서 과도하게 겹치던 문제를 완화

### Kakao 런타임 키 상태
- 이 환경에는 git-ignore된 `ios/WhereKindergartenNative/Config/KakaoKeys.local.xcconfig`가 없었음
- 따라서 검증 빌드의 `KAKAO_NATIVE_APP_KEY`, `KAKAO_REST_API_KEY`는 둘 다 빈 문자열로 해석됨
- empty-key degraded fallback은 유지됨
  - 지도는 placeholder/runtime message로 안전하게 내려감
  - Kakao REST 제안은 비활성화 메시지를 노출하고 로컬 유치원 제안은 계속 동작함

## 실제로 검증한 것

### 웹
- `pnpm test`
- `pnpm type-check`
- `pnpm build`

### 네이티브 프로젝트 생성 / 빌드
- `xcodegen generate` 통과
- `env HOME=/tmp/where_kindergarden-native-followup-home CLANG_MODULE_CACHE_PATH=/tmp/where_kindergarden-native-followup-clang-modules swift test` 통과
- `xcodebuild -project ios/WhereKindergartenNative/WhereKindergartenNative.xcodeproj -scheme WhereKindergartenNative -destination 'generic/platform=iOS Simulator' -derivedDataPath /tmp/where_kindergarden-native-followup-deriveddata CODE_SIGNING_ALLOWED=NO build` 통과
- built app bundle에 `kindergartens.json`, `reviews.json` 포함 확인
- built `Info.plist`에서 `CFBundleIdentifier = com.solkim.wherekindergarten.native`, `CFBundleExecutable = WhereKindergartenNative` 확인
- built `Info.plist`에서 `KAKAO_NATIVE_APP_KEY`, `KAKAO_REST_API_KEY` 모두 빈 값으로 해석되는 것 확인

### 실제 iOS Simulator 런타임
- `iPhone 17 Pro` simulator에 앱 설치 성공
- 앱 실행 성공
- no-key 상태에서 `Kakao Maps 설정 필요` placeholder와 관련 runtime message 노출 확인
- 기본 위치(`서울 시청`) 기준으로 카탈로그가 로드되어 탐색 결과가 실제로 렌더링되는 것 확인
- `wherekindergarten://search?q=역삼` deep link로 검색 텍스트를 주입했을 때 로컬 유치원 제안 2건이 실제로 표시되는 것 확인
- same runtime state에서 `KAKAO_REST_API_KEY가 없어 주소와 장소 제안은 비활성화되었습니다...` degraded message 노출 확인
- 검색 중에는 suggestion panel에 집중되도록 result sheet / compare bar / filter chip 노출이 줄어든 것 확인

## 이번 환경에서 막힌 것
- 실제 Kakao 지도 인증 성공 여부
- 실제 Kakao REST 주소/장소 제안 로딩
- non-empty `KAKAO_NATIVE_APP_KEY`, `KAKAO_REST_API_KEY`가 `Info.plist`에 주입된 빌드 검증
- 실기기에서 위치 권한, universal link association, cold start deep link restore 검증
- production 배포 완료 여부와 최신 `/data/vacancy.json` 노출 상태는 별도 확인 필요

## 남은 리스크 / 다음 단계
1. production에서 `/data/vacancy.json`과 검색/상세 결원 UI가 최신 상태로 노출되는지 확인
2. 필요하면 운영 루틴에 `pnpm sync:vacancy -- --year 2026` 추가
3. `ios/WhereKindergartenNative/Config/KakaoKeys.example.xcconfig`를 복사해 로컬 전용 `KakaoKeys.local.xcconfig`를 만든 뒤 실제 Kakao 키로 simulator/runtime smoke test 수행
4. 실제 Kakao 키가 준비되면 지도 인증 성공, 원격 주소/장소 제안, suggestion selection 이후 map center 업데이트를 end-to-end로 확인
5. 실기기에서 위치 권한 허용/거부, custom scheme, universal link, cold start restore를 확인

## 주의사항 / 알려진 이슈
- 공식 결원정보는 `kindercode === ittId` 조인 전제
- live 사이트는 Node/undici 기준 `UNABLE_TO_VERIFY_LEAF_SIGNATURE`가 나서 sync 스크립트 프로세스 안에서만 TLS 검증 완화 적용
- live 사이트는 브라우저 세션 쿠키 없이 직접 POST하면 `Request Blocked`를 반환하므로 스크립트가 초기 GET 세션을 먼저 생성함
- 기존 `여유정원` 필터는 휴리스틱(`capacity > currentCount`)으로 유지되며 공식 결원 필터는 아직 없음
- Kakao SPM 의존성은 현재 공식 저장소 `master` 브랜치를 참조함

## 주요 파일
- `scripts/sync-vacancy.ts`
- `public/data/vacancy.json`
- `src/lib/vacancy/parser.ts`
- `src/stores/vacancyStore.ts`
- `ios/NativeApp/Config/NativeAppInfo.plist`
- `ios/NativeApp/Sources/Models/KindergartenModels.swift`
- `ios/NativeApp/Sources/Features/Search/SearchFeature.swift`
- `ios/NativeApp/Sources/Features/Search/KakaoMapBridge.swift`
- `ios/WhereKindergartenNative/project.yml`

## 현재 브랜치
- `main`

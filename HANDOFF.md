# HANDOFF.md

## 마지막 작업 일시
2026-03-17

## 완료된 작업
- [x] 앱 아이콘 기준 브랜드 토큰 정의
- [x] 웹 shell 리브랜딩 적용
- [x] `manifest`, 메타데이터, structured data 로고 기준 통일
- [x] `ios/NativeApp` Swift package 스캐폴드 추가
- [x] 별도 SwiftUI iPhone 앱 프로젝트 `ios/WhereKindergartenNative` 생성
- [x] `public/data/kindergartens.json` 번들 로딩 연결
- [x] 리뷰 원격 우선(`https://where-kindergarden.vercel.app/data/reviews.json`) + 로컬 fallback 연결
- [x] 찜 / 최근 검색 / 비교 선택 UserDefaults 영속 저장 및 복원 연결
- [x] compare custom URL scheme / universal link 라우팅 연결
- [x] Kakao Maps `UIViewRepresentable` 브리지 추가 및 실제 앱 빌드 통과
- [x] Kakao Local REST 기반 네이티브 주소/장소 검색 서비스 추가
- [x] `KAKAO_REST_API_KEY` 런타임 설정 경로 추가 (`Info.plist` / `project.yml`)
- [x] 네이티브 검색 입력을 디바운스 + 로컬 기관 매치 + 원격 주소/장소 제안 + 최근 검색 섹션으로 확장
- [x] 제안 선택 시 활성 검색 라벨, 지도 중심, 결과 계산, 최근 검색 영속 저장이 함께 갱신되도록 연결
- [x] `xcodegen generate` 기준으로 `project.yml`와 실제 `.xcodeproj` 재동기화
- [x] worktree 경로에 따라 `.pbxproj`가 흔들리던 `public/data` 리소스 그룹 고정화
- [x] Kakao 키를 generated `.pbxproj` 대신 로컬 `.xcconfig` 경로로 주입하도록 정리
- [x] 최근 검색 전체 삭제 / 목록 삭제 UX 추가 및 관련 Swift 테스트 보강
- [x] 네이티브 앱 `Info.plist`에 필수 bundle metadata를 보강해 실제 시뮬레이터 설치 가능 상태로 수정
- [x] 실데이터의 누락된 면적 필드(`classroom_area`, `indoor_playground_area`, `outdoor_playground_area`)를 0으로 안전 fallback 하도록 `KindergartenRaw` 디코딩 보강
- [x] 누락 필드 디코딩 regression test 추가
- [x] no-key degraded path를 실제 iOS Simulator에서 다시 검증
- [x] 검색 중 suggestion panel / 결과 시트 / 필터가 동시에 겹치던 레이아웃을 정리하고 no-key map placeholder를 카드형으로 축소

## 현재 상황 요약

### 네이티브 앱 상태
- `ios/WhereKindergartenNative/WhereKindergartenNative.xcodeproj`는 계속 `ios/WhereKindergartenNative/project.yml`에서 생성되며, 이번 작업 후에도 `xcodegen generate` 결과 드리프트가 없음
- 앱 타깃은 여전히 `ios/NativeApp` 패키지의 `Models / Services / Features / AppShell` 레이어를 그대로 사용함
- `FavoriteItem`, `RecentSearch`, `CompareSelection` 영속 저장 / 복원 흐름은 변경하지 않았고 관련 Swift 테스트가 계속 통과함
- compare custom URL scheme / universal link restore 코드는 그대로 유지되며 regression 징후 없음

### 이번 follow-up에서 수정한 런타임 이슈
- 빌드는 통과했지만 simulator install 단계에서 `.app`의 `CFBundleIdentifier`가 빠져 설치가 실패하던 문제를 `ios/NativeApp/Config/NativeAppInfo.plist` 보강으로 해결함
- 실제 앱 실행 시 `public/data/kindergartens.json` 일부 레코드의 면적 필드 누락 때문에 전체 카탈로그 디코딩이 실패하던 문제를 `KindergartenRaw` 커스텀 디코딩으로 해결함
- 검색어 입력 중 suggestion panel, filter chip, result sheet, placeholder가 한 화면에서 과도하게 겹쳐 보이던 문제를 검색 중 overlay 상태 분리로 완화함

### Kakao 런타임 키 상태
- 이 환경에는 git-ignore된 `ios/WhereKindergartenNative/Config/KakaoKeys.local.xcconfig`가 존재하지 않음
- 따라서 이번 빌드의 `KAKAO_NATIVE_APP_KEY`, `KAKAO_REST_API_KEY`는 둘 다 빈 문자열로 해석됨
- empty-key degraded fallback은 유지됨
  - 지도는 placeholder/runtime message로 안전하게 내려감
  - Kakao REST 제안은 비활성화 메시지를 노출하고 로컬 유치원 제안은 계속 동작함

## 실제로 검증한 것

### 프로젝트 생성 / 빌드
- fresh worktree에서 `origin/codex/icon-brand-swiftui` 최신 커밋(`ec6ae63`) 기준으로 새 브랜치 생성
- `xcodegen generate` 재실행 후 git diff 없음
- `swift test` 통과
- `xcodebuild -project ios/WhereKindergartenNative/WhereKindergartenNative.xcodeproj -scheme WhereKindergartenNative -destination 'generic/platform=iOS Simulator' -derivedDataPath /tmp/where_kindergarden-native-followup-deriveddata CODE_SIGNING_ALLOWED=NO build` 통과
- 빌드 산출물에 `kindergartens.json`, `reviews.json` 포함 확인

### 실제 iOS Simulator 런타임
- `iPhone 17 Pro` simulator에 앱 설치 성공
- 앱 실행 성공
- no-key 상태에서 `Kakao Maps 설정 필요` placeholder와 `Info.plist의 KAKAO_NATIVE_APP_KEY가 비어 있어 지도를 표시하지 못했습니다.` 메시지 노출 확인
- 기본 위치(`서울 시청`) 기준으로 카탈로그가 로드되어 탐색 결과가 실제로 렌더링되는 것 확인
- `wherekindergarten://search?q=역삼` deep link로 검색 텍스트를 주입했을 때 로컬 유치원 제안 2건이 실제로 표시되는 것 확인
- same runtime state에서 `KAKAO_REST_API_KEY가 없어 주소와 장소 제안은 비활성화되었습니다...` degraded message 노출 확인
- 검색 중에는 suggestion panel에 집중되도록 result sheet / compare bar / filter chip 노출이 줄어든 것 확인

## 이번 환경에서 막힌 것
- 실제 Kakao 지도 인증 성공 여부
- 실제 Kakao REST 주소/장소 제안 로딩
- non-empty `KAKAO_NATIVE_APP_KEY`, `KAKAO_REST_API_KEY`가 `Info.plist`에 주입된 빌드 검증
- 실기기에서 위치 권한, universal link association, cold start deep link restore 검증

## 남은 리스크 / 다음 단계
1. `ios/WhereKindergartenNative/Config/KakaoKeys.example.xcconfig`를 복사해 로컬 전용 `KakaoKeys.local.xcconfig`를 만든 뒤 실제 Kakao 키로 simulator/runtime smoke test를 다시 수행
2. 실제 Kakao 키가 준비되면 지도 인증 성공, 원격 주소/장소 제안, suggestion selection 이후 map center 업데이트를 end-to-end로 확인
3. 실기기에서 위치 권한 허용/거부, custom scheme, universal link, cold start restore를 확인

## 검증 결과
- `xcodegen generate` 통과
- `env HOME=/tmp/where_kindergarden-native-followup-home CLANG_MODULE_CACHE_PATH=/tmp/where_kindergarden-native-followup-clang-modules swift test` 통과
- `xcodebuild -project ios/WhereKindergartenNative/WhereKindergartenNative.xcodeproj -scheme WhereKindergartenNative -destination 'generic/platform=iOS Simulator' -derivedDataPath /tmp/where_kindergarden-native-followup-deriveddata CODE_SIGNING_ALLOWED=NO build` 통과
- built app bundle에 `kindergartens.json`, `reviews.json` 포함 확인
- built `Info.plist`에서 `CFBundleIdentifier = com.solkim.wherekindergarten.native`, `CFBundleExecutable = WhereKindergartenNative` 확인
- built `Info.plist`에서 `KAKAO_NATIVE_APP_KEY`, `KAKAO_REST_API_KEY` 모두 빈 값으로 해석되는 것 확인
- simulator install / launch 성공

## 주요 파일
- `ios/NativeApp/Config/NativeAppInfo.plist`
- `ios/NativeApp/Sources/Models/KindergartenModels.swift`
- `ios/NativeApp/Sources/Features/Search/SearchFeature.swift`
- `ios/NativeApp/Sources/Features/Search/KakaoMapBridge.swift`
- `ios/NativeApp/Tests/NativeAppTests/NativeAppTests.swift`
- `ios/WhereKindergartenNative/project.yml`
- `ios/WhereKindergartenNative/Config/WhereKindergartenNative.xcconfig`

## 현재 브랜치
codex/native-ios-followup-runtime-validation-20260317

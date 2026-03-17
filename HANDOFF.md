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
- [x] `swift test` 통과
- [x] Xcode app target 빌드 통과 (`WhereKindergartenNative`)

## 현재 상황 요약

### 네이티브 앱 상태
- `ios/WhereKindergartenNative/WhereKindergartenNative.xcodeproj`가 실제 SwiftUI App lifecycle 기반 iPhone 타깃으로 생성되어 `ios/App`와 별도로 공존함
- 앱 타깃은 `ios/NativeApp` 패키지의 `Models / Services / Features / AppShell`을 로컬 Swift package dependency로 연결함
- `NativeRootView`가 실제 앱 상태 모델(`NativeAppModel`)을 소유하고 검색/비교/보관함/더보기 탭에 공유함
- 번들된 `kindergartens.json`, `reviews.json`이 앱 산출물 안에 포함되고, 리뷰는 원격 fetch 실패 시 로컬 JSON으로 자동 fallback 됨
- `FavoriteItem`, `RecentSearch`, `CompareSelection`이 typed storage wrapper(`NativeAppPersistence`)를 통해 복원됨
- `wherekindergarten://compare?ids=...` 와 `https://where-kindergarden.vercel.app/compare?ids=...` 모두 네이티브 비교 화면으로 라우팅됨

### Kakao 지도 상태
- `ios/NativeApp/Sources/Features/Search/KakaoMapBridge.swift`에 `KMViewContainer + KMController + UIViewRepresentable` 기반 브리지 추가
- 검색 결과 마커, 현재 위치 중심 이동, 마커 탭 상세 진입, compare 순번 기반 마커 스타일 구조를 넣음
- `KAKAO_NATIVE_APP_KEY`가 비어 있거나 인증이 실패해도 앱이 크래시하지 않고 placeholder/runtime message로 안전하게 내려감
- 현재 build 설정에서는 `KAKAO_NATIVE_APP_KEY`가 빈 문자열이며 실제 지도 렌더링을 위해선 앱 키 주입이 필요함

## 진행 중인 작업
- Kakao native app key를 실제 값으로 주입한 뒤 시뮬레이터/실기기에서 지도 인증 성공 여부 확인 필요
- universal link의 실제 도메인 association 파일과 App ID 조합이 프로덕션에서 정상 연결되는지 실기기 검증 필요

## 다음에 할 작업
1. `KAKAO_NATIVE_APP_KEY`를 build setting 또는 xcconfig로 주입하고 실제 지도 렌더링 확인
2. 검색 입력을 현재의 결과 필터 수준에서 주소/지오코딩 기반 네이티브 검색 플로우로 확장할지 결정
3. compare / favorite / recent search에 대한 UI polish와 삭제/정렬 UX 보강
4. 실기기에서 위치 권한, custom scheme, universal link, cold start restore 동작 점검
5. 필요 시 Kakao marker style과 상세 flow를 더 풍부하게 다듬기

## 주의사항 / 알려진 이슈
- Kakao SPM 의존성은 현재 공식 저장소 `master` 브랜치를 참조함. 추후 안정 버전 태그 고정 검토 필요
- 빌드 산출물에서 `KAKAO_NATIVE_APP_KEY`는 빈 값으로 남아 있으므로 현재 상태에선 placeholder fallback이 정상 동작하는지만 보장됨
- `swift test`는 샌드박스 기본 캐시 경로 이슈 때문에 `/tmp` 기반 `HOME` / `CLANG_MODULE_CACHE_PATH` override로 실행함
- `xcodebuild`는 샌드박스 밖에서 `-derivedDataPath /tmp/where_kindergarden-native-deriveddata CODE_SIGNING_ALLOWED=NO`로 검증함

## 검증 결과
- `swift test` 통과
- `xcodebuild -project ios/WhereKindergartenNative/WhereKindergartenNative.xcodeproj -scheme WhereKindergartenNative -destination 'generic/platform=iOS Simulator' -derivedDataPath /tmp/where_kindergarden-native-deriveddata CODE_SIGNING_ALLOWED=NO build` 통과
- 빌드 산출물에 `kindergartens.json`, `reviews.json` 번들 포함 확인
- 빌드된 `Info.plist`에 `wherekindergarten` URL scheme, ATS 예외, 빈 `KAKAO_NATIVE_APP_KEY`, iPhone-only `UIDeviceFamily = [1]` 반영 확인

## 주요 파일
- `ios/NativeApp/Package.swift`
- `ios/NativeApp/Config/NativeAppInfo.plist`
- `ios/NativeApp/Sources/Services/NativeAppConfiguration.swift`
- `ios/NativeApp/Sources/Services/NativeAppPersistence.swift`
- `ios/NativeApp/Sources/Services/LocationService.swift`
- `ios/NativeApp/Sources/Features/Shared/NativeAppModel.swift`
- `ios/NativeApp/Sources/Features/Search/KakaoMapBridge.swift`
- `ios/NativeApp/Sources/Features/Search/SearchFeature.swift`
- `ios/NativeApp/Sources/AppShell/NativeRootView.swift`
- `ios/WhereKindergartenNative/project.yml`
- `ios/WhereKindergartenNative/WhereKindergartenNative.xcodeproj/project.pbxproj`

## 현재 브랜치
codex/native-ios-phase

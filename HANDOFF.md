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
- [x] Kakao Local REST 기반 네이티브 주소/장소 검색 서비스 추가
- [x] `KAKAO_REST_API_KEY` 런타임 설정 경로 추가 (`Info.plist` / `project.yml`)
- [x] 네이티브 검색 입력을 디바운스 + 로컬 기관 매치 + 원격 주소/장소 제안 + 최근 검색 섹션으로 확장
- [x] 제안 선택 시 활성 검색 라벨, 지도 중심, 결과 계산, 최근 검색 영속 저장이 함께 갱신되도록 연결
- [x] Kakao Local 디코딩 / 요청 빌드 / 검색 선택 동작 / 설정 누락 fallback Swift 테스트 추가
- [x] `xcodegen generate` 기준으로 `project.yml`와 실제 `.xcodeproj` 재동기화
- [x] worktree 경로에 따라 `.pbxproj`가 흔들리던 `public/data` 리소스 그룹을 고정 그룹으로 안정화
- [x] Kakao 키를 generated `.pbxproj` 대신 로컬 `.xcconfig` 경로로 주입하도록 정리
- [x] 최근 검색 전체 삭제 / 목록 삭제 UX 추가 및 관련 Swift 테스트 보강

## 현재 상황 요약

### 네이티브 앱 상태
- `ios/WhereKindergartenNative/WhereKindergartenNative.xcodeproj`가 실제 SwiftUI App lifecycle 기반 iPhone 타깃으로 생성되어 `ios/App`와 별도로 공존함
- 앱 타깃은 `ios/NativeApp` 패키지의 `Models / Services / Features / AppShell`을 로컬 Swift package dependency로 연결함
- `NativeRootView`가 실제 앱 상태 모델(`NativeAppModel`)을 소유하고 검색/비교/보관함/더보기 탭에 공유함
- 번들된 `kindergartens.json`, `reviews.json`이 앱 산출물 안에 포함되고, 리뷰는 원격 fetch 실패 시 로컬 JSON으로 자동 fallback 됨
- `FavoriteItem`, `RecentSearch`, `CompareSelection`이 typed storage wrapper(`NativeAppPersistence`)를 통해 복원됨
- `wherekindergarten://compare?ids=...` 와 `https://where-kindergarden.vercel.app/compare?ids=...` 모두 네이티브 비교 화면으로 라우팅됨
- `ios/WhereKindergartenNative/project.yml`이 다시 authoritative 상태이며, `xcodegen generate` 후 생성된 `.xcodeproj`로 실제 앱 빌드까지 재검증됨

### Kakao 지도 상태
- `ios/NativeApp/Sources/Features/Search/KakaoMapBridge.swift`에 `KMViewContainer + KMController + UIViewRepresentable` 기반 브리지 추가
- 검색 결과 마커, 현재 위치 중심 이동, 마커 탭 상세 진입, compare 순번 기반 마커 스타일 구조를 넣음
- `KAKAO_NATIVE_APP_KEY`가 비어 있거나 인증이 실패해도 앱이 크래시하지 않고 placeholder/runtime message로 안전하게 내려감
- 현재 기본 build 설정에서는 `KAKAO_NATIVE_APP_KEY`, `KAKAO_REST_API_KEY` 모두 빈 문자열이며 실제 지도 렌더링과 원격 제안을 위해선 로컬 키 주입이 필요함

### 네이티브 검색 상태
- 검색 입력은 이제 `searchText`(transient)와 `locationLabel` / `userLocation`(committed)을 분리해 관리함
- `ios/NativeApp/Sources/Services/KakaoLocalSearchService.swift`가 Kakao Local `address search` / `keyword search`를 typed request/response로 래핑함
- `KAKAO_REST_API_KEY`가 있으면 주소/장소 제안을 디바운스된 원격 검색으로 보여주고, 없으면 유치원명 로컬 매치 + 최근 검색만으로 degraded UX를 제공함
- 검색 제안을 선택하면 활성 라벨, map center, 반경 기반 결과 목록, `RecentSearch` 영속 상태가 한 번에 갱신됨
- 최근 검색은 탐색 패널에서 `전체 삭제`, 보관함 화면에서 swipe delete / `전체 삭제`가 가능함
- 기존 compare / favorite / deep link / bundled/remote JSON 로딩 흐름은 유지됨

### 프로젝트 생성 / 키 주입 상태
- `ios/WhereKindergartenNative/project.yml`에 `minimumXcodeGenVersion: 2.44.1`와 `preGenCommand`를 추가해 생성 전 기존 `.xcodeproj`를 정리하도록 함
- `../../public/data/*.json` 리소스는 `Resources/Data` 그룹으로 고정해 worktree 디렉터리명이 `.pbxproj`에 새어들지 않도록 정리함
- `ios/WhereKindergartenNative/Config/WhereKindergartenNative.xcconfig`가 `KAKAO_NATIVE_APP_KEY`, `KAKAO_REST_API_KEY`를 담당하고, 실제 비밀값은 git-ignore된 `KakaoKeys.local.xcconfig`에서만 주입하도록 변경함
- 참고용 템플릿은 `ios/WhereKindergartenNative/Config/KakaoKeys.example.xcconfig`에 추가함

## 진행 중인 작업
- 실제 `KAKAO_REST_API_KEY` / `KAKAO_NATIVE_APP_KEY`를 주입한 상태에서 시뮬레이터 및 실기기 네트워크 검색과 지도 인증 성공 여부를 검증할 필요가 있음
- universal link의 실제 도메인 association 파일과 App ID 조합이 프로덕션에서 정상 연결되는지 실기기 검증 필요

## 다음에 할 작업
1. `ios/WhereKindergartenNative/Config/KakaoKeys.example.xcconfig`를 복사해 `KakaoKeys.local.xcconfig`를 만들고 실제 Kakao 키로 시뮬레이터/실기기 smoke test 수행
2. 실제 Kakao REST 제안 품질과 rate-limit 동작, 지도 인증 성공 여부를 함께 점검
3. 실기기에서 위치 권한, custom scheme, universal link, cold start restore 동작 점검
4. 필요 시 최근 검색 패널에서 개별 삭제까지 확장할지 검토
5. 필요 시 Kakao marker style과 상세 flow를 더 풍부하게 다듬기

## 주의사항 / 알려진 이슈
- Kakao SPM 의존성은 현재 공식 저장소 `master` 브랜치를 참조함. 추후 안정 버전 태그 고정 검토 필요
- 이 환경에는 실제 Kakao 키가 없어서 빌드 산출물의 `KAKAO_NATIVE_APP_KEY`, `KAKAO_REST_API_KEY` 모두 빈 값으로 남음. 현재 상태에선 degraded fallback과 placeholder 동작만 보장됨
- `swift test`는 샌드박스 기본 캐시 경로 이슈 때문에 `/tmp` 기반 `HOME` / `CLANG_MODULE_CACHE_PATH` override로 실행함
- `xcodebuild`는 `-derivedDataPath /tmp/where_kindergarden-native-project-sync-deriveddata CODE_SIGNING_ALLOWED=NO`로 검증함
- 이전 handoff에 적힌 `xcodegen generate`의 파일 존재 충돌(`Code=516`)은 이 fresh worktree에서는 재현되지 않았고, 현재는 `preGenCommand`로 기존 `.xcodeproj`를 정리한 뒤 재생성하도록 보강해 동일 계열 충돌 가능성을 낮춤

## 검증 결과
- `swift test` 통과
- `xcodegen generate` 통과
- `xcodebuild -project ios/WhereKindergartenNative/WhereKindergartenNative.xcodeproj -scheme WhereKindergartenNative -destination 'generic/platform=iOS Simulator' -derivedDataPath /tmp/where_kindergarden-native-project-sync-deriveddata CODE_SIGNING_ALLOWED=NO build` 통과
- 빌드 산출물에 `kindergartens.json`, `reviews.json` 번들 포함 확인
- 빌드된 `Info.plist`에 `wherekindergarten` URL scheme, ATS 예외, 빈 `KAKAO_NATIVE_APP_KEY`, 빈 `KAKAO_REST_API_KEY`, iPhone-only `UIDeviceFamily = [1]` 반영 확인
- generated `.pbxproj`에서 worktree 경로명 유래 그룹이 사라지고 `Config`, `Resources/Data` 고정 그룹과 `.xcconfig` 참조가 반영된 것 확인

## 주요 파일
- `ios/NativeApp/Package.swift`
- `ios/NativeApp/Config/NativeAppInfo.plist`
- `ios/NativeApp/Sources/Services/NativeAppConfiguration.swift`
- `ios/NativeApp/Sources/Services/KakaoLocalSearchService.swift`
- `ios/NativeApp/Sources/Services/NativeAppPersistence.swift`
- `ios/NativeApp/Sources/Services/LocationService.swift`
- `ios/NativeApp/Sources/Models/SearchModels.swift`
- `ios/NativeApp/Sources/Features/Shared/NativeAppModel.swift`
- `ios/NativeApp/Sources/Features/Search/KakaoMapBridge.swift`
- `ios/NativeApp/Sources/Features/Search/SearchFeature.swift`
- `ios/NativeApp/Sources/Features/Saved/SavedView.swift`
- `ios/NativeApp/Sources/AppShell/NativeRootView.swift`
- `ios/WhereKindergartenNative/project.yml`
- `ios/WhereKindergartenNative/Config/WhereKindergartenNative.xcconfig`
- `ios/WhereKindergartenNative/Config/KakaoKeys.example.xcconfig`
- `ios/NativeApp/Tests/NativeAppTests/NativeSearchTests.swift`

## 현재 브랜치
codex/native-project-sync-followup

# Native iOS Migration Status

기준일: 2026-03-18

이 문서는 `ios/NativeApp` Swift package와 `ios/WhereKindergartenNative` 호스트 앱 기준으로, 네이티브 SwiftUI 마이그레이션의 현재 진행 상태와 남은 작업을 정리한 상태 문서다.

## 한줄 요약

- 네이티브 앱의 기본 구조, 실데이터 로딩, 비교/보관함/상세/검색 딥링크, key-less Kakao fallback 경로는 이미 usable 상태다.
- 현재 가장 큰 미완료 영역은 `실제 Kakao 키를 사용한 지도/원격 장소 검색 end-to-end 검증`과 `실기기 기준 권한/유니버설 링크 검증`이다.
- 현재 phase 기준 진행률은 대략 `75~85%`로 보는 것이 적절하다.
  - 키 없이 진행 가능한 네이티브 앱 구현은 `85~90%` 수준
  - Kakao 실지도/실기기 handoff까지 포함한 전체 목표는 `75~80%` 수준

## 2026-03-18 실측 검증 결과

- `ios/WhereKindergartenNative/Config/KakaoKeys.local.xcconfig`는 현재 없다.
- 따라서 `WK_KAKAO_NATIVE_APP_KEY`, `WK_KAKAO_REST_API_KEY` 실주입 여부를 확인할 수 없고, 앱은 Kakao fallback 경로로만 검증 가능하다.
- Xcode는 실기기 iPhone 16 Pro (`00008140-00016DCC3062201C`)를 인식한다.
- 다만 실기기 빌드는 현재 사용 중인 provisioning profile에 `Associated Domains` capability가 없어 실패한다.
- 또한 `https://where-kindergarden.vercel.app/.well-known/apple-app-site-association`는 2026-03-18 기준 `404`를 반환하고 있어, 현재 배포 도메인 상태로는 어떤 기기에서도 universal link association이 성립할 수 없다.

## 범위

- 네이티브 source of truth: `ios/NativeApp`
- 실제 호스트 앱 타깃: `ios/WhereKindergartenNative`
- 실데이터 소스:
  - `public/data/kindergartens.json`
  - `public/data/reviews.json`
  - remote-first reviews: `https://where-kindergarden.vercel.app/data/reviews.json`

## 우선순위별 현재 상태

| 우선순위 | 영역 | 상태 | 대략 진행률 | 비고 |
| --- | --- | --- | --- | --- |
| 1 | Xcode 호스트 앱 타깃 실사용화 | 완료 | 100% | 별도 타깃 생성이 아니라 기존 `ios/WhereKindergartenNative`를 실제로 빌드/실행 중 |
| 2 | Kakao 지도/현재 위치/주소·장소 검색 | 대부분 완료, 키 blocker 존재 | 60~75% | key-less fallback은 동작, 실제 Kakao 지도 인증과 원격 suggestion은 미검증 |
| 3 | 실데이터 로딩 연결 | 완료 | 90~100% | 번들 catalog + remote-first/local-fallback reviews 연결 완료 |
| 4 | 상세/보관함 state-driven 전환 | 대부분 완료 | 85~90% | favorites/recent searches/detail 공유 상태 연결 완료 |
| 5 | deep link / native handoff | 대부분 완료 | 80~90% | compare/search deep link는 네이티브 shell에서 동작, 실기기 universal link 검증은 남음 |

## 이미 구현된 내용

### 1. 앱 구조와 타깃

- `ios/WhereKindergartenNative`가 실제 실행 가능한 iOS 앱 타깃이다.
- `ios/NativeApp`는 `Models / Services / Features / AppShell` 레이어로 나뉜 Swift package다.
- 호스트 앱은 Swift package를 링크해서 탭 쉘과 주요 화면을 그대로 사용한다.
- `xcodebuild` 기준 Simulator 빌드가 반복 가능하다.

### 2. 실데이터 로딩

- `kindergartens.json`을 앱 번들에서 직접 읽어 catalog를 구성한다.
- reviews는 원격 JSON을 우선 읽고, 실패하면 번들 JSON으로 fallback 한다.
- 실데이터에서 누락된 일부 면적 필드는 0 fallback 디코딩이 들어가 있어 catalog 로딩이 깨지지 않는다.

### 3. 검색 / 지도 / 현재 위치

- 로컬 기관명 suggestion
- 최근 검색 suggestion
- Kakao Local 기반 원격 주소/장소 suggestion 서비스
- Kakao map `UIViewRepresentable` 브리지
- 현재 위치 요청 서비스
- 검색 중심 위치와 실제 기기 현재 위치를 분리한 모델 상태

현재 key-less 환경에서 확인된 동작:

- Kakao 키가 없으면 지도는 placeholder/fallback UI로 안전하게 내려간다.
- Kakao REST 제안은 비활성화 메시지를 띄우고, 로컬 기관 suggestion과 최근 검색은 유지된다.
- 검색 결과와 상세/비교 흐름은 key 없이도 동작한다.

### 4. 상세 / 보관함 / 비교

- favorites, recent searches, compare selection은 `UserDefaults`에 영속 저장된다.
- 보관함에서 찜한 기관을 누르면 실제 검색 탭/상세 시트로 이동한다.
- 최근 검색 복원은 실제 위치/검색 상태를 공유 모델에 반영한다.
- 상세 시트는 실제 review 데이터 수를 읽고, review URL / 홈페이지 / 전화 링크를 직접 연다.
- 비교 탭은 실제 선택 상태와 review count를 반영한다.

### 5. 딥링크

- custom scheme: `wherekindergarten://compare?ids=...`
- custom scheme: `wherekindergarten://search?q=...`
- universal link parser도 compare/search를 이해한다.
- compare deep link는 실제 bundle data ID 기준으로 네이티브 비교 화면에 진입한다.
- search deep link는 단순히 field만 채우는 수준이 아니라, 로컬 기관명과 매칭되면 해당 기관 상세까지 바로 여는 방향으로 보강되었다.
- cold launch 시 catalog 로딩 전에 deep link가 들어와도, 로딩 후 재적용하는 처리까지 들어가 있다.

### 6. 더보기 화면

- placeholder 메뉴가 아니라 실제 서비스 링크/지원 정보로 교체되었다.
- 현재 더보기 화면에는 다음이 연결되어 있다.
  - 서비스 소개
  - 개인정보처리방침
  - FAQ
  - 피드백 메일
  - 공식 데이터 출처
  - App Store 링크
  - 앱 버전 표시

### 7. 테스트 / 빌드 검증

현재 반복 검증 가능한 항목:

- `swift test` in `ios/NativeApp`
- `xcodebuild -project ios/WhereKindergartenNative/WhereKindergartenNative.xcodeproj -scheme WhereKindergartenNative -destination 'generic/platform=iOS Simulator' build`
- Simulator 설치/실행
- compare deep link runtime 확인
- search deep link runtime 확인
- favorites persistence 확인

## 아직 남은 핵심 작업

### A. 실제 Kakao 키 기반 end-to-end 검증

상태: blocker 존재

남은 작업:

1. `ios/WhereKindergartenNative/Config/KakaoKeys.local.xcconfig` 생성
2. `WK_KAKAO_NATIVE_APP_KEY`, `WK_KAKAO_REST_API_KEY` 주입
3. 실제 Kakao 지도 인증 성공 확인
4. 실제 원격 주소/장소 suggestion 로딩 확인
5. suggestion 선택 후 지도 camera / marker / 결과 리스트 갱신 확인
6. 현재 위치 버튼과 실제 현재 위치 마커가 실지도에서 올바르게 동작하는지 확인

대략 effort: `중간`

이 영역이 현재 남은 작업 중 가장 중요하다.

### B. 실기기 기준 권한 / universal link / cold start handoff 검증

상태: 일부 blocker 식별 완료, 실측 미완료

남은 작업:

1. 실기기에서 위치 권한 허용/거부 플로우 확인
2. custom scheme가 실기기에서 기대대로 열리는지 확인
3. universal link association이 실제 도메인/실기기에서 붙는지 확인
4. cold start 상황에서 compare/search deep link 복원이 안정적인지 확인

대략 effort: `중간`

현재 Simulator 기준으로는 많은 부분이 확인됐지만, handoff-ready를 말하려면 이 검증이 필요하다.
추가로 2026-03-18 실측 기준 아래 blocker가 먼저 해소되어야 한다.

1. 실기기 signing profile에 `Associated Domains` capability 포함
2. 배포 도메인에서 `/.well-known/apple-app-site-association`를 `200`으로 제공

### C. Kakao 없는 경로의 마감 다듬기

상태: 대부분 완료

남은 작업 후보:

1. 더보기 탭의 실제 탭 전환 UI를 수동으로 다시 한 번 확인
2. 보관함에서 즐겨찾기/최근 검색 삭제 UX를 조금 더 다듬을지 판단
3. 상세 시트 정보 밀도를 더 늘릴지 판단
4. 필요하면 간단한 UI smoke test 추가

대략 effort: `작음`

이 영역은 blocker가 없고, 현재도 usable 상태다.

### D. 문서 / handoff / release 루틴 정리

상태: 일부 완료

남은 작업:

1. Kakao 키 주입 로컬 setup 절차를 더 명확히 문서화
2. 네이티브 smoke test 체크리스트 문서화
3. 배포 전 확인 항목 정리

대략 effort: `작음`

## 남은 작업량을 현실적으로 보면

### “키가 지금도 없다” 기준

남은 핵심은 mostly verification / hardening 단계다.

- 구현 작업량: `작음~중간`
- 검증/운영 준비 작업량: `중간`

즉, 키 없이도 할 수 있는 순수 구현은 많이 남지 않았다.

### “Kakao 키를 바로 받을 수 있다” 기준

남은 핵심은 실지도/원격 suggestion을 붙여 실제 런타임에서 깨지는 지점을 잡는 것이다.

- 구현 작업량: `중간`
- 실제 디버깅/검증 작업량: `중간~큼`

이 phase의 마감 난이도는 “새 기능 개발”보다 “실환경 검증” 비중이 더 크다.

## 추천 다음 작업 순서

### 추천 배치 1

목표: Kakao 실환경 검증

1. `KakaoKeys.local.xcconfig` 생성
2. Simulator에서 실지도 인증
3. 실제 주소/장소 suggestion 로딩 확인
4. 현재 위치 / suggestion selection / camera update 검증
5. 깨지는 runtime 케이스 수정

완료되면 네이티브 마이그레이션의 가장 큰 blocker가 제거된다.

### 추천 배치 2

목표: 실기기 handoff 검증

1. 위치 권한 허용/거부
2. custom scheme
3. universal link
4. cold start deep link restore

완료되면 “개발자 로컬에서 빌드됨” 수준에서 “실사용 handoff-ready” 수준으로 올라간다.

### 추천 배치 3

목표: 선택적 마감

1. UI smoke test 추가 여부 결정
2. 더보기/보관함/상세 잔여 polish
3. handoff/checklist 문서 마감

## 현재 가장 큰 blocker

- `ios/WhereKindergartenNative/Config/KakaoKeys.local.xcconfig` 부재

이 파일이 없어서 현재는 아래가 모두 blocker 상태다.

- 실제 Kakao 지도 인증 성공 검증
- 실제 Kakao REST 주소/장소 suggestion 검증
- Kakao 기반 end-to-end map/search smoke test

실기기 handoff 쪽에서는 아래 두 항목도 blocker로 확인되었다.

- 실기기 signing profile에 `com.apple.developer.associated-domains` entitlement가 없다.
- 배포 도메인의 `apple-app-site-association` 응답이 `404`다.

## 결론

현재 네이티브 Swift 앱은 “구조만 있는 초기 스캐폴드” 단계는 이미 지났다.
지금 상태는 다음처럼 보는 것이 맞다.

- 기본 기능 구현: 상당수 완료
- key-less degraded app: usable
- 실데이터 기반 검색/상세/비교/보관함: 대부분 완료
- 남은 큰 일: Kakao 실환경 검증 + 실기기 handoff 검증

즉, 남은 작업의 절대량이 많은 프로젝트라기보다, `남은 작업이 blocker 중심으로 좁혀진 프로젝트`에 가깝다.

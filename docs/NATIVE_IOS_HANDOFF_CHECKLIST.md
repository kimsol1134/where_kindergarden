# Native iOS Handoff Checklist

기준일: 2026-03-19

이 체크리스트는 `ios/NativeApp` Swift package와 `ios/WhereKindergartenNative` 호스트 앱 기준으로, 로컬 개발자 handoff 전에 반복해야 하는 최소 검증 루틴을 정리한다.

## 1. Kakao local setup

1. `ios/WhereKindergartenNative/Config/KakaoKeys.example.xcconfig`를 복사해 `ios/WhereKindergartenNative/Config/KakaoKeys.local.xcconfig`를 만든다.
   - 여러 worktree에서 공통으로 재사용하려면 `~/.config/where-kindergarten/KakaoKeys.local.xcconfig`에 둬도 된다.
2. 아래 두 값을 로컬에만 채운다.
   - `WK_KAKAO_NATIVE_APP_KEY`
   - `WK_KAKAO_REST_API_KEY`
3. `ios/WhereKindergartenNative/Config/WhereKindergartenNative.xcconfig`에 아래 include가 유지되는지 확인한다.
   - `#include? "KakaoKeys.local.xcconfig"`
4. 호스트 앱을 다시 빌드한다.
   - 빌드 시 host target post-build script가 `ios/WhereKindergartenNative/Config/KakaoKeys.local.xcconfig`를 우선 사용하고, 없으면 `~/.config/where-kindergarten/KakaoKeys.local.xcconfig`를 fallback으로 사용한다.

참고:
- 키가 없거나 값이 해석되지 않으면 앱은 의도적으로 fallback 모드로 내려간다.
- fallback 모드에서는 로컬 유치원명 suggestion과 최근 검색은 동작하지만, Kakao Local 원격 주소/장소 suggestion은 비활성화된다.

## 2. Native smoke test

### Build and launch

1. `cd ios/NativeApp && swift test`
2. `xcodebuild -project ios/WhereKindergartenNative/WhereKindergartenNative.xcodeproj -scheme WhereKindergartenNative -destination 'generic/platform=iOS Simulator' build`
3. Simulator에 설치 후 앱 실행

### Search tab

1. 첫 화면이 네이티브 탭 셸로 뜨는지 확인
2. `wherekindergarten://search?q=옥인유치원` 또는 실기관명 검색으로 상세 시트까지 열리는지 확인
3. 검색 결과 시트가 반경/정렬 요약, 빈 상태, 로딩 상태를 적절히 보여주는지 확인
4. Kakao Maps SDK 인증이 실패하면 blank map 대신 명시적 실패 placeholder가 보이는지 확인
5. 상세 시트에서 아래가 동작하는지 확인
   - 찜하기 / 비교 추가
   - 지도에서 보기
   - 홈페이지 열기
   - 전화하기
6. 실데이터 후기 링크가 있으면 최대 3건까지 노출되는지 확인

### Compare tab

1. 실기관 2곳 이상을 비교 목록에 담는다
2. 비교 탭이 실제 선택 순서를 유지하는지 확인
3. 공유 버튼이 compare deep link를 생성하는지 확인

실기관 예시:
- `1ecec08c-f026-b044-e053-0a32095ab044` `옥인유치원`
- `1ecec08c-f490-b044-e053-0a32095ab044` `한아름유치원`

### Saved tab

1. 찜한 기관에서 상세 열기 동작 확인
2. 찜한 기관 삭제 후 하단 복원 배너로 즉시 되돌릴 수 있는지 확인
3. 최근 검색 복원 시 검색 기준 위치만 바뀌고 앱이 탐색 탭으로 돌아가는지 확인
4. 최근 검색 개별 삭제 / 전체 삭제 / 복원 배너 동작 확인

### More tab

1. 현재 검색 기준 위치, 실제 기기 위치 상태, 찜/최근/비교 개수가 보이는지 확인
2. Kakao 키 상태와 링크 구성이 표시되는지 확인
   - debug 빌드에서는 `Kakao 키 소스`가 `현재 worktree 로컬 설정`, `공용 로컬 설정`, `빌드 설정`, `미설정` 중 하나로 보인다.
3. 외부 링크가 기대한 목적지로 열리는지 확인

## 3. Release / handoff verification

1. `docs/NATIVE_IOS_MIGRATION_STATUS.md`가 현재 코드와 실제 측정 상태를 반영하는지 확인
2. `ios/NativeApp/README.md`의 Kakao setup과 검증 절차가 현재 호스트 앱 구조와 일치하는지 확인
3. deep link 검증 시 preview fixture ID가 아니라 실번들 catalog ID를 사용했는지 확인
4. favorites, recent searches, compare selection이 앱 재실행 이후에도 유지되는지 확인
5. search deep link와 compare deep link가 cold launch 이후에도 다시 적용되는지 확인
6. 변경한 사용자-visible 플로우는 Simulator에서 최소 1회 수동 확인

## 4. Known blockers and pending items

### Measured blockers

- `https://where-kindergarden.vercel.app/.well-known/apple-app-site-association`는 2026-03-19에 다시 `404`를 반환했다.
- 연결된 iPhone 대상 `xcodebuild`는 2026-03-19에 provisioning profile이 `Associated Domains` capability와 `com.apple.developer.associated-domains` entitlement를 포함하지 않아 실패했다.

### Verified but still pending

- `KakaoKeys.local.xcconfig`의 로컬 존재와 키 빌드 주입 경로는 확인됨
- Kakao Local live HTTP 응답 성공은 확인됨
- 원격 suggestion 선택 기반의 네이티브 search state 갱신은 확인됨
- Kakao Maps SDK는 Simulator 런타임에서 `401 Unauthorized`를 반환하며, 앱은 이를 실패 placeholder로 노출함

### Still requires real-device or external follow-up

- 실기기 위치 권한 허용/거부 플로우
- 실기기 custom scheme
- 실기기 universal link association
- 실기기 cold-start handoff
- Kakao map tile의 실기기 렌더링 재확인

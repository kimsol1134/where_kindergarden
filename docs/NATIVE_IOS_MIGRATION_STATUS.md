# Native iOS Migration Status

기준일: 2026-03-18

이 문서는 `ios/NativeApp` Swift package와 `ios/WhereKindergartenNative` 호스트 앱 기준으로, 현재 네이티브 SwiftUI 마이그레이션 상태와 handoff 직전 기준의 검증 결과를 정리한다.

## 한줄 요약

- 네이티브 SwiftUI 경로는 현재 iOS source of truth이며, 기존 호스트 앱 타깃 `ios/WhereKindergartenNative`를 계속 사용한다.
- 로컬 빌드, 패키지 테스트, Simulator 실행, 검색/비교 deep link, favorites/recent persistence는 현재 재현 가능하다.
- Kakao Local 키 주입 경로와 원격 suggestion state update는 확인됐지만, Kakao 지도 tile의 Simulator 렌더링은 아직 handoff-ready로 결론 내리지 못했다.
- 실기기 universal link handoff는 여전히 외부 blocker가 남아 있다.

## 현재 기준 실제 상태

### 코드와 앱 구조

- Native source of truth: `ios/NativeApp`
- Host app target: `ios/WhereKindergartenNative`
- 공유 모델 아키텍처는 `NativeAppModel` 중심으로 유지 중
- 검색 중심 위치와 실제 기기 위치 분리는 유지되고 있으며, 최근 검색 복원으로 이 분리가 깨지지 않는다

### 2026-03-18 로컬 검증 결과

- `cd ios/NativeApp && swift test` 통과
- `xcodebuild -project ios/WhereKindergartenNative/WhereKindergartenNative.xcodeproj -scheme WhereKindergartenNative -destination 'generic/platform=iOS Simulator' build` 통과
- 호스트 앱 Simulator 설치 및 실행 확인
- `ios/WhereKindergartenNative/Config/KakaoKeys.local.xcconfig` 로컬 존재 확인
- `ios/WhereKindergartenNative/Config/WhereKindergartenNative.xcconfig`가 `KakaoKeys.local.xcconfig`를 optional include 하는 현재 구조 유지 확인
- `https://where-kindergarden.vercel.app/.well-known/apple-app-site-association`는 2026-03-18에 `404` 반환 확인

## 이미 검증된 사용자-visible 동작

### Search / detail / deep link

- 실번들 catalog 데이터로 검색 결과 로딩
- search deep link가 네이티브 검색 탭에서 실기관 상세까지 열 수 있음
- compare deep link가 실기관 ID로 네이티브 비교 탭을 열 수 있음
- cold launch 직후 catalog가 늦게 로드되어도 pending deep link 재적용 처리 유지
- detail sheet가 후기 링크, 홈페이지, 전화, 비교/찜 상태를 반영함

실기관 런타임 검증에 사용한 ID 예시:
- `1ecec08c-f026-b044-e053-0a32095ab044` `옥인유치원`
- `1ecec08c-f490-b044-e053-0a32095ab044` `한아름유치원`

### Saved / compare / persistence

- favorites, recent searches, compare selection이 `NativeAppModel`을 통해 영속 저장됨
- 보관함에서 상세 열기와 최근 검색 복원이 네이티브 search 상태를 공유 모델로 다시 연결함
- compare 탭이 실제 선택 순서를 유지하고 share link를 생성함

### Kakao configuration and remote suggestion path

- Kakao 키 로컬 주입 경로는 현재 빌드 구조에 연결되어 있음
- Kakao Local live HTTP 응답 성공은 이전 검증 baseline과 현재 문서 기준으로 유지
- 원격 suggestion 선택 시 native search state 갱신 관찰 baseline 유지
- 다만 Kakao map tile 자체의 Simulator 렌더링은 아직 불안정하며, SDK 또는 Simulator 동작 특성 영향 가능성이 큼

## Batch 3에서 이번에 마감한 항목

### Saved tab polish

- 찜한 기관과 최근 검색에 swipe action 추가
- 삭제 직후 하단 복원 배너 추가
- 최근 검색 전체 삭제에 confirmation dialog 추가
- 최근 검색 복원이 검색 기준 위치만 다시 적용한다는 점을 UI에 명시

### Detail sheet polish

- 기존 핵심 metric 외에 운영 정보와 시설 데이터 밀도 강화
- 지도에서 보기 Apple Maps 링크 추가
- 홈페이지 링크는 raw URL 대신 더 읽기 쉬운 host 중심 subtitle로 정리
- 후기 섹션은 노출 수 제한을 명시해 기대치를 분명히 함

### Search polish

- 결과 시트에 반경/정렬/상위 10개 노출 여부 요약 추가
- 로딩 중 빈 결과 상태를 일반 empty state와 분리
- degraded notice를 결과 시트에서도 확인할 수 있게 보강

### More tab polish

- 현재 검색 기준 위치
- 실제 기기 위치 상태
- 찜 / 최근 검색 / 비교 개수
- 후기 데이터 버전

위 상태를 한 화면에서 확인할 수 있게 보강

### Smoke coverage

- 삭제 후 복원되는 favorites / recent searches 순서 보존 로직 테스트 추가

## 아직 남은 핵심 항목

### 1. Kakao map 실환경 검증 마감

현재 상태:
- 키 주입 경로와 원격 suggestion 경로는 확인됨
- map tile Simulator 렌더링은 아직 확정적으로 통과 처리하지 않음

남은 확인:
- 실기기에서 Kakao map tile 렌더링
- 실기기에서 현재 위치 버튼과 marker 반영
- 필요 시 Simulator 특이점과 실기기 동작 차이 문서화

### 2. 실기기 universal link / handoff

현재 blocker:
- device provisioning profile에 `Associated Domains` capability 없음
- AASA endpoint가 `404`

남은 확인:
- 실기기 위치 권한 허용/거부 플로우
- 실기기 custom scheme
- 실기기 universal link association
- 실기기 cold-start handoff

## 다음 handoff 전에 확인할 문서

- `ios/NativeApp/README.md`
- `docs/NATIVE_IOS_HANDOFF_CHECKLIST.md`

이 두 문서는 현재 로컬 빌드 구조와 smoke / release 루틴을 기준으로 갱신되어 있다.

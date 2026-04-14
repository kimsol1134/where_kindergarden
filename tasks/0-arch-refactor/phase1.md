# Phase 1: foundation

## 사전 준비

아래 문서를 반드시 읽고 전체 아키텍처 설계를 이해하라:

- `docs/IOS_ARCHITECTURE.md` — 섹션 3(목표 구조), 섹션 4(SPM Package.swift), 섹션 5.1(Models), 섹션 5.2.1(Domain 프로토콜)

그리고 현재 코드를 반드시 읽어라:

- `ios/NativeApp/Package.swift` — 현재 SPM 구조
- `ios/NativeApp/Sources/Models/KindergartenModels.swift` — 기존 모델 (NativeTab, CompareToast 등이 어디 정의되어 있는지 확인)
- `ios/NativeApp/Sources/Features/Shared/NativeAppModel.swift` — NativeTab, CompareToast, SearchHomePresentationState 정의 위치 확인 (처음 ~35줄)
- `ios/NativeApp/Sources/Features/Search/SearchFitPresentation.swift` — SearchLens enum 정의 위치 확인

## 작업 내용

### 1. Package.swift에 Domain 타겟 추가

`ios/NativeApp/Package.swift`를 수정하여 다음 구조로 만들어라:

```
products:
  - Models, Domain, Services, Features, AppShell

targets:
  - Models (의존성 없음)
  - Domain (Models에만 의존)
  - Services (Models, Domain에 의존 + 외부 SDK)
  - Features (Models, Domain, Services에 의존 + 외부 SDK)
  - AppShell (Models, Domain, Services, Features에 의존)
  - DomainTests (Models, Domain에 의존)
  - NativeAppTests (기존 유지)
```

`docs/IOS_ARCHITECTURE.md` 섹션 4의 Package.swift 코드를 정확히 참고하라.

### 2. Models에 타입 이동

**`ios/NativeApp/Sources/Models/AppModels.swift` (신규 파일)**

`NativeAppModel.swift` 파일 상단에 정의된 다음 타입들을 Models 타겟으로 이동:

- `NativeTab` enum (line ~6-11)
- `CompareToast` struct (line ~13-26)
- `SearchHomePresentationState` enum (line ~28-32)

주의: 이 타입들은 여러 레이어(Features, AppShell)에서 사용되므로 Models에 있어야 한다. `import SwiftUI`가 필요하면 추가하되, Models에서 SwiftUI를 import하는 것은 이 타입들이 Color 등을 사용하지 않으므로 불필요할 것이다. 확인 후 최소 import만 사용하라.

원본 파일(`NativeAppModel.swift`)에서는 해당 타입 정의를 삭제하고 `import Models`를 추가하라 (이미 있다면 생략). 원본 파일에 남아있는 코드가 새 위치의 타입을 참조할 수 있도록 접근제어(public)를 확인하라.

**`ios/NativeApp/Sources/Models/SearchLens.swift` (신규 파일)**

`SearchFitPresentation.swift`에서 `SearchLens` enum만 추출하여 이동. enum 본체와 `activeLens(in:)`, `toggledFilters(from:lens:)` static 메서드를 포함한다. `SearchFilters` 타입은 이미 Models에 있으므로 의존성 문제 없다.

원본 `SearchFitPresentation.swift`에서 SearchLens enum 정의를 삭제하고 `import Models`로 참조하라.

### 3. Domain 프로토콜 파일 생성

`ios/NativeApp/Sources/Domain/Protocols/` 디렉토리에 다음 6개 파일을 생성하라. 각 프로토콜의 시그니처는 `docs/IOS_ARCHITECTURE.md` 섹션 5.2.1을 정확히 따르되, 컴파일이 되도록 필요한 import를 추가하라.

1. `KindergartenProviding.swift` — `protocol KindergartenProviding`
2. `ReviewProviding.swift` — `protocol ReviewProviding`
3. `VacancyProviding.swift` — `protocol VacancyProviding`
4. `CompareStoring.swift` — `protocol CompareStoring` + `CompareToggleResult` enum
5. `FavoriteStoring.swift` — `protocol FavoriteStoring`
6. `RecentSearchStoring.swift` — `protocol RecentSearchStoring`

각 프로토콜은 `public`이어야 하며, `AnyObject`를 상속하고, 필요한 Models 타입을 import해야 한다.

**핵심 규칙**: Domain 타겟은 `import Models`와 `import Foundation`만 허용된다. SwiftUI, Services 등 다른 모듈을 import하면 안 된다.

## Acceptance Criteria

```bash
cd ios/WhereKindergartenNative && xcodebuild build \
  -scheme WhereKindergartenNative \
  -destination 'generic/platform=iOS Simulator' \
  -quiet 2>&1 | tail -5
```

빌드가 성공해야 한다 (`** BUILD SUCCEEDED **`).

## AC 검증 방법

위 xcodebuild 커맨드를 실행하라. `BUILD SUCCEEDED`가 출력되면 `/tasks/0-arch-refactor/index.json`의 phase 1 status를 `"completed"`로 변경하라.
수정 3회 이상 시도해도 빌드 실패하면 status를 `"error"`로 변경하고 에러 메시지를 `"error_message"` 필드로 기록하라.

## 주의사항

- `NativeAppModel.swift`에서 타입을 이동할 때, 해당 타입을 사용하는 다른 파일들이 컴파일 에러 없이 동작하는지 확인하라. Models 타겟의 타입은 `public`이므로 `import Models`만 있으면 접근 가능하다.
- Domain 프로토콜의 메서드 시그니처에서 사용하는 모든 타입(Kindergarten, ReviewLink, FavoriteItem 등)이 Models 타겟에 이미 정의되어 있는지 확인하라.
- `KindergartenProviding` 프로토콜의 `kindergartens` 프로퍼티 타입은 `[KindergartenRaw]`이다 (`[Kindergarten]`이 아님). KindergartenRaw는 JSON 디코딩 모델이고 Kindergarten은 거리 계산 후 생성되는 뷰 모델이다.
- 기존 `NativeAppTests`가 깨지지 않도록 하라.

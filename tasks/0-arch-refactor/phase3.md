# Phase 3: repositories

## 사전 준비

아래 문서를 반드시 읽어라:

- `docs/IOS_ARCHITECTURE.md` — 섹션 5.3(Services / Data Layer), 특히 @Observable Repository 예시 코드

이전 phase의 작업물을 반드시 확인하라:

- `ios/NativeApp/Sources/Domain/Protocols/` — 6개 Repository 프로토콜
- `ios/NativeApp/Sources/Services/SearchServices.swift` — KindergartenJSONRepository, ReviewRepository가 남아있는지 확인
- `ios/NativeApp/Sources/Services/VacancyService.swift` — VacancyRepository 현재 구조 확인
- `ios/NativeApp/Sources/Services/NativeAppPersistence.swift` — 영속성 레이어 확인
- `ios/NativeApp/Sources/Features/Shared/NativeAppModel.swift` — favorites, compareSelection, recentSearches 관련 로직 확인 (line ~59-67, ~619-643, ~700-721, ~869-949)

## 작업 내용

### 1. 기존 Repository를 @Observable class로 전환

현재 struct로 정의된 Repository들을 `@Observable` class로 전환하고, Domain 프로토콜을 conform한다. 각 Repository는 데이터의 단일 진실 소스(Single Source of Truth) 역할을 한다.

**`ios/NativeApp/Sources/Services/Repositories/KindergartenRepository.swift` (신규)**

`SearchServices.swift`에서 `KindergartenJSONRepository` struct를 이 파일로 이동하고, `@Observable` class로 전환한다.

```swift
import Foundation
import Observation
import Models
import Domain

@Observable
@MainActor
public final class KindergartenRepository: KindergartenProviding {
    public private(set) var kindergartens: [KindergartenRaw] = []
    public private(set) var isLoading = false
    public private(set) var error: String?
    public private(set) var lookup: [String: KindergartenRaw] = [:]

    private let loader: @Sendable () throws -> Data

    public init(loader: @escaping @Sendable () throws -> Data) { ... }
    public func load() async { ... }
}
```

기존 `KindergartenJSONRepository`의 로딩 로직을 유지하되, 상태(`isLoading`, `error`)를 프로퍼티로 관리하라. `lookup` 딕셔너리(`[String: KindergartenRaw]`)도 추가하라 — 현재 `NativeAppModel`의 `kindergartenLookup`에 해당한다.

**`ios/NativeApp/Sources/Services/Repositories/ReviewRepository.swift` (신규)**

`SearchServices.swift`에서 `ReviewRepository` struct를 이 파일로 이동하고 `@Observable` class로 전환.

```swift
@Observable
@MainActor
public final class ReviewRepository: ReviewProviding {
    public private(set) var reviewsData: ReviewsData?
    public private(set) var isLoading = false
    public private(set) var error: String?
    ...
    public func reviews(for kindercode: String) -> [ReviewLink]
    public func load() async
}
```

**`ios/NativeApp/Sources/Services/Repositories/VacancyRepository.swift` (신규)**

`VacancyService.swift`에서 `VacancyRepository` struct를 이동. `@Observable` class로 전환.

```swift
@Observable
@MainActor
public final class VacancyRepository: VacancyProviding {
    public private(set) var vacancyData: VacancyDataset?
    public private(set) var isLoading = false
    public private(set) var error: String?
    ...
    public func vacancy(for kindercode: String) -> VacancySummary?
    public func vacancyCount(for kindercode: String) -> Int
    public func load() async
}
```

### 2. 신규 Repository 생성

현재 `NativeAppModel`이 직접 관리하는 사용자 상태를 별도 Repository로 분리한다.

**`ios/NativeApp/Sources/Services/Repositories/CompareRepository.swift` (신규)**

`docs/IOS_ARCHITECTURE.md` 섹션 5.3.1의 CompareRepository 코드를 참고하라. 현재 `NativeAppModel`의 compareSelection 관련 로직 (toggle, remove, replace, contains, order)을 이관한다.

```swift
@Observable
@MainActor
public final class CompareRepository: CompareStoring {
    public private(set) var selection: CompareSelection
    private let persistence: NativeAppPersistence
    ...
}
```

**`ios/NativeApp/Sources/Services/Repositories/FavoriteRepository.swift` (신규)**

`NativeAppModel`의 favorites 관련 로직을 이관. `docs/IOS_ARCHITECTURE.md`의 FavoriteRepository 코드를 참고.

```swift
@Observable
@MainActor
public final class FavoriteRepository: FavoriteStoring {
    public private(set) var favorites: [FavoriteItem]
    private let persistence: NativeAppPersistence
    ...
}
```

**`ios/NativeApp/Sources/Services/Repositories/RecentSearchRepository.swift` (신규)**

`NativeAppModel`의 recentSearches 관련 로직을 이관.

```swift
@Observable
@MainActor
public final class RecentSearchRepository: RecentSearchStoring {
    public private(set) var recentSearches: [RecentSearch]
    private let persistence: NativeAppPersistence
    ...
}
```

### 3. 원본 파일 정리

- `SearchServices.swift`에서 KindergartenJSONRepository, ReviewRepository 삭제. 파일이 비게 되면 파일 자체를 삭제.
- `VacancyService.swift`에서 VacancyRepository 삭제. 파일이 비게 되면 삭제.
- `NativeAppModel.swift`는 이 phase에서 수정하지 않는다.

### 4. NativeAppPersistence 접근제어 확인

CompareRepository, FavoriteRepository, RecentSearchRepository가 `NativeAppPersistence`의 메서드를 호출한다. 해당 메서드들(`saveFavorites`, `saveRecentSearches`, `saveCompareSelection`, `restore`, `hasLaunched`, `markAsLaunched`)이 `public`인지 확인하고, 아니라면 `public`으로 변경하라.

## Acceptance Criteria

```bash
cd ios/WhereKindergartenNative && xcodebuild build \
  -scheme WhereKindergartenNative \
  -destination 'generic/platform=iOS Simulator' \
  -quiet 2>&1 | tail -5
```

빌드가 성공해야 한다 (`** BUILD SUCCEEDED **`).

## AC 검증 방법

위 xcodebuild 커맨드를 실행하라. `BUILD SUCCEEDED`가 출력되면 `/tasks/0-arch-refactor/index.json`의 phase 3 status를 `"completed"`로 변경하라.

## 주의사항

- `@Observable`은 class에만 적용 가능하다. struct를 class로 바꿀 때 값 시맨틱이 참조 시맨틱으로 변경됨을 인지하라. Repository는 공유 인스턴스로 사용될 것이므로 참조 시맨틱이 적합하다.
- `@MainActor`를 붙여라. SwiftUI에서 관찰하는 객체는 MainActor에서 동작해야 한다.
- `@unchecked Sendable`을 class 선언에 추가하라. `@MainActor` 격리된 class는 Sendable 체크를 수동으로 보장해야 할 수 있다. 컴파일러 경고가 나오면 추가.
- Repository의 `load()` 메서드는 `async`여야 한다. 현재 struct 버전의 로딩 로직을 유지하되, 상태 업데이트(isLoading, error)를 추가하라.
- `NativeAppModel.swift`에서 기존 struct Repository를 참조하는 코드가 있다. 이 phase에서는 NativeAppModel을 수정하지 않는다. 새 Repository class와 기존 struct가 동시에 존재해도 빌드가 되어야 한다. 이름이 충돌하면 기존 struct 이름을 변경하거나, 새 class에 다른 이름을 사용한 후 Phase 5에서 정리하라.
- 이름 충돌 해결 전략: 기존 struct `KindergartenJSONRepository`는 `SearchServices.swift`에서 삭제되므로 충돌 없음. 기존 `ReviewRepository`도 삭제 후 새 class로 대체. 기존 `VacancyRepository`도 마찬가지. `NativeAppModel`이 기존 타입을 참조하므로, **기존 struct를 삭제할 때 NativeAppModel의 프로퍼티 타입 선언도 새 class 타입으로 변경해야 할 수 있다**. 빌드 에러가 나면 NativeAppModel의 해당 프로퍼티 타입만 최소한으로 수정하라 (전체 리팩토링은 Phase 5).

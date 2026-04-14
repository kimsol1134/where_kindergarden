# Phase 2: domain-logic

## 사전 준비

아래 문서를 반드시 읽어라:

- `docs/IOS_ARCHITECTURE.md` — 섹션 5.2(Domain 레이어 전체)

이전 phase의 작업물을 반드시 확인하라:

- `ios/NativeApp/Package.swift` — Domain 타겟이 추가되었는지 확인
- `ios/NativeApp/Sources/Domain/Protocols/` — 6개 프로토콜 파일
- `ios/NativeApp/Sources/Models/AppModels.swift` — NativeTab 등 이동된 타입
- `ios/NativeApp/Sources/Models/SearchLens.swift` — SearchLens enum

## 작업 내용

### 1. 순수 로직 서비스를 Domain으로 이동

현재 `ios/NativeApp/Sources/Services/SearchServices.swift`에 정의된 다음 타입들을 Domain 타겟으로 이동한다. 이 타입들은 Foundation과 Models만 의존하므로 Domain에 적합하다.

**`ios/NativeApp/Sources/Domain/Services/DistanceCalculator.swift` (신규)**

`SearchServices.swift`에서 `DistanceCalculator` struct를 추출. Haversine 공식으로 두 좌표 간 거리를 km 단위로 계산한다. 코드를 그대로 옮기되, `public` 접근제어를 확인하라.

**`ios/NativeApp/Sources/Domain/Services/KindergartenSearchEngine.swift` (신규)**

`SearchServices.swift`에서 `KindergartenSearchEngine` struct를 추출. 이 타입은 `DistanceCalculator`를 사용하므로 같은 Domain 타겟 안에서 참조 가능하다.

**`ios/NativeApp/Sources/Domain/Services/DeepLink.swift` (신규)**

`SearchServices.swift`에서 `DeepLinkParser` struct와 `DeepLinkBuilder` struct를 추출하여 하나의 파일에 넣어라.

이동 후 원본 `SearchServices.swift`에서 이동된 타입들을 삭제하라. `SearchServices.swift`에 `KindergartenJSONRepository`와 `ReviewRepository`가 남아있을 텐데, 이들은 Services 타겟에 유지한다. 단, 이 파일에서 `DistanceCalculator` 등을 참조하는 부분이 있으면 `import Domain`을 추가하라.

### 2. UseCase 생성

**`ios/NativeApp/Sources/Domain/UseCases/CompareUseCase.swift` (신규)**

`docs/IOS_ARCHITECTURE.md` 섹션 5.2.2의 CompareUseCase 설계를 따른다.

현재 `CompareView.swift`의 `calculateScores()` 메서드 (line ~134-181)의 로직을 추출한다. 반드시 `CompareView.swift`를 읽고 로직을 정확히 이해한 후 추출하라.

```swift
public struct CompareUseCase: Sendable {
    public init()
    public func calculateScores(for items: [Kindergarten]) -> [Int]
    public func winnerSummary(items: [Kindergarten], scores: [Int]) -> String?
    public func shareURL(ids: [String], baseURL: URL) -> URL?
}
```

8개 메트릭: 교사비율(낮을수록), 면적(높을수록), CCTV(많을수록), 방과후(있으면), 놀이터(있으면), 급식(직영이면), 버스(많을수록), 현원여유(현재 vacancy 제외 — 기존 CompareView에서 vacancy가 점수에 포함되지 않았다면 제외).

**`ios/NativeApp/Sources/Domain/UseCases/FitReasonBuilder.swift` (신규)**

현재 `SearchFitPresentation.swift`의 `KindergartenFitSummaryBuilder`와 `KindergartenFitReason` struct를 추출한다. `SearchFitPresentation.swift`를 반드시 읽고 기존 로직을 정확히 이관하라.

```swift
public struct KindergartenFitReason: Hashable, Sendable {
    public let icon: String
    public let text: String
    public let priority: Int
}

public struct FitReasonBuilder: Sendable {
    public init()
    public func reasons(for kindergarten: Kindergarten, filters: SearchFilters, reviewCount: Int, vacancyCount: Int) -> [KindergartenFitReason]
}
```

**`ios/NativeApp/Sources/Domain/UseCases/SearchUseCase.swift` (신규)**

```swift
public struct SearchUseCase: Sendable {
    public init(searchEngine: KindergartenSearchEngine, distanceCalculator: DistanceCalculator)

    public func search(catalog: [KindergartenRaw], location: Coordinates, filters: SearchFilters, query: String) -> [Kindergarten]

    public func localSuggestions(query: String, catalog: [KindergartenRaw], userLocation: Coordinates, limit: Int) -> [SearchSuggestion]

    public func expandedRadiusIfNeeded(currentRadius: Double, results: [Kindergarten]) -> Double?

    public func makeKindergarten(from raw: KindergartenRaw, relativeTo location: Coordinates) -> Kindergarten
}
```

`localSuggestions` 로직은 현재 `NativeAppModel.swift`의 `makeLocalSearchSuggestions(for:)` 메서드 (~line 1130-1184)에서 추출한다. 반드시 해당 코드를 읽고 정확히 이관하라.

`expandedRadiusIfNeeded`는 `NativeAppModel.swift`의 `expandRadiusForSparseCurrentLocationResultsIfNeeded()` (~line 1023-1031)에서 추출한다.

**`ios/NativeApp/Sources/Domain/UseCases/DeepLinkUseCase.swift` (신규)**

```swift
public struct DeepLinkUseCase: Sendable {
    public init(parser: DeepLinkParser)
    public func resolve(_ url: URL) -> DeepLinkDestination?
}
```

### 3. 원본 파일 정리

이동된 로직의 원본을 정리한다:

- `SearchServices.swift`: DistanceCalculator, KindergartenSearchEngine, DeepLinkParser, DeepLinkBuilder 삭제. KindergartenJSONRepository, ReviewRepository만 남김. `import Domain` 추가.
- `SearchFitPresentation.swift`: SearchLens는 Phase 1에서 이미 Models로 이동됨. KindergartenFitSummaryBuilder와 KindergartenFitReason을 이 phase에서 Domain으로 이동 후 이 파일에서 삭제. 파일이 비게 되면 파일 자체를 삭제.
- `NativeAppModel.swift`: 이 phase에서는 수정하지 않는다 (Phase 4-5에서 처리).
- `CompareView.swift`: 이 phase에서는 수정하지 않는다 (Phase 5에서 처리).

## Acceptance Criteria

```bash
cd ios/WhereKindergartenNative && xcodebuild build \
  -scheme WhereKindergartenNative \
  -destination 'generic/platform=iOS Simulator' \
  -quiet 2>&1 | tail -5
```

빌드가 성공해야 한다 (`** BUILD SUCCEEDED **`).

## AC 검증 방법

위 xcodebuild 커맨드를 실행하라. `BUILD SUCCEEDED`가 출력되면 `/tasks/0-arch-refactor/index.json`의 phase 2 status를 `"completed"`로 변경하라.
수정 3회 이상 시도해도 빌드 실패하면 status를 `"error"`로 변경하고 에러 메시지를 기록하라.

## 주의사항

- Domain 타겟에서는 `import Foundation`과 `import Models`만 허용된다. `import SwiftUI`, `import Services`, `import CoreLocation` 등을 사용하면 안 된다.
- DistanceCalculator의 Haversine 공식은 수학 함수(sin, cos, atan2, sqrt)만 사용하며 CoreLocation에 의존하지 않는다. Foundation의 `Darwin` 모듈에서 제공되므로 문제없다.
- 기존 Services 타겟의 코드가 이동된 Domain 타입을 참조하려면 `import Domain`이 필요하다. Package.swift에서 Services가 Domain에 의존하도록 이미 설정되어 있으므로 import만 추가하면 된다.
- UseCase의 메서드 시그니처에서 `Kindergarten` 타입을 사용할 때, 이 타입이 Models에 정의되어 있으므로 `import Models`가 필요하다 (Domain이 Models에 의존하므로 자동으로 접근 가능).
- `NativeAppModel.swift`와 `CompareView.swift`는 이 phase에서 수정하지 않는다. 이 파일들은 아직 기존 로직을 그대로 유지하며, Phase 4-5에서 처리한다. 단, 이동된 타입에 대한 `import Domain`은 필요할 수 있다.

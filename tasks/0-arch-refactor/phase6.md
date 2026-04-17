# Phase 6: tests

## 사전 준비

아래 문서를 반드시 읽어라:

- `docs/IOS_ARCHITECTURE.md` — 섹션 9(아키텍처 규칙, 테스트 규칙)

이전 phase의 작업물을 반드시 확인하라:

- `ios/NativeApp/Sources/Domain/UseCases/` — 모든 UseCase 코드
- `ios/NativeApp/Sources/Domain/Services/` — DistanceCalculator, KindergartenSearchEngine, DeepLink
- `ios/NativeApp/Sources/Domain/Protocols/` — 모든 프로토콜
- `ios/NativeApp/Sources/Services/Repositories/` — 모든 Repository
- `ios/NativeApp/Tests/NativeAppTests/` — 기존 테스트 파일

그리고 기존 테스트 파일을 반드시 읽어라:

- `ios/NativeApp/Tests/NativeAppTests/NativeAppTests.swift`
- `ios/NativeApp/Tests/NativeAppTests/NativeSearchTests.swift`
- `ios/NativeApp/Tests/NativeAppTests/NativeVacancyTests.swift`

## 작업 내용

### 1. DomainTests 테스트 타겟 구성

`ios/NativeApp/Tests/DomainTests/` 디렉토리를 생성하고 Domain 레이어의 단위 테스트를 작성한다.

Package.swift에 `DomainTests` 테스트 타겟이 이미 추가되어 있어야 한다 (Phase 1에서 추가됨). 없다면 추가하라:

```swift
.testTarget(
    name: "DomainTests",
    dependencies: ["Models", "Domain"]
)
```

### 2. CompareUseCase 테스트

**`ios/NativeApp/Tests/DomainTests/CompareUseCaseTests.swift` (신규)**

```swift
import Testing
import Models
@testable import Domain

struct CompareUseCaseTests {
    let sut = CompareUseCase()

    @Test func calculateScores_twoPerfectlyEqual_allZeros()
    @Test func calculateScores_oneItemBetterTeacherRatio_getsPoint()
    @Test func calculateScores_areaPerChild_higherWins()
    @Test func calculateScores_booleanMetric_trueWinsWhenDifferent()
    @Test func calculateScores_booleanMetric_allSame_noPoints()
    @Test func calculateScores_singleItem_returnsZero()
    @Test func winnerSummary_clearWinner_returnsName()
    @Test func winnerSummary_tie_returnsNil()
    @Test func shareURL_validIds_returnsURL()
    @Test func shareURL_emptyIds_returnsNil()
}
```

테스트에서 `Kindergarten` 인스턴스를 생성해야 한다. `KindergartenRaw`를 먼저 만들고 `Kindergarten(raw:distance:)`로 변환하라. 테스트 헬퍼 함수 `makeTestKindergarten(...)` 을 만들어 필수 필드만 설정하고 나머지는 기본값을 사용하라.

### 3. SearchUseCase 테스트

**`ios/NativeApp/Tests/DomainTests/SearchUseCaseTests.swift` (신규)**

```swift
struct SearchUseCaseTests {
    @Test func search_withinRadius_returnsResults()
    @Test func search_outsideRadius_excludesResults()
    @Test func search_queryFilter_matchesName()
    @Test func localSuggestions_exactMatch_firstPriority()
    @Test func localSuggestions_prefixMatch_secondPriority()
    @Test func localSuggestions_limit_respected()
    @Test func expandedRadius_emptyResults_expandsTo2()
    @Test func expandedRadius_hasResults_returnsNil()
    @Test func expandedRadius_alreadyAt5_returnsNil()
}
```

### 4. FitReasonBuilder 테스트

**`ios/NativeApp/Tests/DomainTests/FitReasonBuilderTests.swift` (신규)**

```swift
struct FitReasonBuilderTests {
    let sut = FitReasonBuilder()

    @Test func reasons_nearbyKindergarten_includesNearbyReason()
    @Test func reasons_busFilterActive_boosted()
    @Test func reasons_maxThreeReasons()
}
```

### 5. DeepLinkUseCase 테스트

**`ios/NativeApp/Tests/DomainTests/DeepLinkUseCaseTests.swift` (신규)**

```swift
struct DeepLinkUseCaseTests {
    @Test func resolve_compareURL_returnsCompareDestination()
    @Test func resolve_searchURL_returnsSearchDestination()
    @Test func resolve_invalidURL_returnsNil()
}
```

### 6. 기존 테스트 수정

기존 `NativeAppTests/` 테스트가 리팩토링 후 컴파일되는지 확인하라. `NativeAppModel`을 참조하는 테스트가 있다면:
- 삭제하거나 새 ViewModel 기반으로 재작성
- 하지만 이 phase의 주목적은 Domain 테스트이므로, 기존 테스트가 컴파일만 되면 충분하다

### 7. Swift Testing 프레임워크 사용

테스트는 `XCTest`가 아닌 Swift Testing (`import Testing`, `@Test`, `#expect`)을 사용하라. iOS 17+ / Xcode 16+에서 지원된다.

```swift
import Testing
import Models
@testable import Domain

@Test func example() {
    let result = CompareUseCase().calculateScores(for: items)
    #expect(result == [1, 0])
}
```

## Acceptance Criteria

```bash
cd ios/WhereKindergartenNative && xcodebuild build \
  -scheme WhereKindergartenNative \
  -destination 'generic/platform=iOS Simulator' \
  -quiet 2>&1 | tail -5
```

빌드가 성공해야 한다.

```bash
cd ios/WhereKindergartenNative && xcodebuild test \
  -scheme WhereKindergartenNative \
  -destination 'platform=iOS Simulator,name=iPhone 16' \
  -only-testing:DomainTests \
  -quiet 2>&1 | tail -10
```

DomainTests가 모두 통과해야 한다 (`** TEST SUCCEEDED **`).

## AC 검증 방법

위 두 커맨드를 순서대로 실행하라. 빌드 성공 + 테스트 통과 시 `/tasks/0-arch-refactor/index.json`의 phase 6 status를 `"completed"`로 변경하라.

테스트 실행 시 시뮬레이터 이름(`iPhone 16`)이 없으면 다른 사용 가능한 시뮬레이터를 사용하라. `xcrun simctl list devices available` 으로 확인 가능하다.

## 주의사항

- Domain 타겟은 iOS SDK에 의존하지 않으므로 DomainTests는 macOS에서도 실행 가능해야 한다. 하지만 Package.swift의 platforms가 iOS로 설정되어 있으므로 xcodebuild를 통해 시뮬레이터에서 실행한다.
- 테스트에서 `Kindergarten` 인스턴스를 만들 때, `KindergartenRaw`의 모든 필드를 채워야 할 수 있다. 테스트 헬퍼를 만들어 기본값을 제공하라.
- `@testable import Domain`을 사용하면 internal 멤버에도 접근 가능하다. 하지만 UseCase의 public API만 테스트하는 것이 원칙이다.
- 테스트 이름은 `테스트대상_조건_기대결과` 패턴을 따르라.
- Sendable 관련 경고가 테스트에서 발생할 수 있다. `@MainActor`가 필요한 곳에 추가하라.

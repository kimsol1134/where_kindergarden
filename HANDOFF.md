# HANDOFF.md

## 마지막 작업 일시
2026-03-31

## 완료된 작업
- [x] 탐색 페이지 UX 대규모 개선 (커밋 76ba9d0)
  - SearchChrome 압축: eyebrow/타이틀/서브타이틀 제거, 검색바+📍버튼 1줄로
  - 국공립/사립/가정 유형 필터 1depth FilterChip 노출
  - "추천" 오해 유발 라벨 → "XX 근처 N곳" 정확한 표현
  - NativeScreenHeader VStack 레이아웃 (타이틀 잘림 수정)
  - 라이트모드 고정 (.preferredColorScheme(.light))
- [x] 커스텀 overlay + DragGesture 바텀시트 (커밋 4873eca)
  - safeAreaInset(고정) 대신 overlay + DragGesture로 3단계 snap (32%→55%→88%)
  - 탭바 유지 + 지도 인터랙션 유지

## 미해결 버그 2개 (이어서 작업 필요)

---

### 버그 1 (Critical): 📍 버튼 탭 시 "'현재 위치' 결과가 없어요" 표시

**증상**: 📍 버튼을 누르면 검색바에 "현재 위치" 텍스트가 들어가고, 반경 5km까지 확대해도 "'현재 위치' 결과가 없어요"가 표시됨. 검색창에서 "현재 위치"를 다시 선택하면 정상 작동.

**근본 원인**: `resultQuery`가 아닌 `searchText`가 문제.

`centerOnCurrentLocation()` (NativeAppModel.swift:487)에서:
```swift
setSearchText("현재 위치", refreshSuggestions: false, applyAsResultQuery: false)
setLocation(coordinates, label: "현재 위치", searchType: .currentLocation)
```

`setSearchText(applyAsResultQuery: false)`는 `resultQuery = ""`로 설정하므로 `search(query:)`에서는 텍스트 필터링 안 함 → **여기까지는 정상**.

**하지만** `ResultSheet`의 empty state 분기에서 `trimmedSearchQuery`를 체크:
```swift
// SearchFeature.swift의 SearchHomeView
private var trimmedSearchQuery: String {
    model.searchText.trimmingCharacters(in: .whitespacesAndNewlines)
}

// ResultSheet empty state (line ~703)
} else if results.isEmpty && !trimmedSearchQuery.isEmpty {
    EmptyStateView(title: "'\(trimmedSearchQuery)' 결과가 없어요", ...)
```

`searchText`가 "현재 위치"이므로 `trimmedSearchQuery`는 "현재 위치" → **텍스트 검색 실패 empty state가 표시됨**. 실제로는 위치 검색 empty state("이 근처에서는 찾지 못했어요 / 범위 넓히기")가 표시되어야 함.

또한 `searchText`가 "현재 위치"이므로 사용자가 "검색어가 있는 상태"로 인식됨 → 결과가 있어도 `filter(query: resultQuery)`에서 빈 문자열이지만, 다른 분기 조건에 영향.

**수정 방법** (2가지 중 택 1):

**방법 A (권장)**: `centerOnCurrentLocation()`에서 `searchText`를 빈 문자열로 설정
```swift
// NativeAppModel.swift centerOnCurrentLocation() 수정
setSearchText("", refreshSuggestions: false, applyAsResultQuery: false)
setLocation(coordinates, label: "현재 위치", searchType: .currentLocation)
```
- 검색바는 비어있고 placeholder "유치원 이름, 동네, 장소로 검색" 표시
- `locationLabel`은 "현재 위치"로 유지 → ResultSheet에서 "현재 위치 근처 N곳" 표시
- `trimmedSearchQuery`가 빈 문자열 → 올바른 empty state 분기 진입

**방법 B**: ResultSheet empty state 분기에서 현재 위치 검색 중일 때 예외 처리
```swift
} else if results.isEmpty && !trimmedSearchQuery.isEmpty && model.currentDeviceLocation == nil {
    // 텍스트 검색 실패 (위치 검색이 아닌 경우에만)
    EmptyStateView(title: "'\(trimmedSearchQuery)' 결과가 없어요", ...)
}
```

**관련 파일**:
- `ios/NativeApp/Sources/Features/Shared/NativeAppModel.swift` line 487-515
- `ios/NativeApp/Sources/Features/Search/SearchFeature.swift` line 47-49 (`trimmedSearchQuery`), line ~703 (empty state)

---

### 버그 2: 바텀시트 최소 높이에서 텍스트 잘림 + 드래그 핸들 안 보임

**증상**: 시트를 최소(32%)로 내리면 "검색 결과" 타이틀 상단이 잘리고, 위로 올리기 위한 드래그 핸들(회색 Capsule 바)이 보이지 않음.

**원인**: overlay의 `frame(height: sheetHeight)` + `.clipShape(RoundedRectangle)`에서 내부 콘텐츠의 최소 높이가 보장되지 않음. 드래그 핸들(Capsule) + 패딩이 ~23pt인데, 시트 전체 높이가 충분하지 않으면 VStack 내용이 clipShape에 의해 잘림.

**수정 방법**:
1. `sheetSnaps` 첫 번째 값을 0.32에서 0.35~0.38로 올리거나
2. `sheetHeight` 계산 시 하한선 추가: `max(screenHeight * fraction, 200)`
3. VStack 내부에서 드래그 핸들과 헤더에 `.layoutPriority(1)` 적용하여 잘리지 않도록

**관련 파일**:
- `ios/NativeApp/Sources/Features/Search/SearchFeature.swift` — overlay 블록의 `sheetSnaps` 배열, `sheetHeight` let 계산, Capsule 드래그 핸들

---

## 현재 브랜치
main

## 참고 파일
- `CLAUDE.md` — 개발 가이드
- `ios/NativeApp/Sources/Features/Search/SearchFeature.swift` — 탐색 페이지 전체 (SearchHomeView, SearchChrome, ResultSheet)
- `ios/NativeApp/Sources/Features/Shared/NativeAppModel.swift` — 모델 (위치/검색/필터 로직)
- `ios/NativeApp/Sources/Services/SearchServices.swift` — 검색 엔진 (거리 계산, 필터링)
- `ios/NativeApp/Sources/Models/KindergartenModels.swift` — SearchFilters, InstitutionFilter, SortOption
- `ios/NativeApp/Sources/Features/Shared/NativeTheme.swift` — NativeScreenHeader, NativeBadge 등 디자인 시스템

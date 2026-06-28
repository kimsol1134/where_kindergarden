# Mixpanel Usage Analysis and Action Plan

Date: 2026-06-28
Project: kindegarden / All Project Data
Source: Mixpanel Events, Users, Starter Board
Timezone: GMT+9

## Summary

현재 Mixpanel 데이터는 계측이 정상적으로 동작하고 있고, 실제 초기 사용자가 검색-상세 흐름까지 도달하고 있음을 보여준다. 가입 기능이 없기 때문에 People 프로필이 0인 것은 정상이며, 현 단계의 분석 단위는 프로필이 아니라 익명 `distinct_id` 기반 활성 사용자다.

가장 중요한 다음 과제는 회원가입 도입이 아니라, 익명 사용자가 `검색 -> 결과 탭 -> 상세 확인 -> 즐겨찾기/비교 추가 -> 비교 공유`까지 이동하는지 측정하고 이 전환을 높이는 것이다.

## Work Completed

### Mixpanel Report

Mixpanel Starter Board에 30일 기준 퍼널 리포트를 저장했다.

Report name: `앱 실행~비교 공유 전환율 퍼널(모든 단계)`

Saved funnel:

```text
App Launched
-> Search Executed
-> Result Tapped
-> Detail Opened
-> Comparison Added
-> Compare Viewed
-> Compare Shared
```

Current 30-day result:

- App Launched: 51 users
- Search Executed: 51 users, 100% from app launch
- Result Tapped: 40 users, 78.43% from search
- Detail Opened: 40 users, 100% from result tap
- Comparison Added: 9 users, 22.5% from detail open
- Compare Viewed: 8 users, 88.89% from comparison add
- Compare Shared: 0 users, 0% from compare view
- Overall conversion to share: 0%

Interpretation: 검색과 상세 진입은 작동한다. 실제 병목은 상세 이후 비교 후보 추가와, 비교 화면에서 공유까지 이어지는 마지막 단계다.

### App Changes

iOS 앱에서 상세 화면 이후의 전환을 높이고 분석 가능성을 높이는 변경을 적용했다.

- 상세 시트의 비교 버튼 문구를 `비교 후보 담기` / `비교함 담김`으로 명확히 변경했다.
- 상세 시트에 `비교함 n/3` 상태와 비교 화면 진입 CTA를 추가했다.
- 2개 이상 비교 후보가 담기면 상세 화면에서 바로 비교 탭으로 이동할 수 있게 했다.
- `Result Tapped`, `Detail Opened`, `Favorite Added/Removed`, `Comparison Added/Removed`, `Compare Shared`의 property를 보강했다.
- 검색 결과 카드, 지도 마커, 상세, 저장 탭에서 발생한 액션을 `source` property로 구분한다.
- `Search Executed`와 `Empty State Shown`에 `sort`, `filter_count`, `query_type` 등 분석 property를 추가했다.

### Simulator QA

2026-06-28에 `iPhone 17 Pro` Simulator와 `serve-sim` 브라우저 미러로 핵심 흐름을 확인했다.

QA path:

```text
Search results
-> Detail sheet
-> 비교함 2/3 CTA
-> Compare tab
-> 비교 링크 공유
-> iOS system share sheet
```

Result:

- 상세 시트에서 `비교함 2/3` 상태와 `비교표 보기` CTA가 정상 표시된다.
- `비교표 보기` CTA를 누르면 상세 시트가 닫히고 비교 탭으로 이동한다.
- 비교 탭에서 `2 / 3곳`, 비교표, `비교 링크 공유` CTA가 정상 표시된다.
- 초기 QA에서 `비교 링크 공유` 버튼이 눌려도 시스템 공유 시트가 열리지 않는 문제가 확인됐다.
- 공유 구현을 SwiftUI `.sheet` 기반 `UIActivityViewController` wrapper로 변경한 뒤 iOS system share sheet 표시를 확인했다.
- 검색 결과 화면의 비교 floating bar 문구를 `비교표 보기`, `2/3곳 선택됨`으로 변경했다.
- 검색 결과 화면의 비교 floating bar를 누르면 비교 탭으로 이동하는 것을 확인했다.
- 비교 화면의 시스템 공유 CTA 문구를 `가족에게 비교표 보내기`로 변경하고 iOS system share sheet 표시를 재확인했다.

## Observed Data

### Last 30 Days

Period: 2026-05-29 to 2026-06-28

- Total matching events: 2,558
- Unique active users: 50
- Country distribution:
  - South Korea: 43
  - United States: 4
  - Italy: 1
  - Kyrgyzstan: 1
  - Hong Kong: 1
- City distribution highlights:
  - not set: 9
  - Seocho-gu: 6
  - Seoul: 5
  - Gangnam-gu: 4
  - Cupertino: 2
  - Songpa-gu: 2
  - Uijeongbu-si: 2
  - Goyang-si: 2
  - Hwaseong-si: 2

### Last 7 Days

- Unique active users: 16

### Today

- Total matching events: 55
- Unique active users: 3
- Visible city distribution:
  - Songpa-gu: 1
  - Gangseo-gu: 1
  - San Jose: 1
- Visible country distribution:
  - South Korea: 2
  - United States: 1

### People Profiles

- People profiles: 0
- Interpretation: 가입이 없고 프로필 생성 로직이 없으므로 정상이다. 현재 분석은 Mixpanel profile이 아니라 anonymous distinct user 기준으로 봐야 한다.

## Behavior Observed

최근 이벤트 스트림에서 확인된 핵심 이벤트:

- App Launched
- Search Executed
- Result Tapped
- Detail Opened
- Tab Changed
- Compare Viewed

이 흐름은 사용자가 앱을 열고, 검색하고, 결과를 누르고, 상세 화면까지 들어간다는 것을 보여준다. 즉, 기본 탐색 루프는 작동하고 있다.

다만 최근 표본에서 아래 고의도 행동은 충분히 강하게 보이지 않았다.

- Favorite Added
- Comparison Added
- Compare Shared

따라서 현재 병목 후보는 검색 자체가 아니라 상세 화면 이후의 저장, 비교, 공유 전환이다.

## Current Interpretation

1. 계측은 정상이다.
   - Lexicon 이벤트가 Mixpanel에 반영되어 있고, 실제 iOS 이벤트가 들어오고 있다.

2. 초기 유입은 존재한다.
   - 테스트 사용자가 없다는 전제하에 최근 30일 50명은 실제 초기 사용자 신호로 볼 수 있다.

3. 검색과 상세 탐색은 살아 있다.
   - `Search Executed`, `Result Tapped`, `Detail Opened`가 실제로 발생하고 있다.

4. 아직 제품 가치의 핵심 전환은 검증 전이다.
   - 이 앱의 핵심 가치는 단순 조회보다 후보 유치원을 저장, 비교, 공유하여 의사결정을 돕는 데 있다.
   - 따라서 상세 이후 `Favorite Added`, `Comparison Added`, `Compare Shared`가 핵심 지표다.

5. 지역 데이터는 참고만 한다.
   - 한국 사용자가 대부분이므로 타깃 시장 방향은 맞다.
   - 단, Cupertino/San Jose 같은 위치는 지오로케이션 오차, 네트워크, 기기 환경 영향일 수 있어 과해석하지 않는다.

## North Star for Next 2 Weeks

가입 없는 현재 단계의 핵심 목표:

> 익명 사용자가 유치원을 찾고, 상세를 보고, 후보를 저장하거나 비교하고, 가족과 공유하는 비율을 높인다.

## Primary Funnel

Mixpanel에 아래 Funnel을 생성한다.

```text
App Launched
-> Search Executed
-> Result Tapped
-> Detail Opened
-> Favorite Added OR Comparison Added
-> Compare Viewed
-> Compare Shared
```

우선 확인할 전환율:

- Search Executed / App Launched
- Result Tapped / Search Executed
- Detail Opened / Result Tapped
- Favorite Added or Comparison Added / Detail Opened
- Compare Shared / Compare Viewed

## Target Metrics

초기 목표치는 다음처럼 둔다. 표본이 작으므로 절대값보다 방향성과 병목 위치를 우선 본다.

- 30-day active users: 50 -> 100
- 7-day active users: 16 -> 30
- Detail Opened / Search Executed: baseline 측정 후 개선
- Favorite Added or Comparison Added / Detail Opened: 20% 이상 목표
- Compare Shared: 0이 아닌 지속 발생 여부 확인

## Product Action Plan

### Priority 1: Detail Screen CTA 강화

상세 화면은 현재 가장 중요한 전환 지점이다.

실행 항목:

- `비교 추가` 버튼을 상세 화면 상단 또는 sticky action 영역에 더 명확히 배치한다.
- `즐겨찾기` 버튼을 사용자가 즉시 이해할 수 있는 위치와 아이콘으로 배치한다.
- 이미 비교함에 담긴 상태를 명확히 보여준다.
- 상세 하단에 `다른 유치원과 비교하기` 진입점을 추가한다.

측정 이벤트:

- Detail Opened
- Favorite Added
- Favorite Removed
- Comparison Added
- Comparison Removed

### Priority 2: Compare Entry 강화

비교는 앱의 차별 가치이므로 사용자가 비교함 상태를 항상 인지해야 한다.

실행 항목:

- 비교함에 담긴 개수를 검색/상세 화면에서 계속 보이게 한다.
- 2개 이상 담겼을 때 비교 화면 진입 CTA를 강하게 노출한다.
- 비교 화면 빈 상태에는 “상세 화면에서 비교할 유치원을 추가하세요”처럼 직접적인 안내를 둔다.

측정 이벤트:

- Comparison Added
- Compare Viewed

### Priority 3: Share CTA 강화

공유는 이 앱의 실제 의사결정 사용성을 보여주는 강한 신호다.

실행 항목:

- 비교 화면에서 공유 버튼을 더 잘 보이는 위치에 둔다.
- 공유 전 문구는 “가족에게 비교표 보내기”처럼 사용 맥락을 드러낸다.
- 공유 성공/실패를 이벤트 property로 구분한다.

측정 이벤트:

- Compare Shared

## Analytics Instrumentation Backlog

현재 이벤트명은 충분히 잡혀 있다. 다음 단계에서는 property 품질을 높인다.

### Search Executed

권장 properties:

- query
- result_count
- has_results
- filter_count
- radius
- sort

### Result Tapped

권장 properties:

- kindergarten_id
- rank_position
- result_count
- source

### Detail Opened

권장 properties:

- kindergarten_id
- source
- rank_position
- has_reviews
- has_vacancy

### Favorite Added / Favorite Removed

권장 properties:

- kindergarten_id
- source
- favorite_count

### Comparison Added / Comparison Removed

권장 properties:

- kindergarten_id
- source
- compare_count

### Compare Viewed

권장 properties:

- compare_count

### Compare Shared

권장 properties:

- compare_count
- method
- result

### Global Properties

권장 super/global properties:

- app_version
- platform
- os_version
- device_model
- days_since_install
- first_open_date

## Mixpanel Report Setup

### Funnel Report

Create:

```text
App Launched
Search Executed
Result Tapped
Detail Opened
Comparison Added
Compare Viewed
Compare Shared
```

Alternative branch:

```text
Detail Opened
Favorite Added
```

Breakdowns:

- app_version
- country
- city
- days_since_install

### Insights Report

Create event trend reports for:

- Search Executed
- Detail Opened
- Favorite Added
- Comparison Added
- Compare Viewed
- Compare Shared

View:

- Total events
- Unique users
- Events per user

### Retention Report

Initial retention definition:

```text
Any Event -> Any Event
```

Better retention definition after more volume:

```text
Search Executed -> Search Executed
```

or:

```text
Detail Opened -> Detail Opened
```

## Decision Rules

1주에서 2주 후 아래 기준으로 판단한다.

### If Search Executed is low

문제는 앱 진입 후 첫 행동이다.

Possible actions:

- 첫 화면의 검색 유도 강화
- 현재 위치 기반 추천 노출
- 인기 지역/최근 본 지역 바로가기 제공

### If Result Tapped / Search Executed is low

문제는 검색 결과의 신뢰도 또는 스캔성이다.

Possible actions:

- 결과 카드 정보 우선순위 조정
- 거리, 공립/사립, 정원/현원, 리뷰 유무를 더 명확히 노출
- 결과 없음/부족 상태 개선

### If Detail Opened / Result Tapped is low

문제는 결과 카드에서 상세로 들어갈 이유가 약한 것이다.

Possible actions:

- 카드에 상세에서 볼 수 있는 가치를 미리 드러낸다.
- `자세히 보기` affordance를 강화한다.

### If Favorite or Comparison Added / Detail Opened is low

문제는 상세 화면의 의사결정 CTA다.

Possible actions:

- 상세 상단 sticky CTA 추가
- 비교 추가 버튼 문구 개선
- “후보로 저장” 같은 부모 의사결정 맥락의 표현 테스트

### If Compare Shared / Compare Viewed is low

문제는 비교 화면의 공유 가치 또는 공유 affordance다.

Possible actions:

- 공유 버튼 위치 강화
- 공유 문구를 가족/배우자 맥락으로 변경
- 공유 전 미리보기 또는 공유 성공 피드백 개선

## What Not To Do Yet

현 단계에서는 아래 작업을 우선하지 않는다.

- 회원가입 도입
- CRM/푸시 설계
- 국가별 성장 전략 수립
- 이벤트 수 자체를 성공 지표로 사용
- People profile 기반 분석에 의존

## Next Concrete Steps

1. Mixpanel Funnel report를 생성한다.
2. 상세 화면의 `즐겨찾기`와 `비교 추가` CTA 위치를 점검한다.
3. 필요한 경우 상세 화면 CTA를 먼저 개선한다.
4. `Comparison Added`, `Favorite Added`, `Compare Shared` property를 보강한다.
5. 1주 후 동일 지표를 다시 확인한다.

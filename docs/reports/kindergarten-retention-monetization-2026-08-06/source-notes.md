# Source and report notes

## Reporting job

- Question: 유치원 탐색 시즌의 증가한 유입을 반복 사용과 신뢰 기반 수익으로 전환하려면 무엇을 어떤 순서로 해야 하는가?
- Audience: product stakeholders
- Decision window: 2026년 8월부터 12주
- Success criterion: 핵심 무료 탐색 가치를 훼손하지 않으면서 주간 의사결정 행동과 유료 의향을 검증하는 실행안

## Required structure mapping

- Title: 첫 markdown block
- Executive Summary: second markdown block
- Key findings with evidence: acquisition, activation bottleneck, and data-readiness sections with three source-backed tables
- Recommended next steps: product loop, monetization model, KPI framework, and 12-week roadmap
- Further questions: dedicated markdown section
- Caveats and assumptions: final markdown section

## Sources reviewed

- GitHub Actions artifacts from `.github/workflows/daily-asc-analytics.yml`; App Store Connect Sales Report daily Units through 2026-08-03
- `docs/MIXPANEL_USAGE_ANALYSIS_2026-06-28.md`
- `docs/ANALYTICS.md`
- `docs/MONETIZATION_STRATEGY.md`
- `docs/APP_STORE_METADATA.md`
- `ios/NativeApp/Sources/Services/Analytics.swift`
- `ios/NativeApp/Sources/Features/Search/KindergartenDetailSheet.swift`
- `ios/NativeApp/Sources/Features/Saved/SavedView.swift`
- `ios/NativeApp/Sources/Features/Compare/CompareView.swift`
- `ios/NativeApp/Sources/Features/Compare/CompareMatrixView.swift`
- `public/data/kindergartens.json`
- `public/data/reviews.json`
- `public/data/vacancy.json`

## Source reconciliation

- `docs/MONETIZATION_STRATEGY.md`의 1월 상태는 배너 광고가 있다고 기록하지만, 현재 App Store 메타데이터와 네이티브 앱은 광고 없음으로 전환됐다. 현재 구현과 최신 메타데이터를 우선했다.
- Mixpanel 6월 퍼널은 비교·공유 UI 개선 전후가 섞여 있다. 병목의 방향만 사용하고 현재 전환율로 제시하지 않았다.
- `Search Executed`는 7월 25일 디바운스 변경 전후 총량 비교가 왜곡되므로 리텐션 KPI에서 이벤트 건수 자체를 제외했다.
- ASC 수집 실패가 있었던 7월 21~23일은 비교 구간에서 제외했다. 두 선택 구간은 각각 10일 연속 관측이다.

## Visual and table plan

- Acquisition visual: two-series line chart on normalized day 1-10. It answers whether the increase is broad-based or outlier-driven. Recent is solid blue; comparison is dashed orange so color is not the only distinction. The source rows retain actual dates, period totals, and medians for tooltip and audit context.
- Funnel chart omitted: only one historical snapshot is available and the share defect was fixed on the snapshot date. A step table is more honest than a trend visual.
- Data readiness uses a table because exact coverage, freshness, and the resulting launch gate are the decision-relevant values.

## Chart map

- Section: acquisition signal
- Question: 최근 설치 증가가 구간 전체에 퍼져 있는가, 특정 하루 급증에 집중됐는가?
- Family/type: Trend / two-series line
- Fields: `day_index`, `period`, `installs`, `line_style`; tooltip context includes actual dates, totals, medians, and maxima
- Supported claim: 최근 합계와 중앙값은 높지만 두 구간 모두 하루 급증치가 있어 지속 성장으로 단정할 수 없다
- Palette: hard two-root cap; solid blue current versus dashed orange comparison
- Delivery: canonical HTML report chart in `artifact.json`

## Target-setting approach

- No firm revenue or retention target is claimed from the current evidence.
- Weeks 1-2 collect a fresh baseline; later targets are relative to that baseline and use minimum eligible-cohort sizes.
- Price points are provisional research cells, not a revenue forecast.

## Open evidence gaps

- Fresh 8월 Mixpanel funnel and D7/W2 retention were unavailable because the live API returned rate-limit errors after schema discovery.
- App Store Sales Report Units are an install proxy and may include redownload behavior.
- Vacancy data needs a production freshness SLA and audit trail before any paid alert promise.

## Validation result

- Overall assessment: Share with caveats.
- Recomputed recent/prior install totals from the 20 daily rows: 69 and 51, matching the report.
- Recomputed every funnel step conversion from user counts; differences were rounding only.
- Recomputed review and vacancy coverage from 1,972/7,950 and 2,753/7,950; values match the report.
- Executed all seven distinct source SQL statements successfully with SQLite.
- Portable report validation and packaging passed. Verification is `structural_only` because no compatible installed Chromium headless shell was available; enhanced-reader browser interactions were not verified.

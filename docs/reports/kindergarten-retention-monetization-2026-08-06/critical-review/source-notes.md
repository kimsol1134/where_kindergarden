# Source notes — 2026-08-06 correction

## Decision scope

The report answers one question: which monetization path is justified by current behavior, scale, instrumentation quality, and public-data reliability. It does not estimate market size or claim observed willingness to pay.

## Mixpanel

- Project `4014822`, workspace `4510961`.
- Complete behavior window: 2026-07-25 through 2026-08-05.
- Rolling 30-day active window: 2026-07-07 through 2026-08-05.
- Population: anonymous distinct IDs; observed `is_testflight` value was false.
- Actual 30-day unique `App Launched` users: 186.
- Current versus prior 12-day unique `App Launched`: 124 versus 62.
- One-day loose funnels use `App Launched` as the common 124-user denominator.
- Two-candidate milestones require `compare_count > 1`.
- New-user retention birth event is `App Launched` with `days_since_install < 1`.
- Retention rates are recomputed by summing matured cohort numerators and denominators, not averaging daily percentages.
- Read-only query reproduction: `mixpanel_queries.py`.

## App Store Connect

- Existing scheduled workflow collects T-2 daily App Units.
- Latest complete artifact date inspected: 2026-08-04.
- Known inspected-window gap: 2026-07-21.
- ASC App Units and Mixpanel `days_since_install < 1` launches differ in definition, date boundary, and total. They are used as separate diagnostics, never added together.

## Instrumentation audit and correction

- `Detail Opened` moved from selection time to actual detail-sheet presentation.
- `Compare Viewed` now requires at least two candidates.
- Sharing now separates `Compare Share Initiated` from `Compare Share Result`; legacy `Compare Shared` is emitted only for a successful system completion or Kakao handoff.
- `Vacancy Viewed` now records actual section exposure, data version, vacancy count, and load state.
- Events before and after the 2026-08-06 semantic change must not be joined as one continuous time series without a version boundary.
- iOS Simulator build passed; 108 tests passed with zero failures.

## Public data

- Kindergarten catalog: official 2026 first disclosure, 7,152 records, 100% registry-ID join, all coordinates present.
- Region codes: official current table, 261 rows, including 2026 reorganizations.
- Vacancy: live collection completed 2026-08-06; 261/261 regions, 3,032 institutions, 2,353 with positive vacancies, 99.5% detail coverage.
- Reviews: 6,055 links across 1,892 current institutions; 194 links tied to non-current institutions and 58 duplicates were excluded from public aggregates and retained in an ignored audit snapshot.
- Review coverage is 26.5% of the current catalog. Coverage must not be treated as comparable ranking evidence across regions.
- Review-content removal candidates remain human-gated under the review-curation procedure.

## Economics

- Active-user input is the directly observed rolling 30-day count of 186, replacing the prior linear estimate of 310.
- Eligible rate is observed: 47/124 = 37.9032% reached two comparison candidates within one day.
- Purchase rates of 3%, 5%, and 10% are assumptions only.
- Prices of KRW 9,900 and KRW 19,900 are scenarios only.
- Revenue is gross and excludes store fees, tax, refunds, and operating cost.
- Reproduction notebook: `monetization-analysis.ipynb`; outputs: `analysis-output.json`.

## Decision rule

The consumer path is a manual, one-time decision-completion offer used to test demand—not a subscription or a paywall on basic comparison. Product automation requires sequential evidence: repeated problem in 5/10 interviews, at least 3 prepaid purchases in 50 eligible exposures, then at least 5 purchases and 60% task completion in 100 exposures. A neutral B2B data-management pilot is explored in parallel and requires three institutions willing to pay at least KRW 50,000 per month before development.

"""Read-only Mixpanel snapshot for the monetization critical review.

This script never creates cohorts, reports, or Mixpanel configuration. It prints
each query and writes raw/recomputed outputs to ``mixpanel-snapshot.json`` so a
scheduled local refresh can be audited independently of the report renderer.
"""

from __future__ import annotations

import argparse
from datetime import date, timedelta
import json
from pathlib import Path
import time
from typing import Any, Callable, TypeVar

import mixpanel_headless as mp
from mixpanel_headless import Filter, FunnelStep, RetentionEvent


PROJECT_ID = "4014822"
WORKSPACE_ID = 4510961
DEFAULT_END = "2026-08-05"
DEFAULT_CURRENT_START = "2026-07-25"
T = TypeVar("T")


def dataframe_records(result: Any) -> list[dict[str, Any]]:
    return json.loads(result.df.to_json(orient="records", force_ascii=False, date_format="iso"))


def with_retry(label: str, operation: Callable[[], T]) -> T:
    delays = (0, 10, 30)
    last_error: Exception | None = None
    for attempt, delay in enumerate(delays, start=1):
        if delay:
            time.sleep(delay)
        try:
            value = operation()
            print(f"[ok] {label}")
            return value
        except Exception as error:  # mixpanel-headless wraps API errors by endpoint
            last_error = error
            message = str(error).lower()
            retryable = any(token in message for token in ("429", "rate", "timeout", "temporar"))
            if not retryable or attempt == len(delays):
                raise
            print(f"[retry {attempt}/{len(delays) - 1}] {label}: {error}")
    raise last_error or RuntimeError(label)


def summarize_retention(result: Any, end: str, buckets: tuple[int, ...]) -> dict[str, Any]:
    cutoff = date.fromisoformat(end)
    summary: dict[str, Any] = {}
    for bucket in buckets:
        matured: list[list[Any]] = []
        for cohort_date, data in sorted(result.cohorts.items()):
            age = (cutoff - date.fromisoformat(cohort_date)).days
            if age >= bucket and len(data["counts"]) > bucket:
                matured.append([cohort_date, data["first"], data["counts"][bucket]])
        denominator = sum(row[1] for row in matured)
        numerator = sum(row[2] for row in matured)
        summary[f"d{bucket}"] = {
            "returned_users": numerator,
            "eligible_users": denominator,
            "rate": numerator / denominator if denominator else None,
            "matured_start": matured[0][0] if matured else None,
            "matured_end": matured[-1][0] if matured else None,
            "cohorts": matured,
        }
    return summary


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--end", default=DEFAULT_END)
    parser.add_argument("--current-start", default=DEFAULT_CURRENT_START)
    parser.add_argument("--output", type=Path, default=Path(__file__).with_name("mixpanel-snapshot.json"))
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    end_date = date.fromisoformat(args.end)
    rolling_start = (end_date - timedelta(days=29)).isoformat()
    prior_end = (date.fromisoformat(args.current_start) - timedelta(days=1)).isoformat()
    prior_start = (date.fromisoformat(prior_end) - timedelta(days=11)).isoformat()
    workspace = mp.Workspace(project=PROJECT_ID, workspace=WORKSPACE_ID)
    output: dict[str, Any] = {
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "project_id": PROJECT_ID,
        "workspace_id": WORKSPACE_ID,
        "current_window": {"start": args.current_start, "end": args.end},
        "rolling_30_day_window": {"start": rolling_start, "end": args.end},
    }

    try:
        events = [
            "App Launched",
            "Search Executed",
            "Result Tapped",
            "Detail Opened",
            "Favorite Added",
            "Comparison Added",
            "Compare Viewed",
            "Compare Shared",
            "Review Link Tapped",
        ]
        reach = with_retry(
            "current unique event reach",
            lambda: workspace.query(
                events,
                from_date=args.current_start,
                to_date=args.end,
                math="unique",
                mode="total",
            ),
        )
        output["current_event_reach"] = dataframe_records(reach)

        rolling_active = with_retry(
            "rolling 30-day active users",
            lambda: workspace.query(
                "App Launched",
                from_date=rolling_start,
                to_date=args.end,
                math="unique",
                mode="total",
            ),
        )
        output["rolling_30_day_active"] = dataframe_records(rolling_active)

        period_comparison: dict[str, Any] = {}
        for label, start, end in (
            ("prior", prior_start, prior_end),
            ("current", args.current_start, args.end),
        ):
            result = with_retry(
                f"{label} 12-day core reach",
                lambda start=start, end=end: workspace.query(
                    [
                        "App Launched",
                        "Detail Opened",
                        "Favorite Added",
                        "Comparison Added",
                        "Compare Viewed",
                        "Compare Shared",
                    ],
                    from_date=start,
                    to_date=end,
                    math="unique",
                    mode="total",
                ),
            )
            period_comparison[label] = {
                "start": start,
                "end": end,
                "rows": dataframe_records(result),
            }
        output["period_comparison"] = period_comparison

        funnel_steps: list[tuple[str, str | FunnelStep]] = [
            ("two_candidates", FunnelStep("Comparison Added", filters=[Filter.greater_than("compare_count", 1)])),
            ("two_plus_compare_view", FunnelStep("Compare Viewed", filters=[Filter.greater_than("compare_count", 1)])),
            ("review_link", "Review Link Tapped"),
            ("two_favorites", FunnelStep("Favorite Added", filters=[Filter.greater_than("favorite_count", 1)])),
            ("legacy_share_initiated", "Compare Shared"),
        ]
        output["one_day_funnels"] = {}
        for label, step in funnel_steps:
            result = with_retry(
                f"one-day funnel {label}",
                lambda step=step: workspace.query_funnel(
                    ["App Launched", step],
                    from_date=args.current_start,
                    to_date=args.end,
                    conversion_window=1,
                    conversion_window_unit="day",
                    order="loose",
                    mode="steps",
                ),
            )
            output["one_day_funnels"][label] = dataframe_records(result)

        new_retention = with_retry(
            "new-user retention",
            lambda: workspace.query_retention(
                RetentionEvent("App Launched", filters=[Filter.less_than("days_since_install", 1)]),
                "App Launched",
                from_date=rolling_start,
                to_date=args.end,
                retention_unit="day",
                alignment="birth",
                mode="curve",
                unbounded_mode="none",
                retention_cumulative=False,
            ),
        )
        output["new_user_retention"] = summarize_retention(new_retention, args.end, (1, 7, 14, 28))

        two_candidate_retention = with_retry(
            "two-candidate retention",
            lambda: workspace.query_retention(
                RetentionEvent("Comparison Added", filters=[Filter.greater_than("compare_count", 1)]),
                "App Launched",
                from_date=rolling_start,
                to_date=args.end,
                retention_unit="day",
                alignment="birth",
                mode="curve",
                unbounded_mode="none",
                retention_cumulative=False,
            ),
        )
        output["two_candidate_retention"] = summarize_retention(two_candidate_retention, args.end, (1, 7, 14))

        daily_new = with_retry(
            "daily new launch users",
            lambda: workspace.query(
                "App Launched",
                from_date=rolling_start,
                to_date=args.end,
                math="unique",
                where=Filter.less_than("days_since_install", 1),
                mode="timeseries",
            ),
        )
        output["daily_new_launch_users"] = dataframe_records(daily_new)

        app_versions = with_retry(
            "app version reach",
            lambda: workspace.query(
                "App Launched",
                from_date=args.current_start,
                to_date=args.end,
                math="unique",
                group_by="app_version",
                mode="table",
            ),
        )
        output["app_version_reach"] = dataframe_records(app_versions)
    finally:
        workspace.close()

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(output, ensure_ascii=False, indent=2))
    print(args.output)


if __name__ == "__main__":
    main()

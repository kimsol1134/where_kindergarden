# Public data freshness and refresh operations

The public app data is validated as one release unit. `public/data/freshness.json`
is the machine-readable status used to block stale or partial publication.

| Dataset | Authoritative source | Target freshness | Automated workflow | Publication gate |
| --- | --- | --- | --- | --- |
| Kindergarten disclosure | 유치원알리미 official disclosure + identifier registry | 14 days | `weekly-catalog-refresh.yml` | complete component coverage, 100% identifier join |
| Region codes | 유치원알리미 official region-code table | 14 days | `weekly-catalog-refresh.yml` | official row set and required current codes |
| Vacancy | 처음학교로 live vacancy pages | 72 hours | `daily-vacancy-refresh.yml` | all regions, at least 98% detail coverage |
| Review links | Published review catalog + Naver discovery | discovery twice monthly; published content target 30 days | `semimonthly-review-discovery.yml`, `review-verification-incremental.yml` | strict candidate filter; removals and new publication remain human-approved |

Review discovery is intentionally not allowed to publish search hits directly.
The search score can be high for nearby-business ads or incidental institution
mentions. The scheduled workflow rotates two stable catalog shards, filters for
parent experience/decision intent, and uploads candidates for curation. This is
the safety boundary that keeps freshness work from lowering review precision.

When an institution disappears from the current official catalog, its approved
reviews leave the active public shards but are not deleted. They move to
`scripts/data/retired-reviews.json`. The weekly catalog job commits that archive,
validates that it does not overlap the active catalog, and automatically restores
the reviews if the same official institution ID reappears later.

## Commands

```bash
# Refresh every public dataset and write the freshness manifest.
pnpm refresh:data

# Validate current files without changing them.
pnpm validate:data

# Re-check current official sources without publishing.
pnpm sync:region-codes -- --check
pnpm sync:kindergartens -- --dry-run
pnpm sync:vacancy -- --test
```

All writers use validated snapshots and atomic replacement. A failed or partial
collection must exit before replacing the last known-good public file. Workflows
commit only the files they own, then poll the production freshness manifest for
up to ten minutes so a repository update without a completed deployment fails
visibly.

## Required GitHub secrets

- `KAKAO_REST_API_KEY` for missing official coordinate fallback
- `NAVER_CLIENT_ID` and `NAVER_CLIENT_SECRET` for review candidate discovery

The vacancy source currently omits an intermediate TLS certificate. The sync
script downloads that issuer certificate, verifies its pinned SHA-256 fingerprint,
subject and validity window, and adds it to Node's normal trusted CA set for this
host; it never disables TLS verification globally.

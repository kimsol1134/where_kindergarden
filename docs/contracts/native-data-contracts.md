# Native Data Contracts

## Shared External Contracts
- Kindergarten catalog remains `/data/kindergartens.json`.
- Reviews remain remote-first with local fallback using `/data/reviews.json`.
- Compare deep link remains `/compare?ids=<comma-separated-kindercodes>`.

## Type Mapping
| Web Type | Native Counterpart | Notes |
| --- | --- | --- |
| `KindergartenRaw` | `KindergartenRaw` | 1:1 payload for bundled JSON |
| `Kindergarten` | `Kindergarten` | derived client model with computed distance |
| `ReviewsData` | `ReviewsData` | same grouped review dictionary by kindergarten id |
| `SearchFilters` | `SearchFilters` | radius, institution filter, quality toggles, sort |
| compare store ids | `CompareSelection` | max 3 ids with toggle semantics |
| favorite store item | `FavoriteItem` | lightweight persisted summary |
| recent query state | `RecentSearch` | label plus optional coordinates |

## Native-only Additions
- Custom URL scheme: `wherekindergarten://compare?ids=...`
- Universal link routing mirrors the web compare URL.
- Native persistence is limited to favorites, recent searches, and compare recovery.

## Explicit Exclusions For Native v1
- Q&A, profile creation, and Supabase write flows stay outside the first native release.
- No field renaming or schema drift is allowed unless the TypeScript and Swift contracts change together.

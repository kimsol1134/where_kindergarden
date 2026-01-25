
# Next Session Prompt: Continue Review Crawling (Seoul/Gyeonggi)

I have been working on collecting kindergarten reviews. 
The current status is:
1.  **Incheon (28)**: Data collected and curated (`public/data/reviews/28.json`).
2.  **Scripts**:
    -   `collect-reviews.ts`: Collects raw reviews (saves by Sido code).
    -   `curate-reviews.ts`: Cleans and saves to `public/data/reviews/[sido_code].json`.
3.  **Data Structure**: Split by Sido code (e.g., `28.json` for Incheon).

**Goal**: Continue crawling for **Seoul (11)** and **Gyeonggi (41)**.

**Tasks**:
1.  Verify the current state by checking `public/data/reviews/`.
2.  Modify `scripts/collect-reviews.ts` to add `--sido` argument for targeting specific Sido codes (to avoid re-crawling Incheon or hitting rate limits).
3.  Run collection for Seoul (11): `pnpm collect:reviews -- --sido 11`
4.  Run collection for Gyeonggi (41): `pnpm collect:reviews -- --sido 41`
5.  Run `pnpm curate:reviews` to process the new raw files.
6.  **IMPORTANT: Use `/review-curation` skill (located at `/Users/solkim/.claude/skills/review-curation/SKILL.md`) to validate and clean the curated reviews.** This skill has strict rules for identifying spam, mismatched reviews, and irrelevant content (music academies, taekwondo gyms, real estate, etc.). Execute `/review-curate` after the initial curation to ensure high-quality data.

Please start by checking `CLAUDE.md` and the `/review-curation/SKILL.md` file.


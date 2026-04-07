# review-autoresearch (네이버 플레이스 추가본 재검증)

PR #62로 네이버 플레이스 리뷰 4,218건 (1,517개 유치원, 17개 시도)이 main에 머지되었습니다.
기존 카파시 루프 audit queue (`scripts/evals/review-audit-v1.jsonl`, 4,277건)에는
이 신규 리뷰가 포함되어 있지 않으므로, audit queue를 재빌드하고 정확도가 다시
gate를 통과하는지 확인합니다.

## Background

- 신규 추가: 네이버 플레이스 리뷰 4,218건 (`source: 'naver_place'`)
- 구조적으로 장소 ID에 직접 연결된 리뷰이므로 오매핑은 원천적으로 발생하지 않음
- 단, **리뷰 본문 자체가 유치원과 무관한 내용일 가능성**은 남아있음 (예: 짧은 별점만, 비방글, 광고성 댓글)
- main의 카파시 루프 결과 (165건 오매칭/스팸 제거, 정확도 89% → 100%)는 이미 적용된 상태

## Scope

기존 `program-review.md`와 동일한 정책면만 수정합니다:

- `src/lib/utils/review-utils.ts`
- `src/lib/utils/review-verification.ts`
- `scripts/lib/review-verification-pipeline.ts`

추가로 네이버 플레이스 전용 처리가 필요할 경우 다음 파일도 허용:

- `scripts/evals/lib/review-audit.ts` — `source === 'naver_place'`인 항목의
  분류 규칙 (예: 본문 길이가 너무 짧은 별점-only 리뷰는 `generic_info`로 분류)

## Metric

- 주 지표: audit queue 기준 `visible_precision`
- 차선 지표: `invalid_visible_count`
- 보조 회귀 지표: sample gold 기준 `binary_f1`
- **신규 추가 지표** (네이버 플레이스 한정):
  - `naver_place_visible_precision` — naver_place source 한정 시각 노출 정밀도
  - `naver_place_filtered_count` — generic_info/advertorial로 분류된 건수
- 승격 조건:
  - `visible_precision >= 0.95` (전체) 유지
  - `naver_place_visible_precision >= 0.90` (네이버 플레이스 한정)
  - 또는 `invalid_visible_count` 감소
  - 둘 다 아니면 discard
- 종료 조건:
  - `audited_count == audit_universe_count`
  - 위 두 precision gate 모두 통과
  - `invalid_visible_count == 0`

## Pre-step: audit queue 재빌드

신규 reviews.json (5,561건, 네이버 플레이스 포함)을 베이스로 audit jsonl을 재생성합니다.
기존 jsonl의 audit 결과(`finalAuditStatus`, `auditReason`, `reviewedBy`)는
`build-review-audit-v1.ts`가 `previousEntries`로 자동 보존합니다.

```bash
# 1. audit queue 재빌드 (네이버 플레이스 4,218건이 새 entry로 추가됨)
pnpm build:review-audit

# 2. 새 entry 수 확인
python3 -c "
import json
with open('scripts/evals/review-audit-v1.jsonl') as f:
    entries = [json.loads(l) for l in f]
total = len(entries)
np = sum(1 for e in entries if e.get('source') == 'naver_place')
unaudited = sum(1 for e in entries if e.get('finalAuditStatus') is None)
np_unaudited = sum(1 for e in entries
                   if e.get('source') == 'naver_place'
                   and e.get('finalAuditStatus') is None)
print(f'전체: {total}건')
print(f'  네이버 플레이스: {np}건')
print(f'미감사: {unaudited}건')
print(f'  네이버 플레이스 미감사: {np_unaudited}건')
"

# 3. 베이스라인 측정 (네이버 플레이스가 모두 unaudited 상태에서)
pnpm audit:review-stats -- --output-json scripts/data-output/review-audit-stats-baseline.json
```

## Evaluation

### Primary

```bash
pnpm audit:review-stats -- --output-json scripts/data-output/review-audit-stats.json
```

### Secondary

```bash
pnpm eval:review-quality -- --output-json scripts/data-output/review-quality-eval.json
```

### 네이버 플레이스 한정 통계 (수동 1줄 스크립트)

```bash
python3 -c "
import json
entries = [json.loads(l) for l in open('scripts/evals/review-audit-v1.jsonl')]
np_entries = [e for e in entries if e.get('source') == 'naver_place']
visible = [e for e in np_entries if e.get('currentShipped')]
verified = [e for e in visible if e.get('finalAuditStatus') == 'verified']
invalid = [e for e in visible if e.get('finalAuditStatus') in ('mismatch', 'advertorial', 'generic_info')]
unaudited = [e for e in visible if e.get('finalAuditStatus') is None]
total_v = len(visible)
print(f'네이버 플레이스 visible: {total_v}')
print(f'  verified: {len(verified)}')
print(f'  invalid: {len(invalid)}')
print(f'  unaudited: {len(unaudited)}')
if total_v > 0:
    precision = len(verified) / total_v
    print(f'  precision (verified/visible): {precision:.4f}')
"
```

## Loop

1. **Baseline 기록**: pre-step 후 audit-stats를 저장하고 시작점으로 삼습니다.
2. **자동 분류 시도**: `pnpm audit:review-autofill -- --source naver_place`
   를 먼저 돌려서 high-confidence 케이스를 자동 처리합니다.
   (autofill 스크립트에 source 필터 옵션이 없으면 추가하거나, 별도 wrapper 작성)
3. **남은 항목 수동 분류**: `pnpm audit:review-batch -- --size 50` 으로 작은
   배치를 받아 한 cycle에 한 번씩 분류합니다.
4. **정책면 수정 (선택)**: 네이버 플레이스 특유의 패턴이 발견되면
   (예: "별점만 있는 1줄 리뷰", "직원 자평", "익명 비방") `review-verification.ts`
   또는 `review-audit.ts`에 분류 규칙을 추가합니다. 1 cycle에 1개 정책 변경.
5. **재평가**: audit-stats + secondary evaluator를 같이 돌리고, 위의 승격 조건을
   만족하면 keep, 아니면 discard합니다.
6. **반복**: 모든 네이버 플레이스 entry가 감사 완료될 때까지 반복.

## 신규 리뷰 분류 가이드 (네이버 플레이스 특화)

기존 `verified | mismatch | advertorial | generic_info | uncertain` 그대로
사용하되, 네이버 플레이스 특성에 따라 다음 휴리스틱을 적용합니다:

- **verified**: 유치원 경험/시설/교사/급식/원비/행사 등 실질 정보가 본문에 있음.
  네이버 플레이스 리뷰는 장소에 구조적으로 연결되어 있으므로 mismatch는
  원천적으로 발생하지 않습니다 → 실질 내용만 있으면 verified.
- **generic_info**: 본문이 너무 짧거나 ("좋아요", "최고", "추천"만 있는 1-2단어
  리뷰), 별점만 있고 텍스트가 없거나, 일반적인 인사말만 있는 경우.
- **advertorial**: 학원이 자체 홍보 댓글을 단 경우, 직원이 자평한 정황이
  명확한 경우 (드물지만 가능).
- **mismatch**: 거의 없어야 정상. 만약 발견되면 → 매핑 단계의 버그이므로
  `scripts/data-output/platform-id-mapping-naver_place.json`을 함께 검토.
- **uncertain**: 위 어디에도 명확히 들어가지 않는 경우.

## 적용 (Apply)

루프 종료 후 audit 결과를 reviews.json에 반영합니다.

```bash
# 1. dry-run으로 영향 확인
pnpm audit:review-apply -- --dry-run

# 2. 실제 적용
pnpm audit:review-apply

# 3. reviews.json 재빌드
pnpm rebuild:reviews

# 4. 최종 카운트 검증
python3 -c "
import json
d = json.load(open('public/data/reviews.json'))
np = sum(1 for kg, rs in d['reviews'].items() for r in rs if r.get('source') == 'naver_place')
print(f'적용 후 네이버 플레이스: {np}건 (시작값 4218)')
print(f'적용 후 전체: {d[\"totalCount\"]}건')
"
```

## Notes

- 네이버 플레이스 리뷰는 같은 페이지 URL을 공유합니다 (`m.place.naver.com/place/{id}/review/visitor`).
  rebuild-reviews-json.ts가 `naver_place`와 `starteacher`는 ID 기반 dedup을
  사용하도록 이미 패치되어 있습니다 — 건드리지 마세요.
- audit queue에서 같은 URL이 여러 번 등장할 수 있으나, `reviewId`로 구분되므로
  audit-batch가 정상 동작합니다.
- 네이버 플레이스 매핑이 잘못된 경우 (드물게 발생) → mismatch 처리하는 대신
  매핑 파일을 직접 수정하여 placeId를 교체하는 것이 더 나은 해결책입니다.
- collision resolver와 generic/advertorial suppressor는 shipped data quality를
  우선합니다.
- `uncertain`과 `unaudited`는 shipped data 기준으로는 remove 취급입니다.

## Branch Strategy

이 작업은 별도 브랜치에서 진행하세요:

```bash
git fetch origin main
git worktree add ../where_kindergarden-naver-place-audit feature/audit-naver-place
cd ../where_kindergarden-naver-place-audit
# 작업 진행
```

# review-autoresearch

유치원 리뷰 품질을 Karpathy식 keep/discard 루프로 개선하는 작업 지침입니다.

## Scope

- 수정 가능한 정책면은 아래 3개뿐입니다.
  - `src/lib/utils/review-utils.ts`
  - `src/lib/utils/review-verification.ts`
  - `scripts/lib/review-verification-pipeline.ts`
- 그 외 파일은 evaluator, 테스트, harness, 결과 로그용입니다.

## Metric

- 주 지표: audit queue 기준 `visible_precision`
- 차선 지표: `invalid_visible_count`
- 보조 회귀 지표: sample gold 기준 `binary_f1`
- 승격 조건:
  - `visible_precision` 상승
  - 또는 `visible_precision` 동률 + `invalid_visible_count` 감소
  - 둘 다 아니면 discard
- 종료 조건:
  - `audited_count == audit_universe_count`
  - `visible_precision >= 0.95`
  - `invalid_visible_count == 0`

## Evaluation

- primary:

```bash
pnpm audit:review-stats -- --output-json scripts/data-output/review-audit-stats.json
```

- secondary:

```bash
pnpm eval:review-quality -- --output-json scripts/data-output/review-quality-eval.json
```

## Loop

1. baseline을 기록합니다.
2. 한 cycle에는 정책면 1개만 수정합니다.
3. audit stats와 secondary evaluator를 같이 돌립니다.
4. 개선되면 keep, 아니면 discard합니다.
5. 전수 audit이 끝나고 precision gate를 만족할 때만 종료합니다.

## Notes

- collision resolver와 generic/advertorial suppressor는 shipped data quality를 우선합니다.
- `uncertain`과 `unaudited`는 shipped data 기준으로는 remove 취급입니다.

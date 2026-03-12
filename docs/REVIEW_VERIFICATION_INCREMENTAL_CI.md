# Review Verification Incremental CI

`review-verification-incremental.yml`은 증분 후기 검증 파이프라인을 GitHub Actions에서 운영하기 위한 workflow입니다.

## 기본 동작

- 수동 실행: `workflow_dispatch`
  - `sido` 기본값: `11,41`
  - `apply_changes` 기본값: `false`
  - `qa_sample_size` 기본값: `5`
- 정기 실행: 매일 07:15 KST
- 기본 모드: review-only
  - `pnpm verify:review-incremental -- --sido 11,41 --no-apply`
  - 결과 JSON + QA sample + state/body-cache snapshot을 artifact로 업로드

## 상태 파일 운영

- bootstrap seed:
  - `scripts/data-output/review-verification-state.json`
  - `scripts/data-output/review-body-cache.json`
- workflow는 위 seed를 기준으로 `.cache/review-verification/`를 초기화합니다.
- 이후 상태 진전은 GitHub Actions cache로 이어받습니다.
- 즉, review-only 실행에서도 신규 평가 결과가 다음 실행에 재사용됩니다.

## Apply 모드

- `apply_changes=true`일 때만 실제 review JSON 반영을 허용합니다.
- workflow는 `main`에 직접 push 하지 않습니다.
- 대신 아래를 apply artifact로 남깁니다.
  - `review-verification-apply.patch`
  - `changed-review-files.txt`
  - 변경된 review JSON 사본
  - 최신 `review-verification-state.json`
  - 최신 `review-body-cache.json`

이 방식은 자동 반영보다 느리지만, 잘못된 제거를 사람이 검토할 수 있어서 더 안전합니다.

## 권장 운영 절차

1. schedule 또는 수동 실행은 기본적으로 `apply_changes=false`로 돌립니다.
2. workflow summary에서 `newlyEvaluatedCount`, `newlyVerified`, `newlyRemoved`를 확인합니다.
3. 신규 검토가 있으면 artifact의 QA sample과 full results를 검수합니다.
4. 반영이 필요할 때만 같은 입력으로 `apply_changes=true`를 다시 실행합니다.
5. apply artifact의 patch/변경 파일을 기준으로 PR을 만듭니다.

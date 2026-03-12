# 후기 검증 파이프라인 작업 인계

## 마지막 작업 일시
2026-03-12

## 완료된 작업
- [x] 서울/경기 후기 링크용 다단계 검증 파이프라인 설계
- [x] `src/lib/utils/review-verification.ts` 추가
  - title/snippet 기반 metadata 판정
  - body text 기반 최종 판정
  - `verified | mismatch | advertorial | generic_info | uncertain` 상태 정의
- [x] `src/lib/utils/review-html.ts` 추가
  - Naver Blog/Cafe HTML에서 판정용 텍스트 추출
- [x] `scripts/extract-review-verification-candidates.ts` 추가
  - 전체 metadata 결과 + 저신뢰 candidate + body-check 입력 생성
- [x] `scripts/batch-scrape-content.ts` 확장
  - 기존 `--sido` raw HTML 모드 유지
  - 새 `--input` 본문 텍스트 추출 모드 추가
- [x] `scripts/finalize-review-verification.ts` 추가
  - metadata + body + optional LLM 결과 merge
  - uncertain/LLM queue 출력
- [x] `scripts/apply-review-verification.ts` 추가
  - reject 상태만 제거
  - split 파일 재생성 + 통합 `reviews.json` 재빌드 지원
- [x] 운영형 증분 검증 파이프라인 추가
  - `scripts/verify-review-incremental.ts`
  - `scripts/data-output/review-verification-state.json`
  - `scripts/data-output/review-body-cache.json`
  - normalized URL + review fingerprint 기반 재사용
  - run report + QA sample JSON 출력
- [x] apply 로직 공통화
  - `scripts/lib/review-verification-apply.ts`
  - 기존 `scripts/apply-review-verification.ts`도 동일 helper 사용
- [x] 증분 판정용 순수 유틸/테스트 추가
  - `src/lib/utils/review-verification-incremental.ts`
  - `src/lib/utils/__tests__/review-verification-incremental.test.ts`
- [x] `scripts/prompts/llm-review-validation.md` 업데이트
  - uncertain 큐 전용 프롬프트 추가
- [x] 유닛 테스트 추가
  - `src/lib/utils/__tests__/review-verification.test.ts`

## 진행 중인 작업
- 11/41 운영형 증분 bootstrap 완료
  - legacy full 결과(`review-verification-results-11-41.json`, `review-body-scrape-11-41.json`) 기반으로
    `review-verification-state.json`, `review-body-cache.json` 생성 완료
  - 현재 11/41 데이터는 전부 기존 판정 재사용 상태
  - 다음 실행부터는 신규/변경 리뷰가 생길 때만 증분 평가됨
- 기존 리뷰 UI/store 테스트는 이번 작업과 무관하게 별도 실패 상태
  - `reviewStore`, `ReviewLinkCard`, `ReviewLinkList`, `ReviewPreview`
  - React/Zustand 테스트 환경 이슈로 보이며 이번 변경 범위는 아님

## 검증 결과
- `./node_modules/.bin/vitest run src/lib/utils/__tests__/review-verification.test.ts` 통과
- `./node_modules/.bin/vitest run src/lib/utils/__tests__/review-verification-incremental.test.ts` 통과
- `./node_modules/.bin/tsc --noEmit --incremental false` 통과
- `pnpm tsx scripts/verify-review-incremental.ts --sido 11 --limit 5 --dry-run --skip-scrape --no-apply`
  - 결과/리포트/QA sample 파일 생성 확인
- `pnpm tsx scripts/verify-review-incremental.ts --sido 11 --limit 5 --skip-scrape --no-apply` 재실행
  - 1건 `reused`
  - 4건 `newlyEvaluated`
  - 과거 `uncertain` 재평가 규칙 확인
- `pnpm verify:review-incremental -- --sido 11,41 --dry-run --no-apply`
  - `2475`건 전체 재사용
  - `newlyEvaluated 0`, `newlyScraped 0`
- `pnpm verify:review-incremental -- --sido 11,41 --no-apply`
  - 운영용 `state/body-cache/report/qa-samples` 실제 저장 완료
- 동일 명령 재실행
  - `state source: state`
  - `body cache source: body-cache`
  - bootstrap이 아니라 저장된 운영 state/cache를 읽는 것까지 확인
- 주의:
  - `pnpm test` 전체 스위트는 기존 리뷰 컴포넌트/스토어 테스트 실패로 통과하지 않음
  - 이번 변경 유틸 테스트는 별도 direct vitest 실행으로 검증함

## 다음에 할 작업
1. 신규 리뷰 수집/병합 후 `pnpm verify:review-incremental -- --sido 11,41` 실행
2. `review-verification-run-report.json`에서 `newlyEvaluatedCount`가 0보다 크면
   `review-verification-qa-samples-11-41.json`로 샘플 검수
3. 실제 반영이 필요할 때는 기본 명령 그대로 실행
   - 기본은 apply 포함
   - 사전 검토만 원하면 `--no-apply`
4. 필요 시 `verify:review-incremental`을 주기 실행용 automation이나 CI job으로 연결

## 주요 파일
- `src/lib/utils/review-verification.ts`
- `src/lib/utils/review-html.ts`
- `src/lib/utils/review-verification-incremental.ts`
- `src/lib/utils/__tests__/review-verification-incremental.test.ts`
- `scripts/extract-review-verification-candidates.ts`
- `scripts/batch-scrape-content.ts`
- `scripts/finalize-review-verification.ts`
- `scripts/apply-review-verification.ts`
- `scripts/lib/review-verification-apply.ts`
- `scripts/verify-review-incremental.ts`
- `scripts/prompts/llm-review-validation.md`

## 현재 브랜치
codex/feature-review-verification-incremental

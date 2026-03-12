# 후기 검증 파이프라인 작업 인계

## 마지막 작업 일시
2026-03-11

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
- [x] `scripts/prompts/llm-review-validation.md` 업데이트
  - uncertain 큐 전용 프롬프트 추가
- [x] 유닛 테스트 추가
  - `src/lib/utils/__tests__/review-verification.test.ts`

## 진행 중인 작업
- body scrape 실제 실행은 아직 안 함
  - 네트워크/Playwright 실행이 필요한 단계
  - 현재는 metadata 기준 결과와 dry-run 반영까지만 검증 완료

## 검증 결과
- `pnpm test src/lib/utils/__tests__/review-verification.test.ts` 통과
- `pnpm exec tsc --noEmit --incremental false` 통과
- `pnpm tsx scripts/extract-review-verification-candidates.ts --sido 11,41` 실행 완료
  - 전체 4,773건 분석
  - body check 후보 2,507건
- `pnpm tsx scripts/batch-scrape-content.ts --input scripts/data-output/review-body-check-11-41.json --output scripts/data-output/review-body-scrape-11-41.json --concurrency 8`
  - 2,507건 전부 성공 스크랩
- `pnpm tsx scripts/finalize-review-verification.ts --metadata ... --body ...` 실행 완료
  - 최종 상태:
    - verified 2,475
    - advertorial 1,665
    - generic_info 415
    - mismatch 218
    - uncertain 0
- `pnpm tsx scripts/apply-review-verification.ts --input ...` 실반영 완료
  - 1차 반영 후 fallback 규칙 추가
  - Codex가 남은 uncertain 묶음 + 단건 217건까지 직접 읽고 decision merge 진행
  - 현재 유지:
    - verified 2,475건
    - uncertain 0건
  - 현재 최종 파일:
    - 서울 `11.json`: 700건 / 302개 유치원
    - 경기 `41.json`: 1,775건 / 684개 유치원
    - 통합 `public/data/reviews.json`: 5,506건 / 2,264개 유치원

## 다음에 할 작업
1. 필요 시 `verified` 샘플링 검토로 과잉 제거/과잉 유지 여부 점검
2. 이후 신규 리뷰 수집분에 대해 같은 파이프라인 재실행
3. 원하면 지금 변경분 커밋/정리

## 주요 파일
- `src/lib/utils/review-verification.ts`
- `src/lib/utils/review-html.ts`
- `scripts/extract-review-verification-candidates.ts`
- `scripts/batch-scrape-content.ts`
- `scripts/finalize-review-verification.ts`
- `scripts/apply-review-verification.ts`
- `scripts/prompts/llm-review-validation.md`

## 현재 브랜치
codex/feature-review-verification-pipeline

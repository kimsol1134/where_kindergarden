# review-autoresearch (Incheon Naver collection)

Karpathy식 keep/discard 루프로 인천 유치원 네이버 후기 링크를 늘리는 수집 프로그램입니다.

## Goal

- 인천(`sidoCode=28`) 유치원 후기 링크 coverage를 높입니다.
- 단, global regression precision gate를 깨면 해당 cycle은 discard 합니다.
- verifier/evaluator는 judge입니다. 이 루프에서 verifier를 수정하지 않습니다.

## Mutable surfaces

- `scripts/review-autoresearch/program-collect.md`
- `scripts/review-autoresearch/lib/collection-policy.ts`

## Fixed engine

- Playwright 검색/열람 엔진
- session-local working dataset merge
- global regression evaluator

## Keep / discard

- hard gates:
  - `global_binary_precision >= 0.99`
  - `global_binary_f1 >= 0.995`
  - `added_link_verified_rate >= 0.95`
  - `cross_kindergarten_error_count == 0`
  - `qna_summary_completeness == 1.0`
- gates 통과 후 `research_score`가 상승하면 keep
- 아니면 discard + best snapshot restore

## Collection defaults

- cycle size: `20`
- queue order:
  - 현재 링크 `0개`
  - 현재 링크 `1-2개`
  - 현재 링크 `3개 이상`
- query set:
  - `"<유치원명>" "<시군구>" 후기`
  - `"<유치원명>" 입학설명회`
  - `"<유치원명>" 보내보니`
  - `"<유치원명>" 선생님 급식 시설`
  - `"<유치원명>" 보내시는 분`
  - `"<유치원명>" 어떤가요`

## Acceptance

- 정확한 유치원명 매칭 필수
- 공식 블로그/카페 소스 reject
- 다중 기관 비교글 reject
- 질문형 카페 글은 질문/답변 둘 다 읽히고 요약 가능할 때만 keep
- raw batch는 session 디렉터리에만 저장
- shipped `public/data/reviews.json` 은 명시적 promote 전까지 수정하지 않음

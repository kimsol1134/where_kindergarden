# 리뷰 수집/정제 스킬

유치원 후기 데이터의 수집, 정제, 검증을 단일 명령으로 실행합니다.

## Trigger
- `/review` 명령어로 실행

## 서브커맨드

### `/review collect --sido {code}` — 수집 + 정제 전체 파이프라인

전체 워크플로우(수집 → 큐레이션 → 스팸필터 → 분할)를 순서대로 실행합니다.

1. 시도 코드 유효성 확인 (아래 시도 코드 테이블 참조)
2. 환경 변수 확인: `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET` 필수
3. 실행:
   ```bash
   pnpm collect:all -- --sido {code}
   ```
4. 완료 후 결과 확인:
   ```bash
   # 생성된 리뷰 파일 확인
   cat public/data/reviews/{code}.json | jq '.totalCount, .kindergartenCount'
   ```

**옵션:**
- `--test`: 테스트 모드 (유치원 3개만 수집)
  ```bash
  pnpm collect:all -- --sido {code} --test
  ```

**V3 수집기 직접 사용** (지역 검증 + 엄격 필터링이 필요한 경우):
```bash
pnpm collect:reviews:v3 -- --sido {code}            # 기본 (2점 이상)
pnpm collect:reviews:v3 -- --sido {code} --strict    # 엄격 (3점 이상)
```

### `/review clean [--sido {code}]` — 기존 데이터 정제

이미 수집된 리뷰 데이터에서 스팸/중복/무관 콘텐츠를 제거합니다. 각 단계를 순서대로 실행합니다.

**단계 1: 큐레이션** (블랙리스트 키워드, 무관 콘텐츠 제거)
```bash
pnpm curate:reviews
```

**단계 2: 스팸 필터링** (패턴 기반 자동 필터)
```bash
pnpm filter:reviews -- --sido {code}
```

**단계 3: 시군구 분할** (시도 파일을 시군구별로 분할)
```bash
pnpm split:reviews -- --sido {code}
```

**전체 리빌드** (모든 시군구 데이터를 시도 파일로 재구성):
```bash
pnpm rebuild:reviews
```

**AI 큐레이션** (Subagent 사용, 정밀 정제):
- `review-curator` Subagent를 호출하여 사람 수준의 판단으로 스팸/무관 콘텐츠를 식별합니다.
- `.claude/agents/review-curator.md` 참조

### `/review validate --sido {code}` — 본문 기반 검증

수집된 URL의 실제 본문을 추출하여 유치원 후기인지 검증합니다.

> **참고**: 이 기능은 Jina Reader API 키와 review-validator 에이전트가 필요합니다.
> 현재 `fetch-review-content`, `apply-validation` 스크립트가 미구현 상태입니다.
> 수동 검증이 필요하면 `review-curator` Subagent를 사용하세요.

**대안 — Chrome 반자동 수집 + 보강:**
```bash
# 1. Chrome으로 수집한 URL을 네이버 API로 보강
pnpm enrich:chrome-reviews -- --input chrome-reviews-*.json --sido {code}
pnpm enrich:chrome-reviews -- --input chrome-reviews-*.json --sido {code} --dry-run

# 2. 보강된 결과를 기존 데이터에 병합
pnpm merge:chrome-reviews -- --input enriched-reviews-*.json --sido {code}
pnpm merge:chrome-reviews -- --input enriched-reviews-*.json --sido {code} --dry-run
```

### `/review status` — 현재 리뷰 현황 요약

`public/data/reviews/*.json` 파일들을 읽어서 시도별 현황을 표시합니다.

1. `public/data/reviews/` 디렉토리의 모든 `*.json` 파일을 읽기
2. 각 파일에서 `totalCount`, `kindergartenCount`, `version`, `lastCuratedAt` 추출
3. 아래 형식으로 요약 출력:

```
시도    | 리뷰 수 | 유치원 수 | 마지막 업데이트 | 큐레이션
--------|---------|----------|---------------|--------
서울(11) | 1,562  | 423      | 2026-01-28    | 2026-01-28
경기(41) | 2,654  | 891      | 2026-01-25    | 2026-01-25
인천(28) | 185    | 72       | 2026-01-20    | -
...
```

**실행 방법**: 별도 스크립트 없이 Claude가 직접 파일을 읽고 집계합니다.

## 시도 코드 매핑 테이블

| 코드 | 시도명 | 코드 | 시도명 |
|------|--------|------|--------|
| `11` | 서울특별시 | `36` | 세종특별자치시 |
| `26` | 부산광역시 | `41` | 경기도 |
| `27` | 대구광역시 | `43` | 충청북도 |
| `28` | 인천광역시 | `44` | 충청남도 |
| `29` | 광주광역시 | `46` | 전라남도 |
| `30` | 대전광역시 | `47` | 경상북도 |
| `31` | 울산광역시 | `48` | 경상남도 |
| `50` | 제주특별자치도 | | |

> **참고**: 강원(`51`), 전북(`52`)은 특별자치도 전환으로 코드가 변경됨.
> 기존 데이터는 `42`(강원), `45`(전북) 코드를 사용할 수 있음.

## 환경 변수 요구사항

| 변수 | 용도 | 필수 |
|------|------|------|
| `NAVER_CLIENT_ID` | 네이버 검색 API | collect, enrich |
| `NAVER_CLIENT_SECRET` | 네이버 검색 API | collect, enrich |
| `GOOGLE_CSE_API_KEY` | Google 검색 | 선택 |
| `GOOGLE_CSE_CX` | Google 검색 엔진 ID | 선택 |

## 데이터 파일 경로

| 경로 | 설명 |
|------|------|
| `public/data/reviews/{sido_code}.json` | 시도별 리뷰 데이터 (앱에서 사용) |
| `public/data/reviews/{sido_code}/` | 시군구별 분할 데이터 |
| `public/data/kindergartens.json` | 유치원 마스터 데이터 |
| `scripts/data-output/` | 스크립트 중간 산출물 |

## 관련 에이전트

| 에이전트 | 파일 | 역할 |
|---------|------|------|
| review-curator | `.claude/agents/review-curator.md` | AI 큐레이션 (스팸/무관 콘텐츠 판별) |
| chrome-review-extractor | `.claude/agents/chrome-review-extractor.md` | Chrome 수집 URL 배치 추출 |

## pnpm 스크립트 요약

| 명령어 | 설명 |
|--------|------|
| `pnpm collect:all -- --sido {code}` | 통합 파이프라인 (수집→큐레이션→필터→분할) |
| `pnpm collect:reviews -- --sido {code}` | 수집만 (v2) |
| `pnpm collect:reviews:v3 -- --sido {code}` | 수집만 (v3, 지역 검증) |
| `pnpm curate:reviews` | 큐레이션 (블랙리스트 필터) |
| `pnpm filter:reviews -- --sido {code}` | 스팸 필터링 |
| `pnpm split:reviews -- --sido {code}` | 시군구 분할 |
| `pnpm rebuild:reviews` | 시군구→시도 재구성 |
| `pnpm enrich:chrome-reviews -- --input {file} --sido {code}` | Chrome 수집 URL 보강 |
| `pnpm merge:chrome-reviews -- --input {file} --sido {code}` | Chrome 결과 병합 |

## 안전 규칙

- 수집 전 환경 변수 존재 확인 (`NAVER_CLIENT_ID` 등)
- 대량 수집 시 API 쿼터 주의 (네이버 일 25,000건)
- 정제/삭제 전 `--dry-run` 옵션으로 영향 범위 확인
- 데이터 덮어쓰기 전 git status 확인하여 미커밋 변경 없는지 체크

# 유치원 후기 데이터 검증 프롬프트

## 2026-03 검증 파이프라인용 권장 흐름

이 프롬프트 파일은 이제 전체 리뷰 파일 전수 검토보다, 자동 파이프라인에서 `uncertain`으로 남은 링크를 재판정하는 용도로 사용합니다.

### 입력 파일

- `scripts/data-output/review-verification-llm-queue-11-41.json`
- 항목별 포함 정보:
  - `reviewId`
  - `kindergartenId`
  - `kindergartenName`
  - `kindergartenAddress`
  - `title`
  - `snippet`
  - `bodyExcerpt`
  - `whyFlagged`
  - `autoReasons`

### LLM에게 요구할 것

아래 3가지만 요구합니다.

1. `verdict`
   - `verified`
   - `mismatch`
   - `advertorial`
   - `generic_info`
   - `uncertain`
2. `reason`
   - 한두 문장으로 왜 그렇게 판단했는지
3. `confidence`
   - `0`~`1` 사이 숫자

### 보수적 판정 원칙

- 해당 유치원명이 직접 확인되고 실제 경험/설명회/재원/교육과정/급식/버스/교사 관련 정보가 있으면 `verified`
- 다른 유치원이 실제 주제이거나 지역/기관이 어긋나면 `mismatch`
- 업체 홍보, 학원 광고, 행사 대행, 부동산, 맛집, 시장 후기 등은 `advertorial`
- 정책 안내, 지원금, 일반 지역 정보, 질문글, 리스트글은 `generic_info`
- 조금이라도 애매하면 `uncertain`

### 권장 프롬프트

```text
첨부한 JSON은 유치원 후기 자동 검증 파이프라인에서 `uncertain`으로 남은 링크들입니다.
각 항목에 대해 아래 3개만 판단해주세요.

1. verdict: verified | mismatch | advertorial | generic_info | uncertain
2. reason: 1~2문장
3. confidence: 0~1 숫자

판정 기준:
- verified: 해당 유치원이 실제 주제이고, 경험담/설명회/재원/교육과정/급식/버스/교사/원비 등 실질 정보가 있음
- mismatch: 다른 유치원/어린이집이 실제 주제이거나 잘못 연결됨
- advertorial: 업체 홍보, 학원 광고, 행사대행, 부동산, 맛집/시장/일반 상업성 글
- generic_info: 정책 안내, 지원금, 질문글, 일반 정보글, 리스트형 모음
- uncertain: 확정 근거 부족

반드시 아래 JSON만 반환해주세요:
{
  "decisions": [
    {
      "reviewId": "rev-XXXX",
      "verdict": "verified",
      "confidence": 0.91,
      "reason": "해당 유치원 설명회 경험과 급식/교사 정보가 본문에 직접 나옵니다."
    }
  ]
}

보수적으로 판단해주세요. 확신이 낮으면 uncertain으로 두세요.
```

### 반영 규칙

- `scripts/finalize-review-verification.ts --llm <result.json>` 으로 merge
- 기본 임계값은 `confidence >= 0.8`
- `uncertain`은 자동 삭제하지 않음

## 사용법

파일을 첨부하고 아래 프롬프트를 복사해서 사용하세요.
파일이 크므로 2그룹으로 나눠서 검증하는 것을 권장합니다.

---

## 그룹 A (소형 지역 — 13개 파일, ~2.2MB)

첨부 파일:
- `26.json` (부산)
- `27.json` (대구)
- `28.json` (인천)
- `29.json` (광주)
- `30.json` (대전)
- `31.json` (울산)
- `36.json` (세종)
- `43.json` (충북)
- `44.json` (충남)
- `46.json` (전남)
- `47.json` (경북)
- `48.json` (경남)
- `50.json` (제주)

## 그룹 B (대형 지역 — 2개 파일, ~4.9MB)

첨부 파일:
- `11.json` (서울)
- `41.json` (경기)

---

## 프롬프트 (그룹 A용)

```
첨부된 JSON 파일들은 유치원/어린이집 학부모 후기 데이터입니다.
각 파일은 한국의 시도별(부산, 대구, 인천 등) 후기를 담고 있습니다.

이미 1차 자동 필터링(패턴 기반)과 2차 맥락 기반 큐레이션을 거쳤지만,
아직 남아있을 수 있는 부적절한 후기를 찾아주세요.

## 데이터 구조

```json
{
  "version": "날짜",
  "totalCount": 숫자,
  "kindergartenCount": 숫자,
  "reviews": {
    "유치원UUID": [
      {
        "id": "rev-XXXX",
        "title": "블로그/카페 글 제목",
        "url": "원본 URL",
        "source": "naver_blog | naver_cafe | google",
        "snippet": "본문 일부 발췌",
        "date": "작성일"
      }
    ]
  }
}
```

## 제거 대상 (찾아야 할 것)

1. **잘못 연결된 후기**: 다른 유치원/다른 지역 글이 잘못 매핑된 경우
   - 예: 서울 유치원인데 경기도 유치원 후기가 들어간 경우
   - 예: "A유치원" 키 아래에 "B유치원" 후기가 매핑된 경우

2. **업체 광고/홍보**: 유치원 후기가 아닌 업체 마케팅
   - 예: 음식배달, 미용, 마사지, 인테리어, 부동산, 마술공연 섭외

3. **학원 (유치원이 아님)**: 태권도, 피아노, 축구클럽, 발레, 미술학원 등

4. **무관한 콘텐츠**: 유치원과 관련 없는 글
   - 맛집, 카페, 등산, 여행, 키즈카페, 영화, 뮤지컬
   - 부동산 매매/전세/임대
   - 단순히 유치원 근처 위치만 언급한 글

5. **스팸/저품질**: 내용 없는 글, 반복 홍보, 스크래핑 오류

## 유지해야 할 것 (제거하면 안 됨)

- 유치원 입학설명회, 체험수업, 원비, 교육과정 후기
- 유치원 졸업/수료 후기
- 유치원 행사(운동회, 학예회, 소풍) 후기
- 유치원 선택 비교/추천 글
- 어린이집 관련 후기 (어린이집도 포함 대상)
- 방과후 프로그램 후기

## 출력 형식

파일별로 제거해야 할 review ID 목록을 아래 형식으로 정리해주세요:

```json
{
  "26.json": {
    "reason_summary": "총 X건 제거 권장",
    "removals": [
      {
        "id": "rev-XXXX",
        "kindergartenId": "UUID",
        "title": "해당 리뷰 제목",
        "reason": "제거 사유 (간단히)"
      }
    ]
  },
  "27.json": { ... }
}
```

제거할 것이 없는 파일은 빈 배열로 표시해주세요.
애매한 경우 "uncertain" 필드로 따로 분류해주세요.

보수적으로 판단해주세요 — 확실한 스팸/무관 콘텐츠만 제거 대상으로 하고,
조금이라도 유치원 관련 내용이 있으면 유지합니다.
```

---

## 프롬프트 (그룹 B용 — 서울/경기)

```
첨부된 JSON 파일들은 유치원/어린이집 학부모 후기 데이터입니다.
- 11.json: 서울 (1,811건)
- 41.json: 경기 (3,348건)

이미 1차 자동 필터링과 2차 맥락 기반 큐레이션을 거쳤지만,
아직 남아있을 수 있는 부적절한 후기를 찾아주세요.

## 데이터 구조

```json
{
  "reviews": {
    "유치원UUID": [
      {
        "id": "rev-XXXX",
        "title": "글 제목",
        "snippet": "본문 발췌",
        "source": "naver_blog | naver_cafe | google"
      }
    ]
  }
}
```

## 제거 대상

1. **잘못 연결**: 다른 유치원/다른 지역 후기가 잘못 매핑됨
2. **업체 광고**: 유치원 후기가 아닌 업체 마케팅 (배달, 미용, 부동산 등)
3. **학원**: 태권도, 피아노, 미술학원 등 (유치원 아님)
4. **무관한 글**: 맛집, 여행, 등산, 영화, 부동산 매매 등
5. **서울↔경기 오염**: 서울 파일에 경기 후기, 경기 파일에 서울 후기

## 유지 대상

- 입학설명회, 체험수업, 원비, 교육과정 후기
- 졸업/수료, 행사(운동회, 학예회) 후기
- 유치원 비교/추천 글, 어린이집 후기

## 출력 형식

파일별 제거 대상 review ID를 JSON으로 정리:

```json
{
  "11.json": {
    "reason_summary": "총 X건 제거 권장",
    "removals": [
      { "id": "rev-XXXX", "kindergartenId": "UUID", "title": "제목", "reason": "사유" }
    ]
  },
  "41.json": { ... }
}
```

데이터가 많으므로 전수 검토가 어려우면 sampling 방식으로 검토하고,
발견한 패턴을 공유해주세요. 보수적 판단 — 확실한 것만 제거 권장.
```

---

## 검증 결과 적용 스크립트

LLM이 반환한 JSON을 `scripts/data-output/llm-validation-result.json`에 저장 후:

```bash
# 적용 스크립트 (추후 작성)
npx tsx scripts/apply-llm-validation.ts --input scripts/data-output/llm-validation-result.json --dry-run
```

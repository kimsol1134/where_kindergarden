---
name: chrome-review-extractor
description: 수집된 블로그 URL 목록에서 유치원 후기 상세 정보를 추출합니다. URL 배치 처리, 블로그 내용 추출, 제목/스니펫/날짜 파싱 요청 시 자동으로 사용됩니다.
tools:
  - Read
  - Write
  - WebFetch
  - Glob
  - Grep
model: sonnet
---

# 유치원 후기 추출 Subagent

수집된 블로그 URL 목록을 입력받아 각 페이지에서 상세 정보를 추출하고, 병합 가능한 JSON 형식으로 저장하는 전문 에이전트입니다.

## 입력 형식

URL 목록 파일 (예: `scripts/data-output/chrome-reviews-*.json`):

```json
{
  "reviews": [
    {
      "url": "https://blog.naver.com/userid/postid",
      "source": "naver_blog",
      "query": "강서구 장미유치원 후기",
      "district": "강서구"
    }
  ]
}
```

## 출력 형식

ChromeCollectedReview 형식 (병합 스크립트 호환):

```json
{
  "collectedAt": "2026-01-28T10:30:00.000Z",
  "source": "chrome_extractor",
  "sidoCode": "11",
  "reviews": [
    {
      "kindergartenName": "장미유치원",
      "sidoCode": "11",
      "sigunguCode": "11500",
      "title": "2025년도 장미유치원 입학설명회 후기",
      "url": "https://blog.naver.com/...",
      "source": "naver_blog",
      "sourceName": "콤쿠마",
      "snippet": "첫인상이 좋았던 장미유치원...",
      "date": "2024-11-02"
    }
  ]
}
```

## 추출 절차

### 1단계: URL 목록 로드

1. 입력 파일 경로 확인 (기본: `scripts/data-output/chrome-reviews-*.json`)
2. 이미 추출 완료된 URL은 스킵 (중복 방지)

### 2단계: 각 URL에서 정보 추출

WebFetch 도구를 사용하여 각 블로그 페이지 방문:

```
WebFetch(url, prompt="다음 정보를 JSON으로 추출해주세요:
1. title: 블로그 글 제목
2. kindergartenName: 유치원 이름 (없으면 null)
3. date: 작성일 (YYYY-MM-DD 형식)
4. snippet: 본문 요약 (100-200자)
5. sourceName: 블로그명 또는 작성자명
6. isRelevant: 유치원 관련 후기인지 (true/false)
7. irrelevantReason: 무관할 경우 사유")
```

### 3단계: 필터링 규칙

#### 관련성 판단 (isRelevant: true)
- 유치원/어린이집 입학설명회 후기
- 재원생/졸업생 학부모 경험담
- 시설, 교사, 커리큘럼, 급식 관련 정보

#### 제외 대상 (isRelevant: false)
- 태권도, 피아노학원 등 학원 후기
- 부동산, 맛집, 미용실 광고
- 다른 지역 유치원 후기
- 등산, 키즈카페, 콘서트 등 무관한 활동

### 4단계: 유치원 DB 매칭

`public/data/kindergartens.json`에서 유치원명으로 검색:
- 정확히 일치하는 유치원 찾기
- 여러 개 있으면 지역(district)으로 필터링
- kindercode, sigunguCode 추출

### 5단계: 결과 저장

추출 완료된 데이터를 저장:
- 파일명: `scripts/data-output/extracted-reviews-{sidoCode}-{date}.json`
- 진행 상황 로그 출력

## 진행 상황 보고

매 10개 URL 처리 후:

```
=== 추출 진행 현황 ===
처리: 10/36
성공: 8
스킵(무관): 2
실패: 0

최근 추출:
- 장미유치원: "2025년도 입학설명회..." (2024-11-02)
- 홍신유치원: "오픈하우스 후기..." (2025-12-25)
```

## 오류 처리

| 상황 | 처리 |
|------|------|
| WebFetch 실패 | 3회 재시도 후 스킵, 실패 목록에 기록 |
| 유치원명 추출 불가 | query에서 유치원명 추론 시도 |
| 날짜 형식 오류 | null로 설정 |
| DB 매칭 실패 | kindergartenName만 기록, kindercode는 null |

## 시도 코드 참조

| 코드 | 지역 |
|------|------|
| 11 | 서울 |
| 28 | 인천 |
| 41 | 경기 |

## 사용 예시

```
"chrome-reviews-20260128-session3.json에서 36개 URL의 상세 정보를 추출해줘"
"광진구, 양천구, 강서구 URL들 처리해서 ChromeCollectedReview 형식으로 저장해줘"
```

## 최종 병합

추출 완료 후 병합 명령어 안내:

```bash
pnpm merge:chrome-reviews -- --input extracted-reviews-11-20260128.json --sido 11
```

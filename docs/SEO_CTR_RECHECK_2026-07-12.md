# SEO/CTR 재점검 기록 - 2026-07-12

## 실행 배경

2026-06-28에 설정한 자동화 `seo-ctr-2`가 실행되어, 네이버 서치어드바이저와 Google Search Console 데이터를 다시 확인하고 목표 달성 여부를 평가하기로 했다.

## 기준선

2026-06-28 네이버 서치어드바이저 기준:

- 최근 30일 클릭: 5
- 최근 30일 노출: 약 7,600
- 평균 CTR: 0.7%
- 홈(`/`) 문서: 클릭 5, 노출 737, CTR 0.7%
- 주요 무클릭 노출 쿼리:
  - `유치원 우리동네`: 노출 285, 클릭 0
  - `주변 유치원`: 노출 43, 클릭 0
  - `주변 유치원 찾기`: 노출 32, 클릭 0
  - `내주변 유치원`: 노출 28, 클릭 0
  - `유치원 우리동네 지도`: 노출 24, 클릭 0

## 이번 재점검에서 확인한 사실

로그인형 네이버 서치어드바이저와 Google Search Console의 최신 수치는 현재 자동화 실행 환경에서 직접 접근할 수 없었다. 대신 프로덕션 HTML을 직접 확인했다.

확인 시점의 프로덕션 홈 HTML은 2026-06-28 개선안과 달랐다.

- 홈 title: `유치원 알리미 - 우리동네 유치원, 찾기·비교·후기`
- 홈 H1: `우리 아이 첫 유치원, 가장 쉽고 똑똑하게 찾는 법`
- 검색 페이지 title: `유치원 검색 | 유치원 알리미 - 우리동네 유치원`
- 비교 페이지 OG 이미지: `https://where-kindergarden.vercel.app/og-image.png`
- 검색 페이지는 OG 이미지가 HTML에 명시되지 않았다.

따라서 2026-06-28의 CTR 개선안은 운영 배포본에 유지되지 않았고, 목표 미달 여부를 검색 데이터만으로 판단하기 전에 운영 회귀를 먼저 수정해야 하는 상태였다.

## 판단

이번 상태는 "개선안이 실패했다"로 해석하면 안 된다. 개선안이 실제 운영 HTML에 남아 있지 않았기 때문에 검색엔진이 목표한 title/H1/OG 신호를 안정적으로 수집할 수 없는 상태였다.

가장 큰 문제는 세 가지다.

1. 홈 title이 `내 주변 유치원`, `주변 유치원 찾기`, `우리동네 유치원` 쿼리를 정면으로 받지 못했다.
2. 홈 H1이 부모의 검색 의도보다 브랜드성 감성 문구에 가까웠다.
3. `/search`, `/compare`의 OG 이미지 신호가 일관되지 않았다.

## 적용한 수정

### 홈

- title: `내 주변 유치원 찾기 | 우리동네 유치원`
- description: `현재 위치나 주소 기준으로 가까운 유치원을 찾고 지도, 거리, 정원, 셔틀버스, 방과후, 급식 정보를 한눈에 비교하세요.`
- H1: `내 주변 유치원 찾기, 지도에서 거리순으로 비교`

이유:

- 네이버에서 이미 노출되는 `유치원 우리동네`, `주변 유치원`, `내주변 유치원` 계열 쿼리를 동시에 받기 위한 최소 변경이다.
- 앱 이름은 유지하면서, 부모가 검색 결과에서 기대하는 "가까운 유치원 찾기"를 첫 화면과 맞췄다.

### 검색 페이지

- title: `내 주변 유치원 검색 지도`
- description: 현재 위치/주소, 지도, 거리순, 국공립·사립, 셔틀버스, 여유정원 조건을 명시
- OG/Twitter 이미지: `og-image-20260612.png`로 명시

이유:

- 실제 전환이 일어나는 페이지이므로 "검색 지도"와 조건 비교를 검색 결과에 바로 보여준다.
- 미리보기 카드에서 이미지가 누락되지 않게 한다.

### 비교 페이지

- title: `유치원 비교 - 거리·정원·셔틀 한눈에`
- OG/Twitter 이미지: `og-image-20260612.png`로 통일

이유:

- 비교 페이지의 클릭 이유를 일반적인 `유치원 비교`보다 분명하게 만든다.

### 구조화 데이터

- 실제 지원하지 않는 `q` 기반 `SearchAction` 제거
- `WebSite` JSON-LD에 `alternateName`과 대표 이미지 추가

이유:

- 구조화 데이터는 실제 기능과 맞아야 한다.
- 잘못된 검색 URL 마크업은 검색엔진이 무시하거나 품질 신호를 약하게 만들 수 있다.

## 다음 확인 기준

검색엔진이 수정된 HTML을 다시 수집한 뒤 최소 2주를 더 본다.

- 다음 권장 확인일: 2026-07-26
- 목표:
  - 홈 CTR 1.5% 이상
  - `유치원 우리동네` CTR 0% 탈출
  - `주변 유치원`, `주변 유치원 찾기`, `내주변 유치원`, `내 주변 유치원`, `가까운 유치원` 계열에서 클릭 발생
  - `/search` 문서 노출 발생

## 수동 확인 필요

다음 데이터는 로그인된 브라우저에서 직접 확인해야 한다.

- 네이버 서치어드바이저:
  - 콘텐츠 노출/클릭/CTR
  - 검색어별 클릭/노출/CTR
  - 문서별 클릭/노출/CTR
  - 사이트 진단 SEO 오류
- Google Search Console:
  - 검색어별 클릭/노출/CTR/평균 순위
  - 홈, `/search`, `/guides` 계열 URL별 성과

## 참고 문서

- Google Search Central - Title links: https://developers.google.com/search/docs/appearance/title-link
- Google Search Central - Snippets: https://developers.google.com/search/docs/appearance/snippet
- Google Search Central - Google Images SEO: https://developers.google.com/search/docs/appearance/google-images
- Google Search Central - Structured data general guidelines: https://developers.google.com/search/docs/appearance/structured-data/sd-policies
- 네이버 서치어드바이저 - SEO 기본 가이드: https://searchadvisor.naver.com/guide/seo-basic-intro
- 네이버 서치어드바이저 - 콘텐츠 마크업: https://searchadvisor.naver.com/guide/markup-content

# SEO/CTR 개선 기록 - 2026-06-28

## 목표

네이버 검색 노출은 늘었지만 클릭률이 낮은 상태를 개선한다. 목표는 홈과 주요 진입 페이지의 검색 결과 문구를 부모가 실제로 검색하는 표현에 맞추고, 클릭 후 첫 화면에서 기대한 내용을 바로 확인하게 만드는 것이다.

## 기준 데이터

네이버 서치어드바이저 기준 최근 30일 상태:

- 클릭: 5
- 노출: 약 7,600
- 평균 CTR: 0.7%
- 홈(`/`) 문서: 클릭 5, 노출 737, CTR 0.7%
- 주요 노출 쿼리:
  - `유치원 우리동네`: 노출 285, 클릭 0
  - `주변 유치원`: 노출 43, 클릭 0
  - `주변 유치원 찾기`: 노출 32, 클릭 0
  - `내주변 유치원`: 노출 28, 클릭 0
  - `유치원 우리동네 지도`: 노출 24, 클릭 0
  - `내 주변에 있는 유치원 위치`: 노출 6, 클릭 1

## 비판적 검토

직전 개선안의 제목인 `주변 유치원 찾기 - 거리·셔틀·정원 비교`는 검색어와 기능을 담고 있지만 세 가지 문제가 있었다.

1. 브랜드 손실
   - 네이버에서 이미 `유치원 우리동네`, `우리동네 유치원` 계열 노출이 발생한다.
   - 홈 기본 title에서 `우리동네 유치원`이 빠지면 브랜드성 검색 결과에서 클릭 이유가 약해진다.

2. 약속 과잉 위험
   - `셔틀·정원`을 제목 앞에 강하게 노출하면 사용자는 첫 화면에서 즉시 해당 항목을 기대한다.
   - 실제 서비스는 검색, 지도, 거리순, 필터, 상세 패널에서 해당 정보를 제공하므로, 홈 제목은 더 넓은 의도인 `내 주변 유치원 찾기`를 우선해야 한다.

3. 검색 결과와 첫 화면의 연결 부족
   - CTR만 올리는 문구보다 검색 결과 제목, H1, CTA, 검색 화면 기능이 같은 표현을 반복해야 이탈이 줄어든다.
   - 부모 입장에서는 "어디가 가까운지"가 첫 질문이고, 그 다음이 정원, 셔틀, 방과후, 급식이다.

## 적용한 방향

### 홈

- title: `내 주변 유치원 찾기 | 우리동네 유치원`
- description: `현재 위치나 주소 기준으로 가까운 유치원을 찾고 지도, 거리, 정원, 셔틀버스, 방과후, 급식 정보를 한눈에 비교하세요.`
- H1: `내 주변 유치원 찾기, 지도에서 거리순으로 비교`

이유:

- `내 주변 유치원`, `주변 유치원 찾기`, `우리동네 유치원` 쿼리를 동시에 받는다.
- 브랜드명을 유지해 네이버의 브랜드성 노출을 버리지 않는다.
- 부모의 첫 검색 의도인 위치와 거리 확인을 가장 앞에 둔다.

### 검색 페이지

- title: `내 주변 유치원 검색 지도`
- description: 현재 위치/주소, 지도, 거리순, 국공립·사립, 셔틀버스, 여유정원 조건을 명시
- OG/Twitter 이미지: 기존 `og-image-20260612.png`로 통일

이유:

- 검색 페이지는 실제 전환 페이지이므로 "검색 지도"와 "조건 비교"를 명확히 드러낸다.
- 공유/미리보기에서 이미지가 누락되지 않도록 OG 이미지를 명시한다.

### 비교 페이지

- title: `유치원 비교 - 거리·정원·셔틀 한눈에`
- description: 후보 유치원을 나란히 놓고 비교하는 사용 맥락을 반영
- OG/Twitter 이미지: 기존 `og-image-20260612.png`로 통일

이유:

- 비교 페이지가 검색 결과나 공유 카드에 노출될 때 너무 일반적인 `유치원 비교`보다 클릭 이유가 분명하다.

### 구조화 데이터

- `WebSite` JSON-LD의 설명을 현재 메타 설명과 맞췄다.
- 실제 지원하지 않는 `q` 기반 `SearchAction`은 제거했다.
- `image`와 `alternateName`을 추가해 대표 이미지와 검색어 변형 신호를 보강했다.

이유:

- 구조화 데이터는 실제 페이지 기능과 맞아야 한다.
- 지원하지 않는 검색 URL을 마크업으로 노출하면 검색엔진이 무시하거나 품질 신호가 약해질 수 있다.

## 참고한 공식 문서

- Google Search Central - Title links: https://developers.google.com/search/docs/appearance/title-link
- Google Search Central - Snippets: https://developers.google.com/search/docs/appearance/snippet
- Google Search Central - Google Images SEO: https://developers.google.com/search/docs/appearance/google-images
- Google Search Central - Structured data general guidelines: https://developers.google.com/search/docs/appearance/structured-data/sd-policies
- 네이버 서치어드바이저 - SEO 기본 가이드: https://searchadvisor.naver.com/guide/seo-basic-intro
- 네이버 서치어드바이저 - 콘텐츠 마크업: https://searchadvisor.naver.com/guide/markup-content

## 목표와 확인 기한

검색엔진 수집과 검색 결과 반영에는 시간이 걸리므로 2주 뒤 데이터를 다시 본다.

- 확인일: 2026-07-12
- 자동화 ID: `seo-ctr-2`
- 1차 목표:
  - 홈 CTR: 0.7%에서 1.5% 이상
  - `주변 유치원`, `주변 유치원 찾기`, `내주변 유치원` 계열 쿼리에서 클릭 발생
  - `유치원 우리동네` 쿼리 CTR 0% 탈출
- 실패 시 다음 조치:
  - 홈 title을 `주변 유치원 찾기 | 우리동네 유치원`로 A/B성 교체
  - 홈 첫 화면에 실제 검색 UI 진입을 더 강하게 배치
  - `/guides/kindergarten-selection` 내부에서 `/search?mode=location` CTA를 본문 상단으로 이동
  - 네이버에서 노출되는 쿼리별 랜딩 페이지를 분리할지 검토

## 수집할 데이터

2026-07-12에 다음 데이터를 다시 수집한다.

- 네이버 서치어드바이저 최근 30일:
  - 총 클릭, 노출, 평균 CTR
  - 검색어별 클릭, 노출, CTR
  - 문서별 클릭, 노출, CTR
  - 사이트 진단의 SEO 오류
- Google Search Console:
  - 홈, `/search`, `/guides` 계열 페이지의 검색어, 노출, 클릭, CTR, 평균 순위
- 배포 HTML 검증:
  - 홈 title, description, og:title, og:image
  - `/search` title, description, og:image
  - `/compare` title, description, og:image

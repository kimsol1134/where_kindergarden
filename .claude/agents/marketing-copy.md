# Agent 2: Marketing Copy

App Store 마케팅 카피를 생성합니다.

## 역할

우리동네 유치원 앱의 브랜드 톤에 맞는 한국어/영어 마케팅 카피를 생성합니다.

## 브랜드 보이스

- **핵심 가치**: "내 주변 유치원을 쉽고 빠르게 비교"
- **감정 축**: 신뢰 + 편리 + 안심
- **톤**: 학부모 중심, 실용적, 따뜻한
- **키워드**: "우리 아이", "한눈에", "3초면", "비교", "후기"
- **타깃**: 유치원/어린이집을 알아보는 학부모

## 네러티브 흐름 (편리함 → 기능 → 신뢰)

카피는 5장의 스크린샷에 걸쳐 스토리를 전달합니다:

1. **#1 라이프스타일** — 감성 훅 (왜 이 앱이 필요한가)
2. **#2 검색 지도** — 핵심 기능 (위치 기반 검색)
3. **#3 검색 결과** — 맞춤 정렬 (거리순, 정원순)
4. **#4 비교표** — 차별화 (최대 3곳 비교)
5. **#5 상세 정보** — 신뢰 (급식, 통학, 후기)

## 출력 형식

`output/copy.json`:

```json
[
  {
    "screen": "01-lifestyle",
    "type": "lifestyle",
    "headline_ko": "우리 아이 유치원, 3초면 비교 끝",
    "subtitle_ko": "내 주변 유치원을 한눈에",
    "headline_en": "Compare kindergartens in 3 seconds",
    "subtitle_en": "Find the best nearby"
  },
  {
    "screen": "02-search-map",
    "type": "fullscreen",
    "headline_ko": "내 주변 유치원 한눈에",
    "subtitle_ko": "",
    "headline_en": "Nearby kindergartens at a glance",
    "subtitle_en": ""
  },
  {
    "screen": "03-search-results",
    "type": "fullscreen",
    "headline_ko": "거리순, 정원순 맞춤 정렬",
    "subtitle_ko": "",
    "headline_en": "Sort by distance or capacity",
    "subtitle_en": ""
  },
  {
    "screen": "04-compare",
    "type": "fullscreen",
    "headline_ko": "최대 3곳, 나란히 비교",
    "subtitle_ko": "",
    "headline_en": "Compare up to 3 side by side",
    "subtitle_en": ""
  },
  {
    "screen": "05-detail",
    "type": "fullscreen",
    "headline_ko": "급식, 통학버스, 후기까지",
    "subtitle_ko": "",
    "headline_en": "Meals, bus, reviews and more",
    "subtitle_en": ""
  }
]
```

## 프로세스

### Step 1: 컨텍스트 수집

1. `ios/NativeApp/Sources/Features/Shared/BrandTokens.swift` 읽기 — 브랜드 색상 확인
2. `ios/NativeApp/Sources/Features/Shared/NativeTheme.swift` 읽기 — 디자인 시스템 확인
3. 기존 App Store 메타데이터 참조: `docs/APP_STORE_METADATA.md` (있을 경우)

### Step 2: 카피 생성

- 각 화면에 맞는 headline과 subtitle 작성
- 한국어 우선, 영어는 번역이 아닌 현지화 (뉘앙스 보존)
- headline: 짧고 임팩트 있게 (최대 15자 한국어)
- subtitle: 보조 설명 (필요한 경우만, 최대 20자)

### Step 3: 검증

- 모든 5개 스크린에 대한 카피 존재 확인
- 한국어/영어 모두 포함 확인
- headline 길이 적절성 확인

## 사용 도구

- **Read**: 브랜드 가이드, 메타데이터
- **Write**: copy.json 저장
- **Bash**: jq로 JSON 검증

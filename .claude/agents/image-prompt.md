# Agent 3: Image Prompt Engineering

Gemini 이미지 생성 API용 프롬프트를 작성합니다.

## 역할

라이프스타일 이미지(#1) 생성을 위한 Gemini 프롬프트와 전체화면 오버레이 설정을 작성합니다.
전체화면 UI(#2~5)는 시뮬레이터 캡처를 그대로 사용하므로 이미지 생성 프롬프트는 불필요.

## 사전 조건

- `output/raw-screenshots/01-search-map.png` 존재 (라이프스타일 합성 참조용)
- `ios/NativeApp/Sources/Features/Shared/BrandTokens.swift` — 색상 팔레트 참조

## 앱 색상 팔레트 (BrandTokens)

- **Mist White**: rgb(237, 241, 236) `#EDF1EC` — 배경
- **Jade Green**: rgb(102, 183, 116) `#66B774` — 메인 액센트
- **Jade Deep**: rgb(63, 140, 86) `#3F8C56` — 진한 녹색
- **Sun Yellow**: rgb(242, 213, 111) `#F2D56F` — 포인트
- **Ink Black**: rgb(24, 34, 44) `#18222C` — 텍스트
- **Cloud White**: rgb(246, 244, 237) `#F6F4ED` — 카드 배경
- **Slate Blue**: rgb(81, 106, 117) `#516A75` — 보조 텍스트

## 라이프스타일 이미지 프롬프트 가이드라인

### 분위기
- 따뜻한 자연광이 들어오는 실내 (거실/소파/아이 방)
- 한국 가정의 자연스러운 일상
- 전체적으로 밝고 부드러운 톤 (Jade Green + Mist White 팔레트와 조화)

### 구도
- 부모(엄마 또는 아빠)가 한 손에 iPhone을 들고 있는 장면
- 폰 화면은 **비워두기** (흰색 또는 밝은 화면) — QA Agent에서 앱 스크린샷 합성
- 배경에 아이 장난감, 그림책, 블록 등 육아 분위기 소품
- 아이가 근처에서 놀고 있는 모습 (선택적)

### 기술적 요구사항
- 9:16 세로 비율
- 고해상도, 사실적인 사진 스타일
- iPhone이 명확하게 보이되 화면은 비어 있어야 함
- 텍스트나 워터마크 없음

### 프롬프트 변형

다양한 시드/변형을 위해 3개 프롬프트 변형 생성:

**변형 1: 소파에서** — 부모가 소파에 앉아 iPhone을 들고 유치원을 검색하는 장면
**변형 2: 식탁에서** — 부모가 식탁에서 iPhone으로 유치원 정보를 비교하는 장면
**변형 3: 아이와 함께** — 부모 옆에 아이가 놀고 있고, 부모가 iPhone으로 유치원을 찾는 장면

## 출력 형식

`output/prompts.json` — 라이프스타일 프롬프트 + 전체화면 오버레이 설정을 모두 포함합니다.
이 파일은 Agent 4 (이미지 생성)와 Agent 5 (QA/합성) 모두가 참조하는 **공유 설정** 역할을 합니다.

```json
{
  "lifestyle": {
    "description": "라이프스타일 이미지 - 부모가 유치원 검색 앱 사용 중인 장면",
    "variants": [
      {
        "id": "lifestyle-v1",
        "scene": "소파에서",
        "prompt": "A warm, natural-light photograph of a Korean parent sitting on a cozy sofa in a modern living room, holding an iPhone in one hand with its screen showing a plain white display. Soft sunlight streams through sheer curtains. Children's toys, building blocks, and picture books are visible in the background. The parent has a thoughtful, caring expression as if researching something important for their child. Shot in portrait orientation (9:16 aspect ratio). Photorealistic style, soft green and cream tones. No text overlays or watermarks.",
        "negative_prompt": "text, watermark, logo, brand name, app interface on phone screen, dark lighting, cold tones"
      },
      {
        "id": "lifestyle-v2",
        "scene": "식탁에서",
        "prompt": "A warm, natural photograph of a Korean parent sitting at a wooden dining table, focused on comparing information on their iPhone which shows a blank white screen. On the table are children's drawings, crayons, and a cup of tea. Morning sunlight creates a cozy atmosphere. A child's backpack or school bag is visible nearby. Shot in portrait orientation (9:16 aspect ratio). Photorealistic, soft natural tones with gentle green accents. No text or watermarks.",
        "negative_prompt": "text, watermark, logo, app interface visible on phone, harsh lighting, cold blue tones"
      },
      {
        "id": "lifestyle-v3",
        "scene": "아이와 함께",
        "prompt": "A heartwarming natural photograph of a Korean parent sitting on the floor of a bright, airy living room, holding an iPhone with a blank white screen, while a young child (around 4-5 years old) plays with colorful building blocks nearby. Warm afternoon light fills the room. Children's books, a small globe, and educational toys are scattered around. Portrait orientation (9:16). Photorealistic with warm, soft tones matching a sage green and cream palette. No text or logos.",
        "negative_prompt": "text, watermark, logo, visible app on phone screen, dark room, cold lighting, artificial flash"
      }
    ]
  },
  "fullscreen_overlay": {
    "description": "전체화면 UI 오버레이 설정 (Agent 5가 참조)",
    "screens": ["02-search-map", "03-search-results", "04-compare", "05-detail"],
    "overlay_config": {
      "background_color": "#EDF1EC",
      "text_color": "#18222C",
      "accent_color": "#66B774",
      "font": "SF Pro Display",
      "text_position": "top",
      "band_height_ratio": 0.15
    }
  }
}
```

## 프로세스

### Step 1: 컨텍스트 분석

1. `output/raw-screenshots/01-search-map.png` 읽기 — 앱 UI 색상/분위기 파악
2. `ios/NativeApp/Sources/Features/Shared/BrandTokens.swift` 읽기 — 색상 팔레트 참조

### Step 2: 프롬프트 작성

- 라이프스타일 이미지용 프롬프트 3개 변형 작성
- 전체화면 오버레이 설정 포함 (색상, 폰트, 밴드 비율)
- 색상은 BrandTokens의 mistWhite, jadeGreen, inkBlack 기반

### Step 3: 검증

- JSON 형식 유효성
- 프롬프트에 9:16 비율 명시 확인
- 폰 화면 비우기 지시 포함 확인

## 사용 도구

- **Read**: 스크린샷, 디자인 가이드 참조
- **Write**: prompts.json 저장
- **Bash**: JSON 검증

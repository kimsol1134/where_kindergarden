---
name: appstore-screenshots
description: App Store 마케팅 스크린샷 자동 생성 파이프라인
user_invocable: true
---

# App Store 마케팅 스크린샷 자동 생성

Apple 스타일의 App Store 스크린샷을 자동 생성하는 5단계 에이전트 파이프라인입니다.

## 사용법

- `/appstore-screenshots generate` — 전체 파이프라인 실행
- `/appstore-screenshots capture` — 스크린샷만 캡처 (Agent 1)
- `/appstore-screenshots copy` — 마케팅 카피만 생성 (Agent 2)
- `/appstore-screenshots validate` — QA 검증만 실행 (Agent 5)

## 사전 요구사항

```bash
brew install imagemagick jq
```

XcodeBuildMCP가 MCP 서버로 등록되어 있어야 합니다.

Gemini API 키는 프로젝트 루트의 `.env` 파일에 설정 (`.gitignore`에 포함):
```
GEMINI_API_KEY=your-gemini-api-key
```

## 스크린샷 구성

| # | 타입 | 내용 | 카피 |
|---|------|------|------|
| 1 | 라이프스타일 | 부모가 폰으로 유치원 검색 중 (Gemini 생성) | "우리 아이 유치원, 3초면 비교 끝" |
| 2 | 전체 화면 UI | 검색 지도 화면 | "내 주변 유치원 한눈에" |
| 3 | 전체 화면 UI | 검색 결과 목록 | "거리순, 정원순 맞춤 정렬" |
| 4 | 전체 화면 UI | 비교표 화면 | "최대 3곳, 나란히 비교" |
| 5 | 전체 화면 UI | 상세 정보 시트 | "급식, 통학버스, 후기까지" |

## 파이프라인 실행

### `generate` 명령

```
Agent 1 (캡처)
    │
    ├──→ Agent 2 (카피)      ← 병렬 실행
    ├──→ Agent 3 (프롬프트)  ← 병렬 실행
    │
    ▼
Agent 4 (Gemini 이미지 생성)
    │
    ▼
Agent 5 (QA + 합성 + 리사이즈)
```

#### Agent 1: Screenshot Capture
`.claude/agents/screenshot-capture.md` — XcodeBuildMCP로 시뮬레이터에서 4개 화면 캡처.

**출력 검증**: `output/raw-screenshots/`에 4개 PNG

#### Agent 2 + 3: 병렬 실행
Agent 1 완료 후, 다음 두 에이전트를 **동시에** 실행합니다:

- `.claude/agents/marketing-copy.md` → `output/copy.json`
- `.claude/agents/image-prompt.md` → `output/prompts.json`

**출력 검증**: 두 JSON 파일 모두 존재, `jq .` 유효

#### Agent 4: Image Generation
`.claude/agents/image-gen.md` — Gemini API로 라이프스타일 이미지 생성.

**출력 검증**: `output/generated/lifestyle-bg.png` 존재, 파일 크기 > 0

#### Agent 5: QA & Composition
`.claude/agents/screenshot-qa.md` — 합성 + 검증 + 멀티디바이스 리사이즈.

**출력 검증**: `output/final/iPhone-6.9/`에 5개 PNG, `output/qa-report.json` 전체 pass

### `capture` 명령

Agent 1만 실행합니다.

### `copy` 명령

Agent 2만 실행합니다.

### `validate` 명령

Agent 5의 검증 단계만 실행합니다. `output/final/`이 이미 존재해야 합니다.

## 참조 파일

| 파일 | 용도 |
|------|------|
| `ios/NativeApp/Sources/Features/Shared/BrandTokens.swift` | 색상 팔레트 (Jade Green, Mist White 등) |
| `ios/NativeApp/Sources/Features/Shared/NativeTheme.swift` | 디자인 시스템 |
| `ios/NativeApp/Sources/Features/Search/SearchFeature.swift` | 검색/지도 화면 |
| `ios/NativeApp/Sources/Features/Compare/CompareView.swift` | 비교표 화면 |
| `ios/NativeApp/Sources/Features/Search/KindergartenDetailSheet.swift` | 상세 시트 |
| `ios/WhereKindergartenNative/WhereKindergartenNative.xcodeproj` | Xcode 프로젝트 |

## 출력 디렉토리 구조

```
output/
├── raw-screenshots/        # Agent 1
├── copy.json               # Agent 2
├── prompts.json            # Agent 3 (오버레이 설정 포함)
├── generated/              # Agent 4
│   └── lifestyle-bg.png
├── final/                  # Agent 5
│   ├── iPhone-6.9/  (1320x2868)
│   ├── iPhone-6.5/  (1284x2778)
│   ├── iPhone-6.3/  (1179x2556)
│   └── iPhone-6.1/  (1170x2532)
└── qa-report.json
```

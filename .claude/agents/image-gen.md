# Agent 4: Image Generation (Gemini API)

Gemini 3.1 Flash Image API를 호출하여 라이프스타일 이미지를 생성합니다.

## 역할

프롬프트 Agent가 생성한 프롬프트로 Gemini API를 호출하여 라이프스타일 이미지를 생성합니다.
**라이프스타일 이미지 1장만 생성** — 전체화면 UI는 시뮬레이터 캡처를 그대로 사용합니다.

## 사전 조건

- `GEMINI_API_KEY`가 프로젝트 루트의 `.env` 파일에 설정되어 있어야 합니다
- `output/prompts.json` 파일이 존재해야 합니다
- `jq`가 설치되어 있어야 합니다 (`brew install jq`)

## API 설정

Gemini API 엔드포인트:
```
GEMINI_ENDPOINT="https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent"
```

## 프로세스

### Step 1: 환경 검증

```bash
set -euo pipefail

# .env 파일에서 API 키 로드
if [ -f ".env" ]; then
  set -a; source .env; set +a
fi

# API 키 확인
if [ -z "${GEMINI_API_KEY:-}" ]; then
  echo "ERROR: GEMINI_API_KEY가 설정되지 않았습니다."
  echo ".env 파일에 GEMINI_API_KEY=your-key 를 추가해주세요."
  exit 1
fi

# 출력 디렉토리 생성
mkdir -p output/generated
```

### Step 2: 이미지 생성 (병렬)

3개 프롬프트 변형을 **병렬**로 API 호출합니다:

```bash
GEMINI_ENDPOINT="https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent"

generate_image() {
  local variant=$1
  local prompt
  prompt=$(jq -r ".lifestyle.variants[] | select(.id == \"$variant\") | .prompt" output/prompts.json)

  # jq로 안전하게 JSON 구성 (쉘 인젝션 방지)
  local payload
  payload=$(jq -n --arg p "$prompt" '{
    contents: [{parts: [{text: $p}]}],
    generationConfig: {
      responseModalities: ["TEXT", "IMAGE"],
      imageSizeOptions: {aspectRatio: "PORTRAIT_9_16"}
    }
  }')

  local response http_code
  for attempt in 1 2 3; do
    response=$(curl -s -w "\n%{http_code}" -X POST \
      "${GEMINI_ENDPOINT}?key=${GEMINI_API_KEY}" \
      -H "Content-Type: application/json" \
      -d "$payload")

    http_code=$(echo "$response" | tail -1)
    response=$(echo "$response" | sed '$d')

    if [ "$http_code" = "200" ]; then
      echo "$response" | jq -r '.candidates[0].content.parts[] | select(.inlineData) | .inlineData.data' | base64 -D > "output/generated/${variant}.png"

      if [ -s "output/generated/${variant}.png" ]; then
        echo "OK ${variant}.png"
        return 0
      fi
    elif [ "$http_code" = "429" ]; then
      echo "RETRY ${variant} (429, attempt ${attempt})"
      sleep $((attempt * 15))
    else
      echo "FAIL ${variant} (HTTP ${http_code}, attempt ${attempt})"
      sleep 5
    fi
  done
  echo "FAIL ${variant} (all attempts exhausted)"
  return 1
}

# 3개 변형 병렬 생성
for variant in lifestyle-v1 lifestyle-v2 lifestyle-v3; do
  generate_image "$variant" &
done
wait
```

### Step 3: 최적 이미지 선택

생성된 이미지 중 가장 적합한 것을 `lifestyle-bg.png`로 복사합니다.

- Read 도구로 각 이미지를 육안 확인
- 선택 기준:
  1. iPhone이 명확하게 보이는가
  2. 화면이 비어있어 합성 가능한가
  3. 전체 톤이 Mist White / Jade Green 팔레트와 조화로운가
  4. 자연스럽고 사실적인가

```bash
cp output/generated/lifestyle-v1.png output/generated/lifestyle-bg.png
```

### Step 4: 결과 검증

```bash
ls -la output/generated/
sips -g pixelHeight -g pixelWidth output/generated/lifestyle-bg.png
```

## 에러 처리

| 에러 | 대응 |
|------|------|
| `GEMINI_API_KEY` 미설정 | 즉시 중단, 사용자에게 설정 안내 |
| 429 (Rate Limit) | 15/30/45초 대기 후 재시도 (최대 3회) |
| 기타 HTTP 에러 | 5초 대기 후 재시도 (최대 3회) |
| 모든 변형 실패 | 프롬프트 수정 후 재시도 |

## 비용 추정

- Gemini 3.1 Flash Image: ~$0.03/이미지
- 3개 변형 x 1장 = ~$0.09 총 비용

## 사용 도구

- **Bash**: curl API 호출, jq 파싱, 파일 관리
- **Read**: prompts.json, 생성된 이미지 확인
- **Write**: 결과 저장

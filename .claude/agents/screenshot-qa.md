# Agent 5: Screenshot QA & Composition

최종 App Store 스크린샷을 합성, 검증, 리사이즈합니다.

## 역할

1. 라이프스타일 이미지에 앱 스크린샷 합성
2. 전체화면 UI에 마케팅 텍스트 오버레이
3. App Store 규격 검증
4. 멀티디바이스 리사이즈

## 사전 조건

- `output/raw-screenshots/` — 4개 시뮬레이터 캡처
- `output/copy.json` — 마케팅 카피
- `output/prompts.json` — 오버레이 설정 (`fullscreen_overlay` 섹션)
- `output/generated/lifestyle-bg.png` — 라이프스타일 배경
- ImageMagick 설치 (`brew install imagemagick`)

## 디자인 설정

`output/prompts.json`의 `fullscreen_overlay` 섹션에서 읽어옵니다:
- `background_color` → 상단 밴드 배경색 (`#EDF1EC` Mist White)
- `text_color` → 텍스트 색상 (`#18222C` Ink Black)
- `accent_color` → 액센트 색상 (`#66B774` Jade Green)

폰트는 시스템 폰트 SF Pro Display를 사용합니다.

`output/copy.json`에서 각 화면의 `headline_ko`를 읽어 오버레이 텍스트로 사용합니다.

## 초기화

```bash
set -euo pipefail
mkdir -p output/temp output/final/iPhone-6.9

BG_COLOR=$(jq -r '.fullscreen_overlay.overlay_config.background_color' output/prompts.json)
TEXT_COLOR=$(jq -r '.fullscreen_overlay.overlay_config.text_color' output/prompts.json)
ACCENT_COLOR=$(jq -r '.fullscreen_overlay.overlay_config.accent_color' output/prompts.json)
```

## 합성 작업

### #1 라이프스타일 이미지

Gemini가 생성한 라이프스타일 배경에 앱 스크린샷을 합성합니다.

```bash
LIFESTYLE_HEADLINE=$(jq -r '.[] | select(.screen == "01-lifestyle") | .headline_ko' output/copy.json)
LIFESTYLE_SUBTITLE=$(jq -r '.[] | select(.screen == "01-lifestyle") | .subtitle_ko' output/copy.json)

# 1. 라이프스타일 배경을 6.9" 해상도로 리사이즈 (비율 유지 + 크롭)
magick output/generated/lifestyle-bg.png -resize 1320x2868^ -gravity Center -extent 1320x2868 output/temp/lifestyle-resized.png

# 2. 앱 스크린샷을 폰 화면 크기로 축소
magick output/raw-screenshots/01-search-map.png -resize 280x607 output/temp/map-small.png

# 3. 합성 (실제 좌표는 Read로 이미지 확인 후 조정 필요)
magick output/temp/lifestyle-resized.png \
  output/temp/map-small.png -geometry +520+1100 -composite \
  output/temp/lifestyle-composed.png

# 4. 마케팅 텍스트 오버레이
magick output/temp/lifestyle-composed.png \
  -font "SF-Pro-Display-Bold" \
  -pointsize 72 -fill "$TEXT_COLOR" -gravity North \
  -annotate +0+120 "$LIFESTYLE_HEADLINE" \
  -pointsize 36 -fill "#516A75" \
  -annotate +0+220 "$LIFESTYLE_SUBTITLE" \
  output/final/iPhone-6.9/01-lifestyle.png
```

**주의**: 폰 화면 위치는 Gemini 생성 이미지마다 다르므로, Read 도구로 이미지를 확인한 후 좌표를 조정해야 합니다. 필요시 ImageMagick perspective transform 사용:

```bash
magick output/temp/map-small.png \
  -virtual-pixel transparent \
  -distort Perspective \
  "0,0,X1,Y1  280,0,X2,Y2  280,607,X3,Y3  0,607,X4,Y4" \
  output/temp/map-perspective.png
```

### #2~5 전체화면 UI

`copy.json`에서 각 화면의 카피를 읽어 오버레이합니다:

```bash
create_fullscreen_screenshot() {
  local input="$1"
  local output_file="$2"
  local screen_id="$3"
  local band_height=430

  local headline
  headline=$(jq -r ".[] | select(.screen == \"$screen_id\") | .headline_ko" output/copy.json)

  # 단일 ImageMagick 파이프라인 (중간 파일 불필요)
  magick \( -size 1320x${band_height} xc:"$BG_COLOR" \
    -font "SF-Pro-Display-Bold" -pointsize 80 -fill "$TEXT_COLOR" -gravity Center \
    -annotate +0+40 "$headline" \) \
    \( "$input" -resize "1320x$((2868 - band_height))!" \) \
    -append "$output_file"
}

# copy.json의 screen 필드와 raw-screenshot 파일명 매핑
create_fullscreen_screenshot "output/raw-screenshots/01-search-map.png"     "output/final/iPhone-6.9/02-search-map.png"     "02-search-map"
create_fullscreen_screenshot "output/raw-screenshots/02-search-results.png" "output/final/iPhone-6.9/03-search-results.png" "03-search-results"
create_fullscreen_screenshot "output/raw-screenshots/03-compare.png"       "output/final/iPhone-6.9/04-compare.png"        "04-compare"
create_fullscreen_screenshot "output/raw-screenshots/04-detail.png"        "output/final/iPhone-6.9/05-detail.png"         "05-detail"
```

## 알파 채널 제거 + sRGB 보장

```bash
for img in output/final/iPhone-6.9/*.png; do
  magick "$img" -background white -alpha remove -alpha off -colorspace sRGB "$img"
done
```

## 검증

```bash
for img in output/final/iPhone-6.9/*.png; do
  echo "=== $(basename "$img") ==="

  width=$(sips -g pixelWidth "$img" | tail -1 | awk '{print $2}')
  height=$(sips -g pixelHeight "$img" | tail -1 | awk '{print $2}')
  echo "Resolution: ${width}x${height}"
  [ "$width" = "1320" ] && [ "$height" = "2868" ] && echo "PASS resolution" || echo "FAIL resolution"

  size=$(stat -f%z "$img")
  echo "Size: $((size / 1024))KB"
  [ "$size" -lt 10485760 ] && echo "PASS size" || echo "FAIL size (>10MB)"

  alpha=$(sips -g hasAlpha "$img" | tail -1 | awk '{print $2}')
  [ "$alpha" = "no" ] && echo "PASS no-alpha" || echo "FAIL has-alpha"
  echo ""
done
```

## 멀티디바이스 리사이즈 (병렬)

```bash
# 디바이스별 해상도 (zsh 연상 배열 — macOS 기본 셸)
typeset -A SIZES
SIZES=(
  [6.5]="2778 1284"
  [6.3]="2556 1179"
  [6.1]="2532 1170"
)

for size in 6.5 6.3 6.1; do
  mkdir -p "output/final/iPhone-${size}"
  read -r h w <<< "${SIZES[$size]}"

  for img in output/final/iPhone-6.9/*.png; do
    sips -z "$h" "$w" "$img" --out "output/final/iPhone-${size}/$(basename "$img")" &
  done
done
wait
```

## QA 리포트

검증 결과를 `output/qa-report.json`에 저장합니다:

```json
{
  "generated_at": "ISO-8601",
  "devices": ["iPhone-6.9", "iPhone-6.5", "iPhone-6.3", "iPhone-6.1"],
  "screenshots": [
    {
      "name": "01-lifestyle.png",
      "checks": {
        "resolution": "PASS",
        "format": "PASS",
        "no_alpha": "PASS",
        "file_size": "PASS"
      }
    }
  ],
  "summary": {
    "total": 20,
    "passed": 20,
    "failed": 0
  }
}
```

## 사용 도구

- **Bash**: ImageMagick 합성, sips 리사이즈, 검증 스크립트
- **Read**: 이미지 확인 (육안 검수), JSON 파일 읽기
- **Write**: qa-report.json 저장
- **Glob**: 파일 검색

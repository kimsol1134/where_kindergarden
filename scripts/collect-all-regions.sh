#!/bin/bash
#
# 전국 리뷰 수집 + 검증 통합 스크립트
#
# 사용법:
#   bash scripts/collect-all-regions.sh              # 전체 수집 + 검증
#   bash scripts/collect-all-regions.sh --test       # 테스트 (시도당 3개만)
#   bash scripts/collect-all-regions.sh --verify-only # 수집 없이 검증만
#   bash scripts/collect-all-regions.sh --sido 11,41  # 특정 시도만
#

set -e

# 전체 시도 코드
ALL_SIDO="11 26 27 28 29 30 31 36 41 42 43 44 46 47 48 50"
TEST_MODE=""
VERIFY_ONLY=""
TARGET_SIDO=""

# 인자 파싱
while [[ $# -gt 0 ]]; do
  case $1 in
    --test) TEST_MODE="--test"; shift ;;
    --verify-only) VERIFY_ONLY="1"; shift ;;
    --sido) TARGET_SIDO="$2"; shift 2 ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

# 대상 시도 결정
if [ -n "$TARGET_SIDO" ]; then
  SIDO_LIST=$(echo "$TARGET_SIDO" | tr ',' ' ')
else
  SIDO_LIST="$ALL_SIDO"
fi

SIDO_NAMES="11:서울 26:부산 27:대구 28:인천 29:광주 30:대전 31:울산 36:세종 41:경기 42:강원 43:충북 44:충남 46:전남 47:경북 48:경남 50:제주"

get_sido_name() {
  for pair in $SIDO_NAMES; do
    code="${pair%%:*}"
    name="${pair##*:}"
    if [ "$code" = "$1" ]; then
      echo "$name"
      return
    fi
  done
  echo "$1"
}

echo "========================================="
echo "  전국 리뷰 수집 + 검증 통합 파이프라인"
echo "========================================="
echo ""
echo "대상: $(echo $SIDO_LIST | wc -w | tr -d ' ')개 시도"
echo "모드: ${TEST_MODE:-전체수집} ${VERIFY_ONLY:+검증만}"
echo "시작: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

# ========== Phase 1: 수집 ==========
if [ -z "$VERIFY_ONLY" ]; then
  echo "===== Phase 1: 수집 (collect:reviews:v3) ====="
  echo ""

  COLLECT_OK=0
  COLLECT_FAIL=0

  for sido in $SIDO_LIST; do
    name=$(get_sido_name "$sido")
    echo "--- [$sido] $name 수집 시작 ---"

    if pnpm collect:reviews:v3 -- --sido "$sido" $TEST_MODE 2>&1 | tail -5; then
      COLLECT_OK=$((COLLECT_OK + 1))
    else
      echo "  [WARN] $sido 수집 실패, 계속 진행"
      COLLECT_FAIL=$((COLLECT_FAIL + 1))
    fi

    echo ""
    sleep 2  # API rate limit 대응
  done

  echo "수집 완료: 성공 $COLLECT_OK, 실패 $COLLECT_FAIL"
  echo ""

  # ========== Phase 2: 큐레이션 + 필터 + 분할 ==========
  echo "===== Phase 2: 큐레이션 + 필터 + 분할 ====="
  echo ""

  for sido in $SIDO_LIST; do
    name=$(get_sido_name "$sido")
    echo "--- [$sido] $name 파이프라인 ---"
    pnpm collect:all -- --sido "$sido" 2>&1 | tail -3
    echo ""
  done
fi

# ========== Phase 3: 전수검사 ==========
echo "===== Phase 3: 전수검사 (verify:reviews) ====="
echo ""

TOTAL_FLAGGED=0

for sido in $SIDO_LIST; do
  name=$(get_sido_name "$sido")
  RESULT=$(pnpm verify:reviews -- --sido "$sido" 2>&1)
  FLAGGED=$(echo "$RESULT" | grep "플래그:" | grep -o '[0-9]*건' | head -1)
  echo "[$sido] $name: $FLAGGED"

  COUNT=$(echo "$FLAGGED" | grep -o '[0-9]*')
  if [ -n "$COUNT" ] && [ "$COUNT" -gt 0 ]; then
    TOTAL_FLAGGED=$((TOTAL_FLAGGED + COUNT))
  fi
done

echo ""
echo "총 플래그: ${TOTAL_FLAGGED}건"

# ========== Phase 4: 자동 수정 (플래그 있을 때만) ==========
if [ "$TOTAL_FLAGGED" -gt 0 ]; then
  echo ""
  echo "===== Phase 4: 자동 수정 ====="
  echo ""

  for sido in $SIDO_LIST; do
    pnpm verify:reviews -- --sido "$sido" --fix 2>&1 | grep "플래그\|제거 완료" || true
  done

  # sido 파일 재빌드
  echo ""
  echo "===== Phase 5: 재빌드 ====="
  python3 -c "
import json, os, glob

reviews_dir = 'public/data/reviews'
total_all = 0

for sido_dir_name in sorted(os.listdir(reviews_dir)):
    sido_dir = os.path.join(reviews_dir, sido_dir_name)
    if not os.path.isdir(sido_dir): continue

    combined = {}
    total = 0
    for f in sorted(os.listdir(sido_dir)):
        if not f.endswith('.json'): continue
        with open(os.path.join(sido_dir, f)) as fh:
            data = json.load(fh)
        for kid, revs in data.get('reviews', {}).items():
            if kid not in combined: combined[kid] = []
            urls = {r['url'] for r in combined[kid]}
            for r in revs:
                if r['url'] not in urls:
                    combined[kid].append(r)
                    urls.add(r['url'])
                    total += 1

    sido_file = os.path.join(reviews_dir, f'{sido_dir_name}.json')
    with open(sido_file, 'w') as fh:
        json.dump({
            'version': '$(date +%Y-%m-%d)',
            'totalCount': total,
            'kindergartenCount': len(combined),
            'lastCuratedAt': '$(date -u +%Y-%m-%dT%H:%M:%S.000Z)',
            'reviews': combined,
        }, fh, ensure_ascii=False, indent=2)
    total_all += total
    print(f'  {sido_dir_name}: {total}건')

print(f'\n총 리뷰: {total_all}건')
"

  pnpm rebuild:reviews 2>&1 | tail -5

  # 최종 검증
  echo ""
  echo "===== Phase 6: 최종 검증 ====="
  FINAL_RESULT=$(pnpm verify:reviews 2>&1)
  echo "$FINAL_RESULT" | grep "플래그:"
fi

echo ""
echo "========================================="
echo "  완료: $(date '+%Y-%m-%d %H:%M:%S')"
echo "========================================="

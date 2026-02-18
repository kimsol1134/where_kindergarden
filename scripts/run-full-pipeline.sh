#!/bin/bash
# 전국 리뷰 수집 + 검증 전체 파이프라인
# 사용법: bash scripts/run-full-pipeline.sh

set -e

SIDO_CODES=(11 26 27 28 29 30 31 36 41 42 43 44 46 47 48 50)
LOG_FILE="scripts/data-output/pipeline-$(date +%Y%m%d-%H%M%S).log"
mkdir -p scripts/data-output

log() {
  echo "[$(date '+%H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "=========================================="
log "전국 리뷰 수집 파이프라인 시작"
log "대상 시도: ${SIDO_CODES[*]}"
log "=========================================="

# Step 1: 수집 (v3)
log ""
log "=== STEP 1: V3 수집 시작 ==="
COLLECT_FAILED=()
for sido in "${SIDO_CODES[@]}"; do
  log "--- 수집 시작: 시도 $sido ---"
  if pnpm collect:reviews:v3 -- --sido "$sido" 2>&1 | tee -a "$LOG_FILE"; then
    log "✅ 시도 $sido 수집 완료"
  else
    log "❌ 시도 $sido 수집 실패 — 건너뜀"
    COLLECT_FAILED+=("$sido")
  fi
  log "--- 2초 대기 (API rate limit) ---"
  sleep 2
done

log ""
log "=== STEP 1 완료 ==="
log "수집 실패: ${COLLECT_FAILED[*]:-없음}"

# Step 2: 큐레이션 (전체)
log ""
log "=== STEP 2: 큐레이션 ==="
if pnpm curate:reviews 2>&1 | tee -a "$LOG_FILE"; then
  log "✅ 큐레이션 완료"
else
  log "⚠️ 큐레이션 실패 — 계속 진행"
fi

# Step 3: 필터링 + 분할 (시도별)
log ""
log "=== STEP 3: 필터링 + 분할 ==="
for sido in "${SIDO_CODES[@]}"; do
  log "--- 필터링: 시도 $sido ---"
  if pnpm filter:reviews -- --sido "$sido" 2>&1 | tee -a "$LOG_FILE"; then
    log "✅ 시도 $sido 필터링 완료"
  else
    log "⚠️ 시도 $sido 필터링 실패"
  fi

  log "--- 분할: 시도 $sido ---"
  if pnpm split:reviews -- --sido "$sido" 2>&1 | tee -a "$LOG_FILE"; then
    log "✅ 시도 $sido 분할 완료"
  else
    log "⚠️ 시도 $sido 분할 실패"
  fi
done

# Step 4: 전수검사
log ""
log "=== STEP 4: 전수검사 ==="
if pnpm verify:reviews 2>&1 | tee -a "$LOG_FILE"; then
  log "✅ 전수검사 통과"
  VERIFY_OK=true
else
  log "⚠️ 전수검사에서 문제 발견"
  VERIFY_OK=false
fi

# Step 5: 문제 있으면 자동 수정 + 재빌드
if [ "$VERIFY_OK" = false ]; then
  log ""
  log "=== STEP 5: 자동 수정 ==="
  if pnpm verify:reviews -- --fix 2>&1 | tee -a "$LOG_FILE"; then
    log "✅ 자동 수정 완료"
  else
    log "⚠️ 자동 수정 실패"
  fi

  log ""
  log "=== STEP 5b: 재빌드 ==="
  if pnpm rebuild:reviews 2>&1 | tee -a "$LOG_FILE"; then
    log "✅ 재빌드 완료"
  else
    log "⚠️ 재빌드 실패"
  fi
fi

# Step 6: 최종 확인
log ""
log "=== STEP 6: 최종 확인 ==="
pnpm verify:reviews 2>&1 | tee -a "$LOG_FILE"
pnpm type-check 2>&1 | tee -a "$LOG_FILE"

log ""
log "=========================================="
log "전국 리뷰 파이프라인 완료!"
log "로그: $LOG_FILE"
log "=========================================="

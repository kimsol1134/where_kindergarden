#!/usr/bin/env node
/**
 * apply-agent-review.mjs — 에이전트가 직접 링크 본문(excerpt)을 읽고 내린 keep/remove 판정을
 * 정본 public/data/reviews.json 및 시도별 public/data/reviews/<sido>.json 에 반영한다.
 *
 * 판정 파일: scripts/data-output/agent-review-decisions/<sido>.json
 *   { "<reviewId>": { "decision": "remove"|"keep", "reason": "..." }, ... }
 *
 * 사용법:
 *   node scripts/apply-agent-review.mjs --sido 36            # 적용
 *   node scripts/apply-agent-review.mjs --sido 36 --dry-run  # 미적용(시뮬)
 *   node scripts/apply-agent-review.mjs --all                # 모든 결정 파일 적용
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const CANON = path.join(ROOT, 'public/data/reviews.json');
const SIDO_DIR = path.join(ROOT, 'public/data/reviews');
const DEC_DIR = path.join(ROOT, 'scripts/data-output/agent-review-decisions');
const LOG_DIR = path.join(ROOT, 'scripts/data-output/agent-review-removed');

const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const val = (f) => { const i = args.indexOf(f); return i === -1 ? undefined : args[i + 1]; };
const DRY = has('--dry-run');
const ALL = has('--all');
const SIDO = val('--sido');

function loadDecisions() {
  const files = ALL
    ? fs.readdirSync(DEC_DIR).filter((f) => f.endsWith('.json'))
    : [`${SIDO}.json`];
  const removeIds = new Map(); // reviewId -> reason
  for (const f of files) {
    const p = path.join(DEC_DIR, f);
    if (!fs.existsSync(p)) { console.error(`decision file missing: ${p}`); continue; }
    const map = JSON.parse(fs.readFileSync(p, 'utf8'));
    for (const [id, d] of Object.entries(map)) {
      if (d && d.decision === 'remove') removeIds.set(id, d.reason || '');
    }
  }
  return removeIds;
}

function pruneReviewsObject(reviews, removeIds, removedLog) {
  let removed = 0;
  for (const kid of Object.keys(reviews)) {
    const before = reviews[kid].length;
    reviews[kid] = reviews[kid].filter((r) => {
      if (removeIds.has(r.id)) {
        removedLog.push({ id: r.id, kindergartenId: kid, title: r.title, url: r.url, source: r.source, reason: removeIds.get(r.id) });
        return false;
      }
      return true;
    });
    removed += before - reviews[kid].length;
    if (reviews[kid].length === 0) delete reviews[kid];
  }
  return removed;
}

function recount(data) {
  let total = 0;
  for (const kid in data.reviews) total += data.reviews[kid].length;
  data.totalCount = total;
  data.kindergartenCount = Object.keys(data.reviews).length;
  return total;
}

function main() {
  const removeIds = loadDecisions();
  console.log(`[apply] remove targets: ${removeIds.size} review ids ${DRY ? '(DRY RUN)' : ''}`);
  if (removeIds.size === 0) { console.log('nothing to remove'); return; }

  const removedLog = [];

  // 1) canonical reviews.json
  const canon = JSON.parse(fs.readFileSync(CANON, 'utf8'));
  const rmCanon = pruneReviewsObject(canon.reviews, removeIds, removedLog);
  recount(canon);
  console.log(`[apply] reviews.json: removed ${rmCanon} → now ${canon.totalCount} reviews / ${canon.kindergartenCount} kg`);

  // 2) per-sido files (지정 시도 또는 전체)
  const sidoFiles = fs.readdirSync(SIDO_DIR).filter((f) => /^(\d+|unknown)\.json$/.test(f));
  let rmSidoTotal = 0;
  const perSidoSummary = [];
  for (const f of sidoFiles) {
    if (!ALL && SIDO && f !== `${SIDO}.json`) continue;
    const p = path.join(SIDO_DIR, f);
    const data = JSON.parse(fs.readFileSync(p, 'utf8'));
    const dummyLog = [];
    const n = pruneReviewsObject(data.reviews, removeIds, dummyLog);
    if (n > 0) {
      recount(data);
      perSidoSummary.push({ file: f, removed: n, now: data.totalCount });
      rmSidoTotal += n;
      if (!DRY) fs.writeFileSync(p, JSON.stringify(data, null, 2));
    }
  }
  console.log(`[apply] per-sido files: removed ${rmSidoTotal}`, JSON.stringify(perSidoSummary));

  if (!DRY) {
    fs.writeFileSync(CANON, JSON.stringify(canon, null, 2));
    fs.mkdirSync(LOG_DIR, { recursive: true });
    const logPath = path.join(LOG_DIR, `removed-${SIDO || 'all'}-${new Date().toISOString().slice(0, 10)}.json`);
    fs.writeFileSync(logPath, JSON.stringify(removedLog, null, 2));
    console.log(`[apply] removed-log → ${path.relative(ROOT, logPath)}`);
  } else {
    console.log('[apply] DRY RUN — no files written. Sample removals:');
    removedLog.slice(0, 8).forEach((r) => console.log(`   - ${r.source} | ${r.title?.slice(0, 50)} | ${r.reason}`));
  }
}

main();

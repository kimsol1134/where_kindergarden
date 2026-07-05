#!/usr/bin/env node
/**
 * apply-phase-b.mjs — Phase B에서 에이전트가 진성 후기로 직접 확인한 후보 URL을
 * 정본 reviews.json + 시도별 파일에 신규 리뷰로 추가한다.
 *
 * 입력: scripts/data-output/phase-b/approved-<sido>.json
 *   [{ kindergartenId, source, title, url, snippet, date }]  (date 없으면 null)
 *
 *   node scripts/apply-phase-b.mjs --sido 11 --dry-run
 *   node scripts/apply-phase-b.mjs --sido 11
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const SIDO = args[args.indexOf('--sido') + 1];
const DRY = args.includes('--dry-run');

const approvedPath = path.join(ROOT, `scripts/data-output/phase-b/approved-${SIDO}.json`);
const approved = JSON.parse(fs.readFileSync(approvedPath, 'utf8'));
const kgs = JSON.parse(fs.readFileSync(path.join(ROOT, 'public/data/kindergartens.json'), 'utf8'));
const sidoOf = new Map(kgs.map((k) => [k.kindercode, k.sido_code]));

function rid() { return 'rev-pb-' + Math.random().toString(36).slice(2, 6) + '-' + Math.random().toString(36).slice(2, 6); }
function canon(u) { try { const x = new URL(u); return (x.hostname.replace(/^m\.|^www\./, '') + x.pathname).replace(/\/$/, ''); } catch { return u; } }

function addTo(data, useSidoFilter) {
  const existing = new Set();
  for (const k in data.reviews) for (const r of data.reviews[k]) existing.add(canon(r.url));
  let added = 0;
  for (const a of approved) {
    if (useSidoFilter && sidoOf.get(a.kindergartenId) !== SIDO) continue;
    if (existing.has(canon(a.url))) continue;
    const review = { id: rid(), kindergartenId: a.kindergartenId, title: a.title, url: a.url, source: a.source || 'naver_blog', sourceName: a.sourceName || '', snippet: a.snippet || '', date: a.date || null, collectedAt: new Date().toISOString(), relevanceScore: a.relevanceScore ?? 8, phaseB: true };
    (data.reviews[a.kindergartenId] ??= []).push(review);
    existing.add(canon(a.url));
    added++;
  }
  let total = 0; for (const k in data.reviews) total += data.reviews[k].length;
  data.totalCount = total; data.kindergartenCount = Object.keys(data.reviews).length;
  return added;
}

const canonPath = path.join(ROOT, 'public/data/reviews.json');
const canonData = JSON.parse(fs.readFileSync(canonPath, 'utf8'));
const a1 = addTo(canonData, false);
const sidoPath = path.join(ROOT, `public/data/reviews/${SIDO}.json`);
const sidoData = JSON.parse(fs.readFileSync(sidoPath, 'utf8'));
const a2 = addTo(sidoData, true);
console.log(`[phase-b apply] approved=${approved.length} | reviews.json +${a1} (now ${canonData.totalCount}) | ${SIDO}.json +${a2}${DRY ? ' (DRY)' : ''}`);
if (!DRY) { fs.writeFileSync(canonPath, JSON.stringify(canonData, null, 2)); fs.writeFileSync(sidoPath, JSON.stringify(sidoData, null, 2)); }

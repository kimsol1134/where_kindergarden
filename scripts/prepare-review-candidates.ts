/**
 * 수집 원본(reviews-raw-v3-*.json)을 본문 검수 대상으로 좁힌다.
 *
 * v3 수집기의 relevanceScore만으로는 걸러지지 않는 것들이 있어 여기서 한 번 더 친다:
 *   - 이미 배포된 URL
 *   - 유치원명 부분 매칭 (`가온호수유치원` 글이 `호수유치원`에 붙는 경우)
 *   - 시군구 불일치 (동명 유치원이 전국에 흔해 시도 단위 검증만으로는 부족)
 *
 * 출력은 batch-scrape-content.ts가 먹는 매니페스트 형식이다.
 *
 * 사용법:
 *   npx tsx scripts/prepare-review-candidates.ts --sido 11
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  isSpamReview,
  classifyContentType,
} from '../src/lib/utils/review-utils';

const args = process.argv.slice(2);
const SIDO = args[args.indexOf('--sido') + 1];
if (!SIDO) {
  console.error('--sido 가 필요합니다.');
  process.exit(1);
}

const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'scripts/data-output');

interface Kindergarten {
  kindercode: string;
  name: string;
  address: string;
}

const kindergartens = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'public/data/kindergartens.json'), 'utf-8')
) as Kindergarten[];
const byCode = new Map(kindergartens.map((k) => [k.kindercode, k]));

/** 전국 시군구 명칭. 다른 지역 글을 가려내는 데 쓴다. */
const ALL_DISTRICTS = new Set<string>();
for (const k of kindergartens) {
  for (const part of k.address.split(/\s+/).slice(1, 3)) {
    if (/(시|군|구)$/.test(part) && part.length >= 3) {
      ALL_DISTRICTS.add(part);
      ALL_DISTRICTS.add(part.replace(/(시|군|구)$/, ''));
    }
  }
}

function districtMatches(text: string, address: string): boolean {
  const parts = address.split(/\s+/);
  const own = parts.slice(1, 3).filter((p) => /(시|군|구)$/.test(p));
  if (own.length === 0) return false;
  const flat = text.replace(/\s+/g, '');
  const forms = own
    .flatMap((d) => [d, d.replace(/(시|군|구)$/, '')])
    .filter((s) => s.length >= 2);
  if (forms.some((f) => flat.includes(f))) return true;
  for (const other of ALL_DISTRICTS) {
    if (forms.includes(other)) continue;
    if (flat.includes(other)) return false;
  }
  return false;
}

const HANGUL = /[가-힣]/;
/** 이름이 더 긴 다른 유치원 이름의 꼬리로 걸린 게 아닌지 확인한다. */
function nameStandalone(text: string, name: string): boolean {
  const hay = text.replace(/\s+/g, '');
  const needle = name.replace(/\s+/g, '');
  let i = hay.indexOf(needle);
  while (i >= 0) {
    if (!HANGUL.test(i > 0 ? hay[i - 1] : '')) return true;
    i = hay.indexOf(needle, i + 1);
  }
  return false;
}

const publishedUrls = new Set<string>();
const pubDir = path.join(ROOT, 'public/data/reviews');
for (const f of fs.readdirSync(pubDir)) {
  if (!f.endsWith('.json')) continue;
  const d = JSON.parse(fs.readFileSync(path.join(pubDir, f), 'utf-8'));
  for (const revs of Object.values(d.reviews ?? {}) as Array<Array<{ url: string }>>) {
    for (const r of revs) publishedUrls.add(r.url);
  }
}

const rawFile = fs
  .readdirSync(OUT_DIR)
  .filter((f) => f.startsWith('reviews-raw-v3-') && f.endsWith(`-${SIDO}.json`))
  .sort()
  .pop();
if (!rawFile) {
  console.error(`시도 ${SIDO}의 수집 파일을 찾을 수 없습니다.`);
  process.exit(1);
}

const raw = JSON.parse(fs.readFileSync(path.join(OUT_DIR, rawFile), 'utf-8'));
const entries = Array.isArray(raw) ? raw : raw.reviews ?? [];

const stats: Record<string, number> = {};
const bump = (k: string) => (stats[k] = (stats[k] ?? 0) + 1);
const items: unknown[] = [];
const seen = new Set<string>();

for (const e of entries) {
  if (!e.url || publishedUrls.has(e.url) || seen.has(e.url)) { bump('중복/기배포'); continue; }
  const kg = byCode.get(e.kindergartenId);
  if (!kg) { bump('유치원 미매칭'); continue; }

  const title = e.title ?? '';
  const snippet = e.snippet ?? '';
  const text = `${title} ${snippet}`;

  if (isSpamReview({ title, snippet, sourceName: e.sourceName }).isSpam) { bump('스팸'); continue; }
  const ct = classifyContentType(title, snippet);
  if (ct === 'question' || ct === 'template') { bump('질문/템플릿'); continue; }
  if (!nameStandalone(text, kg.name)) { bump('이름 부분매칭'); continue; }
  if (!districtMatches(text, kg.address)) { bump('시군구 불일치'); continue; }

  seen.add(e.url);
  items.push({
    reviewId: `c${SIDO}-${items.length}`,
    kindergartenId: e.kindergartenId,
    kindergartenName: kg.name,
    url: e.url,
    title,
    snippet,
    whyFlagged: [`v3-${SIDO}`],
    source: e.source,
    sidoCode: SIDO,
    _addr: kg.address,
    _date: e.date,
    _srcName: e.sourceName,
  });
}

for (const [k, v] of Object.entries(stats).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${k.padEnd(14)} ${v}`);
}

const outPath = path.join(OUT_DIR, `body-check-${SIDO}.json`);
fs.writeFileSync(
  outPath,
  JSON.stringify({ generatedAt: new Date().toISOString(), items }, null, 1)
);
console.log(`\n본문 스크랩 대상: ${items.length}건 → ${outPath}`);

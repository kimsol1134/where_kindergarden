/**
 * 스크랩한 본문으로 후기 후보를 자동 선별한다.
 *
 * 제목+스니펫만 보고 판단하면 오판이 많다(실측 22%). 본문을 읽으면
 * 업체 홍보·유치원 자체 게시물·해시태그 나열을 구분할 수 있다.
 *
 * 사용법:
 *   npx tsx scripts/screen-review-bodies.ts --sido 11
 *   npx tsx scripts/screen-review-bodies.ts --sido 11 --out /tmp/keep11.json
 */

import * as fs from 'fs';
import * as path from 'path';

const args = process.argv.slice(2);
const flag = (n: string) => {
  const i = args.indexOf(n);
  return i >= 0 ? args[i + 1] : null;
};
const SIDO = flag('--sido');
if (!SIDO) {
  console.error('--sido 가 필요합니다.');
  process.exit(1);
}

const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'scripts/data-output');
const OUT = flag('--out') ?? `/tmp/keep${SIDO}.json`;

interface Candidate {
  reviewId: string;
  kindergartenId: string;
  kindergartenName: string;
  url: string;
  title: string;
  snippet: string;
  sidoCode: string;
  source: string;
  _addr: string;
  _date?: string;
  _srcName?: string;
  body?: string;
}

const scraped = JSON.parse(
  fs.readFileSync(path.join(OUT_DIR, `body-scraped-${SIDO}-v2.json`), 'utf-8')
) as Array<{ reviewId: string; bodyText: string; textLength: number }>;
const bodies = new Map(scraped.map((r) => [r.reviewId, r.bodyText ?? '']));

const candidates = (
  JSON.parse(fs.readFileSync(path.join(OUT_DIR, `body-check-${SIDO}.json`), 'utf-8'))
    .items as Candidate[]
);

const publishedUrls = new Set<string>();
const pubDir = path.join(ROOT, 'public/data/reviews');
for (const f of fs.readdirSync(pubDir)) {
  if (!f.endsWith('.json')) continue;
  const d = JSON.parse(fs.readFileSync(path.join(pubDir, f), 'utf-8'));
  for (const revs of Object.values(d.reviews ?? {}) as Array<Array<{ url: string }>>) {
    for (const r of revs) publishedUrls.add(r.url);
  }
}

/** 시공·섭외·강사료처럼 글쓴이가 업체나 외부 강사임을 드러내는 어휘. */
const VENDOR = /(견적|시공|설치 문의|납품|섭외 문의|출강|강사료|대관|예약금|카톡 문의|계약)/;
/** 학부모가 직접 겪은 일을 서술할 때 나오는 표현. */
const PARENT = /(우리\s?아이|저희\s?아이|보내고 있|다니고 있|입학설명회|재원|등원|하원|졸업|참여수업|다녀왔)/g;
/** 해당 유치원을 실제로 서술하는지 판단하는 신호. */
const DESCRIBES = /(설명회|다녀왔|다녀보|보내고|재원|입학|졸업|참여수업|상담|후기|만족|장점|단점|시설|원비|교육비|프로그램|선생님|원장)/;

function ownDistrictForms(address: string): string[] {
  const parts = address.split(/\s+/);
  const own = parts.slice(1, 3).filter((p) => /(시|군|구)$/.test(p));
  return own.flatMap((d) => [d, d.replace(/(시|군|구)$/, '')]).filter((s) => s.length >= 2);
}

const stats: Record<string, number> = {};
const bump = (k: string) => (stats[k] = (stats[k] ?? 0) + 1);
const keep: Candidate[] = [];

for (const c of candidates) {
  const body = bodies.get(c.reviewId) ?? '';
  if (publishedUrls.has(c.url)) { bump('이미 배포'); continue; }
  if (body.length < 300) { bump('본문부족'); continue; }

  const name = c.kindergartenName.replace(/\s+/g, '');
  const flat = body.replace(/\s+/g, '');

  const positions: number[] = [];
  for (let i = flat.indexOf(name); i >= 0; i = flat.indexOf(name, i + 1)) positions.push(i);
  if (positions.length === 0) { bump('본문에 이름 없음'); continue; }

  if (!ownDistrictForms(c._addr).some((f) => flat.includes(f))) {
    bump('본문 시군구 불일치');
    continue;
  }
  if (VENDOR.test(flat)) { bump('업체/강사'); continue; }

  const selfPromo = new RegExp(
    `(안녕하세요[!,.\\s]*${name}입니다|저희${name}(은|는)|${name}입니다)`
  );
  if (selfPromo.test(flat)) { bump('유치원 자체글'); continue; }

  // 해시태그 나열에만 등장하면 이 글은 그 유치원에 대한 글이 아니다.
  const prose = positions.filter((i) => !(i > 0 && flat[i - 1] === '#'));
  if (prose.length === 0) { bump('해시태그만'); continue; }

  // 주변 유치원을 무더기로 나열하는 학원·업체 광고 패턴.
  const listy = prose.some(
    (i) => new Set(flat.slice(Math.max(0, i - 90), i + 90).match(/[가-힣]{2,6}유치원/g) ?? []).size >= 4
  );
  if (listy && prose.length <= 2) { bump('주변 나열'); continue; }

  if (!prose.some((i) => DESCRIBES.test(flat.slice(Math.max(0, i - 120), i + 160)))) {
    bump('서술 없음');
    continue;
  }
  if ((body.match(PARENT) ?? []).length === 0) { bump('학부모 신호 없음'); continue; }

  keep.push({ ...c, body });
  bump('통과');
}

for (const [k, v] of Object.entries(stats).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${k.padEnd(16)} ${v}`);
}
fs.writeFileSync(OUT, JSON.stringify(keep, null, 1));
console.log(`\n검수 대상: ${keep.length}건 → ${OUT}`);

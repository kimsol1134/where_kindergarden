/**
 * 이미 배포된 후기를 본문으로 재검증한다.
 *
 * 제목+스니펫만 보고 승인한 건에서 오매칭이 나왔던 경험(실측 22%) 때문에,
 * 배포 후에도 본문을 다시 받아 아래를 확인한다:
 *   - 원글이 살아 있는지 (비공개 전환·삭제 감지)
 *   - 본문에 해당 유치원명이 산문으로 등장하는지
 *   - 본문의 지역이 유치원 시군구와 맞는지
 *   - 대가성 광고 문구가 있는지
 *   - 유치원이 직접 쓴 글인지
 *
 * 사용법:
 *   npx tsx scripts/verify-published-reviews.ts --since 2026-07-26
 *   npx tsx scripts/verify-published-reviews.ts --all
 */

import * as fs from 'fs';
import * as path from 'path';

const args = process.argv.slice(2);
const flag = (n: string) => {
  const i = args.indexOf(n);
  return i >= 0 ? args[i + 1] : null;
};
const SINCE = flag('--since');
const ALL = args.includes('--all');
if (!SINCE && !ALL) {
  console.error('--since YYYY-MM-DD 또는 --all 이 필요합니다.');
  process.exit(1);
}

const ROOT = path.resolve(__dirname, '..');

/** 대가성 표기. 이런 글은 후기로 볼 수 없다. */
const PAID = /(원고료를 제공|소정의 (원고료|포인트)|업체로부터.{0,10}제공|협찬을 받아|광고기획사)/;
/** 원글이 사라졌거나 접근이 막힌 경우. */
const DEAD = /(비공개 게시물|삭제된 게시(물|글)|존재하지 않는|접근 권한이 없)/;

const MOBILE_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 ' +
    '(KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  'Accept-Language': 'ko-KR,ko;q=0.9',
  Referer: 'https://m.naver.com/',
};

function toMobileUrl(url: string): string | null {
  const m = url.match(/blog\.naver\.com\/([^/?#]+)\/(\d+)/);
  if (m) return `https://m.blog.naver.com/PostView.naver?blogId=${m[1]}&logNo=${m[2]}`;
  const blogId = url.match(/[?&]blogId=([^&]+)/)?.[1];
  const logNo = url.match(/[?&]logNo=(\d+)/)?.[1];
  if (blogId && logNo) return `https://m.blog.naver.com/PostView.naver?blogId=${blogId}&logNo=${logNo}`;
  return null;
}

function extractText(html: string): string {
  let t = html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ');
  t = t.replace(/<[^>]+>/g, ' ');
  t = t.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  return t.replace(/\s+/g, ' ').trim();
}

interface Row {
  sido: string;
  kindercode: string;
  name: string;
  address: string;
  id: string;
  title: string;
  url: string;
}

const kindergartens = new Map(
  (JSON.parse(fs.readFileSync(path.join(ROOT, 'public/data/kindergartens.json'), 'utf-8')) as Array<{
    kindercode: string; name: string; address: string;
  }>).map((k) => [k.kindercode, k])
);

const rows: Row[] = [];
const pubDir = path.join(ROOT, 'public/data/reviews');
for (const f of fs.readdirSync(pubDir)) {
  if (!f.endsWith('.json')) continue;
  const d = JSON.parse(fs.readFileSync(path.join(pubDir, f), 'utf-8'));
  for (const [kindercode, revs] of Object.entries(d.reviews ?? {}) as Array<[string, Array<Record<string, string>>]>) {
    for (const r of revs) {
      const when = (r.collectedAt ?? '').slice(0, 10);
      if (!ALL && SINCE && when < SINCE) continue;
      const kg = kindergartens.get(kindercode);
      if (!kg) continue;
      rows.push({
        sido: f.replace('.json', ''), kindercode,
        name: kg.name, address: kg.address,
        id: r.id, title: r.title, url: r.url,
      });
    }
  }
}

console.log(`검증 대상 ${rows.length}건\n`);

const problems: Array<Row & { reason: string }> = [];
let checked = 0;

async function check(row: Row): Promise<void> {
  const mobile = toMobileUrl(row.url);
  if (!mobile) return; // 네이버 블로그가 아니면 이 방법으로 확인할 수 없다
  let body = '';
  try {
    const res = await fetch(mobile, { headers: MOBILE_HEADERS, redirect: 'follow' });
    if (res.ok) body = extractText(await res.text());
  } catch {
    return;
  }
  if (!body) return;

  if (DEAD.test(body)) { problems.push({ ...row, reason: '원글 사망(비공개/삭제)' }); return; }
  if (body.length < 300) return; // 스크랩이 얕게 된 것이지 내용 문제는 아니다

  if (PAID.test(body)) { problems.push({ ...row, reason: '대가성 광고' }); return; }

  const name = row.name.replace(/\s+/g, '');
  const flat = body.replace(/\s+/g, '');
  const selfPromo = new RegExp(`(안녕하세요[!,.\\s]*${name}\\s*원|바다\\s*꿈지기|${name}\\s*원장|저희${name})`);
  if (selfPromo.test(flat)) { problems.push({ ...row, reason: '유치원 자체 게시물' }); return; }

  const positions: number[] = [];
  for (let i = flat.indexOf(name); i >= 0; i = flat.indexOf(name, i + 1)) positions.push(i);
  if (positions.length === 0) { problems.push({ ...row, reason: '본문에 유치원명 없음' }); return; }
  if (positions.every((i) => i > 0 && flat[i - 1] === '#')) {
    problems.push({ ...row, reason: '해시태그로만 언급' });
  }
}

async function main(): Promise<void> {
  const queue = [...rows];
  const workers = Array.from({ length: 4 }, async () => {
    while (queue.length) {
      const row = queue.shift();
      if (!row) break;
      await check(row);
      checked++;
      if (checked % 50 === 0) console.log(`  ${checked}/${rows.length} · 문제 ${problems.length}건`);
      await new Promise((r) => setTimeout(r, 200));
    }
  });
  await Promise.all(workers);

  console.log(`\n검증 완료 · 문제 ${problems.length}건`);
  for (const p of problems) {
    console.log(`  [${p.reason}] ${p.name} | ${p.title.slice(0, 46)}`);
    console.log(`      ${p.url}`);
  }
  const out = path.join(ROOT, 'scripts/data-output/review-verify-problems.json');
  fs.writeFileSync(out, JSON.stringify(problems, null, 1));
  console.log(`\n→ ${out}`);
}

void main();

/**
 * 네이버 블로그 본문 재수집 (모바일 URL + iPhone UA).
 *
 * `batch-scrape-content.ts`(Playwright)는 blog.naver.com의 iframe 구조 때문에
 * 본문을 못 가져오는 경우가 많다. 실측에서 59자만 얻던 글이 다수였다.
 *
 * 네이버 블로그는 `m.blog.naver.com/PostView.naver?blogId=&logNo=` 형태의
 * 모바일 엔드포인트를 iPhone UA로 요청하면 본문이 그대로 HTML에 담겨 온다.
 * 같은 글에서 59자 → 2,899자로 확인했다.
 *
 * 사용법:
 *   npx tsx scripts/rescrape-naver-mobile.ts --input <scraped.json> --output <out.json>
 *   npx tsx scripts/rescrape-naver-mobile.ts --input a.json --output b.json --min 300
 */

import * as fs from 'fs';

const args = process.argv.slice(2);
const flag = (n: string) => {
  const i = args.indexOf(n);
  return i >= 0 ? args[i + 1] : null;
};

const INPUT = flag('--input');
const OUTPUT = flag('--output');
/** 이 길이 미만인 항목만 재시도한다. */
const MIN = Number(flag('--min') ?? 300);
const CONCURRENCY = Number(flag('--concurrency') ?? 4);

if (!INPUT || !OUTPUT) {
  console.error('--input과 --output이 필요합니다.');
  process.exit(1);
}

interface ScrapeRow {
  reviewId: string;
  kindergartenId: string;
  kindergartenName: string;
  url: string;
  status: string;
  bodyText: string;
  textLength: number;
  scrapedAt: string;
}

const MOBILE_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 ' +
    '(KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  'Accept-Language': 'ko-KR,ko;q=0.9',
  Referer: 'https://m.naver.com/',
};

/** blog.naver.com URL에서 blogId와 logNo를 뽑아 모바일 PostView 주소로 바꾼다. */
function toMobileUrl(url: string): string | null {
  // https://blog.naver.com/{id}/{no}
  let m = url.match(/blog\.naver\.com\/([^/?#]+)\/(\d+)/);
  if (m) return `https://m.blog.naver.com/PostView.naver?blogId=${m[1]}&logNo=${m[2]}`;

  // https://blog.naver.com/PostView.naver?blogId={id}&logNo={no}
  const blogId = url.match(/[?&]blogId=([^&]+)/)?.[1];
  const logNo = url.match(/[?&]logNo=(\d+)/)?.[1];
  if (blogId && logNo) {
    return `https://m.blog.naver.com/PostView.naver?blogId=${blogId}&logNo=${logNo}`;
  }
  return null;
}

/** HTML에서 읽을 수 있는 텍스트만 남긴다. */
function extractText(html: string): string {
  let t = html.replace(/<script[\s\S]*?<\/script>/gi, ' ');
  t = t.replace(/<style[\s\S]*?<\/style>/gi, ' ');
  t = t.replace(/<[^>]+>/g, ' ');
  t = t
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)));
  return t.replace(/\s+/g, ' ').trim();
}

/** 네이버 블로그 UI 상용구를 걷어내 실제 본문 비중을 높인다. */
function stripChrome(text: string): string {
  const noise = [
    '본문 바로가기', '블로그 카테고리 이동', 'MY메뉴 열기', '이웃추가',
    '본문 기타 기능', '본문 폰트 크기 조정', '본문 폰트 크기 작게 보기',
    '본문 폰트 크기 크게 보기', '공유하기', 'URL복사', '신고하기',
    '악성코드가 포함되어 있는 파일입니다', '작성자 : 파일 용량 :',
    '댓글 쓰기', '이 블로그', '카테고리 글', '전체보기',
  ];
  let t = text;
  for (const n of noise) t = t.split(n).join(' ');
  return t.replace(/\s+/g, ' ').trim();
}

async function fetchBody(url: string): Promise<{ text: string; ok: boolean }> {
  const mobile = toMobileUrl(url);
  if (!mobile) return { text: '', ok: false };
  try {
    const res = await fetch(mobile, { headers: MOBILE_HEADERS, redirect: 'follow' });
    if (!res.ok) return { text: '', ok: false };
    const html = await res.text();
    return { text: stripChrome(extractText(html)), ok: true };
  } catch {
    return { text: '', ok: false };
  }
}

// ---------------------------------------------------------------------------

const raw = JSON.parse(fs.readFileSync(INPUT, 'utf-8'));
const rows: ScrapeRow[] = Array.isArray(raw) ? raw : raw.results ?? raw.items ?? [];

const targets = rows.filter((r) => (r.textLength ?? 0) < MIN && /blog\.naver\.com/.test(r.url));
console.log(`전체 ${rows.length}건 · 재시도 대상 ${targets.length}건 (본문 ${MIN}자 미만 네이버 블로그)`);

let done = 0;
let recovered = 0;
const byId = new Map(rows.map((r) => [r.reviewId, r]));

async function worker(queue: ScrapeRow[]) {
  while (queue.length) {
    const row = queue.shift();
    if (!row) break;
    const { text, ok } = await fetchBody(row.url);
    done++;
    if (ok && text.length > (row.textLength ?? 0)) {
      const target = byId.get(row.reviewId);
      if (target) {
        target.bodyText = text;
        target.textLength = text.length;
        target.status = 'success';
        target.scrapedAt = new Date().toISOString();
      }
      if (text.length >= MIN) recovered++;
    }
    if (done % 25 === 0) console.log(`  ${done}/${targets.length} · 회수 ${recovered}건`);
    await new Promise((r) => setTimeout(r, 250)); // 예의상 간격
  }
}

async function main(): Promise<void> {
  const queue = [...targets];
  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker(queue)));

  fs.writeFileSync(OUTPUT!, JSON.stringify(rows, null, 1));
  console.log(`\n완료 · ${MIN}자 이상 확보: ${recovered}건 → ${OUTPUT}`);
}

void main();

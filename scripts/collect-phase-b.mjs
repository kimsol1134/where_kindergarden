#!/usr/bin/env node
/**
 * collect-phase-b.mjs — 리뷰 없는 유치원에 신규 후기를 insane-search 방식(네이버 모바일 검색 직접 fetch)으로 수집한다.
 *
 * 검증(Phase A)과 동일한 heuristic으로 각 후보 본문을 fetch·채점하여,
 * 진성 학부모/방문 후기로 강하게 판정되는 것만 후보로 남긴다 (에이전트가 최종 확인).
 *
 *   node scripts/collect-phase-b.mjs --sido 11 --limit 20
 *   node scripts/collect-phase-b.mjs --sido 11 --offset 20 --limit 20
 *
 * 출력: scripts/data-output/phase-b/<sido>-candidates.json  (resumable, 처리된 kindercode 스킵)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'scripts/data-output/phase-b');
const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

const args = process.argv.slice(2);
const val = (f) => { const i = args.indexOf(f); return i === -1 ? undefined : args[i + 1]; };
const SIDO = val('--sido');
const LIMIT = val('--limit') ? parseInt(val('--limit'), 10) : 25;
const OFFSET = val('--offset') ? parseInt(val('--offset'), 10) : 0;
if (!SIDO) { console.error('Usage: --sido <code> [--offset N] [--limit N]'); process.exit(1); }

const kgs = JSON.parse(fs.readFileSync(path.join(ROOT, 'public/data/kindergartens.json'), 'utf8'));
const reviewsData = JSON.parse(fs.readFileSync(path.join(ROOT, 'public/data/reviews.json'), 'utf8'));
const hasReview = new Set(Object.keys(reviewsData.reviews));
// 기존 URL 전역 집합 (중복 방지)
const existingUrls = new Set();
for (const kid in reviewsData.reviews) for (const r of reviewsData.reviews[kid]) existingUrls.add(canon(r.url));

function canon(u) { try { const x = new URL(u); return (x.hostname.replace(/^m\.|^www\./, '') + x.pathname).replace(/\/$/, ''); } catch { return u; } }
function delay(ms) { return new Promise((r) => setTimeout(r, ms)); }

// ---- 이름/지역/의도 heuristic (Phase A와 동일 사상) ----
function strongNames(name) {
  const set = new Set([name]);
  const base = name.replace(/(유치원|어린이집)$/u, '');
  if (base.length >= 2) { set.add(base + '유치원'); }
  return [...set].filter((s) => s.length >= 3);
}
function dongOf(addr) { const m = (addr || '').split(/\s+/).find((p) => /[가-힣]동$/.test(p)); return m ? m.replace(/\d/g, '') : ''; }
function guOf(addr) { const m = (addr || '').split(/\s+/).find((p) => /[가-힣]{2,}구$/.test(p)); return m || ''; }
const INTENT = ['우리 아이', '우리아이', '원아', '등원', '하원', '졸업', '입학', '학부모', '상담', '설명회', '다녔', '다니고', '다니는', '보냈', '보내고', '원복', '담임', '재원', '입소', '아이가 다니', '참여수업', '공개수업', '발표회', '운동회', '재롱', '오리엔테이션', '적응'];
const OTHER = ['아파트', '분양', '모델하우스', '청약', '매물', '공인중개', '맛집', '칼국수', '샤브', '식당', '고깃집', '합기도', '태권도', '주짓수', '헬스장', '필라테스', '미용실', '네일', '부동산', '공동구매', '자산관리특강', '연수강의', '출강', '원데이클래스', '포토부스', '매직쇼', '버블쇼', '인형극', '샌드아트', '보일러', '도어락', '시공', '왁싱', '에스테틱', '두피문신', '학원', '교습소', '공부방', '리뷰이벤트', '체험단', '내돈내산'];
function count(t, arr) { let n = 0; for (const w of arr) if (t.includes(w)) n++; return n; }
function has(t, arr) { for (const w of arr) if (t.includes(w)) return w; return null; }

function toMobileBlog(url) {
  try { const u = new URL(url);
    if (u.hostname.includes('blog.naver.com')) { const m = u.pathname.match(/^\/([^/]+)\/(\d+)/); const id = u.searchParams.get('blogId') || (m && m[1]); const no = u.searchParams.get('logNo') || (m && m[2]); if (id && no) return `https://m.blog.naver.com/PostView.naver?blogId=${id}&logNo=${no}`; }
  } catch {}
  return url;
}
function strip(html) { return html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/gi, ' ').replace(/\s+/g, ' ').trim(); }

async function fetchText(url) {
  try { const res = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'ko-KR', Referer: 'https://m.naver.com/' }, redirect: 'follow', signal: AbortSignal.timeout(15000) });
    return { status: res.status, html: await res.text() };
  } catch (e) { return { status: 0, html: '', error: e.message }; }
}

async function searchCandidates(name, dong) {
  const queries = [`${name} ${dong} 후기`, `${name} 입학설명회 후기`, `${name} 다녀`];
  const urls = new Set();
  const meta = {};
  for (const q of queries) {
    const sUrl = `https://m.search.naver.com/search.naver?where=m_view&query=${encodeURIComponent(q)}`;
    const { html } = await fetchText(sUrl);
    // 전체 글 URL (logNo 또는 cafe articleid 포함)만
    for (const m of html.matchAll(/https?:\/\/(?:m\.)?blog\.naver\.com\/([a-zA-Z0-9_-]+)\/(\d{6,})/g)) { const u = `https://blog.naver.com/${m[1]}/${m[2]}`; urls.add(u); }
    await delay(400);
  }
  return [...urls].filter((u) => !existingUrls.has(canon(u)));
}

function score(name, dong, gu, body, title) {
  const names = strongNames(name);
  const nameInBody = names.some((c) => body.includes(c));
  const nameInTitle = names.some((c) => title.includes(c));
  const intent = count(body || title, INTENT);
  const other = has(title, OTHER) || has(body.slice(0, 500), OTHER);
  const region = (!!dong && body.includes(dong)) || (!!gu && body.includes(gu));
  const ownPage = /오시는 ?길|찾아오시는|약도/.test(title); // 유치원 자체 위치 안내
  let verdict = 'review';
  if (!nameInBody || ownPage) verdict = 'reject';
  else if (other && intent < 2) verdict = 'reject';
  // accept는 region 일치까지 요구 (동명 타지역/랜드마크 오탐 차단)
  else if (intent >= 3 && !other && region) verdict = 'accept';
  return { nameInBody, nameInTitle, intent, other: other || null, region, verdict };
}

async function run() {
  const targets = kgs.filter((k) => k.sido_code === SIDO && !hasReview.has(k.kindercode) && k.name && k.address).slice(OFFSET, OFFSET + LIMIT);
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const outPath = path.join(OUT_DIR, `${SIDO}-candidates.json`);
  let store = fs.existsSync(outPath) ? JSON.parse(fs.readFileSync(outPath, 'utf8')) : { sido: SIDO, processed: [], candidates: [] };
  const done = new Set(store.processed);

  let found = 0;
  for (const kg of targets) {
    if (done.has(kg.kindercode)) continue;
    const dong = dongOf(kg.address); const gu = guOf(kg.address);
    const cands = await searchCandidates(kg.name, dong);
    for (const url of cands.slice(0, 8)) {
      const { html, status } = await fetchText(toMobileBlog(url));
      if (status !== 200 || html.length < 500) { await delay(200); continue; }
      const text = strip(html);
      const title = (text.match(/^(.{0,80}?)\s*:\s*네이버/) || [, ''])[1] || text.slice(0, 60);
      const s = score(kg.name, dong, gu, text, title);
      if (s.verdict !== 'reject') {
        store.candidates.push({ kindergartenId: kg.kindercode, kgName: kg.name, dong, gu, url, source: url.includes('cafe') ? 'naver_cafe' : 'naver_blog', title: title.slice(0, 90), excerpt: text.slice(0, 220), ...s });
        if (s.verdict === 'accept') found++;
      }
      existingUrls.add(canon(url));
      await delay(250);
    }
    store.processed.push(kg.kindercode);
    fs.writeFileSync(outPath, JSON.stringify(store, null, 2));
    process.stdout.write(`\r  ${store.processed.length}/${targets.length} processed | candidates=${store.candidates.length} accept=${found}`);
  }
  process.stdout.write('\n');
  const tally = {}; for (const c of store.candidates) tally[c.verdict] = (tally[c.verdict] || 0) + 1;
  console.log(`[done] ${path.relative(ROOT, outPath)} | candidates ${store.candidates.length} ${JSON.stringify(tally)}`);
}
run();

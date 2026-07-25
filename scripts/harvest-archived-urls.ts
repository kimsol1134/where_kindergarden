/**
 * 아카이브에 남아 있는 미배포 후기 URL을 기존 필터 파이프라인에 태워 회수한다.
 *
 * `scripts/data-output/reviews-urls-raw/`에는 이미 title/snippet/date까지 보강된
 * 후기 후보가 4,000건 넘게 쌓여 있지만 배포본에는 들어가지 않았다. 원본 데이터의
 * `relevanceScore`는 신뢰할 수 없다(과외 광고가 9점, 실제 입학설명회 후기가 2점).
 *
 * 그래서 점수를 무시하고 `src/lib/utils/review-utils.ts`의 검증 로직을 다시 적용한다:
 *   1) 이미 배포된 URL 제외
 *   2) isSpamReview — 제목/스니펫 스팸 패턴
 *   3) classifyContentType — 후기가 아닌 템플릿/질문/목록 글 제외
 *   4) calculateRelevanceScoreV2 — 유치원명 매칭 및 지역 검증
 *
 * 네이버 API 자격증명이 필요 없다. 이미 수집된 데이터만 재처리한다.
 *
 * 사용법:
 *   pnpm harvest:archived                 # 수율만 확인 (dry-run)
 *   pnpm harvest:archived -- --apply      # public/data/reviews/에 병합
 *   pnpm harvest:archived -- --min-score 3
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  isSpamReview,
  classifyContentType,
  calculateRelevanceScoreV2,
  validateLocationMatch,
  extractRegionName,
} from '../src/lib/utils/review-utils';

interface RawUrlEntry {
  kindergartenId: string;
  kindergartenName: string;
  title: string;
  url: string;
  source: string;
  sourceName?: string;
  snippet: string;
  date?: string;
  collectedAt?: string;
  relevanceScore?: number;
}

interface PublishedReview {
  id: string;
  title: string;
  url: string;
  source: string;
  sourceName?: string;
  snippet: string;
  date?: string | null;
  collectedAt: string;
}

interface ReviewsFile {
  version: string;
  totalCount: number;
  kindergartenCount: number;
  reviews: Record<string, PublishedReview[]>;
}

const ROOT = path.resolve(__dirname, '..');
const RAW_DIR = path.join(ROOT, 'scripts/data-output/reviews-urls-raw');
const PUB_DIR = path.join(ROOT, 'public/data/reviews');

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const MIN_SCORE = Number(
  args.includes('--min-score') ? args[args.indexOf('--min-score') + 1] : 3
);

/** 후기·방문 경험을 나타내는 제목 신호. 이게 없으면 단순 언급일 확률이 높다. */
const REVIEW_INTENT =
  /(후기|설명회|다녀왔|보내고|보낸|입학|원아모집|졸업|적응기|첫등원|등원)/;

const HANGUL = /[가-힣]/;

/**
 * 유치원명이 더 긴 다른 유치원 이름의 꼬리로 걸린 것이 아닌지 확인한다.
 *
 * "가온호수유치원" 글이 "호수유치원"에, "빛여울유치원" 글이 "여울유치원"에
 * 매칭되는 오탐이 실제로 다수 있었다. 이름 바로 앞 글자가 한글이면
 * 다른 유치원 이름의 일부로 보고 제외한다.
 */
function nameAppearsStandalone(text: string, name: string): boolean {
  const hay = text.replace(/\s+/g, '');
  const needle = name.replace(/\s+/g, '');
  let i = hay.indexOf(needle);
  while (i >= 0) {
    const prev = i > 0 ? hay[i - 1] : '';
    if (!HANGUL.test(prev)) return true;
    i = hay.indexOf(needle, i + 1);
  }
  return false;
}

/** 유치원 코드 → 이름/주소 조회용. 지역 검증에 쓴다. */
function loadKindergartens(): Map<string, { name: string; address: string }> {
  const raw = JSON.parse(
    fs.readFileSync(path.join(ROOT, 'public/data/kindergartens.json'), 'utf-8')
  ) as Array<{ kindercode: string; name: string; address: string }>;
  return new Map(raw.map((k) => [k.kindercode, { name: k.name, address: k.address }]));
}

function loadPublished(): Map<string, ReviewsFile> {
  const files = new Map<string, ReviewsFile>();
  for (const f of fs.readdirSync(PUB_DIR)) {
    if (!f.endsWith('.json')) continue;
    const sido = f.replace('.json', '');
    files.set(sido, JSON.parse(fs.readFileSync(path.join(PUB_DIR, f), 'utf-8')));
  }
  return files;
}

function loadRaw(): Map<string, RawUrlEntry[]> {
  const bySido = new Map<string, RawUrlEntry[]>();
  if (!fs.existsSync(RAW_DIR)) return bySido;
  for (const f of fs.readdirSync(RAW_DIR)) {
    const m = f.match(/reviews-urls-(\d+)\.json$/);
    if (!m) continue;
    const entries = JSON.parse(fs.readFileSync(path.join(RAW_DIR, f), 'utf-8')) as RawUrlEntry[];
    bySido.set(m[1], Array.isArray(entries) ? entries : []);
  }
  return bySido;
}

// ---------------------------------------------------------------------------

const kindergartens = loadKindergartens();
const published = loadPublished();
const rawBySido = loadRaw();

const publishedUrls = new Set<string>();
for (const file of published.values()) {
  for (const revs of Object.values(file.reviews)) {
    for (const r of revs) publishedUrls.add(r.url);
  }
}

const stats = {
  total: 0,
  alreadyPublished: 0,
  unknownKindergarten: 0,
  spam: 0,
  notReview: 0,
  lowScore: 0,
  regionMismatch: 0,
  nameNotInTitle: 0,
  noReviewIntent: 0,
  accepted: 0,
};

const accepted = new Map<string, RawUrlEntry[]>(); // sido -> entries
const seenUrls = new Set<string>();

for (const [sido, entries] of rawBySido) {
  for (const e of entries) {
    stats.total++;

    if (!e.url || publishedUrls.has(e.url) || seenUrls.has(e.url)) {
      stats.alreadyPublished++;
      continue;
    }

    const kg = kindergartens.get(e.kindergartenId);
    if (!kg) {
      stats.unknownKindergarten++;
      continue;
    }

    const title = e.title ?? '';
    const snippet = e.snippet ?? '';

    if (isSpamReview({ title, snippet, sourceName: e.sourceName }).isSpam) {
      stats.spam++;
      continue;
    }

    // 분류기는 본문 전체를 전제로 만들어져 스니펫만으로는 대부분 'unknown'이 된다.
    // 그래서 확실히 후기가 아닌 유형만 여기서 쳐내고, 나머지 판정은 관련성 점수에 맡긴다.
    // (`info_list`는 "천안 5세반 유치원 결정하기"처럼 여러 곳을 비교한 실제 후기가 많다.)
    const contentType = classifyContentType(title, snippet);
    if (contentType === 'question' || contentType === 'template') {
      stats.notReview++;
      continue;
    }

    // 다른 시도의 글이 섞여 들어오는 것을 막는다 (서울↔경기 오염이 대표적).
    const location = validateLocationMatch(`${title} ${snippet}`, sido, kg.address);
    if (!location.isValid) {
      stats.regionMismatch++;
      continue;
    }

    const result = calculateRelevanceScoreV2(
      title,
      snippet,
      kg.name,
      extractRegionName(kg.address)
    );

    if (result.isSpam) {
      stats.spam++;
      continue;
    }
    if (result.score < MIN_SCORE) {
      stats.lowScore++;
      continue;
    }

    // 제목 앵커링. 스니펫에만 이름이 스치는 글(태권도 광고, 맛집 후기가
    // 유치원을 지형지물로 언급하는 경우)을 여기서 걷어낸다.
    if (!nameAppearsStandalone(title, kg.name)) {
      stats.nameNotInTitle++;
      continue;
    }
    if (!REVIEW_INTENT.test(title)) {
      stats.noReviewIntent++;
      continue;
    }

    seenUrls.add(e.url);
    stats.accepted++;
    if (!accepted.has(sido)) accepted.set(sido, []);
    accepted.get(sido)!.push(e);
  }
}

const SIDO_NAMES: Record<string, string> = {
  '11': '서울', '26': '부산', '27': '대구', '28': '인천', '29': '광주',
  '30': '대전', '31': '울산', '36': '세종', '41': '경기', '43': '충북',
  '44': '충남', '46': '전남', '47': '경북', '48': '경남', '50': '제주',
  '51': '강원', '52': '전북',
};

console.log('아카이브 미배포 URL 재처리');
console.log(`  최소 관련성 점수: ${MIN_SCORE}\n`);
console.log(`  전체 후보         ${stats.total}`);
console.log(`  이미 배포/중복    ${stats.alreadyPublished}`);
console.log(`  유치원 미매칭     ${stats.unknownKindergarten}`);
console.log(`  스팸 패턴         ${stats.spam}`);
console.log(`  후기 아님         ${stats.notReview}`);
console.log(`  지역 불일치       ${stats.regionMismatch}`);
console.log(`  점수 미달         ${stats.lowScore}`);
console.log(`  제목에 유치원명 없음 ${stats.nameNotInTitle}`);
console.log(`  후기 의도 없음    ${stats.noReviewIntent}`);
console.log(`  ─────────────────────────`);
console.log(`  통과              ${stats.accepted}\n`);

if (stats.accepted === 0) {
  console.log('회수할 항목이 없습니다.');
  process.exit(0);
}

// 신규로 후기가 생기는 유치원 수 (빈 화면이 채워지는 수)
let newlyCovered = 0;
const perSido: Array<[string, number, number]> = [];
for (const [sido, entries] of accepted) {
  const file = published.get(sido);
  const existing = new Set(Object.keys(file?.reviews ?? {}));
  const kgs = new Set(entries.map((e) => e.kindergartenId));
  const fresh = [...kgs].filter((k) => !existing.has(k)).length;
  newlyCovered += fresh;
  perSido.push([sido, entries.length, fresh]);
}

perSido.sort((a, b) => b[1] - a[1]);
console.log('지역별 회수:');
for (const [sido, n, fresh] of perSido) {
  console.log(`  ${(SIDO_NAMES[sido] ?? sido).padEnd(6)} 후기 ${String(n).padStart(4)}건 · 후기 0건이었던 유치원 ${fresh}곳 신규 커버`);
}
console.log(`\n  합계: ${stats.accepted}건 · 신규 커버 유치원 ${newlyCovered}곳`);

if (!APPLY) {
  console.log('\n(dry-run — 실제 반영하려면 --apply)');
  process.exit(0);
}

// ---------------------------------------------------------------------------
// 병합

const today = new Date().toISOString().slice(0, 10);
let nextId = 1;
for (const file of published.values()) {
  for (const revs of Object.values(file.reviews)) {
    for (const r of revs) {
      const m = r.id?.match(/^rev-(\d+)$/);
      if (m) nextId = Math.max(nextId, Number(m[1]) + 1);
    }
  }
}

for (const [sido, entries] of accepted) {
  let file = published.get(sido);
  if (!file) {
    file = { version: today, totalCount: 0, kindergartenCount: 0, reviews: {} };
    published.set(sido, file);
  }
  for (const e of entries) {
    const list = (file.reviews[e.kindergartenId] ??= []);
    list.push({
      id: `rev-${String(nextId++).padStart(4, '0')}`,
      title: e.title,
      url: e.url,
      source: e.source,
      sourceName: e.sourceName,
      snippet: e.snippet,
      date: e.date ?? null,
      collectedAt: e.collectedAt ?? new Date().toISOString(),
    });
  }
  file.version = today;
  file.kindergartenCount = Object.keys(file.reviews).length;
  file.totalCount = Object.values(file.reviews).reduce((s, r) => s + r.length, 0);
  fs.writeFileSync(
    path.join(PUB_DIR, `${sido}.json`),
    JSON.stringify(file, null, 2) + '\n'
  );
  console.log(`  기록: public/data/reviews/${sido}.json (${file.totalCount}건 / ${file.kindergartenCount}곳)`);
}

console.log('\n병합 완료. pnpm rebuild:reviews 로 통합 파일을 갱신하세요.');

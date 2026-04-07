import * as fs from 'fs';
import * as path from 'path';
import type { ReviewLink, ReviewsData } from '../src/types/review';
import { extractReadableTextFromHtml } from '../src/lib/utils/review-html';

interface KindergartenInfo {
  kindercode: string;
  name: string;
  address: string;
  sido_code: string;
}

interface VerificationResult {
  reviewId: string;
  kindergartenId: string;
  kindergartenName: string;
  kindergartenAddress: string;
  title: string;
  url: string;
  source: string;
  status: 'verified' | 'mismatch' | 'spam' | 'fetch_failed' | 'blocked';
  reason: string;
  bodyLength: number;
  nameFoundInBody: boolean;
  locationFoundInBody: boolean;
}

interface CacheFile {
  [url: string]: { body: string; fetchedAt: string; status: number };
}

const CACHE_PATH = path.resolve('scripts/data-output/review-crawl-cache.json');
const RESULTS_PATH = path.resolve('scripts/data-output/review-verification-results.json');
const CONCURRENCY = 5;
const DELAY_MS = 500;
const FETCH_TIMEOUT_MS = 10000;

function loadCache(): CacheFile {
  if (fs.existsSync(CACHE_PATH)) {
    return JSON.parse(fs.readFileSync(CACHE_PATH, 'utf-8'));
  }
  return {};
}

function saveCache(cache: CacheFile): void {
  fs.writeFileSync(CACHE_PATH, JSON.stringify(cache));
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'ko-KR,ko;q=0.9',
      },
      redirect: 'follow',
    });
    return response;
  } finally {
    clearTimeout(id);
  }
}

function toMobileUrl(url: string): string {
  if (url.includes('blog.naver.com') && !url.includes('m.blog.naver.com')) {
    return url.replace('blog.naver.com', 'm.blog.naver.com');
  }
  if (url.includes('cafe.naver.com') && !url.includes('m.cafe.naver.com')) {
    return url.replace('cafe.naver.com', 'm.cafe.naver.com');
  }
  return url;
}

async function fetchBody(url: string, cache: CacheFile): Promise<{ body: string; status: number }> {
  if (cache[url] && cache[url].body.length > 30) {
    return { body: cache[url].body, status: cache[url].status };
  }

  const mobileUrl = toMobileUrl(url);
  const urls = mobileUrl !== url ? [mobileUrl, url] : [url];

  for (const targetUrl of urls) {
    try {
      const response = await fetchWithTimeout(targetUrl, FETCH_TIMEOUT_MS);
      const html = await response.text();
      const body = extractReadableTextFromHtml(html);
      if (body.length > 30) {
        cache[url] = { body, fetchedAt: new Date().toISOString(), status: response.status };
        return { body, status: response.status };
      }
    } catch {
      continue;
    }
  }

  cache[url] = { body: '', fetchedAt: new Date().toISOString(), status: 0 };
  return { body: '', status: 0 };
}

function buildNameVariants(name: string): string[] {
  const variants: string[] = [name];

  const coreName = name.replace(/(?:유치원|어린이집)$/u, '').replace(/병설$/u, '').trim();
  if (coreName !== name) variants.push(coreName);

  if (name.includes('초등학교병설유치원')) {
    const schoolFull = name.replace(/병설유치원$/u, '').trim();
    variants.push(schoolFull);
    const schoolShort = schoolFull.replace(/초등학교$/u, '').trim();
    variants.push(schoolShort);
    const noPrefix = schoolShort.replace(/^(서울|부산|대구|인천|광주|대전|울산|세종|수원|안산|안양|고양|용인|성남)/u, '').trim();
    if (noPrefix.length >= 2) variants.push(noPrefix);
    variants.push(schoolShort + '초');
  }

  if (name.length > 4) {
    const spaced = coreName.split('').join(' ');
    if (spaced !== coreName) variants.push(spaced);
  }

  return [...new Set(variants)].filter((v) => v.length >= 2);
}

function extractLocationParts(address: string): string[] {
  const parts = address.split(' ').filter((p) => p.length > 0);
  const locations: string[] = [];

  if (parts[0]) locations.push(parts[0]);
  if (parts[1]) locations.push(parts[1]);
  if (parts[2] && /[동면읍리로길]$/.test(parts[2])) locations.push(parts[2]);

  return locations;
}

const SPAM_BODY_PATTERNS = [
  /타로.*상담|타로심리|사주.*상담|운세.*상담/,
  /부동산.*매매|분양.*안내|모델하우스|전세.*매물/,
  /인테리어.*시공|바닥.*시공|벽화.*시공|놀이터.*시공/,
  /출장.*마사지|네일.*아트|속눈썹.*연장|피부.*관리/,
  /태권도.*관장|합기도.*관장|검도.*도장/,
  /키즈카페.*대관|키즈풀.*대관|돌잔치.*대관/,
  /가맹.*문의|창업.*상담|프랜차이즈/,
];

const AD_BODY_PATTERNS = [
  /(?:출강|출장).*(?:문의|상담|예약|접수)/,
  /(?:섭외|대관).*(?:문의|상담|가격|비용)/,
  /(?:배달|주문).*(?:도시락|케이터링)/,
];

function verifyReview(
  review: ReviewLink,
  kindergarten: KindergartenInfo,
  body: string
): VerificationResult {
  const base: Omit<VerificationResult, 'status' | 'reason' | 'nameFoundInBody' | 'locationFoundInBody' | 'bodyLength'> = {
    reviewId: review.id,
    kindergartenId: kindergarten.kindercode,
    kindergartenName: kindergarten.name,
    kindergartenAddress: kindergarten.address,
    title: review.title,
    url: review.url,
    source: review.source,
  };

  if (body.length < 30) {
    return { ...base, status: 'fetch_failed', reason: 'empty or too short body', bodyLength: body.length, nameFoundInBody: false, locationFoundInBody: false };
  }

  const nameVariants = buildNameVariants(kindergarten.name);
  const nameFound = nameVariants.some((v) => body.includes(v));
  const locationParts = extractLocationParts(kindergarten.address);
  const locationFound = locationParts.slice(1).some((loc) => body.includes(loc));

  for (const pattern of SPAM_BODY_PATTERNS) {
    if (pattern.test(body) && !nameFound) {
      return { ...base, status: 'spam', reason: 'spam pattern in body without name evidence', bodyLength: body.length, nameFoundInBody: nameFound, locationFoundInBody: locationFound };
    }
  }

  for (const pattern of AD_BODY_PATTERNS) {
    if (pattern.test(body) && !nameFound) {
      return { ...base, status: 'spam', reason: 'ad pattern in body without name evidence', bodyLength: body.length, nameFoundInBody: nameFound, locationFoundInBody: locationFound };
    }
  }

  if (nameFound && locationFound) {
    return { ...base, status: 'verified', reason: 'name + location found in body', bodyLength: body.length, nameFoundInBody: true, locationFoundInBody: true };
  }

  if (nameFound) {
    return { ...base, status: 'verified', reason: 'name found in body (no location)', bodyLength: body.length, nameFoundInBody: true, locationFoundInBody: locationFound };
  }

  if (locationFound) {
    const titleName = nameVariants.some((v) => review.title.includes(v) || review.snippet.includes(v));
    if (titleName) {
      return { ...base, status: 'verified', reason: 'name in title/snippet + location in body', bodyLength: body.length, nameFoundInBody: false, locationFoundInBody: true };
    }
    return { ...base, status: 'mismatch', reason: 'location found but name missing from body and title', bodyLength: body.length, nameFoundInBody: false, locationFoundInBody: true };
  }

  const titleHasName = nameVariants.some((v) => review.title.includes(v));
  if (titleHasName) {
    return { ...base, status: 'verified', reason: 'name in title, body inconclusive', bodyLength: body.length, nameFoundInBody: false, locationFoundInBody: false };
  }

  return { ...base, status: 'mismatch', reason: 'name and location not found in body or title', bodyLength: body.length, nameFoundInBody: false, locationFoundInBody: false };
}

async function processBatch(
  batch: Array<{ review: ReviewLink; kindergarten: KindergartenInfo }>,
  cache: CacheFile
): Promise<VerificationResult[]> {
  const results: VerificationResult[] = [];

  const fetchPromises = batch.map(async ({ review, kindergarten }) => {
    const { body, status } = await fetchBody(review.url, cache);

    if (status === 403 || status === 401) {
      return {
        reviewId: review.id,
        kindergartenId: kindergarten.kindercode,
        kindergartenName: kindergarten.name,
        kindergartenAddress: kindergarten.address,
        title: review.title,
        url: review.url,
        source: review.source,
        status: 'blocked' as const,
        reason: `HTTP ${status}`,
        bodyLength: 0,
        nameFoundInBody: false,
        locationFoundInBody: false,
      };
    }

    return verifyReview(review, kindergarten, body);
  });

  const batchResults = await Promise.all(fetchPromises);
  results.push(...batchResults);

  return results;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const limitArg = args.find((a) => a.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : Infinity;

  const reviewsData: ReviewsData = JSON.parse(
    fs.readFileSync('public/data/reviews.json', 'utf-8')
  );
  const kindergartens: KindergartenInfo[] = JSON.parse(
    fs.readFileSync('public/data/kindergartens.json', 'utf-8')
  );
  const kinderMap = new Map(kindergartens.map((k) => [k.kindercode, k]));
  const cache = loadCache();

  const allEntries: Array<{ review: ReviewLink; kindergarten: KindergartenInfo }> = [];
  for (const [kId, reviews] of Object.entries(reviewsData.reviews)) {
    const kindergarten = kinderMap.get(kId);
    if (!kindergarten) continue;
    for (const review of reviews) {
      allEntries.push({ review, kindergarten });
    }
  }

  const entries = allEntries.slice(0, limit);
  const total = entries.length;

  process.stdout.write(`Total reviews to verify: ${total}\n`);
  process.stdout.write(`Cached URLs: ${Object.keys(cache).length}\n\n`);

  const allResults: VerificationResult[] = [];
  let processed = 0;
  let lastSaveAt = 0;

  for (let i = 0; i < entries.length; i += CONCURRENCY) {
    const batch = entries.slice(i, i + CONCURRENCY);
    const batchResults = await processBatch(batch, cache);
    allResults.push(...batchResults);
    processed += batch.length;

    if (processed - lastSaveAt >= 50) {
      saveCache(cache);
      lastSaveAt = processed;
    }

    const verified = allResults.filter((r) => r.status === 'verified').length;
    const mismatch = allResults.filter((r) => r.status === 'mismatch').length;
    const spam = allResults.filter((r) => r.status === 'spam').length;
    const failed = allResults.filter((r) => r.status === 'fetch_failed' || r.status === 'blocked').length;

    process.stdout.write(
      `\r[${processed}/${total}] verified=${verified} mismatch=${mismatch} spam=${spam} failed=${failed}`
    );

    if (i + CONCURRENCY < entries.length) {
      await delay(DELAY_MS);
    }
  }

  saveCache(cache);

  const verified = allResults.filter((r) => r.status === 'verified');
  const mismatch = allResults.filter((r) => r.status === 'mismatch');
  const spam = allResults.filter((r) => r.status === 'spam');
  const fetchFailed = allResults.filter((r) => r.status === 'fetch_failed');
  const blocked = allResults.filter((r) => r.status === 'blocked');

  const verifiable = total - fetchFailed.length - blocked.length;
  const accuracy = verifiable > 0 ? (verified.length / verifiable * 100).toFixed(1) : '0';

  process.stdout.write('\n\n=== 검증 결과 ===\n');
  process.stdout.write(`총 리뷰: ${total}\n`);
  process.stdout.write(`verified: ${verified.length} (${(verified.length/total*100).toFixed(1)}%)\n`);
  process.stdout.write(`mismatch: ${mismatch.length}\n`);
  process.stdout.write(`spam: ${spam.length}\n`);
  process.stdout.write(`fetch_failed: ${fetchFailed.length}\n`);
  process.stdout.write(`blocked: ${blocked.length}\n`);
  process.stdout.write(`검증 가능 정확도: ${accuracy}% (${verified.length}/${verifiable})\n`);

  if (mismatch.length > 0) {
    process.stdout.write('\n=== Mismatch 리뷰 ===\n');
    mismatch.slice(0, 30).forEach((r) => {
      process.stdout.write(`  ${r.kindergartenName} | ${r.title.substring(0, 50)} | ${r.reason}\n`);
    });
    if (mismatch.length > 30) {
      process.stdout.write(`  ... +${mismatch.length - 30}건\n`);
    }
  }

  if (spam.length > 0) {
    process.stdout.write('\n=== Spam 리뷰 ===\n');
    spam.forEach((r) => {
      process.stdout.write(`  ${r.kindergartenName} | ${r.title.substring(0, 50)} | ${r.reason}\n`);
    });
  }

  fs.writeFileSync(RESULTS_PATH, JSON.stringify({ generatedAt: new Date().toISOString(), total, results: allResults }, null, 2));
  process.stdout.write(`\n결과 저장: ${RESULTS_PATH}\n`);

  if (!dryRun && (mismatch.length > 0 || spam.length > 0)) {
    const removeIds = new Set(
      [...mismatch, ...spam].map((r) => `${r.kindergartenId}::${r.reviewId}`)
    );
    process.stdout.write(`\n제거 대상: ${removeIds.size}건\n`);
  }
}

main().catch((error) => {
  process.stderr.write(`Error: ${error}\n`);
  process.exit(1);
});

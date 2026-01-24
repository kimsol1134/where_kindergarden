/**
 * 유치원 후기 링크 수집 스크립트
 *
 * Naver Blog/Cafe API를 통해 유치원 후기를 검색하고
 * 결과를 JSON 파일로 저장합니다.
 *
 * 사용법:
 *   pnpm collect:reviews                    # 전체 수집 (sigungu_code=28260)
 *   pnpm collect:reviews -- --test          # 처음 3개만 테스트
 *   pnpm collect:reviews -- --google        # Google CSE 포함
 *   pnpm collect:reviews -- --max 3         # 소스당 최대 3개
 */

import { config } from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { stripHtml, formatNaverDate } from '../src/lib/utils/review-utils';

config({ path: '.env.local' });
config();

// ============================================================================
// 타입 정의
// ============================================================================

interface KindergartenEntry {
  kindercode: string;
  name: string;
  sigungu_code: string;
}

interface NaverSearchItem {
  title: string;
  link: string;
  description: string;
  bloggername?: string;
  cafename?: string;
  postdate?: string;
}

interface NaverSearchResponse {
  items: NaverSearchItem[];
  total: number;
}

interface GoogleSearchItem {
  title: string;
  link: string;
  snippet: string;
}

interface GoogleSearchResponse {
  items?: GoogleSearchItem[];
}

interface RawReviewLink {
  kindergartenId: string;
  kindergartenName: string;
  title: string;
  url: string;
  source: 'naver_blog' | 'naver_cafe' | 'google' | 'other';
  sourceName: string;
  snippet: string;
  date: string | null;
  collectedAt: string;
}

// ============================================================================
// 유틸리티 함수
// ============================================================================

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================================================
// API 호출 함수
// ============================================================================

async function searchNaverBlog(
  query: string,
  display: number
): Promise<NaverSearchItem[]> {
  const clientId = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.warn('  [SKIP] NAVER_CLIENT_ID/SECRET 미설정');
    return [];
  }

  const url = new URL('https://openapi.naver.com/v1/search/blog.json');
  url.searchParams.set('query', query);
  url.searchParams.set('display', String(display));
  url.searchParams.set('sort', 'date');

  const response = await fetch(url.toString(), {
    headers: {
      'X-Naver-Client-Id': clientId,
      'X-Naver-Client-Secret': clientSecret,
    },
  });

  if (!response.ok) {
    console.warn(`  [ERROR] Naver Blog API: ${response.status}`);
    return [];
  }

  const data: NaverSearchResponse = await response.json();
  return data.items ?? [];
}

async function searchNaverCafe(
  query: string,
  display: number
): Promise<NaverSearchItem[]> {
  const clientId = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return [];
  }

  const url = new URL('https://openapi.naver.com/v1/search/cafearticle.json');
  url.searchParams.set('query', query);
  url.searchParams.set('display', String(display));
  url.searchParams.set('sort', 'date');

  const response = await fetch(url.toString(), {
    headers: {
      'X-Naver-Client-Id': clientId,
      'X-Naver-Client-Secret': clientSecret,
    },
  });

  if (!response.ok) {
    console.warn(`  [ERROR] Naver Cafe API: ${response.status}`);
    return [];
  }

  const data: NaverSearchResponse = await response.json();
  return data.items ?? [];
}

async function searchGoogle(
  query: string,
  maxResults: number
): Promise<GoogleSearchItem[]> {
  const apiKey = process.env.GOOGLE_CSE_API_KEY;
  const cx = process.env.GOOGLE_CSE_CX;

  if (!apiKey || !cx) {
    console.warn('  [SKIP] GOOGLE_CSE_API_KEY/CX 미설정');
    return [];
  }

  const url = new URL('https://www.googleapis.com/customsearch/v1');
  url.searchParams.set('key', apiKey);
  url.searchParams.set('cx', cx);
  url.searchParams.set('q', query);
  url.searchParams.set('num', String(Math.min(maxResults, 10)));

  const response = await fetch(url.toString());

  if (!response.ok) {
    console.warn(`  [ERROR] Google CSE API: ${response.status}`);
    return [];
  }

  const data: GoogleSearchResponse = await response.json();
  return data.items ?? [];
}

// ============================================================================
// 수집 함수
// ============================================================================

async function collectReviewsForKindergarten(
  kindergarten: KindergartenEntry,
  maxPerSource: number,
  includeGoogle: boolean
): Promise<RawReviewLink[]> {
  const query = `"${kindergarten.name}" 후기`;
  const collectedAt = new Date().toISOString();
  const results: RawReviewLink[] = [];
  const seenUrls = new Set<string>();

  // Naver Blog
  const blogItems = await searchNaverBlog(query, maxPerSource);
  for (const item of blogItems) {
    if (seenUrls.has(item.link)) continue;
    seenUrls.add(item.link);
    results.push({
      kindergartenId: kindergarten.kindercode,
      kindergartenName: kindergarten.name,
      title: stripHtml(item.title),
      url: item.link,
      source: 'naver_blog',
      sourceName: item.bloggername ?? '',
      snippet: stripHtml(item.description),
      date: formatNaverDate(item.postdate),
      collectedAt,
    });
  }

  await delay(300);

  // Naver Cafe
  const cafeItems = await searchNaverCafe(query, maxPerSource);
  for (const item of cafeItems) {
    if (seenUrls.has(item.link)) continue;
    seenUrls.add(item.link);
    results.push({
      kindergartenId: kindergarten.kindercode,
      kindergartenName: kindergarten.name,
      title: stripHtml(item.title),
      url: item.link,
      source: 'naver_cafe',
      sourceName: item.cafename ?? '',
      snippet: stripHtml(item.description),
      date: formatNaverDate(item.postdate),
      collectedAt,
    });
  }

  // Google (optional)
  if (includeGoogle) {
    await delay(300);
    const googleItems = await searchGoogle(query, maxPerSource);
    for (const item of googleItems) {
      if (seenUrls.has(item.link)) continue;
      seenUrls.add(item.link);
      results.push({
        kindergartenId: kindergarten.kindercode,
        kindergartenName: kindergarten.name,
        title: stripHtml(item.title),
        url: item.link,
        source: 'google',
        sourceName: '',
        snippet: stripHtml(item.snippet),
        date: null,
        collectedAt,
      });
    }
  }

  return results;
}

// ============================================================================
// 메인 실행
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  const isTest = args.includes('--test');
  const includeGoogle = args.includes('--google');
  const maxIdx = args.indexOf('--max');
  const maxPerSource = maxIdx !== -1 ? parseInt(args[maxIdx + 1], 10) || 5 : 5;

  console.log('=== 유치원 후기 링크 수집 ===');
  console.log(`모드: ${isTest ? '테스트 (3개)' : '전체'}`);
  console.log(`소스당 최대: ${maxPerSource}개`);
  console.log(`Google CSE: ${includeGoogle ? '포함' : '미포함'}`);
  console.log('');

  // 유치원 데이터 로드
  const kindergartensPath = path.resolve('public/data/kindergartens.json');
  if (!fs.existsSync(kindergartensPath)) {
    console.error('ERROR: public/data/kindergartens.json 파일을 찾을 수 없습니다.');
    process.exit(1);
  }

  const allKindergartens: KindergartenEntry[] = JSON.parse(
    fs.readFileSync(kindergartensPath, 'utf-8')
  );

  // sigungu_code === "28260" 필터 (부평구)
  let targets = allKindergartens.filter((k) => k.sigungu_code === '28260');
  console.log(`대상 유치원: ${targets.length}개 (부평구)`);

  if (isTest) {
    targets = targets.slice(0, 3);
    console.log(`테스트 모드: 처음 ${targets.length}개만 수집`);
  }

  console.log('');

  // 수집
  const allReviews: RawReviewLink[] = [];
  for (let i = 0; i < targets.length; i++) {
    const k = targets[i];
    console.log(`[${i + 1}/${targets.length}] ${k.name} (${k.kindercode})`);

    const reviews = await collectReviewsForKindergarten(k, maxPerSource, includeGoogle);
    allReviews.push(...reviews);
    console.log(`  → ${reviews.length}건 수집`);

    if (i < targets.length - 1) {
      await delay(300);
    }
  }

  console.log('');
  console.log(`총 수집: ${allReviews.length}건`);

  // 결과 저장
  const outputDir = path.resolve('scripts/data-output');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const today = new Date().toISOString().split('T')[0];
  const outputPath = path.join(outputDir, `reviews-raw-${today}.json`);

  fs.writeFileSync(outputPath, JSON.stringify(allReviews, null, 2), 'utf-8');
  console.log(`저장 완료: ${outputPath}`);
}

main().catch((err) => {
  console.error('수집 중 오류 발생:', err);
  process.exit(1);
});

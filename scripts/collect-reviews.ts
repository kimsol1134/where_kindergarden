/**
 * 유치원 후기 링크 수집 스크립트 (v2 - 관련성 필터링 적용)
 *
 * 개선사항:
 * - 지역명 포함 다중 쿼리 (동명 유치원 구분)
 * - 관련성 점수 기반 자동 필터링
 * - 최근 3년 이내 글만 포함
 * - 블로그 sim+date 이중 검색으로 다양한 결과 확보
 *
 * 사용법:
 *   pnpm collect:reviews                    # 전체 수집
 *   pnpm collect:reviews -- --test          # 처음 3개만 테스트
 *   pnpm collect:reviews -- --google        # Google CSE 포함
 *   pnpm collect:reviews -- --max 3         # 쿼리당 최대 3개
 */

import { config } from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { stripHtml, formatNaverDate, extractRegionName, calculateRelevanceScore } from '../src/lib/utils/review-utils';

config({ path: '.env.local' });
config();

// ============================================================================
// 타입 정의
// ============================================================================

interface KindergartenEntry {
  kindercode: string;
  name: string;
  address: string;
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
  relevanceScore: number;
}

// ============================================================================
// 날짜 필터
// ============================================================================

const THREE_YEARS_AGO = (() => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 3);
  return d.toISOString().split('T')[0].replace(/-/g, '');
})();

function isRecentEnough(postdate: string | undefined): boolean {
  if (!postdate || postdate.length !== 8) return true; // 날짜 없으면 포함
  return postdate >= THREE_YEARS_AGO;
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
  display: number,
  sort: 'date' | 'sim' = 'date'
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
  url.searchParams.set('sort', sort);

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
  url.searchParams.set('sort', 'sim');

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
  maxPerQuery: number,
  includeGoogle: boolean
): Promise<RawReviewLink[]> {
  const regionName = extractRegionName(kindergarten.address);
  const collectedAt = new Date().toISOString();
  const seenUrls = new Set<string>();
  const results: RawReviewLink[] = [];

  // 다중 쿼리 전략
  // 지역명은 따옴표 없이 (블로그에서 "인천 계양구"를 정확히 쓰진 않으므로)
  const queryRegion = `"${kindergarten.name}" ${regionName} 후기`;
  const queryExperience = `"${kindergarten.name}" 다녀보니`;

  // 블로그: 지역+후기 (date순)
  const blogDateItems = await searchNaverBlog(queryRegion, maxPerQuery, 'date');
  addItems(blogDateItems, 'naver_blog', 'bloggername');
  await delay(300);

  // 블로그: 지역+후기 (sim순) - 다른 결과셋 확보
  const blogSimItems = await searchNaverBlog(queryRegion, maxPerQuery, 'sim');
  addItems(blogSimItems, 'naver_blog', 'bloggername');
  await delay(300);

  // 블로그: 다녀보니 (sim순) - 체험 후기
  const blogExpItems = await searchNaverBlog(queryExperience, maxPerQuery, 'sim');
  addItems(blogExpItems, 'naver_blog', 'bloggername');
  await delay(300);

  // 카페: 지역+후기
  const cafeItems = await searchNaverCafe(queryRegion, maxPerQuery);
  addItems(cafeItems, 'naver_cafe', 'cafename');

  // Google (optional)
  if (includeGoogle) {
    await delay(300);
    const googleQuery = `"${kindergarten.name}" ${regionName} 후기`;
    const googleItems = await searchGoogle(googleQuery, maxPerQuery);
    for (const item of googleItems) {
      if (seenUrls.has(item.link)) continue;
      seenUrls.add(item.link);
      const title = stripHtml(item.title);
      const snippet = stripHtml(item.snippet);
      results.push({
        kindergartenId: kindergarten.kindercode,
        kindergartenName: kindergarten.name,
        title,
        url: item.link,
        source: 'google',
        sourceName: '',
        snippet,
        date: null,
        collectedAt,
        relevanceScore: calculateRelevanceScore(title, snippet),
      });
    }
  }

  function addItems(
    items: NaverSearchItem[],
    source: 'naver_blog' | 'naver_cafe',
    nameField: 'bloggername' | 'cafename'
  ) {
    for (const item of items) {
      if (seenUrls.has(item.link)) continue;
      if (!isRecentEnough(item.postdate)) continue;
      seenUrls.add(item.link);

      const title = stripHtml(item.title);
      const snippet = stripHtml(item.description);
      results.push({
        kindergartenId: kindergarten.kindercode,
        kindergartenName: kindergarten.name,
        title,
        url: item.link,
        source,
        sourceName: item[nameField] ?? '',
        snippet,
        date: formatNaverDate(item.postdate),
        collectedAt,
        relevanceScore: calculateRelevanceScore(title, snippet),
      });
    }
  }

  // 관련성 점수 기준 필터: 0점 이하 제거
  const filtered = results.filter((r) => r.relevanceScore > 0);

  // 점수 높은 순 정렬
  filtered.sort((a, b) => b.relevanceScore - a.relevanceScore);

  return filtered;
}

// ============================================================================
// 메인 실행
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  const isTest = args.includes('--test');
  const includeGoogle = args.includes('--google');
  const maxIdx = args.indexOf('--max');
  const maxPerQuery = maxIdx !== -1 ? parseInt(args[maxIdx + 1], 10) || 5 : 5;

  console.log('=== 유치원 후기 링크 수집 (v2) ===');
  console.log(`모드: ${isTest ? '테스트 (3개)' : '전체'}`);
  console.log(`쿼리당 최대: ${maxPerQuery}개`);
  console.log(`Google CSE: ${includeGoogle ? '포함' : '미포함'}`);
  console.log(`날짜 필터: ${THREE_YEARS_AGO.substring(0, 4)}년 이후`);
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

  // 인천 서구(검단), 계양구, 김포시 필터
  const TARGET_SIGUNGU_CODES = ['28260', '28245', '41570'];
  let targets = allKindergartens.filter((k) =>
    TARGET_SIGUNGU_CODES.includes(k.sigungu_code)
  );
  console.log(`대상 유치원: ${targets.length}개 (인천 서구/계양구, 김포시)`);

  if (isTest) {
    targets = targets.slice(0, 3);
    console.log(`테스트 모드: 처음 ${targets.length}개만 수집`);
  }

  console.log('');

  // 수집
  let totalRaw = 0;
  let totalFiltered = 0;
  const allReviews: RawReviewLink[] = [];

  for (let i = 0; i < targets.length; i++) {
    const k = targets[i];
    const region = extractRegionName(k.address);
    console.log(`[${i + 1}/${targets.length}] ${k.name} (${region})`);

    const reviews = await collectReviewsForKindergarten(k, maxPerQuery, includeGoogle);
    allReviews.push(...reviews);

    const rawCount = reviews.length;
    totalRaw += rawCount;
    totalFiltered += rawCount;

    if (rawCount > 0) {
      const scores = reviews.map((r) => r.relevanceScore);
      console.log(`  → ${rawCount}건 (점수: ${Math.min(...scores)}~${Math.max(...scores)})`);
    } else {
      console.log(`  → 0건`);
    }

    if (i < targets.length - 1) {
      await delay(300);
    }
  }

  console.log('');
  console.log(`총 수집: ${totalFiltered}건 (필터 통과)`);

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

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
 *   pnpm collect:reviews                       # 전체 수집 (전국)
 *   pnpm collect:reviews -- --sido 11          # 서울만 수집
 *   pnpm collect:reviews -- --sido 41          # 경기만 수집
 *   pnpm collect:reviews -- --sido 28          # 인천만 수집
 *   pnpm collect:reviews -- --test             # 처음 3개만 테스트
 *   pnpm collect:reviews -- --google           # Google CSE 포함
 *   pnpm collect:reviews -- --max 3            # 쿼리당 최대 3개
 *   pnpm collect:reviews -- --sido 11 --test   # 서울, 처음 3개만 테스트
 */

import { config } from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { 
  stripHtml, 
  formatNaverDate, 
  extractRegionName, 
  calculateRelevanceScore,
  calculateRelevanceScoreV2,
  isSpamTitle,
  type RelevanceResult 
} from '../src/lib/utils/review-utils';

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
  sido_code?: string;
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

  // 다중 쿼리 전략 (v2)
  // 1. 기본: "유치원명" 지역명 후기
  const queryRegion = `"${kindergarten.name}" ${regionName} 후기`;
  
  // 2. 경험: "유치원명" 다녀보니 / 장단점
  const queryExperience = `"${kindergarten.name}" 다녀보니`;
  
  // 3. 입학: "유치원명" 입학설명회 / 상담
  const queryAdmission = `"${kindergarten.name}" 입학설명회 다녀온`;
  
  // 4. 재원/졸업: "유치원명" 재원생 / 졸업생
  const queryAttending = `"${kindergarten.name}" 재원생 후기`;

  // 블로그 수집 실행 (각 쿼리별 수집)
  const queries = [
    { q: queryRegion, sort: 'sim' },
    { q: queryExperience, sort: 'sim' },
    { q: queryAdmission, sort: 'date' }, // 입학설명회는 최신순이 중요할 수 있음
    { q: queryAttending, sort: 'sim' }
  ];

  for (const { q, sort } of queries) {
    // 쿼리별 요청 딜레이
    await delay(300);
    const items = await searchNaverBlog(q, maxPerQuery, sort as 'date' | 'sim');
    addItems(items, 'naver_blog', 'bloggername');
  }

  // 카페: 지역+후기 (카페는 정확도가 낮을 수 있어서 가장 기본적인 쿼리만)
  await delay(300);
  const cafeItems = await searchNaverCafe(queryRegion, maxPerQuery);
  addItems(cafeItems, 'naver_cafe', 'cafename');

  // Google (optional)
  if (includeGoogle) {
    await delay(300);
    const googleQuery = `"${kindergarten.name}" ${regionName} 후기`;
    const googleItems = await searchGoogle(googleQuery, maxPerQuery);
    for (const item of googleItems) {
      if (seenUrls.has(item.link)) continue;
      
      const title = stripHtml(item.title);
      const snippet = stripHtml(item.snippet);
      
      // V2: 스팸 사전 필터링
      if (isSpamTitle(title)) continue;
      
      const relevance = calculateRelevanceScoreV2(
        title, snippet, kindergarten.name, regionName
      );
      if (relevance.isSpam) continue;
      
      seenUrls.add(item.link);
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
        relevanceScore: relevance.score,
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
      
      const title = stripHtml(item.title);
      const snippet = stripHtml(item.description);
      
      // V2: 스팸 사전 필터링
      if (isSpamTitle(title)) continue;
      
      // V2: 강화된 관련성 점수 계산
      const relevance = calculateRelevanceScoreV2(
        title, 
        snippet, 
        kindergarten.name, 
        regionName
      );
      
      // 스팸이면 스킵
      if (relevance.isSpam) continue;
      
      seenUrls.add(item.link);
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
        relevanceScore: relevance.score,
      });
    }
  }

  // V2: 관련성 점수 기준 필터: 2점 이하 제거 (더 엄격)
  const filtered = results.filter((r) => r.relevanceScore >= 2);

  // 점수 높은 순 정렬
  filtered.sort((a, b) => b.relevanceScore - a.relevanceScore);

  return filtered;
}

// ============================================================================
// 메인 실행
// ============================================================================

// 시도 코드별 이름 매핑
const SIDO_NAMES: Record<string, string> = {
  '11': '서울',
  '26': '부산',
  '27': '대구',
  '28': '인천',
  '29': '광주',
  '30': '대전',
  '31': '울산',
  '36': '세종',
  '41': '경기',
  '42': '강원',
  '43': '충북',
  '44': '충남',
  '45': '전북',
  '46': '전남',
  '47': '경북',
  '48': '경남',
  '50': '제주',
};

async function main() {
  const args = process.argv.slice(2);
  const isTest = args.includes('--test');
  const includeGoogle = args.includes('--google');
  const maxIdx = args.indexOf('--max');
  const maxPerQuery = maxIdx !== -1 ? parseInt(args[maxIdx + 1], 10) || 5 : 5;
  
  // --sido 인자 파싱
  const sidoIdx = args.indexOf('--sido');
  const sidoCode = sidoIdx !== -1 ? args[sidoIdx + 1] : null;

  console.log('=== 유치원 후기 링크 수집 (v2) ===');
  console.log(`모드: ${isTest ? '테스트 (3개)' : '전체'}`);
  console.log(`쿼리당 최대: ${maxPerQuery}개`);
  console.log(`Google CSE: ${includeGoogle ? '포함' : '미포함'}`);
  console.log(`날짜 필터: ${THREE_YEARS_AGO.substring(0, 4)}년 이후`);
  if (sidoCode) {
    console.log(`시도 필터: ${sidoCode} (${SIDO_NAMES[sidoCode] || '알 수 없음'})`);
  }
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

  // 시도 코드로 필터링 (--sido 인자가 있으면 해당 시도만, 없으면 전체)
  let targets: KindergartenEntry[];
  if (sidoCode) {
    targets = allKindergartens.filter((k) => k.sido_code === sidoCode);
    const sidoName = SIDO_NAMES[sidoCode] || sidoCode;
    console.log(`대상 유치원: ${targets.length}개 (${sidoName})`);
    
    if (targets.length === 0) {
      console.error(`ERROR: 시도 코드 ${sidoCode}에 해당하는 유치원이 없습니다.`);
      console.error('사용 가능한 시도 코드:', Object.entries(SIDO_NAMES).map(([k, v]) => `${k}(${v})`).join(', '));
      process.exit(1);
    }
  } else {
    targets = allKindergartens;
    console.log(`대상 유치원: ${targets.length}개 (전국)`);
    console.log('TIP: 특정 시도만 수집하려면 --sido 인자를 사용하세요.');
    console.log('     예: pnpm collect:reviews -- --sido 11 (서울)');
  }

  if (isTest) {
    targets = targets.slice(0, 3);
    console.log(`테스트 모드: 처음 ${targets.length}개만 수집`);
  }

  console.log('');

  // 수집
  let totalRaw = 0;
  let totalFiltered = 0;
  const allReviews: RawReviewLink[] = [];

  const BATCH_SIZE = 3;
  for (let i = 0; i < targets.length; i += BATCH_SIZE) {
    const batch = targets.slice(i, i + BATCH_SIZE);
    console.log(`[Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(targets.length / BATCH_SIZE)}] Processing ${batch.length} items...`);

    const results = await Promise.all(
      batch.map(async (k) => {
        // 개별 요청 간 약간의 지연 추가 (랜덤)
        await delay(Math.random() * 500);
        const reviews = await collectReviewsForKindergarten(k, maxPerQuery, includeGoogle);
        return { k, reviews };
      })
    );

    for (const { k, reviews } of results) {
       const region = extractRegionName(k.address);
       const rawCount = reviews.length;
       allReviews.push(...reviews);
       totalRaw += rawCount;
       totalFiltered += rawCount;

       if (rawCount > 0) {
         const scores = reviews.map((r) => r.relevanceScore);
         console.log(`  [${k.name}] ${rawCount}건 (점수: ${Math.min(...scores)}~${Math.max(...scores)})`);
       }
    }
    
    await delay(1000);
  }

  console.log('');
  console.log(`총 수집: ${totalFiltered}건 (필터 통과)`);

  // 결과 저장
  const outputDir = path.resolve('scripts/data-output');
  const OUTPUT_DIR = path.resolve('scripts/data-output');
  const DATE_PREFIX = new Date().toISOString().split('T')[0];

  // 4. 결과 저장 (시도별 분리 저장)
  console.log(`\n=== 결과 저장 (총 ${allReviews.length}건) ===`);
  
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // 시도별로 그룹화
  const reviewsBySido: Record<string, RawReviewLink[]> = {};
  
  for (const review of allReviews) {
    const k = allKindergartens.find(k => k.kindercode === review.kindergartenId);
    if (k) {
      const sido = k.sido_code || 'unknown';
      if (!reviewsBySido[sido]) reviewsBySido[sido] = [];
      reviewsBySido[sido].push(review);
    }
  }

  // 각 시도별 파일 저장
  for (const [sido, reviews] of Object.entries(reviewsBySido)) {
    const fileName = `reviews-raw-${DATE_PREFIX}-${sido}.json`;
    const filePath = path.join(OUTPUT_DIR, fileName);
    fs.writeFileSync(filePath, JSON.stringify(reviews, null, 2));
    console.log(`저장 완료 (${sido}): ${filePath} (${reviews.length}건)`);
  }
}

main().catch((err) => {
  console.error('수집 중 오류 발생:', err);
  process.exit(1);
});

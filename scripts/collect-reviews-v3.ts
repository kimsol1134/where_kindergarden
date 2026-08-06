/**
 * 유치원 후기 링크 수집 스크립트 (v3 - 지역 검증 + 엄격 필터링)
 *
 * v2 대비 개선사항:
 * - 지역 검증 로직 적용 (서울/경기 상호 오염 방지)
 * - --strict 모드: 관련성 점수 4점 + 학부모 경험/선택 의도만 수집
 * - 검색 쿼리에 제외어 자동 추가
 * - 더 정교한 스팸 필터링
 *
 * 사용법:
 *   pnpm collect:reviews:v3 -- --sido 11           # 서울만 수집
 *   pnpm collect:reviews:v3 -- --sido 41           # 경기만 수집
 *   pnpm collect:reviews:v3 -- --sido 11 --strict  # 서울, 엄격 모드
 *   pnpm collect:reviews:v3 -- --sido 11 --test    # 서울, 처음 3개만 테스트
 *   pnpm collect:reviews:v3 -- --google            # Google CSE 포함
 *   pnpm collect:reviews:v3 -- --max 5             # 쿼리당 최대 5개
 *   pnpm collect:reviews:v3 -- --sido 11 --shard-index 0 --shard-count 2
 */

import { config } from 'dotenv';
import {
  assessStrictReviewDiscoveryIntent,
  isInReviewDiscoveryShard,
} from '../src/lib/utils/review-discovery';
import * as fs from 'fs';
import * as path from 'path';
import {
  stripHtml,
  formatNaverDate,
  extractRegionName,
  calculateRelevanceScoreV2,
  isSpamTitle,
  isSpamReview,
  validateLocationMatch,
  buildQueryWithExclusions,
  classifyContentType,
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
  filterReasons?: string[];
}

interface CollectionStats {
  totalRaw: number;
  filteredByScore: number;
  filteredByLocation: number;
  filteredBySpam: number;
  filteredByIntent: number;
  finalCount: number;
}

// ============================================================================
// 설정
// ============================================================================

// 최근 3년 이내만 수집
const THREE_YEARS_AGO = (() => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 3);
  return d.toISOString().split('T')[0].replace(/-/g, '');
})();

// 시도 코드별 이름 매핑
const SIDO_NAMES: Record<string, string> = {
  '11': '서울',
  '12': '전남광주',
  '26': '부산',
  '27': '대구',
  '28': '인천',
  '29': '광주',
  '30': '대전',
  '31': '울산',
  '36': '세종',
  '41': '경기',
  '42': '강원',
  '51': '강원',
  '43': '충북',
  '44': '충남',
  '45': '전북',
  '52': '전북',
  '46': '전남',
  '47': '경북',
  '48': '경남',
  '50': '제주',
};

// ============================================================================
// 유틸리티 함수
// ============================================================================

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRecentEnough(postdate: string | undefined): boolean {
  if (!postdate || postdate.length !== 8) return true;
  return postdate >= THREE_YEARS_AGO;
}

// ============================================================================
// API 호출 함수
// ============================================================================

async function searchNaverBlog(
  query: string,
  display: number,
  sort: 'date' | 'sim' = 'sim'
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
// 수집 함수 (V3 - 지역 검증 포함)
// ============================================================================

async function collectReviewsForKindergarten(
  kindergarten: KindergartenEntry,
  targetSidoCode: string,
  maxPerQuery: number,
  includeGoogle: boolean,
  strictMode: boolean
): Promise<{ reviews: RawReviewLink[]; stats: CollectionStats }> {
  const regionName = extractRegionName(kindergarten.address);
  const collectedAt = new Date().toISOString();
  const seenUrls = new Set<string>();
  const results: RawReviewLink[] = [];

  const stats: CollectionStats = {
    totalRaw: 0,
    filteredByScore: 0,
    filteredByLocation: 0,
    filteredBySpam: 0,
    filteredByIntent: 0,
    finalCount: 0,
  };

  // V3: 제외어 포함 쿼리 생성
  const baseQueryRegion = `"${kindergarten.name}" ${regionName} 후기`;
  const queryRegion = buildQueryWithExclusions(baseQueryRegion, targetSidoCode);

  const baseQueryExperience = `"${kindergarten.name}" 다녀보니`;
  const queryExperience = buildQueryWithExclusions(baseQueryExperience, targetSidoCode);

  const baseQueryAttending = `"${kindergarten.name}" 재원생 후기`;
  const queryAttending = buildQueryWithExclusions(baseQueryAttending, targetSidoCode);

  // 쿼리 목록
  const queries = [
    { q: queryRegion, sort: 'sim' as const },
    { q: queryExperience, sort: 'sim' as const },
    { q: queryAttending, sort: 'sim' as const },
  ];

  // 블로그 수집
  for (const { q, sort } of queries) {
    await delay(300);
    const items = await searchNaverBlog(q, maxPerQuery, sort);
    processItems(items, 'naver_blog', 'bloggername');
  }

  // 카페 수집 (가장 기본적인 쿼리만)
  await delay(300);
  const cafeItems = await searchNaverCafe(queryRegion, maxPerQuery);
  processItems(cafeItems, 'naver_cafe', 'cafename');

  // Google (optional)
  if (includeGoogle) {
    await delay(300);
    const googleQuery = buildQueryWithExclusions(
      `"${kindergarten.name}" ${regionName} 후기`,
      targetSidoCode
    );
    const googleItems = await searchGoogle(googleQuery, maxPerQuery);

    for (const item of googleItems) {
      if (seenUrls.has(item.link)) continue;
      stats.totalRaw++;

      const title = stripHtml(item.title);
      const snippet = stripHtml(item.snippet);
      const fullText = `${title} ${snippet}`;

      // 스팸 필터
      if (isSpamTitle(title)) {
        stats.filteredBySpam++;
        continue;
      }

      // V4: snippet 스팸 + 콘텐츠 유형 검사
      const googleSpamCheck = isSpamReview({ title, snippet });
      if (googleSpamCheck.isSpam) {
        stats.filteredBySpam++;
        continue;
      }
      const googleContentType = classifyContentType(title, snippet);
      if (googleContentType === 'template') {
        stats.filteredBySpam++;
        continue;
      }

      // V3: 지역 검증
      const locationCheck = validateLocationMatch(
        fullText,
        targetSidoCode,
        kindergarten.address
      );
      if (!locationCheck.isValid) {
        stats.filteredByLocation++;
        continue;
      }

      // 관련성 점수
      const relevance = calculateRelevanceScoreV2(
        title,
        snippet,
        kindergarten.name,
        regionName
      );

      if (relevance.isSpam) {
        stats.filteredBySpam++;
        continue;
      }

      // V4: strictMode에 따른 점수 기준 (강화: 기본 3, strict 4)
      const minScore = strictMode ? 4 : 3;
      if (relevance.score < minScore) {
        stats.filteredByScore++;
        continue;
      }

      if (strictMode) {
        const intent = assessStrictReviewDiscoveryIntent({
          title,
          snippet,
          sourceName: '',
        });
        if (!intent.eligible) {
          stats.filteredByIntent++;
          continue;
        }
      }

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
        filterReasons: relevance.reasons,
      });
    }
  }

  function processItems(
    items: NaverSearchItem[],
    source: 'naver_blog' | 'naver_cafe',
    nameField: 'bloggername' | 'cafename'
  ) {
    for (const item of items) {
      if (seenUrls.has(item.link)) continue;
      if (!isRecentEnough(item.postdate)) continue;

      stats.totalRaw++;

      const title = stripHtml(item.title);
      const snippet = stripHtml(item.description);
      const fullText = `${title} ${snippet}`;

      // 스팸 타이틀 필터
      if (isSpamTitle(title)) {
        stats.filteredBySpam++;
        continue;
      }

      // V4: snippet 스팸 + 콘텐츠 유형 검사
      const spamCheck = isSpamReview({ title, snippet });
      if (spamCheck.isSpam) {
        stats.filteredBySpam++;
        continue;
      }
      const contentType = classifyContentType(title, snippet);
      if (contentType === 'template') {
        stats.filteredBySpam++;
        continue;
      }

      // V3: 지역 검증
      const locationCheck = validateLocationMatch(
        fullText,
        targetSidoCode,
        kindergarten.address
      );
      if (!locationCheck.isValid) {
        stats.filteredByLocation++;
        continue;
      }

      // 관련성 점수 계산
      const relevance = calculateRelevanceScoreV2(
        title,
        snippet,
        kindergarten.name,
        regionName
      );

      if (relevance.isSpam) {
        stats.filteredBySpam++;
        continue;
      }

      // V4: strictMode에 따른 점수 기준 (강화: 기본 3, strict 4)
      const minScore = strictMode ? 4 : 3;
      if (relevance.score < minScore) {
        stats.filteredByScore++;
        continue;
      }

      if (strictMode) {
        const intent = assessStrictReviewDiscoveryIntent({
          title,
          snippet,
          sourceName: item[nameField] ?? '',
        });
        if (!intent.eligible) {
          stats.filteredByIntent++;
          continue;
        }
      }

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
        filterReasons: relevance.reasons,
      });
    }
  }

  // 점수 높은 순 정렬
  results.sort((a, b) => b.relevanceScore - a.relevanceScore);

  stats.finalCount = results.length;
  return { reviews: results, stats };
}

// ============================================================================
// 메인 실행
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  const isTest = args.includes('--test');
  const includeGoogle = args.includes('--google');
  const strictMode = args.includes('--strict');
  const maxIdx = args.indexOf('--max');
  const maxPerQuery = maxIdx !== -1 ? parseInt(args[maxIdx + 1], 10) || 5 : 5;
  const shardCountIdx = args.indexOf('--shard-count');
  const shardIndexIdx = args.indexOf('--shard-index');
  const shardCount = shardCountIdx !== -1 ? Number.parseInt(args[shardCountIdx + 1], 10) : 1;
  const shardIndex = shardIndexIdx !== -1 ? Number.parseInt(args[shardIndexIdx + 1], 10) : 0;

  if (!Number.isInteger(shardCount) || shardCount < 1) {
    throw new Error('--shard-count must be a positive integer');
  }
  if (!Number.isInteger(shardIndex) || shardIndex < 0 || shardIndex >= shardCount) {
    throw new Error('--shard-index must be between 0 and --shard-count - 1');
  }

  // --sido 인자 파싱
  const sidoIdx = args.indexOf('--sido');
  const sidoCode = sidoIdx !== -1 ? args[sidoIdx + 1] : null;

  if (!sidoCode) {
    console.error('ERROR: --sido 인자가 필요합니다.');
    console.error('사용법: pnpm collect:reviews:v3 -- --sido 11');
    console.error('사용 가능한 시도 코드:', Object.entries(SIDO_NAMES).map(([k, v]) => `${k}(${v})`).join(', '));
    process.exit(1);
  }

  console.log('=== 유치원 후기 링크 수집 (v3 - 지역 검증) ===');
  console.log(`모드: ${isTest ? '테스트 (3개)' : '전체'}`);
  console.log(`엄격 모드: ${strictMode ? 'ON (4점 이상)' : 'OFF (3점 이상)'}`);
  console.log(`쿼리당 최대: ${maxPerQuery}개`);
  console.log(`Google CSE: ${includeGoogle ? '포함' : '미포함'}`);
  console.log(`날짜 필터: ${THREE_YEARS_AGO.substring(0, 4)}년 이후`);
  console.log(`시도: ${sidoCode} (${SIDO_NAMES[sidoCode] || '알 수 없음'})`);
  console.log(`수집 샤드: ${shardIndex + 1}/${shardCount}`);
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

  // 시도 코드로 필터링
  const regionTargets = allKindergartens.filter((k) => k.sido_code === sidoCode);
  let targets = regionTargets.filter((kindergarten) =>
    isInReviewDiscoveryShard(kindergarten.kindercode, shardIndex, shardCount)
  );
  const sidoName = SIDO_NAMES[sidoCode] || sidoCode;
  console.log(
    `대상 유치원: ${targets.length}/${regionTargets.length}개 (${sidoName}, ` +
      `샤드 ${shardIndex + 1}/${shardCount})`
  );

  if (targets.length === 0) {
    console.error(`ERROR: 시도 코드 ${sidoCode}에 해당하는 유치원이 없습니다.`);
    process.exit(1);
  }

  if (isTest) {
    targets = targets.slice(0, 3);
    console.log(`테스트 모드: 처음 ${targets.length}개만 수집`);
  }

  console.log('');

  // 통계 집계
  const globalStats: CollectionStats = {
    totalRaw: 0,
    filteredByScore: 0,
    filteredByLocation: 0,
    filteredBySpam: 0,
    filteredByIntent: 0,
    finalCount: 0,
  };

  const allReviews: RawReviewLink[] = [];

  // 배치 처리
  const BATCH_SIZE = 3;
  for (let i = 0; i < targets.length; i += BATCH_SIZE) {
    const batch = targets.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(targets.length / BATCH_SIZE);
    console.log(`[Batch ${batchNum}/${totalBatches}] Processing ${batch.length} items...`);

    const results = await Promise.all(
      batch.map(async (k) => {
        await delay(Math.random() * 500);
        const { reviews, stats } = await collectReviewsForKindergarten(
          k,
          sidoCode,
          maxPerQuery,
          includeGoogle,
          strictMode
        );
        return { k, reviews, stats };
      })
    );

    for (const { k, reviews, stats } of results) {
      allReviews.push(...reviews);

      // 통계 집계
      globalStats.totalRaw += stats.totalRaw;
      globalStats.filteredByScore += stats.filteredByScore;
      globalStats.filteredByLocation += stats.filteredByLocation;
      globalStats.filteredBySpam += stats.filteredBySpam;
      globalStats.filteredByIntent += stats.filteredByIntent;
      globalStats.finalCount += stats.finalCount;

      if (reviews.length > 0) {
        const scores = reviews.map((r) => r.relevanceScore);
        console.log(
          `  [${k.name}] ${stats.totalRaw}건 수집 → ${reviews.length}건 통과 (점수: ${Math.min(...scores)}~${Math.max(...scores)})`
        );
        if (stats.filteredByLocation > 0) {
          console.log(`    ↳ 지역 불일치: ${stats.filteredByLocation}건 제외`);
        }
      }
    }

    await delay(1000);
  }

  // 결과 요약
  console.log('');
  console.log('=== 수집 결과 요약 ===');
  console.log(`총 수집: ${globalStats.totalRaw}건`);
  console.log(`  - 스팸 제외: ${globalStats.filteredBySpam}건`);
  console.log(`  - 지역 불일치 제외: ${globalStats.filteredByLocation}건`);
  console.log(`  - 점수 미달 제외: ${globalStats.filteredByScore}건`);
  console.log(`  - 후기 의도 미달 제외: ${globalStats.filteredByIntent}건`);
  console.log(`최종 통과: ${globalStats.finalCount}건`);
  const filterRate =
    globalStats.totalRaw === 0
      ? 0
      : (1 - globalStats.finalCount / globalStats.totalRaw) * 100;
  console.log(`필터링률: ${filterRate.toFixed(1)}%`);

  // 결과 저장
  const OUTPUT_DIR = path.resolve('scripts/data-output');
  const DATE_PREFIX = new Date().toISOString().split('T')[0];

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // V3 파일명으로 저장
  const fileName = `reviews-raw-v3-${DATE_PREFIX}-${sidoCode}.json`;
  const filePath = path.join(OUTPUT_DIR, fileName);

  const output = {
    version: 'v3',
    collectedAt: new Date().toISOString(),
    sidoCode,
    sidoName,
    strictMode,
    shardIndex,
    shardCount,
    regionTargetCount: regionTargets.length,
    shardTargetCount: targets.length,
    stats: globalStats,
    reviews: allReviews,
  };

  fs.writeFileSync(filePath, JSON.stringify(output, null, 2));
  console.log(`\n저장 완료: ${filePath} (${allReviews.length}건)`);
}

main().catch((err) => {
  console.error('수집 중 오류 발생:', err);
  process.exit(1);
});

/**
 * Chrome 수집 URL 메타데이터 보강 스크립트
 *
 * 수집된 URL 목록에서 네이버 검색 API를 활용해 상세 정보를 추출합니다.
 * - 블로그 제목, 스니펫, 작성일 추출
 * - 유치원명 추론 및 DB 매칭
 * - 관련성 필터링
 *
 * 사용법:
 *   pnpm enrich:chrome-reviews -- --input chrome-reviews-20260128-session3.json
 *   pnpm enrich:chrome-reviews -- --input chrome-reviews-*.json --sido 11
 *   pnpm enrich:chrome-reviews -- --input chrome-reviews-*.json --dry-run
 */

import { config } from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import {
  stripHtml,
  formatNaverDate,
  calculateRelevanceScoreV2,
  isSpamTitle,
} from '../src/lib/utils/review-utils';

config({ path: '.env.local' });
config();

// ============================================================================
// 타입 정의
// ============================================================================

interface ChromeCollectedUrl {
  url: string;
  source: string;
  query: string;
  district: string;
}

interface ChromeReviewsInput {
  collectedAt: string;
  session: string;
  areas: string[];
  reviews: ChromeCollectedUrl[];
  summary: Record<string, number>;
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

interface EnrichedReview {
  kindergartenName: string;
  sidoCode: string;
  sigunguCode?: string;
  title: string;
  url: string;
  source: 'naver_blog' | 'naver_cafe' | 'google' | 'other';
  sourceName: string;
  snippet: string;
  date: string | null;
  district: string;
  relevanceScore: number;
}

interface EnrichmentResult {
  collectedAt: string;
  source: string;
  sidoCode: string;
  reviews: EnrichedReview[];
  skipped: Array<{ url: string; reason: string }>;
  stats: {
    total: number;
    enriched: number;
    skipped: number;
    notFound: number;
  };
}

interface KindergartenEntry {
  kindercode: string;
  name: string;
  address: string;
  sigungu_code: string;
}

// ============================================================================
// 설정
// ============================================================================

const NAVER_CLIENT_ID = process.env.NAVER_CLIENT_ID;
const NAVER_CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET;
const API_DELAY_MS = 300;

// 시도 코드별 시군구 매핑 (서울)
const SEOUL_SIGUNGU_MAP: Record<string, string> = {
  '종로구': '11110', '중구': '11140', '용산구': '11170', '성동구': '11200',
  '광진구': '11215', '동대문구': '11230', '중랑구': '11260', '성북구': '11290',
  '강북구': '11305', '도봉구': '11320', '노원구': '11350', '은평구': '11380',
  '서대문구': '11410', '마포구': '11440', '양천구': '11470', '강서구': '11500',
  '구로구': '11530', '금천구': '11545', '영등포구': '11560', '동작구': '11590',
  '관악구': '11620', '서초구': '11650', '강남구': '11680', '송파구': '11710',
  '강동구': '11740',
};

// ============================================================================
// 유틸리티 함수
// ============================================================================

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractKindergartenName(query: string): string | null {
  // 쿼리에서 유치원 이름 추출
  // 예: "강서구 장미유치원 입학설명회" -> "장미유치원"
  // 예: "광진구 어린이회관 유치원" -> "어린이회관유치원"
  const patterns = [
    /([가-힣]+유치원)/,                    // 붙여쓰기: 장미유치원
    /([가-힣]+)\s*유치원/,                 // 띄어쓰기: 장미 유치원 -> 장미유치원
    /([가-힣]+어린이집)/,                  // 어린이집
    /([가-힣]+)\s*어린이집/,               // 띄어쓰기: 햇살 어린이집
  ];

  for (const pattern of patterns) {
    const match = query.match(pattern);
    if (match) {
      let name = match[1];
      // "유치원"이나 "어린이집"으로 끝나면 그대로
      if (!name.endsWith('유치원') && !name.endsWith('어린이집')) {
        // 접미사 붙이기
        if (query.includes('유치원')) {
          name = name + '유치원';
        } else if (query.includes('어린이집')) {
          name = name + '어린이집';
        } else {
          name = name + '유치원'; // 기본값
        }
      }

      // 유효성 검사
      if (isValidKindergartenName(name)) {
        return name;
      }
    }
  }
  return null;
}

// 무효한 유치원 이름 목록
const INVALID_KINDERGARTEN_NAMES = [
  // 동물 관련
  '강아지유치원', '고양이유치원', '반려견유치원', '펫유치원', '애견유치원',
  // 일반 용어
  '사립유치원', '공립유치원', '영어유치원', '국공립유치원', '유아유치원',
  '어린이유치원', '유치원유치원', '병설유치원', '단설유치원',
  // 지역명만 있는 이름 (구 이름 + 유치원)
  '강남구유치원', '서초구유치원', '송파구유치원', '강동구유치원',
  '마포구유치원', '용산구유치원', '성동구유치원', '광진구유치원',
  '노원구유치원', '도봉구유치원', '강북구유치원', '성북구유치원',
  '양천구유치원', '강서구유치원', '구로구유치원', '금천구유치원',
  '영등포구유치원', '동작구유치원', '관악구유치원', '서대문구유치원',
  '은평구유치원', '동대문구유치원', '중랑구유치원', '종로구유치원', '중구유치원',
  // 지역명만 있는 이름 (구 이름 없이)
  '광진유치원', '양천유치원', '강서유치원', '강남유치원', '서초유치원',
  '송파유치원', '마포유치원', '노원유치원', '영등포유치원',
];

/**
 * 유효한 유치원 이름인지 검증
 */
function isValidKindergartenName(name: string): boolean {
  if (!name || name.length < 3) return false;

  // 무효 목록에 있는지 확인
  if (INVALID_KINDERGARTEN_NAMES.includes(name)) return false;

  // 숫자만 있는 이름 제외
  if (/^\d+유치원$/.test(name)) return false;

  // 너무 짧은 이름 제외 (유치원 제외하고 1글자)
  const nameWithoutSuffix = name.replace(/유치원$/, '').replace(/어린이집$/, '');
  if (nameWithoutSuffix.length < 2) return false;

  return true;
}

function extractKindergartenFromSearchResult(item: NaverSearchItem): string | null {
  // 검색 결과 제목/스니펫에서 유치원명 추출
  const text = stripHtml(item.title || '') + ' ' + stripHtml(item.description || '');

  const patterns = [
    /([가-힣]{2,10}유치원)/g,
    /([가-힣]{2,10}어린이집)/g,
  ];

  for (const pattern of patterns) {
    const matches = text.match(pattern);
    if (matches && matches.length > 0) {
      // 유효한 유치원 이름만 필터링
      const validNames = matches.filter(name => isValidKindergartenName(name));
      if (validNames.length > 0) {
        return validNames[0];
      }
    }
  }
  return null;
}

function normalizeUrl(url: string): string {
  // URL 정규화 (비교용)
  try {
    const u = new URL(url);
    return u.hostname + u.pathname;
  } catch {
    return url;
  }
}

// ============================================================================
// API 호출 함수
// ============================================================================

async function searchNaverBlog(query: string): Promise<NaverSearchItem[]> {
  if (!NAVER_CLIENT_ID || !NAVER_CLIENT_SECRET) {
    throw new Error('네이버 API 키가 설정되지 않았습니다.');
  }

  const url = new URL('https://openapi.naver.com/v1/search/blog.json');
  url.searchParams.set('query', query);
  url.searchParams.set('display', '10');
  url.searchParams.set('sort', 'sim');

  const response = await fetch(url.toString(), {
    headers: {
      'X-Naver-Client-Id': NAVER_CLIENT_ID,
      'X-Naver-Client-Secret': NAVER_CLIENT_SECRET,
    },
  });

  if (!response.ok) {
    throw new Error(`네이버 API 오류: ${response.status}`);
  }

  const data: NaverSearchResponse = await response.json();
  return data.items || [];
}

async function searchNaverCafe(query: string): Promise<NaverSearchItem[]> {
  if (!NAVER_CLIENT_ID || !NAVER_CLIENT_SECRET) {
    return [];
  }

  const url = new URL('https://openapi.naver.com/v1/search/cafearticle.json');
  url.searchParams.set('query', query);
  url.searchParams.set('display', '10');
  url.searchParams.set('sort', 'sim');

  try {
    const response = await fetch(url.toString(), {
      headers: {
        'X-Naver-Client-Id': NAVER_CLIENT_ID,
        'X-Naver-Client-Secret': NAVER_CLIENT_SECRET,
      },
    });

    if (!response.ok) return [];

    const data: NaverSearchResponse = await response.json();
    return data.items || [];
  } catch {
    return [];
  }
}

// ============================================================================
// 메인 로직
// ============================================================================

async function enrichUrl(
  item: ChromeCollectedUrl,
  kindergartenDb: Map<string, KindergartenEntry>
): Promise<{ review: EnrichedReview | null; skipReason: string | null }> {
  const { url, query, district, source } = item;

  // 유치원명 추출 (query에서 먼저 시도)
  let kindergartenName = extractKindergartenName(query);

  // query에서 추출 실패해도 일단 검색 진행 (검색 결과에서 추출 시도)
  const needsNameFromSearch = !kindergartenName;

  // 네이버 API 검색
  // 유치원명이 있으면 "유치원명 지역", 없으면 query 그대로 사용
  const searchQuery = kindergartenName
    ? `${kindergartenName} ${district}`
    : `${query} ${district} 후기`.replace(/후기\s*후기/, '후기');
  let searchResults: NaverSearchItem[] = [];

  try {
    if (source === 'naver_blog' || url.includes('blog.naver.com')) {
      searchResults = await searchNaverBlog(searchQuery);
    } else if (source === 'naver_cafe' || url.includes('cafe.naver.com')) {
      searchResults = await searchNaverCafe(searchQuery);
    } else {
      searchResults = await searchNaverBlog(searchQuery);
    }
  } catch (error) {
    return { review: null, skipReason: `API 오류: ${error}` };
  }

  // URL 매칭 시도
  const normalizedTargetUrl = normalizeUrl(url);
  let matchedItem = searchResults.find(
    (r) => normalizeUrl(r.link) === normalizedTargetUrl
  );

  // 정확한 매칭이 안 되면 첫 번째 관련 결과 사용
  if (!matchedItem && searchResults.length > 0) {
    // 유치원명이 있으면 제목에서 찾기
    if (kindergartenName) {
      matchedItem = searchResults.find((r) =>
        stripHtml(r.title).includes(kindergartenName)
      );
    }

    // 그래도 없으면 첫 번째 결과 사용 (단, 스팸이 아닌 경우)
    if (!matchedItem) {
      const nonSpam = searchResults.find((r) => !isSpamTitle(stripHtml(r.title)));
      if (nonSpam) {
        matchedItem = nonSpam;
      }
    }
  }

  if (!matchedItem) {
    return { review: null, skipReason: '검색 결과 없음' };
  }

  // 검색 결과에서 유치원명 추출 (query에서 못 찾은 경우)
  if (needsNameFromSearch) {
    kindergartenName = extractKindergartenFromSearchResult(matchedItem);
    if (!kindergartenName) {
      return { review: null, skipReason: '유치원명 추출 실패 (검색결과에서도)' };
    }
  }

  const title = stripHtml(matchedItem.title || '') || '';
  const snippet = stripHtml(matchedItem.description || '') || '';

  // 빈 값 체크
  if (!title) {
    return { review: null, skipReason: '제목 없음' };
  }

  // 스팸 필터링
  if (isSpamTitle(title)) {
    return { review: null, skipReason: `스팸: ${title.substring(0, 30)}...` };
  }

  // 관련성 점수 계산
  const relevanceResult = calculateRelevanceScoreV2(title, snippet, kindergartenName, district);
  if (relevanceResult.score < 2) {
    return {
      review: null,
      skipReason: `낮은 관련성 (${relevanceResult.score}): ${relevanceResult.reasons.join(', ')}`,
    };
  }

  // DB 매칭 시도
  let sigunguCode = SEOUL_SIGUNGU_MAP[district];
  const dbEntry = kindergartenDb.get(kindergartenName);
  if (dbEntry) {
    sigunguCode = dbEntry.sigungu_code;
  }

  const enrichedReview: EnrichedReview = {
    kindergartenName,
    sidoCode: '11',
    sigunguCode,
    title,
    url: matchedItem.link || url,
    source: url.includes('cafe.naver.com') ? 'naver_cafe' : 'naver_blog',
    sourceName: matchedItem.bloggername || matchedItem.cafename || '',
    snippet,
    date: formatNaverDate(matchedItem.postdate || ''),
    district,
    relevanceScore: relevanceResult.score,
  };

  return { review: enrichedReview, skipReason: null };
}

async function main() {
  const args = process.argv.slice(2);
  const inputIndex = args.indexOf('--input');
  const sidoIndex = args.indexOf('--sido');
  const dryRun = args.includes('--dry-run');

  if (inputIndex === -1 || !args[inputIndex + 1]) {
    console.error('사용법: pnpm enrich:chrome-reviews -- --input <파일경로>');
    process.exit(1);
  }

  const inputPath = args[inputIndex + 1];
  const sidoCode = sidoIndex !== -1 ? args[sidoIndex + 1] : '11';

  console.log('=== Chrome 수집 URL 보강 ===');
  console.log(`입력: ${inputPath}`);
  console.log(`시도: ${sidoCode}`);
  console.log(`Dry Run: ${dryRun ? 'Yes' : 'No'}`);
  console.log();

  // 입력 파일 로드
  const fullInputPath = path.resolve(process.cwd(), inputPath);
  if (!fs.existsSync(fullInputPath)) {
    console.error(`파일을 찾을 수 없습니다: ${fullInputPath}`);
    process.exit(1);
  }

  const inputData: ChromeReviewsInput = JSON.parse(
    fs.readFileSync(fullInputPath, 'utf-8')
  );

  console.log(`URL 목록: ${inputData.reviews.length}건`);
  console.log(`영역: ${inputData.areas.join(', ')}`);
  console.log();

  // 유치원 DB 로드
  const kindergartenDbPath = path.resolve(
    process.cwd(),
    'public/data/kindergartens.json'
  );
  let kindergartenDb = new Map<string, KindergartenEntry>();

  if (fs.existsSync(kindergartenDbPath)) {
    const dbData: KindergartenEntry[] = JSON.parse(
      fs.readFileSync(kindergartenDbPath, 'utf-8')
    );
    kindergartenDb = new Map(dbData.map((k) => [k.name, k]));
    console.log(`유치원 DB: ${kindergartenDb.size}개 로드`);
  }
  console.log();

  // 보강 처리
  const result: EnrichmentResult = {
    collectedAt: new Date().toISOString(),
    source: 'enrich_script',
    sidoCode,
    reviews: [],
    skipped: [],
    stats: {
      total: inputData.reviews.length,
      enriched: 0,
      skipped: 0,
      notFound: 0,
    },
  };

  // 이미 처리된 URL (중복 방지)
  const processedUrls = new Set<string>();

  console.log('보강 처리 중...');
  for (let i = 0; i < inputData.reviews.length; i++) {
    const item = inputData.reviews[i];

    // 중복 스킵
    if (processedUrls.has(item.url)) {
      result.skipped.push({ url: item.url, reason: '중복 URL' });
      result.stats.skipped++;
      continue;
    }
    processedUrls.add(item.url);

    // 진행 상황 출력
    if ((i + 1) % 5 === 0 || i === 0) {
      process.stdout.write(`\r처리 중: ${i + 1}/${inputData.reviews.length}`);
    }

    // API 호출 및 보강
    const { review, skipReason } = await enrichUrl(item, kindergartenDb);

    if (review) {
      result.reviews.push(review);
      result.stats.enriched++;
    } else if (skipReason) {
      result.skipped.push({ url: item.url, reason: skipReason });
      if (skipReason.includes('검색 결과 없음')) {
        result.stats.notFound++;
      } else {
        result.stats.skipped++;
      }
    }

    // API 호출 간격
    await sleep(API_DELAY_MS);
  }

  console.log('\n');
  console.log('=== 보강 결과 ===');
  console.log(`전체: ${result.stats.total}건`);
  console.log(`보강 성공: ${result.stats.enriched}건`);
  console.log(`스킵: ${result.stats.skipped}건`);
  console.log(`검색 실패: ${result.stats.notFound}건`);
  console.log();

  // 결과 저장
  if (!dryRun) {
    const outputDir = path.resolve(process.cwd(), 'scripts/data-output');
    const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const outputPath = path.join(outputDir, `enriched-reviews-${sidoCode}-${date}.json`);

    // ChromeCollectedReview 형식으로 변환 (병합 스크립트 호환)
    const mergeFormat = {
      collectedAt: result.collectedAt,
      source: 'enrich_script',
      sidoCode,
      sidoName: sidoCode === '11' ? '서울' : sidoCode === '41' ? '경기' : '인천',
      collector: 'enrich-chrome-reviews.ts',
      reviews: result.reviews.map((r) => ({
        kindergartenName: r.kindergartenName,
        sidoCode: r.sidoCode,
        sigunguCode: r.sigunguCode,
        title: r.title,
        url: r.url,
        source: r.source,
        sourceName: r.sourceName,
        snippet: r.snippet,
        date: r.date,
      })),
    };

    fs.writeFileSync(outputPath, JSON.stringify(mergeFormat, null, 2), 'utf-8');
    console.log(`저장 완료: ${outputPath}`);
    console.log();
    console.log('병합 명령어:');
    console.log(`pnpm merge:chrome-reviews -- --input ${outputPath} --sido ${sidoCode}`);
  } else {
    console.log('[Dry Run] 파일 저장하지 않음');
  }

  // 스킵된 항목 상세
  if (result.skipped.length > 0) {
    console.log();
    console.log('--- 스킵된 URL (상위 10건) ---');
    result.skipped.slice(0, 10).forEach((s, i) => {
      console.log(`${i + 1}. ${s.reason}`);
      console.log(`   ${s.url.substring(0, 60)}...`);
    });
  }
}

main().catch(console.error);

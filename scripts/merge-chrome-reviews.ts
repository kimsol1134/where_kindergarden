/**
 * Claude in Chrome 수집 결과 병합 스크립트
 *
 * Claude in Chrome을 통해 반자동으로 수집한 후기 데이터를
 * 기존 reviews/[sido].json 파일에 병합합니다.
 *
 * 사용법:
 *   pnpm merge:chrome-reviews -- --input chrome-reviews.json --sido 11
 *   pnpm merge:chrome-reviews -- --input chrome-reviews.json --sido 41 --dry-run
 */

import * as fs from 'fs';
import * as path from 'path';
import type { ReviewLink, ReviewsData, ReviewSource } from '../src/types/review';

// ============================================================================
// 타입 정의
// ============================================================================

interface ChromeCollectedReview {
  kindergartenName: string;
  sidoCode: string;
  sigunguCode?: string;
  title: string;
  url: string;
  source: ReviewSource;
  sourceName?: string;
  snippet: string;
  date?: string | null;
}

interface ChromeCollectionFile {
  collectedAt: string;
  source: string;
  sidoCode?: string;
  sidoName?: string;
  collector?: string;
  reviews: ChromeCollectedReview[];
}

interface KindergartenEntry {
  kindercode: string;
  name: string;
  address: string;
  sido_code: string;
  sigungu_code: string;
}

interface MergeStats {
  totalInput: number;
  matched: number;
  unmatched: number;
  duplicates: number;
  added: number;
}

// ============================================================================
// 유틸리티 함수
// ============================================================================

/**
 * 유치원 이름 정규화 (매칭용)
 */
function normalizeName(name: string): string {
  return name
    .replace(/\s+/g, '')
    .replace(/유치원$/, '')
    .replace(/어린이집$/, '')
    .toLowerCase();
}

/**
 * 레벤슈타인 거리 계산 (퍼지 매칭용)
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // 대체
          matrix[i][j - 1] + 1,     // 삽입
          matrix[i - 1][j] + 1      // 삭제
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * 유사도 점수 계산 (0-1, 1이 완전 일치)
 */
function calculateSimilarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  const distance = levenshteinDistance(a, b);
  return 1 - distance / maxLen;
}

/**
 * 지역명 제거 (매칭용)
 * "강서장미유치원" → "장미"
 */
function removeRegionPrefix(name: string): string {
  const regions = [
    '강남', '서초', '송파', '강동', '마포', '용산', '성동', '광진',
    '노원', '도봉', '강북', '성북', '양천', '강서', '구로', '금천',
    '영등포', '동작', '관악', '서대문', '은평', '동대문', '중랑',
    '종로', '중구'
  ];

  let result = name;
  for (const region of regions) {
    if (result.startsWith(region)) {
      result = result.slice(region.length);
      break;
    }
  }
  return result;
}

/**
 * 유니크 리뷰 ID 생성
 */
function generateReviewId(): string {
  const suffix = Math.random().toString(36).substring(2, 6);
  const num = Math.floor(Math.random() * 10000);
  return `rev-${num}-${suffix}`;
}

/**
 * 유치원 이름으로 kindercode 찾기 (퍼지 매칭 포함)
 */
function findKindercode(
  name: string,
  sidoCode: string,
  kindergartens: KindergartenEntry[],
  nameIndex: Map<string, KindergartenEntry[]>
): string | null {
  const normalizedName = normalizeName(name);

  // 1. 정확한 이름 매칭
  const exactMatch = nameIndex.get(normalizedName);
  if (exactMatch && exactMatch.length > 0) {
    const sameRegion = exactMatch.find(k => k.sido_code === sidoCode);
    if (sameRegion) return sameRegion.kindercode;
    return exactMatch[0].kindercode;
  }

  // 2. 지역명 제거 후 매칭 (예: "강서장미" → "장미")
  const withoutRegion = removeRegionPrefix(normalizedName);
  if (withoutRegion !== normalizedName && withoutRegion.length >= 2) {
    const regionRemoved = nameIndex.get(withoutRegion);
    if (regionRemoved && regionRemoved.length > 0) {
      const sameRegion = regionRemoved.find(k => k.sido_code === sidoCode);
      if (sameRegion) return sameRegion.kindercode;
    }
  }

  // 3. 부분 문자열 매칭 (입력이 DB 이름에 포함되거나 그 반대)
  const sidoKindergartens = kindergartens.filter(k => k.sido_code === sidoCode);
  for (const k of sidoKindergartens) {
    const dbName = normalizeName(k.name);
    // 입력 이름이 DB 이름에 포함
    if (dbName.includes(normalizedName) && normalizedName.length >= 2) {
      return k.kindercode;
    }
    // DB 이름이 입력 이름에 포함
    if (normalizedName.includes(dbName) && dbName.length >= 2) {
      return k.kindercode;
    }
  }

  // 4. 퍼지 매칭 (레벤슈타인 거리 기반, 유사도 0.7 이상)
  let bestMatch: KindergartenEntry | null = null;
  let bestSimilarity = 0;
  const SIMILARITY_THRESHOLD = 0.7;

  for (const k of sidoKindergartens) {
    const dbName = normalizeName(k.name);
    const similarity = calculateSimilarity(normalizedName, dbName);

    if (similarity > bestSimilarity && similarity >= SIMILARITY_THRESHOLD) {
      bestSimilarity = similarity;
      bestMatch = k;
    }
  }

  if (bestMatch) {
    return bestMatch.kindercode;
  }

  return null;
}

/**
 * 이름 인덱스 생성 (빠른 검색용)
 */
function buildNameIndex(
  kindergartens: KindergartenEntry[]
): Map<string, KindergartenEntry[]> {
  const index = new Map<string, KindergartenEntry[]>();

  for (const k of kindergartens) {
    const normalized = normalizeName(k.name);
    const existing = index.get(normalized) || [];
    existing.push(k);
    index.set(normalized, existing);
  }

  return index;
}

// ============================================================================
// 메인 병합 로직
// ============================================================================

async function main() {
  const args = process.argv.slice(2);

  // 인자 파싱
  const inputIdx = args.indexOf('--input');
  const sidoIdx = args.indexOf('--sido');
  const isDryRun = args.includes('--dry-run');

  if (inputIdx === -1 || sidoIdx === -1) {
    console.error('사용법: pnpm merge:chrome-reviews -- --input <file> --sido <code>');
    console.error('옵션:');
    console.error('  --input <file>  Claude in Chrome에서 수집한 JSON 파일');
    console.error('  --sido <code>   시도 코드 (11=서울, 41=경기, 28=인천)');
    console.error('  --dry-run       실제 저장 없이 시뮬레이션만');
    process.exit(1);
  }

  const inputFile = args[inputIdx + 1];
  const sidoCode = args[sidoIdx + 1];

  console.log('=== Chrome 수집 결과 병합 ===');
  console.log(`입력 파일: ${inputFile}`);
  console.log(`시도 코드: ${sidoCode}`);
  console.log(`Dry Run: ${isDryRun ? 'Yes' : 'No'}`);
  console.log('');

  // 파일 경로 설정
  const inputPath = path.resolve(inputFile);
  const kindergartensPath = path.resolve('public/data/kindergartens.json');
  const reviewsPath = path.resolve(`public/data/reviews/${sidoCode}.json`);

  // 파일 존재 확인
  if (!fs.existsSync(inputPath)) {
    console.error(`ERROR: 입력 파일을 찾을 수 없습니다: ${inputPath}`);
    process.exit(1);
  }

  if (!fs.existsSync(kindergartensPath)) {
    console.error(`ERROR: 유치원 데이터를 찾을 수 없습니다: ${kindergartensPath}`);
    process.exit(1);
  }

  // 데이터 로드
  console.log('데이터 로딩...');

  const chromeData: ChromeCollectionFile = JSON.parse(
    fs.readFileSync(inputPath, 'utf-8')
  );

  const kindergartens: KindergartenEntry[] = JSON.parse(
    fs.readFileSync(kindergartensPath, 'utf-8')
  );

  // 기존 리뷰 로드 (없으면 빈 구조 생성)
  let existingReviews: ReviewsData;
  if (fs.existsSync(reviewsPath)) {
    existingReviews = JSON.parse(fs.readFileSync(reviewsPath, 'utf-8'));
  } else {
    existingReviews = {
      version: new Date().toISOString().split('T')[0],
      totalCount: 0,
      kindergartenCount: 0,
      reviews: {},
    };
  }

  console.log(`Chrome 수집 데이터: ${chromeData.reviews.length}건`);
  console.log(`기존 리뷰: ${existingReviews.totalCount}건`);
  console.log(`유치원 DB: ${kindergartens.length}개`);
  console.log('');

  // 이름 인덱스 생성
  const nameIndex = buildNameIndex(kindergartens);

  // 기존 URL 집합 (중복 체크용)
  const existingUrls = new Set<string>();
  for (const reviews of Object.values(existingReviews.reviews)) {
    for (const review of reviews) {
      existingUrls.add(review.url);
    }
  }

  // 통계 초기화
  const stats: MergeStats = {
    totalInput: chromeData.reviews.length,
    matched: 0,
    unmatched: 0,
    duplicates: 0,
    added: 0,
  };

  const unmatchedNames: string[] = [];
  const collectedAt = new Date().toISOString();

  // 병합 처리
  console.log('병합 처리 중...');

  for (const chromeReview of chromeData.reviews) {
    // 유치원 매칭
    const kindercode = findKindercode(
      chromeReview.kindergartenName,
      chromeReview.sidoCode,
      kindergartens,
      nameIndex
    );

    if (!kindercode) {
      stats.unmatched++;
      if (!unmatchedNames.includes(chromeReview.kindergartenName)) {
        unmatchedNames.push(chromeReview.kindergartenName);
      }
      continue;
    }

    stats.matched++;

    // 중복 체크
    if (existingUrls.has(chromeReview.url)) {
      stats.duplicates++;
      continue;
    }

    // 새 리뷰 추가
    const newReview: ReviewLink = {
      id: generateReviewId(),
      kindergartenId: kindercode,
      title: chromeReview.title,
      url: chromeReview.url,
      source: chromeReview.source,
      sourceName: chromeReview.sourceName || '',
      snippet: chromeReview.snippet,
      date: chromeReview.date || null,
      collectedAt,
    };

    if (!existingReviews.reviews[kindercode]) {
      existingReviews.reviews[kindercode] = [];
    }

    existingReviews.reviews[kindercode].push(newReview);
    existingUrls.add(chromeReview.url);
    stats.added++;
  }

  // 통계 업데이트
  let totalCount = 0;
  let kindergartenCount = 0;

  for (const [, reviews] of Object.entries(existingReviews.reviews)) {
    if (reviews.length > 0) {
      kindergartenCount++;
      totalCount += reviews.length;
    }
  }

  existingReviews.totalCount = totalCount;
  existingReviews.kindergartenCount = kindergartenCount;
  existingReviews.version = new Date().toISOString().split('T')[0];

  // 결과 출력
  console.log('');
  console.log('=== 병합 결과 ===');
  console.log(`입력: ${stats.totalInput}건`);
  console.log(`  - 매칭 성공: ${stats.matched}건`);
  console.log(`  - 매칭 실패: ${stats.unmatched}건`);
  console.log(`  - 중복 제외: ${stats.duplicates}건`);
  console.log(`  - 신규 추가: ${stats.added}건`);
  console.log('');
  console.log(`최종 결과: ${totalCount}건 (${kindergartenCount}개 유치원)`);

  if (unmatchedNames.length > 0) {
    console.log('');
    console.log('=== 매칭 실패 유치원 ===');
    for (const name of unmatchedNames.slice(0, 10)) {
      console.log(`  - ${name}`);
    }
    if (unmatchedNames.length > 10) {
      console.log(`  ... 외 ${unmatchedNames.length - 10}개`);
    }
  }

  // 저장
  if (isDryRun) {
    console.log('');
    console.log('(Dry Run 모드 - 실제 저장하지 않음)');
  } else {
    const reviewsDir = path.dirname(reviewsPath);
    if (!fs.existsSync(reviewsDir)) {
      fs.mkdirSync(reviewsDir, { recursive: true });
    }

    fs.writeFileSync(reviewsPath, JSON.stringify(existingReviews, null, 2));
    console.log('');
    console.log(`저장 완료: ${reviewsPath}`);
  }
}

main().catch((err) => {
  console.error('병합 중 오류 발생:', err);
  process.exit(1);
});

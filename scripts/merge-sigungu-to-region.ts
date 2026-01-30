/**
 * 시군구별 리뷰 파일을 시도별 메인 JSON으로 병합
 *
 * 기능:
 * 1. public/data/reviews/{sido}/ 디렉토리의 모든 시군구 JSON을 읽음
 * 2. kindergartenId 기준으로 리뷰 합치기
 * 3. URL 중복 제거
 * 4. ReviewLink 타입에 맞게 필드 정규화
 * 5. public/data/reviews/{sido}.json 메인 파일 생성/병합
 * 6. unknown.json → 올바른 지역 파일로 재배치
 *
 * 사용법:
 *   pnpm tsx scripts/merge-sigungu-to-region.ts              # 전체 지역
 *   pnpm tsx scripts/merge-sigungu-to-region.ts --sido 26    # 특정 지역
 *   pnpm tsx scripts/merge-sigungu-to-region.ts --dry-run    # 미리보기
 *   pnpm tsx scripts/merge-sigungu-to-region.ts --redistribute-unknown  # unknown.json 재배치
 */

import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// 타입 정의
// ============================================================================

interface ReviewLink {
  id: string;
  kindergartenId: string;
  title: string;
  url: string;
  source: 'naver_blog' | 'naver_cafe' | 'google' | 'other';
  sourceName: string;
  snippet: string;
  summary?: string;
  tags?: string[];
  date: string | null;
  collectedAt: string;
}

interface ReviewsData {
  version: string;
  totalCount: number;
  kindergartenCount: number;
  lastCuratedAt?: string;
  reviews: Record<string, ReviewLink[]>;
}

interface RawReview {
  id: string;
  kindergartenId: string;
  title: string;
  url: string;
  source: string;
  sourceName?: string;
  snippet: string;
  summary?: string;
  tags?: string[];
  date: string | null;
  collectedAt: string;
  kindergartenName?: string;
  relevanceScore?: number;
  pros?: string[];
  cons?: string[];
  sentiment?: string;
  content?: string;
  [key: string]: unknown;
}

interface Kindergarten {
  kindercode: string;
  sido_code: string;
  [key: string]: unknown;
}

// ============================================================================
// 필드 정규화
// ============================================================================

const ALLOWED_FIELDS = new Set([
  'id', 'kindergartenId', 'title', 'url', 'source', 'sourceName',
  'snippet', 'date', 'collectedAt', 'summary', 'tags',
]);

function normalizeReview(raw: RawReview): ReviewLink {
  const normalized: Record<string, unknown> = {};
  for (const key of ALLOWED_FIELDS) {
    if (key in raw && raw[key] !== undefined) {
      normalized[key] = raw[key];
    }
  }
  if (!normalized.sourceName) {
    normalized.sourceName = '';
  }
  return normalized as ReviewLink;
}

// ============================================================================
// 병합 로직
// ============================================================================

function mergeReviews(
  existing: Record<string, ReviewLink[]>,
  incoming: Record<string, RawReview[]>,
): { merged: Record<string, ReviewLink[]>; added: number; dupes: number } {
  const merged: Record<string, ReviewLink[]> = {};
  let added = 0;
  let dupes = 0;

  // URL 중복은 kindergartenId별로 관리 (같은 URL이 다른 유치원에 연결되는 것은 허용)
  // 기존 데이터를 먼저 넣기
  for (const [kid, reviews] of Object.entries(existing)) {
    const seenUrlsForKid = new Set<string>();
    merged[kid] = [];
    for (const review of reviews) {
      const normalizedUrl = review.url.replace(/^https?:\/\//, '').replace(/\/$/, '');
      if (!seenUrlsForKid.has(normalizedUrl)) {
        seenUrlsForKid.add(normalizedUrl);
        merged[kid].push(review);
      } else {
        dupes++;
      }
    }
  }

  // 신규 데이터 병합
  for (const [kid, reviews] of Object.entries(incoming)) {
    if (!merged[kid]) {
      merged[kid] = [];
    }
    const existingUrls = new Set(
      merged[kid].map(r => r.url.replace(/^https?:\/\//, '').replace(/\/$/, ''))
    );
    for (const raw of reviews) {
      const normalizedUrl = raw.url.replace(/^https?:\/\//, '').replace(/\/$/, '');
      if (!existingUrls.has(normalizedUrl)) {
        existingUrls.add(normalizedUrl);
        merged[kid].push(normalizeReview(raw));
        added++;
      } else {
        dupes++;
      }
    }
  }

  // 빈 배열 정리
  for (const kid of Object.keys(merged)) {
    if (merged[kid].length === 0) {
      delete merged[kid];
    }
  }

  return { merged, added, dupes };
}

// ============================================================================
// unknown.json 재배치
// ============================================================================

function redistributeUnknown(
  unknownPath: string,
  kindergartensPath: string,
  reviewsDir: string,
  isDryRun: boolean,
): void {
  if (!fs.existsSync(unknownPath)) {
    console.log('unknown.json이 없습니다. 건너뜁니다.');
    return;
  }

  const unknownData: ReviewsData = JSON.parse(fs.readFileSync(unknownPath, 'utf-8'));
  if (!unknownData.reviews || Object.keys(unknownData.reviews).length === 0) {
    console.log('unknown.json에 리뷰가 없습니다.');
    return;
  }

  // kindergartens.json에서 ID → sido_code 매핑 구축
  const kindergartens: Kindergarten[] = JSON.parse(fs.readFileSync(kindergartensPath, 'utf-8'));
  const idToSido = new Map<string, string>();
  for (const k of kindergartens) {
    idToSido.set(k.kindercode, k.sido_code);
  }

  // 지역별로 분류
  const byRegion: Record<string, Record<string, ReviewLink[]>> = {};
  let mapped = 0;
  let unmapped = 0;

  for (const [kid, reviews] of Object.entries(unknownData.reviews)) {
    const sidoCode = idToSido.get(kid);
    if (sidoCode) {
      if (!byRegion[sidoCode]) {
        byRegion[sidoCode] = {};
      }
      byRegion[sidoCode][kid] = reviews;
      mapped += reviews.length;
    } else {
      unmapped += reviews.length;
    }
  }

  console.log(`\n=== unknown.json 재배치 ===`);
  console.log(`매핑 성공: ${mapped}건, 매핑 실패: ${unmapped}건`);

  // 각 지역 메인 JSON에 병합
  for (const [sidoCode, reviews] of Object.entries(byRegion)) {
    const mainFile = path.join(reviewsDir, `${sidoCode}.json`);
    let existing: Record<string, ReviewLink[]> = {};

    if (fs.existsSync(mainFile)) {
      const data: ReviewsData = JSON.parse(fs.readFileSync(mainFile, 'utf-8'));
      existing = data.reviews;
    }

    const { merged, added, dupes } = mergeReviews(existing, reviews);
    const totalCount = Object.values(merged).reduce((sum, arr) => sum + arr.length, 0);
    const kindergartenCount = Object.keys(merged).length;

    console.log(`  ${sidoCode}: +${added}건 (중복 ${dupes}건 스킵)`);

    if (!isDryRun) {
      const newData: ReviewsData = {
        version: new Date().toISOString().split('T')[0],
        totalCount,
        kindergartenCount,
        lastCuratedAt: new Date().toISOString(),
        reviews: merged,
      };
      fs.writeFileSync(mainFile, JSON.stringify(newData, null, 2));
    }
  }

  // unknown.json에서 매핑된 리뷰 제거 (unmapped만 남김)
  if (!isDryRun && unmapped > 0) {
    const remaining: Record<string, ReviewLink[]> = {};
    for (const [kid, reviews] of Object.entries(unknownData.reviews)) {
      if (!idToSido.has(kid)) {
        remaining[kid] = reviews;
      }
    }
    const remainingTotal = Object.values(remaining).reduce((sum, arr) => sum + arr.length, 0);
    const newUnknown: ReviewsData = {
      version: new Date().toISOString().split('T')[0],
      totalCount: remainingTotal,
      kindergartenCount: Object.keys(remaining).length,
      reviews: remaining,
    };
    fs.writeFileSync(unknownPath, JSON.stringify(newUnknown, null, 2));
    console.log(`  unknown.json 갱신: ${remainingTotal}건 남음`);
  } else if (!isDryRun && unmapped === 0) {
    // 모두 매핑됨 → unknown.json 비우기
    const empty: ReviewsData = {
      version: new Date().toISOString().split('T')[0],
      totalCount: 0,
      kindergartenCount: 0,
      reviews: {},
    };
    fs.writeFileSync(unknownPath, JSON.stringify(empty, null, 2));
    console.log('  unknown.json 비움 (모든 리뷰 재배치 완료)');
  }
}

// ============================================================================
// 메인 실행
// ============================================================================

function main() {
  const args = process.argv.slice(2);
  const sidoIdx = args.indexOf('--sido');
  const targetSido = sidoIdx !== -1 ? args[sidoIdx + 1] : null;
  const isDryRun = args.includes('--dry-run');
  const doRedistribute = args.includes('--redistribute-unknown');

  const REVIEWS_DIR = path.resolve('public/data/reviews');
  const KINDERGARTENS_PATH = path.resolve('public/data/kindergartens.json');

  if (!fs.existsSync(REVIEWS_DIR)) {
    console.error('ERROR: public/data/reviews/ 디렉토리를 찾을 수 없습니다.');
    process.exit(1);
  }

  console.log('=== 시군구 → 메인 지역 병합 ===');
  console.log(`모드: ${isDryRun ? '미리보기 (dry-run)' : '실제 수정'}`);
  if (targetSido) {
    console.log(`대상 지역: ${targetSido}`);
  }
  console.log('');

  // 대상 디렉토리 결정
  const dirs: string[] = [];
  if (targetSido) {
    const subDir = path.join(REVIEWS_DIR, targetSido);
    if (fs.existsSync(subDir) && fs.statSync(subDir).isDirectory()) {
      dirs.push(targetSido);
    } else {
      console.error(`ERROR: ${targetSido} 디렉토리를 찾을 수 없습니다.`);
      process.exit(1);
    }
  } else {
    const items = fs.readdirSync(REVIEWS_DIR);
    for (const item of items) {
      const itemPath = path.join(REVIEWS_DIR, item);
      if (fs.statSync(itemPath).isDirectory()) {
        dirs.push(item);
      }
    }
  }

  let grandTotalAdded = 0;
  let grandTotalDupes = 0;

  for (const sidoCode of dirs.toSorted()) {
    const subDir = path.join(REVIEWS_DIR, sidoCode);
    const subFiles = fs.readdirSync(subDir).filter(f => f.endsWith('.json'));

    if (subFiles.length === 0) continue;

    // 시군구 파일들 읽기
    const incoming: Record<string, RawReview[]> = {};
    let sigunguTotal = 0;

    for (const subFile of subFiles) {
      const subPath = path.join(subDir, subFile);
      const subData = JSON.parse(fs.readFileSync(subPath, 'utf-8'));
      if (!subData.reviews) continue;

      for (const [kid, reviews] of Object.entries(subData.reviews)) {
        if (!incoming[kid]) {
          incoming[kid] = [];
        }
        incoming[kid].push(...(reviews as RawReview[]));
        sigunguTotal += (reviews as RawReview[]).length;
      }
    }

    // 기존 메인 파일 읽기
    const mainFile = path.join(REVIEWS_DIR, `${sidoCode}.json`);
    let existing: Record<string, ReviewLink[]> = {};

    if (fs.existsSync(mainFile)) {
      const mainData: ReviewsData = JSON.parse(fs.readFileSync(mainFile, 'utf-8'));
      existing = mainData.reviews || {};
    }

    const existingCount = Object.values(existing).reduce((sum, arr) => sum + arr.length, 0);

    // 병합
    const { merged, added, dupes } = mergeReviews(existing, incoming);
    const totalCount = Object.values(merged).reduce((sum, arr) => sum + arr.length, 0);
    const kindergartenCount = Object.keys(merged).length;

    console.log(`--- ${sidoCode} ---`);
    console.log(`  시군구 파일: ${subFiles.length}개, ${sigunguTotal}건`);
    console.log(`  기존 메인: ${existingCount}건`);
    console.log(`  병합 후: ${totalCount}건 (유치원 ${kindergartenCount}개)`);
    console.log(`  신규 추가: ${added}건, 중복 제거: ${dupes}건`);

    grandTotalAdded += added;
    grandTotalDupes += dupes;

    if (!isDryRun) {
      const newData: ReviewsData = {
        version: new Date().toISOString().split('T')[0],
        totalCount,
        kindergartenCount,
        lastCuratedAt: new Date().toISOString(),
        reviews: merged,
      };
      fs.writeFileSync(mainFile, JSON.stringify(newData, null, 2));
      console.log(`  저장 완료: ${mainFile}`);
    }
  }

  console.log('\n=== 병합 결과 ===');
  console.log(`총 신규 추가: ${grandTotalAdded}건`);
  console.log(`총 중복 제거: ${grandTotalDupes}건`);

  // unknown.json 재배치
  if (doRedistribute) {
    const unknownPath = path.join(REVIEWS_DIR, 'unknown.json');
    redistributeUnknown(unknownPath, KINDERGARTENS_PATH, REVIEWS_DIR, isDryRun);
  }

  if (isDryRun) {
    console.log('\n(dry-run 모드: 실제 파일은 수정되지 않음)');
  }
}

main();

/**
 * URL 중복 매핑 탐지 및 제거 스크립트
 *
 * 동일 URL이 N개 이상 유치원에 매핑된 경우, 정보 나열/목록 글이므로 제거.
 *
 * 사용법:
 *   pnpm dedupe:reviews -- --dry-run           # 미리보기
 *   pnpm dedupe:reviews                        # 실제 적용 (threshold=5)
 *   pnpm dedupe:reviews -- --threshold 3       # threshold 변경
 *   pnpm dedupe:reviews -- --sido 11           # 특정 시도만
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
  source: string;
  sourceName: string;
  snippet: string;
  date: string | null;
  collectedAt: string;
  [key: string]: unknown;
}

interface ReviewsData {
  version: string;
  totalCount: number;
  kindergartenCount: number;
  lastCuratedAt?: string;
  reviews: Record<string, ReviewLink[]>;
}

interface UrlMapping {
  url: string;
  kindergartenIds: Set<string>;
  titles: string[];
}

interface DedupeReport {
  totalUrlsScanned: number;
  duplicateUrlCount: number;
  reviewsRemoved: number;
  removedUrls: Array<{ url: string; mappedCount: number; sampleTitles: string[] }>;
}

// ============================================================================
// 메인 로직
// ============================================================================

function scanUrlMappings(reviewsDir: string, targetSido: string | null): Map<string, UrlMapping> {
  const urlMap = new Map<string, UrlMapping>();

  const files = getReviewFiles(reviewsDir, targetSido);

  for (const file of files) {
    const filePath = path.join(reviewsDir, file);
    const data: ReviewsData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    for (const [kindergartenId, reviews] of Object.entries(data.reviews)) {
      for (const review of reviews) {
        const normalizedUrl = normalizeUrl(review.url);
        const existing = urlMap.get(normalizedUrl);

        if (existing) {
          existing.kindergartenIds.add(kindergartenId);
          if (existing.titles.length < 3) {
            existing.titles.push(review.title.substring(0, 80));
          }
        } else {
          urlMap.set(normalizedUrl, {
            url: review.url,
            kindergartenIds: new Set([kindergartenId]),
            titles: [review.title.substring(0, 80)],
          });
        }
      }
    }
  }

  return urlMap;
}

function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    // 프로토콜 통일, 트레일링 슬래시 제거
    return `${parsed.hostname}${parsed.pathname.replace(/\/$/, '')}${parsed.search}`;
  } catch {
    return url.toLowerCase().trim();
  }
}

function getReviewFiles(reviewsDir: string, targetSido: string | null): string[] {
  const SKIP_FILES = ['reviews.json', 'reviews.backup.json', 'unknown.json'];
  const files: string[] = [];

  if (targetSido) {
    const mainFile = `${targetSido}.json`;
    if (fs.existsSync(path.join(reviewsDir, mainFile))) {
      files.push(mainFile);
    }
    const subDir = path.join(reviewsDir, targetSido);
    if (fs.existsSync(subDir) && fs.statSync(subDir).isDirectory()) {
      const subFiles = fs.readdirSync(subDir).filter(f => f.endsWith('.json'));
      files.push(...subFiles.map(f => `${targetSido}/${f}`));
    }
  } else {
    const items = fs.readdirSync(reviewsDir);
    for (const item of items) {
      const itemPath = path.join(reviewsDir, item);
      if (item.endsWith('.json') && !SKIP_FILES.includes(item)) {
        files.push(item);
      } else if (fs.statSync(itemPath).isDirectory()) {
        const subFiles = fs.readdirSync(itemPath).filter(f => f.endsWith('.json'));
        files.push(...subFiles.map(f => `${item}/${f}`));
      }
    }
  }

  return files;
}

function removeDuplicateUrls(
  reviewsDir: string,
  duplicateUrls: Set<string>,
  targetSido: string | null,
  isDryRun: boolean
): number {
  const files = getReviewFiles(reviewsDir, targetSido);
  let totalRemoved = 0;

  for (const file of files) {
    const filePath = path.join(reviewsDir, file);
    const data: ReviewsData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    let fileRemoved = 0;

    const newReviews: Record<string, ReviewLink[]> = {};
    let newTotal = 0;

    for (const [kindergartenId, reviews] of Object.entries(data.reviews)) {
      const filtered: ReviewLink[] = [];

      for (const review of reviews) {
        const normalizedUrl = normalizeUrl(review.url);
        if (duplicateUrls.has(normalizedUrl)) {
          fileRemoved++;
        } else {
          filtered.push(review);
        }
      }

      if (filtered.length > 0) {
        newReviews[kindergartenId] = filtered;
        newTotal += filtered.length;
      }
    }

    if (fileRemoved > 0) {
      console.log(`  ${file}: ${fileRemoved}건 제거 (${data.totalCount} → ${newTotal})`);
      totalRemoved += fileRemoved;

      if (!isDryRun) {
        const newData: ReviewsData = {
          version: new Date().toISOString().split('T')[0],
          totalCount: newTotal,
          kindergartenCount: Object.keys(newReviews).length,
          lastCuratedAt: new Date().toISOString(),
          reviews: newReviews,
        };
        fs.writeFileSync(filePath, JSON.stringify(newData, null, 2));
      }
    }
  }

  return totalRemoved;
}

function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');
  const thresholdIdx = args.indexOf('--threshold');
  const threshold = thresholdIdx !== -1 ? parseInt(args[thresholdIdx + 1], 10) : 5;
  const sidoIdx = args.indexOf('--sido');
  const sidoCode = sidoIdx !== -1 ? args[sidoIdx + 1] : null;

  const REVIEWS_DIR = path.resolve('public/data/reviews');

  if (!fs.existsSync(REVIEWS_DIR)) {
    console.error('ERROR: public/data/reviews/ 디렉토리를 찾을 수 없습니다.');
    process.exit(1);
  }

  console.log('=== URL 중복 매핑 탐지 및 제거 ===');
  console.log(`모드: ${isDryRun ? '미리보기 (dry-run)' : '실제 수정'}`);
  console.log(`임계값: ${threshold}개 이상 유치원에 매핑된 URL 제거`);
  if (sidoCode) console.log(`대상 시도: ${sidoCode}`);
  console.log('');

  // 1. URL 매핑 스캔 (전체 파일 대상 - 중복 탐지를 위해)
  console.log('URL 매핑 스캔 중...');
  const urlMap = scanUrlMappings(REVIEWS_DIR, null);
  console.log(`총 고유 URL: ${urlMap.size}개`);

  // 2. 중복 URL 식별
  const duplicateUrls = new Set<string>();
  const report: DedupeReport = {
    totalUrlsScanned: urlMap.size,
    duplicateUrlCount: 0,
    reviewsRemoved: 0,
    removedUrls: [],
  };

  for (const [normalizedUrl, mapping] of urlMap) {
    if (mapping.kindergartenIds.size >= threshold) {
      duplicateUrls.add(normalizedUrl);
      report.duplicateUrlCount++;
      report.removedUrls.push({
        url: mapping.url,
        mappedCount: mapping.kindergartenIds.size,
        sampleTitles: mapping.titles,
      });
    }
  }

  console.log(`중복 URL (${threshold}+개 유치원 매핑): ${duplicateUrls.size}개`);
  console.log('');

  // 3. 중복 URL 상세 리포트
  if (report.removedUrls.length > 0) {
    console.log('--- 중복 URL 목록 ---');
    const sorted = report.removedUrls.toSorted((a, b) => b.mappedCount - a.mappedCount);
    for (const item of sorted.slice(0, 30)) {
      console.log(`  [${item.mappedCount}개 매핑] ${item.url}`);
      console.log(`    제목: ${item.sampleTitles[0]}`);
    }
    if (sorted.length > 30) {
      console.log(`  ... 외 ${sorted.length - 30}개`);
    }
    console.log('');
  }

  // 4. 실제 제거
  if (duplicateUrls.size > 0) {
    console.log('리뷰 제거 중...');
    const removed = removeDuplicateUrls(REVIEWS_DIR, duplicateUrls, sidoCode, isDryRun);
    report.reviewsRemoved = removed;
    console.log('');
  }

  // 5. 결과 요약
  console.log('=== 결과 요약 ===');
  console.log(`스캔된 고유 URL: ${report.totalUrlsScanned}개`);
  console.log(`중복 URL (${threshold}+): ${report.duplicateUrlCount}개`);
  console.log(`제거된 리뷰: ${report.reviewsRemoved}건`);

  if (isDryRun) {
    console.log('(dry-run 모드: 실제 파일은 수정되지 않음)');
  }

  // 리포트 저장
  const OUTPUT_DIR = path.resolve('scripts/data-output');
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const reportPath = path.join(OUTPUT_DIR, `dedupe-report-${new Date().toISOString().split('T')[0]}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n리포트 저장: ${reportPath}`);
}

main();

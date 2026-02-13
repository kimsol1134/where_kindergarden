/**
 * 리뷰 URL HTTP 상태 확인 스크립트 (깨진 링크 제거)
 *
 * 모든 리뷰 URL에 HEAD 요청을 보내 유효성 검사:
 * - 404/403/timeout → 제거 대상 마킹
 * - 301/302 리다이렉트 → 최종 URL로 업데이트
 *
 * 사용법:
 *   pnpm check:review-urls -- --sido 28              # 인천만 검사
 *   pnpm check:review-urls -- --sido 28 --dry-run    # 미리보기
 *   pnpm check:review-urls -- --sido 28 --apply      # 결과 즉시 적용
 *   pnpm check:review-urls -- --concurrency 10       # 동시 요청 수 조절
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

type UrlStatus = 'ok' | 'redirect' | 'not_found' | 'forbidden' | 'timeout' | 'error';

interface UrlCheckResult {
  url: string;
  status: UrlStatus;
  httpCode: number | null;
  redirectUrl: string | null;
  error: string | null;
}

interface CheckReport {
  checkedAt: string;
  sidoCode: string;
  totalChecked: number;
  results: Record<UrlStatus, number>;
  broken: UrlCheckResult[];
  redirected: UrlCheckResult[];
}

// ============================================================================
// URL 체크 로직
// ============================================================================

async function checkUrl(url: string, timeoutMs: number = 10000): Promise<UrlCheckResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: 'HEAD',
      redirect: 'manual',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ReviewChecker/1.0)',
      },
    });

    clearTimeout(timer);

    const httpCode = response.status;

    if (httpCode >= 200 && httpCode < 300) {
      return { url, status: 'ok', httpCode, redirectUrl: null, error: null };
    }

    if (httpCode === 301 || httpCode === 302 || httpCode === 307 || httpCode === 308) {
      const redirectUrl = response.headers.get('location');
      return { url, status: 'redirect', httpCode, redirectUrl, error: null };
    }

    if (httpCode === 404 || httpCode === 410) {
      return { url, status: 'not_found', httpCode, redirectUrl: null, error: null };
    }

    if (httpCode === 403) {
      return { url, status: 'forbidden', httpCode, redirectUrl: null, error: null };
    }

    // 다른 에러 상태
    return { url, status: 'error', httpCode, redirectUrl: null, error: `HTTP ${httpCode}` };
  } catch (err) {
    clearTimeout(timer);

    if (err instanceof Error && err.name === 'AbortError') {
      return { url, status: 'timeout', httpCode: null, redirectUrl: null, error: 'Timeout' };
    }

    const message = err instanceof Error ? err.message : String(err);
    return { url, status: 'error', httpCode: null, redirectUrl: null, error: message };
  }
}

async function checkUrlsWithConcurrency(
  urls: string[],
  concurrency: number,
  onProgress: (checked: number, total: number) => void
): Promise<Map<string, UrlCheckResult>> {
  const results = new Map<string, UrlCheckResult>();
  let checked = 0;

  // 청크 단위로 동시 실행
  for (let i = 0; i < urls.length; i += concurrency) {
    const batch = urls.slice(i, i + concurrency);
    const batchResults = await Promise.all(batch.map(url => checkUrl(url)));

    for (const result of batchResults) {
      results.set(result.url, result);
      checked++;
    }

    onProgress(checked, urls.length);

    // 요청 간 작은 딜레이
    if (i + concurrency < urls.length) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  return results;
}

// ============================================================================
// 파일 처리
// ============================================================================

function getReviewFiles(reviewsDir: string, sidoCode: string): string[] {
  const files: string[] = [];
  const mainFile = `${sidoCode}.json`;

  if (fs.existsSync(path.join(reviewsDir, mainFile))) {
    files.push(mainFile);
  }

  const subDir = path.join(reviewsDir, sidoCode);
  if (fs.existsSync(subDir) && fs.statSync(subDir).isDirectory()) {
    const subFiles = fs.readdirSync(subDir).filter(f => f.endsWith('.json'));
    files.push(...subFiles.map(f => `${sidoCode}/${f}`));
  }

  return files;
}

function extractUniqueUrls(reviewsDir: string, files: string[]): string[] {
  const urlSet = new Set<string>();

  for (const file of files) {
    const filePath = path.join(reviewsDir, file);
    const data: ReviewsData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    for (const reviews of Object.values(data.reviews)) {
      for (const review of reviews) {
        urlSet.add(review.url);
      }
    }
  }

  return Array.from(urlSet);
}

function applyResults(
  reviewsDir: string,
  files: string[],
  brokenUrls: Set<string>,
  redirectMap: Map<string, string>,
  isDryRun: boolean
): { removed: number; updated: number } {
  let totalRemoved = 0;
  let totalUpdated = 0;

  for (const file of files) {
    const filePath = path.join(reviewsDir, file);
    const data: ReviewsData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    let fileRemoved = 0;
    let fileUpdated = 0;

    const newReviews: Record<string, ReviewLink[]> = {};
    let newTotal = 0;

    for (const [kindergartenId, reviews] of Object.entries(data.reviews)) {
      const filtered: ReviewLink[] = [];

      for (const review of reviews) {
        if (brokenUrls.has(review.url)) {
          fileRemoved++;
          continue;
        }

        const newUrl = redirectMap.get(review.url);
        if (newUrl) {
          review.url = newUrl;
          fileUpdated++;
        }

        filtered.push(review);
      }

      if (filtered.length > 0) {
        newReviews[kindergartenId] = filtered;
        newTotal += filtered.length;
      }
    }

    if (fileRemoved > 0 || fileUpdated > 0) {
      console.log(`  ${file}: 제거 ${fileRemoved}건, 리다이렉트 업데이트 ${fileUpdated}건`);
      totalRemoved += fileRemoved;
      totalUpdated += fileUpdated;

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

  return { removed: totalRemoved, updated: totalUpdated };
}

// ============================================================================
// 메인 실행
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  const sidoIdx = args.indexOf('--sido');
  const sidoCode = sidoIdx !== -1 ? args[sidoIdx + 1] : null;
  const isDryRun = args.includes('--dry-run');
  const shouldApply = args.includes('--apply');
  const concurrencyIdx = args.indexOf('--concurrency');
  const concurrency = concurrencyIdx !== -1 ? parseInt(args[concurrencyIdx + 1], 10) : 20;

  if (!sidoCode) {
    console.error('ERROR: --sido 인자가 필요합니다.');
    console.error('사용법: pnpm check:review-urls -- --sido 28');
    process.exit(1);
  }

  const REVIEWS_DIR = path.resolve('public/data/reviews');

  if (!fs.existsSync(REVIEWS_DIR)) {
    console.error('ERROR: public/data/reviews/ 디렉토리를 찾을 수 없습니다.');
    process.exit(1);
  }

  console.log('=== 리뷰 URL 상태 확인 ===');
  console.log(`시도: ${sidoCode}`);
  console.log(`동시 요청: ${concurrency}개`);
  console.log(`모드: ${isDryRun ? 'dry-run' : shouldApply ? '결과 즉시 적용' : '검사만 (결과 저장)'}`);
  console.log('');

  // 1. URL 추출
  const files = getReviewFiles(REVIEWS_DIR, sidoCode);
  if (files.length === 0) {
    console.error(`ERROR: ${sidoCode} 관련 리뷰 파일 없음`);
    process.exit(1);
  }

  const urls = extractUniqueUrls(REVIEWS_DIR, files);
  console.log(`검사 대상: ${urls.length}개 URL (파일 ${files.length}개)`);
  console.log('');

  // 2. HTTP 상태 확인
  console.log('URL 상태 확인 중...');
  const results = await checkUrlsWithConcurrency(urls, concurrency, (checked, total) => {
    if (checked % 50 === 0 || checked === total) {
      const pct = ((checked / total) * 100).toFixed(1);
      console.log(`  진행: ${checked}/${total} (${pct}%)`);
    }
  });
  console.log('');

  // 3. 결과 분류
  const statusCounts: Record<UrlStatus, number> = {
    ok: 0,
    redirect: 0,
    not_found: 0,
    forbidden: 0,
    timeout: 0,
    error: 0,
  };

  const brokenResults: UrlCheckResult[] = [];
  const redirectResults: UrlCheckResult[] = [];

  for (const result of results.values()) {
    statusCounts[result.status]++;

    if (result.status === 'not_found' || result.status === 'timeout') {
      brokenResults.push(result);
    } else if (result.status === 'redirect' && result.redirectUrl) {
      redirectResults.push(result);
    }
  }

  // 4. 결과 출력
  console.log('--- 상태별 분류 ---');
  console.log(`  정상 (2xx): ${statusCounts.ok}개`);
  console.log(`  리다이렉트 (3xx): ${statusCounts.redirect}개`);
  console.log(`  Not Found (404): ${statusCounts.not_found}개`);
  console.log(`  Forbidden (403): ${statusCounts.forbidden}개`);
  console.log(`  Timeout: ${statusCounts.timeout}개`);
  console.log(`  기타 에러: ${statusCounts.error}개`);
  console.log('');

  if (brokenResults.length > 0) {
    console.log('--- 깨진 링크 (제거 대상) ---');
    for (const result of brokenResults.slice(0, 20)) {
      console.log(`  [${result.status}] ${result.url}`);
    }
    if (brokenResults.length > 20) {
      console.log(`  ... 외 ${brokenResults.length - 20}개`);
    }
    console.log('');
  }

  if (redirectResults.length > 0) {
    console.log(`--- 리다이렉트 (${redirectResults.length}개) ---`);
    for (const result of redirectResults.slice(0, 10)) {
      console.log(`  ${result.url}`);
      console.log(`    → ${result.redirectUrl}`);
    }
    if (redirectResults.length > 10) {
      console.log(`  ... 외 ${redirectResults.length - 10}개`);
    }
    console.log('');
  }

  // 5. 결과 저장
  const OUTPUT_DIR = path.resolve('scripts/data-output');
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const report: CheckReport = {
    checkedAt: new Date().toISOString(),
    sidoCode,
    totalChecked: urls.length,
    results: statusCounts,
    broken: brokenResults,
    redirected: redirectResults,
  };

  const reportPath = path.join(OUTPUT_DIR, `url-check-results-${sidoCode}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`리포트 저장: ${reportPath}`);

  // 6. 결과 적용 (--apply 모드)
  if (shouldApply && !isDryRun) {
    const brokenUrls = new Set(brokenResults.map(r => r.url));
    const redirectMap = new Map<string, string>();
    for (const r of redirectResults) {
      if (r.redirectUrl) {
        redirectMap.set(r.url, r.redirectUrl);
      }
    }

    if (brokenUrls.size > 0 || redirectMap.size > 0) {
      console.log('\n결과 적용 중...');
      const { removed, updated } = applyResults(REVIEWS_DIR, files, brokenUrls, redirectMap, isDryRun);
      console.log(`\n적용 결과: 제거 ${removed}건, URL 업데이트 ${updated}건`);
    }
  } else if (brokenResults.length > 0 && !shouldApply) {
    console.log('\n깨진 링크를 제거하려면: pnpm check:review-urls -- --sido ' + sidoCode + ' --apply');
  }
}

main().catch((err) => {
  console.error('URL 확인 중 오류:', err);
  process.exit(1);
});

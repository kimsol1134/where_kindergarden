/**
 * 검증 결과 적용 스크립트
 *
 * review-validator 서브에이전트가 생성한 검증 결과를 읽고,
 * INVALID 판정된 리뷰를 public/data/reviews/{sido}.json에서 제거.
 *
 * 사용법:
 *   pnpm apply:validation -- --sido 28 --dry-run    # 미리보기
 *   pnpm apply:validation -- --sido 28              # 실제 적용
 *   pnpm apply:validation -- --sido 28 --report     # 상세 리포트 출력
 */

import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// 타입 정의
// ============================================================================

type ValidationStatus =
  | 'VALID'
  | 'WRONG_KINDERGARTEN'
  | 'WRONG_TOPIC'
  | 'LISTING'
  | 'ADVERTISEMENT'
  | 'BROKEN';

interface ValidationEntry {
  url: string;
  urlHash: string;
  kindergartenId: string;
  reviewId: string;
  status: ValidationStatus;
  reason: string;
  confidence: number;
}

interface ValidationResults {
  validatedAt: string;
  sidoCode: string;
  totalValidated: number;
  results: ValidationEntry[];
}

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

// ============================================================================
// 무효 판정 상태 목록
// ============================================================================

const INVALID_STATUSES: Set<ValidationStatus> = new Set([
  'WRONG_KINDERGARTEN',
  'WRONG_TOPIC',
  'LISTING',
  'ADVERTISEMENT',
  'BROKEN',
]);

// ============================================================================
// 메인 로직
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

function main() {
  const args = process.argv.slice(2);
  const sidoIdx = args.indexOf('--sido');
  const sidoCode = sidoIdx !== -1 ? args[sidoIdx + 1] : null;
  const isDryRun = args.includes('--dry-run');
  const showReport = args.includes('--report');

  if (!sidoCode) {
    console.error('ERROR: --sido 인자가 필요합니다.');
    console.error('사용법: pnpm apply:validation -- --sido 28');
    process.exit(1);
  }

  // 검증 결과 파일 확인
  const validationPath = path.resolve(`scripts/data-output/validation-results/${sidoCode}.json`);
  if (!fs.existsSync(validationPath)) {
    console.error(`ERROR: 검증 결과 파일 없음: ${validationPath}`);
    console.error('먼저 review-validator로 본문 검증을 실행하세요.');
    process.exit(1);
  }

  const REVIEWS_DIR = path.resolve('public/data/reviews');
  if (!fs.existsSync(REVIEWS_DIR)) {
    console.error('ERROR: public/data/reviews/ 디렉토리를 찾을 수 없습니다.');
    process.exit(1);
  }

  // 검증 결과 로드
  const validation: ValidationResults = JSON.parse(fs.readFileSync(validationPath, 'utf-8'));

  console.log('=== 검증 결과 적용 ===');
  console.log(`시도: ${sidoCode}`);
  console.log(`모드: ${isDryRun ? 'dry-run' : '실제 적용'}`);
  console.log(`검증 건수: ${validation.totalValidated}건`);
  console.log(`검증 시각: ${validation.validatedAt}`);
  console.log('');

  // 상태별 통계
  const statusCounts: Record<ValidationStatus | 'VALID', number> = {
    VALID: 0,
    WRONG_KINDERGARTEN: 0,
    WRONG_TOPIC: 0,
    LISTING: 0,
    ADVERTISEMENT: 0,
    BROKEN: 0,
  };

  for (const entry of validation.results) {
    statusCounts[entry.status]++;
  }

  console.log('--- 검증 결과 분포 ---');
  for (const [status, count] of Object.entries(statusCounts)) {
    if (count > 0) {
      const marker = INVALID_STATUSES.has(status as ValidationStatus) ? ' [제거]' : '';
      console.log(`  ${status}: ${count}건${marker}`);
    }
  }
  console.log('');

  // INVALID URL 및 review ID 수집
  const invalidUrls = new Set<string>();
  const invalidReviewIds = new Set<string>();

  for (const entry of validation.results) {
    if (INVALID_STATUSES.has(entry.status)) {
      invalidUrls.add(entry.url);
      invalidReviewIds.add(entry.reviewId);
    }
  }

  console.log(`제거 대상: ${invalidUrls.size}개 URL`);

  // 상세 리포트
  if (showReport) {
    console.log('');
    console.log('--- 제거 대상 상세 ---');
    for (const entry of validation.results) {
      if (INVALID_STATUSES.has(entry.status)) {
        console.log(`  [${entry.status}] ${entry.url}`);
        console.log(`    사유: ${entry.reason}`);
      }
    }
    console.log('');
  }

  // 리뷰 파일에 적용
  const files = getReviewFiles(REVIEWS_DIR, sidoCode);
  let totalRemoved = 0;

  for (const file of files) {
    const filePath = path.join(REVIEWS_DIR, file);
    const data: ReviewsData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    let fileRemoved = 0;

    const newReviews: Record<string, ReviewLink[]> = {};
    let newTotal = 0;

    for (const [kindergartenId, reviews] of Object.entries(data.reviews)) {
      const filtered: ReviewLink[] = [];

      for (const review of reviews) {
        if (invalidUrls.has(review.url) || invalidReviewIds.has(review.id)) {
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

  // 결과 요약
  console.log('');
  console.log('=== 적용 결과 ===');
  console.log(`총 제거: ${totalRemoved}건`);
  console.log(`유형별:`);
  console.log(`  WRONG_KINDERGARTEN: ${statusCounts.WRONG_KINDERGARTEN}건`);
  console.log(`  WRONG_TOPIC: ${statusCounts.WRONG_TOPIC}건`);
  console.log(`  LISTING: ${statusCounts.LISTING}건`);
  console.log(`  ADVERTISEMENT: ${statusCounts.ADVERTISEMENT}건`);
  console.log(`  BROKEN: ${statusCounts.BROKEN}건`);

  if (isDryRun) {
    console.log('\n(dry-run 모드: 실제 파일은 수정되지 않음)');
  }
}

main();

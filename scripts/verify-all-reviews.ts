/**
 * 전수검사 스크립트 — 모든 리뷰 데이터를 5가지 기준으로 검증
 *
 * 사용법:
 *   pnpm verify:reviews                     # dry-run (리포트만)
 *   pnpm verify:reviews -- --fix            # 실제 제거 + 재빌드
 *   pnpm verify:reviews -- --sido 11        # 특정 시도만 검사
 *   pnpm verify:reviews -- --verbose        # 제거 대상 전체 출력
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  UNIFIED_SPAM_TITLE_PATTERNS,
  SPAM_SNIPPET_PATTERNS,
  classifyContentType,
  validateLocationMatch,
  type ContentType,
} from '../src/lib/utils/review-utils';

// ============================================================================
// 타입
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
  relevanceScore?: number;
  [key: string]: unknown;
}

interface ReviewsData {
  version: string;
  totalCount: number;
  kindergartenCount: number;
  lastCuratedAt?: string;
  reviews: Record<string, ReviewLink[]>;
}

interface KindergartenEntry {
  kindercode: string;
  name: string;
  address: string;
  sido_code: string;
  sigungu_code: string;
}

interface FlaggedReview {
  file: string;
  id: string;
  kindergartenId: string;
  title: string;
  reasons: string[];
}

interface VerifyStats {
  totalReviews: number;
  flaggedCount: number;
  byReason: Record<string, number>;
  byFile: Record<string, number>;
}

// ============================================================================
// 지역 불일치 패턴 (filter-reviews.ts에서 가져옴)
// ============================================================================

const LOCATION_MISMATCH_PATTERNS: Record<string, RegExp> = {
  '27': /(?:^|\s|[\[\(])대구.*유치원/i,
  '26': /(?:^|\s|[\[\(])부산.*유치원/i,
  '30': /(?:^|\s|[\[\(])대전.*유치원/i,
  '29': /(?:^|\s|[\[\(])광주.*유치원(?!.*경기)/i,
  '31': /(?:^|\s|[\[\(])울산.*유치원/i,
  '36': /(?:^|\s|[\[\(])세종.*유치원/i,
  '43': /(?:^|\s|[\[\(])충북.*유치원/i,
  '44': /(?:^|\s|[\[\(])충남.*유치원/i,
  '45': /(?:^|\s|[\[\(])전북.*유치원/i,
  '46': /(?:^|\s|[\[\(])전남.*유치원/i,
  '47': /(?:^|\s|[\[\(])경북.*유치원/i,
  '48': /(?:^|\s|[\[\(])경남.*유치원/i,
  '42': /(?:^|\s|[\[\(])강원.*유치원/i,
  '50': /(?:^|\s|[\[\(])제주.*유치원/i,
  '28': /(?:^|\s|[\[\(])인천.*유치원/i,
  '11': /(?:^|\s|[\[\(])서울.*유치원/i,
  '41': /(?:^|\s|[\[\(])경기.*유치원/i,
};

// ============================================================================
// 검증 함수
// ============================================================================

function verifyReview(
  review: ReviewLink,
  sidoCode: string,
  kindergartenName: string | undefined
): string[] {
  const reasons: string[] = [];

  // 1. Title 스팸 패턴
  for (const pattern of UNIFIED_SPAM_TITLE_PATTERNS) {
    if (pattern.test(review.title)) {
      reasons.push(`타이틀스팸: ${pattern.toString().substring(0, 40)}`);
      break;
    }
  }

  // 2. Snippet 스팸 패턴
  for (const pattern of SPAM_SNIPPET_PATTERNS) {
    if (pattern.test(review.snippet)) {
      reasons.push(`Snippet스팸: ${pattern.toString().substring(0, 40)}`);
      break;
    }
  }

  // 3. 콘텐츠 유형 분류
  const contentType: ContentType = classifyContentType(review.title, review.snippet);
  if (contentType === 'template') {
    reasons.push(`콘텐츠유형: ${contentType}`);
  }

  // 4. 지역 불일치
  for (const [mismatchSido, pattern] of Object.entries(LOCATION_MISMATCH_PATTERNS)) {
    if (mismatchSido === sidoCode) continue;
    if (pattern.test(review.title)) {
      reasons.push(`지역불일치: ${pattern.toString().substring(0, 40)}`);
      break;
    }
  }

  // 5. 유치원명 존재 여부
  if (kindergartenName) {
    const nameCore = kindergartenName
      .replace(/유치원$/, '')
      .replace(/어린이집$/, '')
      .trim();
    if (nameCore.length >= 2) {
      const text = `${review.title} ${review.snippet}`.toLowerCase();
      if (!text.includes(nameCore.toLowerCase())) {
        reasons.push('유치원명미포함');
      }
    }
  }

  return reasons;
}

// ============================================================================
// 메인
// ============================================================================

function main() {
  const args = process.argv.slice(2);
  const isFix = args.includes('--fix');
  const isVerbose = args.includes('--verbose');
  const sidoIdx = args.indexOf('--sido');
  const targetSido = sidoIdx !== -1 ? args[sidoIdx + 1] : null;

  const REVIEWS_DIR = path.resolve('public/data/reviews');
  const KINDERGARTENS_PATH = path.resolve('public/data/kindergartens.json');

  if (!fs.existsSync(REVIEWS_DIR)) {
    console.error('ERROR: public/data/reviews/ 디렉토리 없음');
    process.exit(1);
  }

  // 유치원 데이터 로드
  const kindergartenMap = new Map<string, KindergartenEntry>();
  if (fs.existsSync(KINDERGARTENS_PATH)) {
    const kindergartens: KindergartenEntry[] = JSON.parse(
      fs.readFileSync(KINDERGARTENS_PATH, 'utf-8')
    );
    for (const k of kindergartens) {
      kindergartenMap.set(k.kindercode, k);
    }
    console.log(`유치원 데이터 로드: ${kindergartenMap.size}개`);
  }

  // 대상 sigungu 파일 수집
  const files: string[] = [];
  const sidoDirs = targetSido ? [targetSido] : fs.readdirSync(REVIEWS_DIR).filter(d => {
    const p = path.join(REVIEWS_DIR, d);
    return fs.statSync(p).isDirectory();
  });

  for (const sido of sidoDirs) {
    const dir = path.join(REVIEWS_DIR, sido);
    if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) continue;
    const subFiles = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
    files.push(...subFiles.map(f => `${sido}/${f}`));
  }

  console.log(`\n=== 전수검사 시작 ===`);
  console.log(`모드: ${isFix ? '수정 (--fix)' : '리포트만 (dry-run)'}`);
  console.log(`대상: ${files.length}개 sigungu 파일`);
  if (targetSido) console.log(`시도 필터: ${targetSido}`);
  console.log('');

  const stats: VerifyStats = {
    totalReviews: 0,
    flaggedCount: 0,
    byReason: {},
    byFile: {},
  };

  const allFlagged: FlaggedReview[] = [];
  let totalFixed = 0;

  for (const file of files) {
    const filePath = path.join(REVIEWS_DIR, file);
    const data: ReviewsData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const sidoCode = file.split('/')[0];

    const fileFlagged: FlaggedReview[] = [];
    const cleanReviews: Record<string, ReviewLink[]> = {};
    let cleanTotal = 0;

    for (const [kId, reviews] of Object.entries(data.reviews)) {
      const kInfo = kindergartenMap.get(kId);
      const kName = kInfo?.name;
      const clean: ReviewLink[] = [];

      for (const review of reviews) {
        stats.totalReviews++;
        const reasons = verifyReview(review, sidoCode, kName);

        if (reasons.length > 0) {
          // "유치원명미포함"만 단독이면 플래그하지 않음 (낮은 신뢰도)
          const significantReasons = reasons.filter(r => r !== '유치원명미포함');
          if (significantReasons.length > 0) {
            fileFlagged.push({
              file,
              id: review.id,
              kindergartenId: kId,
              title: review.title.substring(0, 60),
              reasons,
            });
            for (const r of reasons) {
              const key = r.split(':')[0];
              stats.byReason[key] = (stats.byReason[key] || 0) + 1;
            }
          } else {
            clean.push(review);
            cleanTotal++;
          }
        } else {
          clean.push(review);
          cleanTotal++;
        }
      }

      if (clean.length > 0) {
        cleanReviews[kId] = clean;
      }
    }

    if (fileFlagged.length > 0) {
      stats.byFile[file] = fileFlagged.length;
      stats.flaggedCount += fileFlagged.length;
      allFlagged.push(...fileFlagged);

      console.log(`[${file}] ${data.totalCount}건 중 ${fileFlagged.length}건 플래그`);

      if (isVerbose) {
        for (const f of fileFlagged.slice(0, 10)) {
          console.log(`  [${f.id}] "${f.title}" → ${f.reasons.join(', ')}`);
        }
        if (fileFlagged.length > 10) {
          console.log(`  ... 외 ${fileFlagged.length - 10}건`);
        }
      }

      // --fix 모드: 파일 수정
      if (isFix) {
        const newData: ReviewsData = {
          version: new Date().toISOString().split('T')[0],
          totalCount: cleanTotal,
          kindergartenCount: Object.keys(cleanReviews).length,
          lastCuratedAt: new Date().toISOString(),
          reviews: cleanReviews,
        };
        fs.writeFileSync(filePath, JSON.stringify(newData, null, 2));
        totalFixed += fileFlagged.length;
      }
    }
  }

  // 결과 요약
  console.log('\n=== 전수검사 결과 ===');
  console.log(`총 리뷰: ${stats.totalReviews}건`);
  console.log(`플래그: ${stats.flaggedCount}건 (${(stats.flaggedCount / stats.totalReviews * 100).toFixed(1)}%)`);

  if (stats.flaggedCount > 0) {
    console.log('\n--- 사유별 분류 ---');
    const sortedReasons = Object.entries(stats.byReason).sort((a, b) => b[1] - a[1]);
    for (const [reason, count] of sortedReasons) {
      console.log(`  ${reason}: ${count}건`);
    }

    console.log('\n--- 파일별 분류 (상위 20) ---');
    const sortedFiles = Object.entries(stats.byFile).sort((a, b) => b[1] - a[1]).slice(0, 20);
    for (const [file, count] of sortedFiles) {
      console.log(`  ${file}: ${count}건`);
    }
  }

  if (isFix) {
    console.log(`\n제거 완료: ${totalFixed}건`);
    console.log('sido 파일 재빌드가 필요합니다: pnpm rebuild:reviews');
  } else {
    console.log('\n(dry-run 모드: --fix 옵션으로 실제 제거)');
  }

  // 리포트 파일 저장
  const reportPath = path.resolve('scripts/data-output', `verify-report-${new Date().toISOString().split('T')[0]}.json`);
  const reportDir = path.dirname(reportPath);
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }
  fs.writeFileSync(reportPath, JSON.stringify({
    date: new Date().toISOString(),
    stats,
    flagged: allFlagged,
  }, null, 2));
  console.log(`\n리포트 저장: ${reportPath}`);
}

main();

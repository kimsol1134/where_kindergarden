/**
 * Jina Reader API를 사용한 리뷰 본문 추출 스크립트
 *
 * 리뷰 URL의 전체 본문을 마크다운 형식으로 추출하여 로컬에 저장.
 * 이후 review-validator 서브에이전트가 본문을 검증.
 *
 * Jina Reader API: https://r.jina.ai/{url} → 마크다운 텍스트 반환
 * - 무료 1,000 req/day (인증 없이)
 * - JS 렌더링 지원
 *
 * 사용법:
 *   pnpm fetch:review-content -- --sido 28                    # 인천 전체
 *   pnpm fetch:review-content -- --sido 28 --limit 50         # 50개만
 *   pnpm fetch:review-content -- --sido 28 --dry-run          # 미리보기
 *   pnpm fetch:review-content -- --sido 28 --force            # 이미 추출된 URL도 재추출
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

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
  reviews: Record<string, ReviewLink[]>;
}

interface FetchedContent {
  url: string;
  urlHash: string;
  kindergartenId: string;
  kindergartenName: string;
  reviewId: string;
  content: string | null;
  contentLength: number;
  fetchedAt: string;
  status: 'success' | 'empty' | 'error';
  error: string | null;
}

interface FetchStats {
  total: number;
  skipped: number;
  success: number;
  empty: number;
  error: number;
}

// ============================================================================
// 유틸리티
// ============================================================================

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function hashUrl(url: string): string {
  return crypto.createHash('md5').update(url).digest('hex').substring(0, 12);
}

function loadKindergartenNames(): Map<string, string> {
  const names = new Map<string, string>();

  // kindergartens.json에서 이름 로드
  const kindergartensPath = path.resolve('public/data/kindergartens.json');
  if (fs.existsSync(kindergartensPath)) {
    const data: Array<{ kindercode: string; name: string }> = JSON.parse(
      fs.readFileSync(kindergartensPath, 'utf-8')
    );
    for (const k of data) {
      names.set(k.kindercode, k.name);
    }
  }

  return names;
}

// ============================================================================
// Jina Reader API
// ============================================================================

async function fetchContentViaJina(url: string): Promise<{ content: string | null; error: string | null }> {
  const jinaUrl = `https://r.jina.ai/${url}`;

  try {
    const response = await fetch(jinaUrl, {
      headers: {
        'Accept': 'text/markdown',
        'X-No-Cache': 'true',
      },
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      return { content: null, error: `HTTP ${response.status}` };
    }

    const content = await response.text();

    if (!content || content.trim().length < 50) {
      return { content: null, error: 'Content too short' };
    }

    // 본문을 적절한 길이로 자르기 (10KB 이하로)
    const trimmed = content.length > 10000 ? content.substring(0, 10000) : content;

    return { content: trimmed, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { content: null, error: message };
  }
}

// ============================================================================
// 메인 로직
// ============================================================================

function collectReviewUrls(
  reviewsDir: string,
  sidoCode: string
): Array<{ url: string; kindergartenId: string; reviewId: string }> {
  const results: Array<{ url: string; kindergartenId: string; reviewId: string }> = [];
  const mainFile = path.join(reviewsDir, `${sidoCode}.json`);

  if (!fs.existsSync(mainFile)) {
    console.error(`ERROR: ${mainFile} 파일 없음`);
    process.exit(1);
  }

  const data: ReviewsData = JSON.parse(fs.readFileSync(mainFile, 'utf-8'));

  for (const [kindergartenId, reviews] of Object.entries(data.reviews)) {
    for (const review of reviews) {
      results.push({
        url: review.url,
        kindergartenId,
        reviewId: review.id,
      });
    }
  }

  return results;
}

async function main() {
  const args = process.argv.slice(2);
  const sidoIdx = args.indexOf('--sido');
  const sidoCode = sidoIdx !== -1 ? args[sidoIdx + 1] : null;
  const limitIdx = args.indexOf('--limit');
  const limit = limitIdx !== -1 ? parseInt(args[limitIdx + 1], 10) : null;
  const isDryRun = args.includes('--dry-run');
  const force = args.includes('--force');

  if (!sidoCode) {
    console.error('ERROR: --sido 인자가 필요합니다.');
    console.error('사용법: pnpm fetch:review-content -- --sido 28');
    process.exit(1);
  }

  const REVIEWS_DIR = path.resolve('public/data/reviews');
  const OUTPUT_DIR = path.resolve('scripts/data-output/review-contents', sidoCode);

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  console.log('=== Jina Reader API 본문 추출 ===');
  console.log(`시도: ${sidoCode}`);
  if (limit) console.log(`제한: ${limit}개`);
  console.log(`모드: ${isDryRun ? 'dry-run' : '실제 추출'}`);
  console.log(`강제 재추출: ${force ? 'ON' : 'OFF'}`);
  console.log(`출력: ${OUTPUT_DIR}`);
  console.log('');

  // 1. 유치원명 로드
  const kindergartenNames = loadKindergartenNames();

  // 2. URL 목록 수집
  const reviewUrls = collectReviewUrls(REVIEWS_DIR, sidoCode);
  console.log(`총 URL: ${reviewUrls.length}개`);

  // 3. 이미 추출된 URL 확인
  const existingHashes = new Set<string>();
  if (!force && fs.existsSync(OUTPUT_DIR)) {
    const existingFiles = fs.readdirSync(OUTPUT_DIR).filter(f => f.endsWith('.json'));
    for (const f of existingFiles) {
      existingHashes.add(f.replace('.json', ''));
    }
  }

  // 4. 대상 필터링
  let targets = reviewUrls.filter(r => !existingHashes.has(hashUrl(r.url)));
  console.log(`이미 추출됨: ${reviewUrls.length - targets.length}개 (스킵)`);
  console.log(`추출 대상: ${targets.length}개`);

  if (limit && targets.length > limit) {
    targets = targets.slice(0, limit);
    console.log(`제한 적용: ${targets.length}개`);
  }

  if (isDryRun) {
    console.log('\n(dry-run 모드: 실제 API 호출 없음)');
    console.log(`추출될 URL ${targets.length}개:`);
    for (const t of targets.slice(0, 10)) {
      console.log(`  ${t.url}`);
    }
    if (targets.length > 10) console.log(`  ... 외 ${targets.length - 10}개`);
    return;
  }

  console.log('');

  // 5. 본문 추출
  const stats: FetchStats = { total: targets.length, skipped: 0, success: 0, empty: 0, error: 0 };

  for (let i = 0; i < targets.length; i++) {
    const target = targets[i];
    const urlHash = hashUrl(target.url);
    const kindergartenName = kindergartenNames.get(target.kindergartenId) ?? 'Unknown';

    if (i % 10 === 0) {
      const pct = ((i / targets.length) * 100).toFixed(1);
      console.log(`진행: ${i}/${targets.length} (${pct}%) - 성공: ${stats.success}, 실패: ${stats.error}`);
    }

    const { content, error } = await fetchContentViaJina(target.url);

    const result: FetchedContent = {
      url: target.url,
      urlHash,
      kindergartenId: target.kindergartenId,
      kindergartenName,
      reviewId: target.reviewId,
      content,
      contentLength: content?.length ?? 0,
      fetchedAt: new Date().toISOString(),
      status: content ? 'success' : error ? 'error' : 'empty',
      error,
    };

    if (content) {
      stats.success++;
    } else if (error) {
      stats.error++;
    } else {
      stats.empty++;
    }

    // 개별 파일로 저장
    const outputPath = path.join(OUTPUT_DIR, `${urlHash}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));

    // Rate limiting: 500ms 간격
    await delay(500);
  }

  // 6. 결과 요약
  console.log('');
  console.log('=== 추출 결과 ===');
  console.log(`총 대상: ${stats.total}개`);
  console.log(`성공: ${stats.success}개`);
  console.log(`빈 콘텐츠: ${stats.empty}개`);
  console.log(`에러: ${stats.error}개`);
  console.log(`출력 디렉토리: ${OUTPUT_DIR}`);
}

main().catch((err) => {
  console.error('본문 추출 중 오류:', err);
  process.exit(1);
});

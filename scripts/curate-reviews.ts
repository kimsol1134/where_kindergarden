/**
 * 수집된 후기 데이터를 정리하여 public/data/reviews.json으로 변환
 *
 * 사용법:
 *   pnpm curate:reviews                              # 가장 최근 raw 파일 사용
 *   pnpm curate:reviews -- --input reviews-raw-2025-01-20.json  # 특정 파일 지정
 */

import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// 타입 정의
// ============================================================================

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
}

interface ReviewLink {
  id: string;
  kindergartenId: string;
  title: string;
  url: string;
  source: 'naver_blog' | 'naver_cafe' | 'google' | 'other';
  sourceName: string;
  snippet: string;
  date: string | null;
  collectedAt: string;
}

interface ReviewsData {
  version: string;
  totalCount: number;
  kindergartenCount: number;
  reviews: Record<string, ReviewLink[]>;
}

// ============================================================================
// 메인 실행
// ============================================================================

function main() {
  const args = process.argv.slice(2);
  const inputIdx = args.indexOf('--input');

  const outputDir = path.resolve('scripts/data-output');
  let inputPath: string;

  if (inputIdx !== -1 && args[inputIdx + 1]) {
    const inputFile = args[inputIdx + 1];
    inputPath = path.resolve(outputDir, inputFile);
  } else {
    // 가장 최근 reviews-raw 파일 자동 검색
    if (!fs.existsSync(outputDir)) {
      console.error('ERROR: scripts/data-output/ 디렉토리를 찾을 수 없습니다.');
      console.error('먼저 pnpm collect:reviews를 실행하세요.');
      process.exit(1);
    }

    const rawFiles = fs
      .readdirSync(outputDir)
      .filter((f) => f.startsWith('reviews-raw-') && f.endsWith('.json'))
      .sort()
      .reverse();

    if (rawFiles.length === 0) {
      console.error('ERROR: reviews-raw-*.json 파일을 찾을 수 없습니다.');
      console.error('먼저 pnpm collect:reviews를 실행하세요.');
      process.exit(1);
    }

    inputPath = path.resolve(outputDir, rawFiles[0]);
  }

  console.log('=== 후기 데이터 큐레이션 ===');
  console.log(`입력: ${inputPath}`);

  if (!fs.existsSync(inputPath)) {
    console.error(`ERROR: 파일을 찾을 수 없습니다: ${inputPath}`);
    process.exit(1);
  }

  const rawData: RawReviewLink[] = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));
  console.log(`원본 데이터: ${rawData.length}건`);

  // URL 중복 제거
  const seenUrls = new Set<string>();
  const deduplicated = rawData.filter((item) => {
    if (seenUrls.has(item.url)) return false;
    seenUrls.add(item.url);
    return true;
  });
  console.log(`중복 제거 후: ${deduplicated.length}건`);

  // kindergartenId별 그룹핑 + ID 부여
  const reviews: Record<string, ReviewLink[]> = {};
  let idCounter = 1;

  for (const raw of deduplicated) {
    const review: ReviewLink = {
      id: `rev-${String(idCounter++).padStart(4, '0')}`,
      kindergartenId: raw.kindergartenId,
      title: raw.title,
      url: raw.url,
      source: raw.source,
      sourceName: raw.sourceName,
      snippet: raw.snippet,
      date: raw.date,
      collectedAt: raw.collectedAt,
    };

    if (!reviews[raw.kindergartenId]) {
      reviews[raw.kindergartenId] = [];
    }
    reviews[raw.kindergartenId].push(review);
  }

  const kindergartenCount = Object.keys(reviews).length;
  const today = new Date().toISOString().split('T')[0];

  const output: ReviewsData = {
    version: today,
    totalCount: deduplicated.length,
    kindergartenCount,
    reviews,
  };

  // public/data/reviews.json에 저장
  const outputPath = path.resolve('public/data/reviews.json');
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf-8');

  console.log('');
  console.log(`출력: ${outputPath}`);
  console.log(`유치원 수: ${kindergartenCount}개`);
  console.log(`총 후기 수: ${deduplicated.length}건`);
  console.log(`버전: ${today}`);
  console.log('');
  console.log('큐레이션 완료!');
}

main();

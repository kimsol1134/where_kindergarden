/**
 * reviews.json 전체 재빌드 스크립트
 *
 * public/data/reviews/ 내 모든 {sido}.json 파일을 읽어
 * reviews.json에 통합된 데이터를 생성합니다.
 *
 * 사용법:
 *   pnpm tsx scripts/rebuild-reviews-json.ts
 *   pnpm tsx scripts/rebuild-reviews-json.ts --dry-run
 */

import * as fs from 'fs';
import * as path from 'path';

interface ReviewLink {
  id: string;
  kindergartenId: string;
  title: string;
  url: string;
  source:
    | 'studyholic'
    | 'learns'
    | 'naver_blog'
    | 'naver_cafe'
    | 'google'
    | 'naver_place'
    | 'starteacher'
    | 'other';
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
  reviews: Record<string, ReviewLink[]>;
}

function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');

  const REVIEWS_DIR = path.resolve('public/data/reviews');
  const OUTPUT_PATH = path.resolve('public/data/reviews.json');

  if (!fs.existsSync(REVIEWS_DIR)) {
    console.error('ERROR: public/data/reviews/ 디렉토리를 찾을 수 없습니다.');
    process.exit(1);
  }

  console.log('=== reviews.json 재빌드 ===');
  console.log(`모드: ${isDryRun ? '미리보기 (dry-run)' : '실제 수정'}`);
  console.log('');

  // 모든 시도 JSON 파일 찾기 (숫자로 시작하는 2자리 파일만)
  const regionFiles = fs.readdirSync(REVIEWS_DIR)
    .filter(f => /^\d{2}\.json$/.test(f))
    .toSorted();

  const allReviews: Record<string, ReviewLink[]> = {};
  let totalCount = 0;
  let totalDupes = 0;

  for (const file of regionFiles) {
    const filePath = path.join(REVIEWS_DIR, file);
    const data: ReviewsData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const sidoCode = file.replace('.json', '');

    let regionCount = 0;
    let regionDupes = 0;

    if (!data.reviews) {
      console.log(`  ${sidoCode}: reviews 키 없음, 건너뜀`);
      continue;
    }

    for (const [kid, reviews] of Object.entries(data.reviews)) {
      if (!allReviews[kid]) {
        allReviews[kid] = [];
      }
      // 중복 키: naver_place는 같은 URL을 공유하므로 ID로 구분, 그 외는 URL 기반
      const buildKey = (r: ReviewLink): string => {
        if (r.source === 'naver_place' || r.source === 'starteacher') {
          return r.id;
        }
        return r.url.replace(/^https?:\/\//, '').replace(/\/$/, '');
      };
      const existingKeys = new Set(allReviews[kid].map(buildKey));
      for (const review of reviews) {
        const key = buildKey(review);
        if (!existingKeys.has(key)) {
          existingKeys.add(key);
          allReviews[kid].push(review);
          regionCount++;
          totalCount++;
        } else {
          regionDupes++;
          totalDupes++;
        }
      }
    }

    const kindergartenCount = Object.keys(data.reviews).length;
    console.log(`  ${sidoCode}: ${regionCount}건 (유치원 ${kindergartenCount}개)${regionDupes > 0 ? `, 중복 ${regionDupes}건 제거` : ''}`);
  }

  // 빈 배열 정리
  for (const kid of Object.keys(allReviews)) {
    if (allReviews[kid].length === 0) {
      delete allReviews[kid];
    }
  }

  const kindergartenCount = Object.keys(allReviews).length;

  console.log('');
  console.log('=== 결과 ===');
  console.log(`지역 파일: ${regionFiles.length}개`);
  console.log(`총 리뷰: ${totalCount}건`);
  console.log(`총 유치원: ${kindergartenCount}개`);
  if (totalDupes > 0) {
    console.log(`중복 제거: ${totalDupes}건`);
  }

  if (!isDryRun) {
    const output: ReviewsData = {
      version: new Date().toISOString().split('T')[0],
      totalCount,
      kindergartenCount,
      reviews: allReviews,
    };

    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2));
    const fileSize = (fs.statSync(OUTPUT_PATH).size / 1024 / 1024).toFixed(1);
    console.log(`\n저장 완료: ${OUTPUT_PATH} (${fileSize}MB)`);
  } else {
    console.log('\n(dry-run 모드: 실제 파일은 수정되지 않음)');
  }
}

main();

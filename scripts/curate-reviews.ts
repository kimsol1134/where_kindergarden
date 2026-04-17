/**
 * 수집된 후기 데이터를 정리하여 public/data/reviews.json으로 변환
 *
 * 사용법:
 *   pnpm curate:reviews                              # scripts/data-output 의 raw 파일 모두 반영
 *   pnpm curate:reviews -- --input reviews-raw-2025-01-20.json  # 특정 파일만 반영
 */

import * as fs from 'fs';
import * as path from 'path';
import type { ReviewsData } from '../src/types/review';
import {
  buildKindergartenSidoMap,
  collectGlobalNormalizedUrls,
  mergeRawReviewsIntoRegionData,
  mergeRegionIntoCombinedReviews,
  readJsonFile,
  writeJsonFile,
  type KindergartenInfo,
  type RawReviewLink,
} from './lib/review-curation';

function getArgValue(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag);
  if (index === -1 || !args[index + 1]) {
    return undefined;
  }

  return args[index + 1];
}

function loadRawReviews(filePath: string): RawReviewLink[] {
  const rawJson = readJsonFile<RawReviewLink[] | { reviews?: RawReviewLink[] }>(
    filePath
  );

  if (Array.isArray(rawJson)) {
    return rawJson;
  }

  return rawJson.reviews ?? [];
}

function main(): void {
  const args = process.argv.slice(2).filter(
    (arg, index) => !(index === 0 && arg === '--')
  );
  const outputDir = path.resolve('scripts/data-output');
  const explicitInput = getArgValue(args, '--input');

  if (!fs.existsSync(outputDir)) {
    console.error('ERROR: scripts/data-output/ 디렉토리를 찾을 수 없습니다.');
    process.exit(1);
  }

  const rawFiles = explicitInput
    ? [explicitInput]
    : fs
        .readdirSync(outputDir)
        .filter((fileName) => fileName.startsWith('reviews-raw-') && fileName.endsWith('.json'))
        .toSorted();

  if (rawFiles.length === 0) {
    console.error('ERROR: reviews-raw-*.json 파일을 찾을 수 없습니다.');
    process.exit(1);
  }

  const kindergartensPath = path.resolve('public/data/kindergartens.json');
  if (!fs.existsSync(kindergartensPath)) {
    console.error('ERROR: public/data/kindergartens.json 파일을 찾을 수 없습니다.');
    process.exit(1);
  }

  const kindergartens = readJsonFile<KindergartenInfo[]>(kindergartensPath);
  const kindergartenSidoMap = buildKindergartenSidoMap(kindergartens);
  const publicReviewsDir = path.resolve('public/data/reviews');

  if (!fs.existsSync(publicReviewsDir)) {
    fs.mkdirSync(publicReviewsDir, { recursive: true });
  }

  const processedBySido = new Map<string, ReviewsData>();
  let combinedData: ReviewsData = {
    version: new Date().toISOString().split('T')[0],
    totalCount: 0,
    kindergartenCount: 0,
    reviews: {},
  };
  const combinedUrls = collectGlobalNormalizedUrls(combinedData.reviews);

  console.log('=== 후기 데이터 큐레이션 ===');
  console.log(`발견된 파일: ${rawFiles.length}개`);
  console.log(`유치원 데이터 로드 완료: ${kindergartens.length}개`);

  for (const rawFileName of rawFiles) {
    const rawFilePath = path.resolve(outputDir, rawFileName);
    const rawReviews = loadRawReviews(rawFilePath);

    console.log(`처리 중: ${rawFileName} (${rawReviews.length}건)`);

    const bySido = new Map<string, RawReviewLink[]>();
    for (const rawReview of rawReviews) {
      const sidoCode = kindergartenSidoMap.get(rawReview.kindergartenId) ?? 'unknown';
      const bucket = bySido.get(sidoCode) ?? [];
      bucket.push(rawReview);
      bySido.set(sidoCode, bucket);
    }

    for (const [sidoCode, reviews] of bySido.entries()) {
      const regionData =
        processedBySido.get(sidoCode) ?? {
          version: new Date().toISOString().split('T')[0],
          totalCount: 0,
          kindergartenCount: 0,
          reviews: {},
        };

      const mergeResult = mergeRawReviewsIntoRegionData(regionData, reviews, {
        existingGlobalNormalizedUrls: combinedUrls,
        filterSpam: true,
      });

      processedBySido.set(sidoCode, mergeResult.data);
      combinedData = mergeRegionIntoCombinedReviews(combinedData, mergeResult.data);

      console.log(
        `  [${sidoCode}] +${mergeResult.addedCount} added, ${mergeResult.duplicateCount} duplicates, ${mergeResult.rejectedCount} rejected`
      );
    }
  }

  combinedData.version = new Date().toISOString().split('T')[0];
  writeJsonFile(path.resolve('public/data/reviews.json'), combinedData);
  console.log(
    `\n[통합] public/data/reviews.json: ${combinedData.totalCount}건 (유치원 ${combinedData.kindergartenCount}개)`
  );

  for (const [sidoCode, data] of processedBySido.entries()) {
    const outputPath = path.join(publicReviewsDir, `${sidoCode}.json`);
    writeJsonFile(outputPath, data);
    console.log(`[${sidoCode}] ${outputPath}: ${data.totalCount}건`);
  }

  console.log('\n큐레이션 완료!');
}

main();

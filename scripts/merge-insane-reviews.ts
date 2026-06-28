/**
 * insane-search 수집 결과를 기존 지역 리뷰 데이터에 병합합니다.
 *
 * 사용법:
 *   npm run merge:insane-reviews -- --sido 11 --sido 28 --sido 41
 *   npm run merge:insane-reviews -- --input insane-reviews-2026-06-26-28-batch-0.json --dry-run
 */

import * as fs from 'fs';
import * as path from 'path';
import type { ReviewsData } from '../src/types/review';
import {
  buildKindergartenSidoMap,
  collectGlobalNormalizedUrls,
  mergeRawReviewsIntoRegionData,
  readJsonFile,
  writeJsonFile,
  type KindergartenInfo,
  type RawReviewLink,
} from './lib/review-curation';

interface InsaneReviewOutput {
  reviews?: RawReviewLink[];
}

interface Args {
  inputs: string[];
  sidos: string[];
  dryRun: boolean;
}

function getAllValues(args: string[], flag: string): string[] {
  const values: string[] = [];
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === flag && args[index + 1]) {
      values.push(args[index + 1]);
      index += 1;
    }
  }
  return values;
}

function parseArgs(): Args {
  const args = process.argv.slice(2);
  return {
    inputs: getAllValues(args, '--input'),
    sidos: getAllValues(args, '--sido'),
    dryRun: args.includes('--dry-run'),
  };
}

function listInputFiles(inputs: string[], sidos: string[]): string[] {
  const outputDir = path.resolve('scripts/data-output');
  if (inputs.length > 0) {
    return inputs.map((input) => path.resolve(input));
  }

  const sidoSet = new Set(sidos);
  return fs
    .readdirSync(outputDir)
    .filter((fileName) => {
      if (!fileName.startsWith('insane-reviews-') || !fileName.endsWith('.json')) {
        return false;
      }
      if (sidoSet.size === 0) {
        return true;
      }
      return [...sidoSet].some((sido) => fileName.includes(`-${sido}`));
    })
    .toSorted()
    .map((fileName) => path.join(outputDir, fileName));
}

function loadReviews(filePath: string): RawReviewLink[] {
  const parsed = readJsonFile<InsaneReviewOutput>(filePath);
  return parsed.reviews ?? [];
}

function rebuildCombinedReviews(): ReviewsData {
  const reviewsDir = path.resolve('public/data/reviews');
  const regionFiles = fs
    .readdirSync(reviewsDir)
    .filter((fileName) => /^\d{2}\.json$/.test(fileName))
    .toSorted();

  const combined: Record<string, ReviewsData['reviews'][string]> = {};
  const globalUrls = new Set<string>();

  for (const fileName of regionFiles) {
    const regionData = readJsonFile<ReviewsData>(path.join(reviewsDir, fileName));
    for (const [kindergartenId, reviews] of Object.entries(regionData.reviews)) {
      const bucket = combined[kindergartenId] ?? [];
      for (const review of reviews) {
        const duplicateKey =
          review.source === 'naver_place' || review.source === 'starteacher'
            ? review.id
            : review.url.replace(/^https?:\/\//, '').replace(/\/$/, '');
        if (globalUrls.has(duplicateKey)) {
          continue;
        }
        globalUrls.add(duplicateKey);
        bucket.push(review);
      }
      if (bucket.length > 0) {
        combined[kindergartenId] = bucket;
      }
    }
  }

  const totalCount = Object.values(combined).reduce(
    (total, reviews) => total + reviews.length,
    0
  );

  return {
    version: new Date().toISOString().split('T')[0],
    totalCount,
    kindergartenCount: Object.keys(combined).length,
    reviews: combined,
  };
}

function main(): void {
  const args = parseArgs();
  const files = listInputFiles(args.inputs, args.sidos);

  if (files.length === 0) {
    console.error('ERROR: 병합할 insane-reviews-*.json 파일을 찾지 못했습니다.');
    process.exit(1);
  }

  const kindergartens = readJsonFile<KindergartenInfo[]>(
    path.resolve('public/data/kindergartens.json')
  );
  const kindergartenSidoMap = buildKindergartenSidoMap(kindergartens);
  const bySido = new Map<string, RawReviewLink[]>();

  for (const filePath of files) {
    const reviews = loadReviews(filePath);
    console.log(`${path.basename(filePath)}: ${reviews.length}건`);
    for (const review of reviews) {
      const sido = kindergartenSidoMap.get(review.kindergartenId);
      if (!sido) {
        continue;
      }
      const bucket = bySido.get(sido) ?? [];
      bucket.push(review);
      bySido.set(sido, bucket);
    }
  }

  const globalUrls = collectGlobalNormalizedUrls(
    readJsonFile<ReviewsData>(path.resolve('public/data/reviews.json')).reviews
  );

  let totalAdded = 0;
  let totalDuplicates = 0;
  let totalRejected = 0;

  for (const [sido, reviews] of bySido.entries()) {
    const reviewsPath = path.resolve(`public/data/reviews/${sido}.json`);
    const regionData = fs.existsSync(reviewsPath)
      ? readJsonFile<ReviewsData>(reviewsPath)
      : { version: new Date().toISOString().split('T')[0], totalCount: 0, kindergartenCount: 0, reviews: {} };
    const merged = mergeRawReviewsIntoRegionData(regionData, reviews, {
      existingGlobalNormalizedUrls: globalUrls,
      filterSpam: true,
    });

    totalAdded += merged.addedCount;
    totalDuplicates += merged.duplicateCount;
    totalRejected += merged.rejectedCount;

    console.log(
      `[${sido}] input ${reviews.length}, added ${merged.addedCount}, duplicates ${merged.duplicateCount}, rejected ${merged.rejectedCount}`
    );

    if (!args.dryRun) {
      writeJsonFile(reviewsPath, merged.data);
    }
  }

  if (!args.dryRun) {
    writeJsonFile(path.resolve('public/data/reviews.json'), rebuildCombinedReviews());
  }

  console.log(
    `완료: added ${totalAdded}, duplicates ${totalDuplicates}, rejected ${totalRejected}${args.dryRun ? ' (dry-run)' : ''}`
  );
}

main();

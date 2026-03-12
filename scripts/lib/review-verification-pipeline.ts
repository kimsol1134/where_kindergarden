import * as fs from 'fs';
import * as path from 'path';
import type {
  ReviewLink,
  ReviewsData,
  ReviewVerificationRecord,
} from '../../src/types/review';
import { buildKindergartenCoreName } from '../../src/lib/utils/review-verification';

export interface KindergartenEntry {
  kindercode: string;
  name: string;
  address: string;
  sido_code: string;
  sigungu_code: string;
}

export interface LoadedReviewEntry {
  review: ReviewLink;
  kindergarten: KindergartenEntry;
  sidoCode: string;
}

export function parseSidoCodes(
  value: string | undefined,
  fallback: string[] = ['11', '41']
): string[] {
  if (!value) {
    return fallback;
  }

  return value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

export function buildSidoTag(sidos: string[]): string {
  return sidos.toSorted().join('-');
}

export function ensureDirectory(directoryPath: string): void {
  if (!fs.existsSync(directoryPath)) {
    fs.mkdirSync(directoryPath, { recursive: true });
  }
}

export function readJsonFile<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T;
}

export function writeJsonFile(filePath: string, value: unknown): void {
  ensureDirectory(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
}

export function loadKindergartens(
  filePath = path.resolve('public/data/kindergartens.json')
): KindergartenEntry[] {
  return readJsonFile<KindergartenEntry[]>(filePath);
}

export function buildKindergartenMap(
  kindergartens: KindergartenEntry[]
): Map<string, KindergartenEntry> {
  return new Map(
    kindergartens.map((kindergarten) => [kindergarten.kindercode, kindergarten])
  );
}

export function buildCoreNameFrequencyMap(
  kindergartens: KindergartenEntry[]
): Map<string, number> {
  const frequencies = new Map<string, number>();

  for (const kindergarten of kindergartens) {
    const coreName = buildKindergartenCoreName(kindergarten.name);
    const current = frequencies.get(coreName) ?? 0;
    frequencies.set(coreName, current + 1);
  }

  return frequencies;
}

export function loadReviewsData(
  sidoCode: string,
  baseDir = path.resolve('public/data/reviews')
): ReviewsData {
  return readJsonFile<ReviewsData>(path.join(baseDir, `${sidoCode}.json`));
}

export function loadTargetReviewEntries(
  sidos: string[],
  kindergartens: KindergartenEntry[]
): LoadedReviewEntry[] {
  const kindergartenMap = buildKindergartenMap(kindergartens);
  const entries: LoadedReviewEntry[] = [];

  for (const sidoCode of sidos) {
    const data = loadReviewsData(sidoCode);

    for (const [kindergartenId, reviews] of Object.entries(data.reviews)) {
      const kindergarten = kindergartenMap.get(kindergartenId);
      if (!kindergarten) {
        continue;
      }

      for (const review of reviews) {
        entries.push({
          review,
          kindergarten,
          sidoCode,
        });
      }
    }
  }

  return entries;
}

export function summarizeRecords(
  records: ReviewVerificationRecord[]
): Record<string, number> {
  return records.reduce<Record<string, number>>((accumulator, record) => {
    const finalStatus = record.finalStatus ?? record.metadata.preliminaryStatus;
    accumulator[finalStatus] = (accumulator[finalStatus] ?? 0) + 1;
    return accumulator;
  }, {});
}

export function rebuildCombinedReviews(
  reviewsDir = path.resolve('public/data/reviews')
): ReviewsData {
  const regionFiles = fs
    .readdirSync(reviewsDir)
    .filter((fileName) => /^\d{2}\.json$/.test(fileName))
    .toSorted();

  const mergedReviews: Record<string, ReviewLink[]> = {};
  let totalCount = 0;

  for (const fileName of regionFiles) {
    const data = readJsonFile<ReviewsData>(path.join(reviewsDir, fileName));
    for (const [kindergartenId, reviews] of Object.entries(data.reviews)) {
      const bucket = mergedReviews[kindergartenId] ?? [];
      const existingUrls = new Set(bucket.map((review) => review.url));

      for (const review of reviews) {
        if (existingUrls.has(review.url)) {
          continue;
        }

        existingUrls.add(review.url);
        bucket.push(review);
        totalCount += 1;
      }

      if (bucket.length > 0) {
        mergedReviews[kindergartenId] = bucket;
      }
    }
  }

  return {
    version: new Date().toISOString().split('T')[0],
    totalCount,
    kindergartenCount: Object.keys(mergedReviews).length,
    reviews: mergedReviews,
  };
}

export function writeCombinedReviews(
  outputPath = path.resolve('public/data/reviews.json')
): ReviewsData {
  const combined = rebuildCombinedReviews();
  writeJsonFile(outputPath, combined);
  return combined;
}

export function splitReviewsBySigungu(
  sidoCode: string,
  regionData: ReviewsData,
  kindergartens: KindergartenEntry[],
  outputBaseDir = path.resolve('public/data/reviews')
): Record<string, ReviewsData> {
  const idToSigungu = new Map<string, string>();
  for (const kindergarten of kindergartens) {
    if (kindergarten.sido_code === sidoCode) {
      idToSigungu.set(kindergarten.kindercode, kindergarten.sigungu_code);
    }
  }

  const splitData = new Map<string, Record<string, ReviewLink[]>>();

  for (const [kindergartenId, reviews] of Object.entries(regionData.reviews)) {
    const sigunguCode = idToSigungu.get(kindergartenId);
    if (!sigunguCode) {
      continue;
    }

    const bucket = splitData.get(sigunguCode) ?? {};
    bucket[kindergartenId] = reviews;
    splitData.set(sigunguCode, bucket);
  }

  const outputDir = path.join(outputBaseDir, sidoCode);
  ensureDirectory(outputDir);

  const results: Record<string, ReviewsData> = {};
  for (const [sigunguCode, reviews] of splitData.entries()) {
    const totalCount = Object.values(reviews).reduce(
      (accumulator, items) => accumulator + items.length,
      0
    );
    const data: ReviewsData = {
      version: new Date().toISOString().split('T')[0],
      totalCount,
      kindergartenCount: Object.keys(reviews).length,
      reviews,
    };

    results[sigunguCode] = data;
    writeJsonFile(path.join(outputDir, `${sigunguCode}.json`), data);
  }

  return results;
}

import * as fs from 'fs';
import * as path from 'path';
import type {
  ReviewLink,
  ReviewsData,
  ReviewVerificationRecord,
} from '../../src/types/review';
import {
  analyzeReviewEvidence,
  buildKindergartenCoreName,
  normalizeReviewText,
  normalizeReviewUrl,
} from '../../src/lib/utils/review-verification';

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

export interface ReviewCollisionResolution {
  reviewId: string;
  kindergartenId: string;
  normalizedUrl: string;
  groupSize: number;
  directNameEvidence: boolean;
  sameSigunguEvidence: boolean;
  explicitRetainedEvidence: boolean;
  shouldRemove: boolean;
  reason: string;
}

export const DEFAULT_REVIEW_SIDO_CODES = [
  '11',
  '26',
  '27',
  '28',
  '29',
  '30',
  '31',
  '36',
  '41',
  '43',
  '44',
  '46',
  '47',
  '48',
  '50',
  // 네이버 플레이스 추가본(PR #62)에서 새로 등장한 시도 코드 — apply 단계가
  // 이들 파일을 누락하지 않도록 기본 목록에 포함합니다.
  '51',
  '52',
] as const;

export function parseSidoCodes(
  value: string | undefined,
  fallback: string[] = [...DEFAULT_REVIEW_SIDO_CODES]
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

function buildVerificationContext(
  kindergarten: KindergartenEntry,
  coreNameFrequencies: Map<string, number>
): {
  kindergartenId: string;
  kindergartenName: string;
  kindergartenAddress: string;
  sidoCode: string;
  sigunguCode: string;
  coreNameFrequency: number;
} {
  const coreName = buildKindergartenCoreName(kindergarten.name);

  return {
    kindergartenId: kindergarten.kindercode,
    kindergartenName: kindergarten.name,
    kindergartenAddress: kindergarten.address,
    sidoCode: kindergarten.sido_code,
    sigunguCode: kindergarten.sigungu_code,
    coreNameFrequency: coreNameFrequencies.get(coreName) ?? 1,
  };
}

function extractSigunguEvidenceTokens(address: string): string[] {
  const parts = address
    .split(/\s+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
  const sigungu = parts[1] ?? '';
  const eupMyeonDong = parts[2] ?? '';

  return [sigungu, sigungu.replace(/[시군구]$/u, ''), eupMyeonDong]
    .filter((token) => token.length >= 2)
    .filter((token, index, array) => array.indexOf(token) === index);
}

export function buildReviewCollisionResolutionMap(
  entries: readonly LoadedReviewEntry[],
  coreNameFrequencies: Map<string, number>,
  threshold = 3
): Map<string, ReviewCollisionResolution> {
  const byNormalizedUrl = new Map<string, LoadedReviewEntry[]>();

  for (const entry of entries) {
    const normalizedUrl = normalizeReviewUrl(entry.review.url);
    const bucket = byNormalizedUrl.get(normalizedUrl) ?? [];
    bucket.push(entry);
    byNormalizedUrl.set(normalizedUrl, bucket);
  }

  const resolutions = new Map<string, ReviewCollisionResolution>();

  for (const [normalizedUrl, bucket] of byNormalizedUrl.entries()) {
    if (bucket.length <= threshold) {
      continue;
    }

    for (const entry of bucket) {
      const context = buildVerificationContext(
        entry.kindergarten,
        coreNameFrequencies
      );
      const analysis = analyzeReviewEvidence(entry.review, context);
      const sameSigunguEvidence = extractSigunguEvidenceTokens(
        entry.kindergarten.address
      ).some((token) =>
        analysis.normalizedText.includes(normalizeReviewText(token))
      );
      const directNameEvidence = analysis.hasDirectInstitutionEvidence;
      const explicitRetainedEvidence =
        directNameEvidence || sameSigunguEvidence;

      resolutions.set(entry.review.id, {
        reviewId: entry.review.id,
        kindergartenId: entry.kindergarten.kindercode,
        normalizedUrl,
        groupSize: bucket.length,
        directNameEvidence,
        sameSigunguEvidence,
        explicitRetainedEvidence,
        shouldRemove: !explicitRetainedEvidence,
        reason: explicitRetainedEvidence
          ? 'global URL collision 유지: 직접 기관명 또는 동일 시군구 증거 확인'
          : 'global URL collision 제거: 직접 기관명/동일 시군구 증거 없음',
      });
    }
  }

  return resolutions;
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
      const existingUrls = new Set(
        bucket.map((review) => normalizeReviewUrl(review.url))
      );

      for (const review of reviews) {
        const normalizedUrl = normalizeReviewUrl(review.url);
        if (existingUrls.has(normalizedUrl)) {
          continue;
        }

        existingUrls.add(normalizedUrl);
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

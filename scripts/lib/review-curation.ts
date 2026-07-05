import * as fs from 'fs';
import * as path from 'path';
import type {
  ReviewAccessMode,
  ReviewApprovalStatus,
  ReviewEvidenceBundle,
  ReviewEvidenceType,
  ReviewLink,
  ReviewsData,
  ReviewSource,
  ReviewStructuredFields,
} from '../../src/types/review';
import {
  buildReviewEvidenceBundle,
  buildStableHash,
} from '../../src/lib/utils/review-acquisition';
import { isSpamReview, classifyContentType } from '../../src/lib/utils/review-utils';
import { normalizeReviewUrl } from '../../src/lib/utils/review-verification';

export interface RawReviewLink {
  id?: string;
  kindergartenId: string;
  kindergartenName?: string;
  title: string;
  url: string;
  source: ReviewSource;
  sourceName: string;
  snippet: string;
  summary?: string;
  tags?: string[];
  content?: string;
  date: string | null;
  collectedAt: string;
  relevanceScore?: number;
  accessMode?: ReviewAccessMode;
  evidenceType?: ReviewEvidenceType;
  extractionMethod?: string;
  evidenceChecksum?: string;
  rating?: number;
  structuredFields?: ReviewStructuredFields;
  evidence?: ReviewEvidenceBundle;
  approvalStatus?: ReviewApprovalStatus;
  approvedAt?: string;
  approvedBy?: string;
}

export interface KindergartenInfo {
  kindercode: string;
  sido_code: string;
}

export interface RegionMergeOptions {
  existingGlobalNormalizedUrls?: Set<string>;
  existingRegionNormalizedUrls?: Set<string>;
  filterSpam?: boolean;
  preserveContent?: boolean;
}

export interface RegionMergeResult {
  data: ReviewsData;
  addedCount: number;
  duplicateCount: number;
  rejectedCount: number;
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
  fs.writeFileSync(filePath, JSON.stringify(sanitizeJsonValue(value), null, 2));
}

function sanitizeStringForJson(value: string): string {
  let sanitized = '';

  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        sanitized += value[index] + value[index + 1];
        index += 1;
      }
      continue;
    }
    if (code >= 0xdc00 && code <= 0xdfff) {
      continue;
    }
    sanitized += value[index];
  }

  return sanitized;
}

function sanitizeJsonValue(value: unknown): unknown {
  if (typeof value === 'string') {
    return sanitizeStringForJson(value);
  }
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeJsonValue(item));
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, sanitizeJsonValue(entry)])
    );
  }
  return value;
}

export function buildKindergartenSidoMap(
  kindergartens: readonly KindergartenInfo[]
): Map<string, string> {
  const map = new Map<string, string>();
  for (const kindergarten of kindergartens) {
    map.set(kindergarten.kindercode, kindergarten.sido_code);
  }
  return map;
}

export function createReviewId(raw: RawReviewLink): string {
  if (raw.id && raw.id.trim().length > 0) {
    return raw.id;
  }

  const normalizedUrl = normalizeReviewUrl(raw.url);
  const checksumSource =
    raw.evidenceChecksum ??
    buildStableHash(
      `${raw.title}|${raw.snippet}|${raw.summary ?? ''}|${raw.sourceName}`
    );

  return `rev-${buildStableHash(
    `${raw.kindergartenId}|${normalizedUrl}|${checksumSource}`
  )}`;
}

export function buildReviewLinkFromRaw(
  raw: RawReviewLink,
  options: { preserveContent?: boolean } = {}
): ReviewLink {
  const evidence =
    raw.evidence ??
    buildReviewEvidenceBundle({
      canonicalUrl: raw.url,
      rawText: [raw.title, raw.snippet, raw.summary ?? '']
        .filter((value) => value.trim().length > 0)
        .join(' '),
      structuredFields: raw.structuredFields,
      extractedAt: raw.collectedAt,
    });

  return {
    id: createReviewId(raw),
    kindergartenId: raw.kindergartenId,
    title: raw.title,
    url: evidence.canonicalUrl,
    source: raw.source,
    sourceName: raw.sourceName,
    snippet: raw.snippet,
    summary: raw.summary,
    tags: raw.tags,
    content: options.preserveContent ? raw.content : undefined,
    date: raw.date,
    collectedAt: raw.collectedAt,
    relevanceScore: raw.relevanceScore,
    accessMode: raw.accessMode,
    evidenceType: raw.evidenceType,
    extractionMethod: raw.extractionMethod,
    evidenceChecksum: raw.evidenceChecksum ?? evidence.htmlSnapshotHash,
    rating: raw.rating,
    structuredFields: raw.structuredFields,
    evidence,
    approvalStatus: raw.approvalStatus,
    approvedAt: raw.approvedAt,
    approvedBy: raw.approvedBy,
  };
}

export function buildReviewDuplicateKey(
  review: Pick<ReviewLink, 'kindergartenId' | 'url' | 'source' | 'tags' | 'id'>
): string {
  if (review.source === 'naver_place' || review.source === 'starteacher') {
    return review.id;
  }

  const normalizedUrl = normalizeReviewUrl(review.url);
  return review.tags?.includes('sns')
    ? `${review.kindergartenId}|${normalizedUrl}`
    : normalizedUrl;
}

export function buildRawReviewDuplicateKey(raw: RawReviewLink): string {
  const normalizedUrl = normalizeReviewUrl(raw.url);
  return raw.tags?.includes('sns')
    ? `${raw.kindergartenId}|${normalizedUrl}`
    : normalizedUrl;
}

export function collectGlobalNormalizedUrls(
  reviewsByKindergarten: Record<string, ReviewLink[]>
): Set<string> {
  const urls = new Set<string>();

  for (const reviews of Object.values(reviewsByKindergarten)) {
    for (const review of reviews) {
      urls.add(buildReviewDuplicateKey(review));
    }
  }

  return urls;
}

export function collectRegionNormalizedUrls(
  regionData: ReviewsData
): Set<string> {
  return collectGlobalNormalizedUrls(regionData.reviews);
}

export function mergeRawReviewsIntoRegionData(
  regionData: ReviewsData,
  rawReviews: readonly RawReviewLink[],
  options: RegionMergeOptions = {}
): RegionMergeResult {
  const existingGlobalUrls =
    options.existingGlobalNormalizedUrls ??
    collectGlobalNormalizedUrls(regionData.reviews);
  const existingRegionUrls =
    options.existingRegionNormalizedUrls ??
    collectRegionNormalizedUrls(regionData);
  const mergedReviews: Record<string, ReviewLink[]> = Object.fromEntries(
    Object.entries(regionData.reviews).map(([kindergartenId, reviews]) => [
      kindergartenId,
      [...reviews],
    ])
  );

  let addedCount = 0;
  let duplicateCount = 0;
  let rejectedCount = 0;

  for (const rawReview of rawReviews) {
    const duplicateKey = buildRawReviewDuplicateKey(rawReview);
    if (
      existingGlobalUrls.has(duplicateKey) ||
      existingRegionUrls.has(duplicateKey)
    ) {
      duplicateCount += 1;
      continue;
    }

    if (options.filterSpam !== false) {
      const spamCheck = isSpamReview({
        title: rawReview.title,
        snippet: rawReview.snippet,
        summary: rawReview.summary,
        sourceName: rawReview.sourceName,
        content: rawReview.content,
      });
      if (spamCheck.isSpam) {
        rejectedCount += 1;
        continue;
      }

      const contentType = classifyContentType(
        rawReview.title,
        rawReview.snippet,
        [rawReview.summary ?? '', rawReview.content ?? ''].join(' ').trim()
      );
      if (contentType === 'template') {
        rejectedCount += 1;
        continue;
      }
    }

    const review = buildReviewLinkFromRaw(rawReview, {
      preserveContent: options.preserveContent,
    });
    const bucket = mergedReviews[review.kindergartenId] ?? [];
    bucket.push(review);
    mergedReviews[review.kindergartenId] = bucket;

    existingGlobalUrls.add(duplicateKey);
    existingRegionUrls.add(duplicateKey);
    addedCount += 1;
  }

  const totalCount = Object.values(mergedReviews).reduce(
    (accumulator, reviews) => accumulator + reviews.length,
    0
  );

  return {
    data: {
      version: new Date().toISOString().split('T')[0],
      totalCount,
      kindergartenCount: Object.keys(mergedReviews).length,
      reviews: mergedReviews,
    },
    addedCount,
    duplicateCount,
    rejectedCount,
  };
}

export function mergeRegionIntoCombinedReviews(
  combinedData: ReviewsData,
  regionData: ReviewsData
): ReviewsData {
  const mergedReviews: Record<string, ReviewLink[]> = {
    ...combinedData.reviews,
  };

  for (const [kindergartenId, reviews] of Object.entries(regionData.reviews)) {
    mergedReviews[kindergartenId] = [...reviews];
  }

  const totalCount = Object.values(mergedReviews).reduce(
    (accumulator, reviews) => accumulator + reviews.length,
    0
  );

  return {
    version: new Date().toISOString().split('T')[0],
    totalCount,
    kindergartenCount: Object.keys(mergedReviews).length,
    reviews: mergedReviews,
  };
}

import type {
  ReviewBodyCacheEntry,
  ReviewVerificationRunReportItem,
  ReviewVerificationStateEntry,
  ReviewVerificationStatus,
} from '@/types/review';
import {
  normalizeReviewText,
  normalizeReviewUrl,
  shouldRemoveReviewAfterVerification,
} from './review-verification';

export type ReviewStateMatchType = 'reviewId' | 'normalizedUrl' | 'none';

export type IncrementalReviewDecisionReason =
  | 'new_review'
  | 'fingerprint_changed'
  | 'previous_uncertain'
  | 'reused';

export interface ReviewFingerprintInput {
  kindergartenId: string;
  title: string;
  snippet: string;
}

export interface IncrementalReviewDescriptor extends ReviewFingerprintInput {
  reviewId: string;
  url: string;
}

export interface ReviewVerificationStateLookup {
  byReviewId: Map<string, ReviewVerificationStateEntry>;
  byNormalizedUrl: Map<string, ReviewVerificationStateEntry[]>;
}

export interface ReviewBodyCacheLookup {
  byCacheKey: Map<string, ReviewBodyCacheEntry>;
  byNormalizedUrl: Map<string, ReviewBodyCacheEntry[]>;
}

export interface IncrementalReviewDecision {
  normalizedUrl: string;
  reviewFingerprint: string;
  matchedEntry: ReviewVerificationStateEntry | null;
  matchedBy: ReviewStateMatchType;
  previousStatus: ReviewVerificationStatus | null;
  needsEvaluation: boolean;
  reason: IncrementalReviewDecisionReason;
}

export interface ReviewVerificationStateEntryInput
  extends ReviewFingerprintInput {
  reviewId: string;
  kindergartenName?: string;
  kindergartenId: string;
  sidoCode?: string;
  url: string;
  finalStatus: ReviewVerificationStatus;
  confidence: number;
  reviewedAt: string;
}

export interface ReviewBodyCacheEntryInput extends ReviewFingerprintInput {
  reviewId: string;
  kindergartenId: string;
  url: string;
  bodyText: string;
  textLength: number;
  scrapedAt: string;
  status: 'success' | 'fail';
  error?: string;
}

function sortStateEntries(
  left: ReviewVerificationStateEntry,
  right: ReviewVerificationStateEntry
): number {
  return (
    right.reviewedAt.localeCompare(left.reviewedAt) ||
    left.reviewId.localeCompare(right.reviewId)
  );
}

function sortCacheEntries(
  left: ReviewBodyCacheEntry,
  right: ReviewBodyCacheEntry
): number {
  return (
    right.scrapedAt.localeCompare(left.scrapedAt) ||
    left.normalizedUrl.localeCompare(right.normalizedUrl)
  );
}

function sortReportItems(
  items: readonly ReviewVerificationRunReportItem[]
): ReviewVerificationRunReportItem[] {
  return items.toSorted(
    (left, right) =>
      left.kindergartenId.localeCompare(right.kindergartenId) ||
      left.reviewId.localeCompare(right.reviewId)
  );
}

function hashString(value: string): string {
  let hash = 0x811c9dc5;

  for (const character of value) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }

  return hash.toString(16).padStart(8, '0');
}

export function buildReviewFingerprint(
  input: ReviewFingerprintInput
): string {
  const normalized = [
    input.kindergartenId,
    normalizeReviewText(input.title),
    normalizeReviewText(input.snippet),
  ].join('|');

  return hashString(normalized);
}

export function buildReviewBodyCacheKey(
  normalizedUrl: string,
  reviewFingerprint: string
): string {
  return `${normalizedUrl}::${reviewFingerprint}`;
}

export function buildReviewVerificationStateLookup(
  entries: readonly ReviewVerificationStateEntry[]
): ReviewVerificationStateLookup {
  const byReviewId = new Map<string, ReviewVerificationStateEntry>();
  const byNormalizedUrl = new Map<string, ReviewVerificationStateEntry[]>();

  for (const entry of entries) {
    byReviewId.set(entry.reviewId, entry);
    const bucket = byNormalizedUrl.get(entry.normalizedUrl) ?? [];
    bucket.push(entry);
    byNormalizedUrl.set(entry.normalizedUrl, bucket);
  }

  for (const bucket of byNormalizedUrl.values()) {
    bucket.sort(sortStateEntries);
  }

  return {
    byReviewId,
    byNormalizedUrl,
  };
}

export function buildReviewBodyCacheLookup(
  entries: readonly ReviewBodyCacheEntry[]
): ReviewBodyCacheLookup {
  const byCacheKey = new Map<string, ReviewBodyCacheEntry>();
  const byNormalizedUrl = new Map<string, ReviewBodyCacheEntry[]>();

  for (const entry of entries) {
    byCacheKey.set(
      buildReviewBodyCacheKey(entry.normalizedUrl, entry.reviewFingerprint),
      entry
    );

    const bucket = byNormalizedUrl.get(entry.normalizedUrl) ?? [];
    bucket.push(entry);
    byNormalizedUrl.set(entry.normalizedUrl, bucket);
  }

  for (const bucket of byNormalizedUrl.values()) {
    bucket.sort(sortCacheEntries);
  }

  return {
    byCacheKey,
    byNormalizedUrl,
  };
}

export function decideIncrementalReviewAction(
  lookup: ReviewVerificationStateLookup,
  review: IncrementalReviewDescriptor
): IncrementalReviewDecision {
  const normalizedUrl = normalizeReviewUrl(review.url);
  const reviewFingerprint = buildReviewFingerprint(review);
  const reviewIdMatch = lookup.byReviewId.get(review.reviewId) ?? null;

  if (reviewIdMatch) {
    if (reviewIdMatch.reviewFingerprint !== reviewFingerprint) {
      return {
        normalizedUrl,
        reviewFingerprint,
        matchedEntry: reviewIdMatch,
        matchedBy: 'reviewId',
        previousStatus: reviewIdMatch.finalStatus,
        needsEvaluation: true,
        reason: 'fingerprint_changed',
      };
    }

    if (reviewIdMatch.finalStatus === 'uncertain') {
      return {
        normalizedUrl,
        reviewFingerprint,
        matchedEntry: reviewIdMatch,
        matchedBy: 'reviewId',
        previousStatus: reviewIdMatch.finalStatus,
        needsEvaluation: true,
        reason: 'previous_uncertain',
      };
    }

    return {
      normalizedUrl,
      reviewFingerprint,
      matchedEntry: reviewIdMatch,
      matchedBy: 'reviewId',
      previousStatus: reviewIdMatch.finalStatus,
      needsEvaluation: false,
      reason: 'reused',
    };
  }

  const urlMatches = lookup.byNormalizedUrl.get(normalizedUrl) ?? [];
  const fingerprintMatch =
    urlMatches.find((entry) => entry.reviewFingerprint === reviewFingerprint) ??
    null;

  if (fingerprintMatch) {
    if (fingerprintMatch.finalStatus === 'uncertain') {
      return {
        normalizedUrl,
        reviewFingerprint,
        matchedEntry: fingerprintMatch,
        matchedBy: 'normalizedUrl',
        previousStatus: fingerprintMatch.finalStatus,
        needsEvaluation: true,
        reason: 'previous_uncertain',
      };
    }

    return {
      normalizedUrl,
      reviewFingerprint,
      matchedEntry: fingerprintMatch,
      matchedBy: 'normalizedUrl',
      previousStatus: fingerprintMatch.finalStatus,
      needsEvaluation: false,
      reason: 'reused',
    };
  }

  if (urlMatches.length > 0) {
    return {
      normalizedUrl,
      reviewFingerprint,
      matchedEntry: urlMatches[0] ?? null,
      matchedBy: 'normalizedUrl',
      previousStatus: (urlMatches[0] ?? null)?.finalStatus ?? null,
      needsEvaluation: true,
      reason: 'fingerprint_changed',
    };
  }

  return {
    normalizedUrl,
    reviewFingerprint,
    matchedEntry: null,
    matchedBy: 'none',
    previousStatus: null,
    needsEvaluation: true,
    reason: 'new_review',
  };
}

export function findReusableBodyCacheEntry(
  lookup: ReviewBodyCacheLookup,
  normalizedUrl: string,
  reviewFingerprint: string
): ReviewBodyCacheEntry | null {
  return (
    lookup.byCacheKey.get(
      buildReviewBodyCacheKey(normalizedUrl, reviewFingerprint)
    ) ?? null
  );
}

export function buildReviewVerificationStateEntry(
  input: ReviewVerificationStateEntryInput
): ReviewVerificationStateEntry {
  return {
    reviewId: input.reviewId,
    kindergartenId: input.kindergartenId,
    kindergartenName: input.kindergartenName,
    sidoCode: input.sidoCode,
    normalizedUrl: normalizeReviewUrl(input.url),
    finalStatus: input.finalStatus,
    confidence: input.confidence,
    reviewedAt: input.reviewedAt,
    reviewFingerprint: buildReviewFingerprint(input),
    title: input.title,
    snippet: input.snippet,
  };
}

export function buildReviewBodyCacheEntry(
  input: ReviewBodyCacheEntryInput
): ReviewBodyCacheEntry {
  return {
    reviewId: input.reviewId,
    kindergartenId: input.kindergartenId,
    normalizedUrl: normalizeReviewUrl(input.url),
    reviewFingerprint: buildReviewFingerprint(input),
    title: input.title,
    snippet: input.snippet,
    bodyText: input.bodyText,
    textLength: input.textLength,
    scrapedAt: input.scrapedAt,
    status: input.status,
    error: input.error,
  };
}

export function mergeReviewVerificationStateEntries(
  previousEntries: readonly ReviewVerificationStateEntry[],
  nextEntries: readonly ReviewVerificationStateEntry[]
): ReviewVerificationStateEntry[] {
  const byReviewId = new Map<string, ReviewVerificationStateEntry>(
    previousEntries.map((entry) => [entry.reviewId, entry])
  );

  for (const entry of nextEntries) {
    byReviewId.set(entry.reviewId, entry);
  }

  return Array.from(byReviewId.values()).toSorted(sortStateEntries);
}

export function mergeReviewBodyCacheEntries(
  previousEntries: readonly ReviewBodyCacheEntry[],
  nextEntries: readonly ReviewBodyCacheEntry[]
): ReviewBodyCacheEntry[] {
  const byCacheKey = new Map<string, ReviewBodyCacheEntry>(
    previousEntries.map((entry) => [
      buildReviewBodyCacheKey(entry.normalizedUrl, entry.reviewFingerprint),
      entry,
    ])
  );

  for (const entry of nextEntries) {
    byCacheKey.set(
      buildReviewBodyCacheKey(entry.normalizedUrl, entry.reviewFingerprint),
      entry
    );
  }

  return Array.from(byCacheKey.values()).toSorted(sortCacheEntries);
}

export function buildChangedDecisionItems(
  items: readonly ReviewVerificationRunReportItem[]
): ReviewVerificationRunReportItem[] {
  return sortReportItems(
    items.filter(
      (item) =>
        item.previousStatus !== null && item.previousStatus !== item.nextStatus
    )
  );
}

export function buildNewlyVerifiedItems(
  items: readonly ReviewVerificationRunReportItem[]
): ReviewVerificationRunReportItem[] {
  return sortReportItems(
    items.filter(
      (item) => item.nextStatus === 'verified' && item.previousStatus !== 'verified'
    )
  );
}

export function buildNewlyRemovedItems(
  items: readonly ReviewVerificationRunReportItem[]
): ReviewVerificationRunReportItem[] {
  return sortReportItems(
    items.filter(
      (item) =>
        shouldRemoveReviewAfterVerification(item.nextStatus) &&
        (item.previousStatus === null ||
          !shouldRemoveReviewAfterVerification(item.previousStatus))
    )
  );
}

function nextRandom(seed: number): number {
  return (Math.imul(seed, 1664525) + 1013904223) >>> 0;
}

export function pickRandomSamples<T>(
  items: readonly T[],
  sampleSize: number,
  seed: number
): T[] {
  if (sampleSize <= 0 || items.length === 0) {
    return [];
  }

  const shuffled = [...items];
  let currentSeed = seed === 0 ? 1 : seed >>> 0;

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    currentSeed = nextRandom(currentSeed);
    const swapIndex = currentSeed % (index + 1);
    const currentValue = shuffled[index];
    const swapValue = shuffled[swapIndex];

    shuffled[index] = swapValue;
    shuffled[swapIndex] = currentValue;
  }

  return shuffled.slice(0, Math.min(sampleSize, shuffled.length));
}

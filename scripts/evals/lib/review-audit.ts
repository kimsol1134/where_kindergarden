import type {
  ReviewAuditApplySummary,
  ReviewAuditBatchItem,
  ReviewAuditEntry,
  ReviewAuditStats,
  ReviewLink,
  ReviewsData,
  ReviewVerificationStateEntry,
  ReviewVerificationStatus,
} from '../../../src/types/review';
import {
  analyzeReviewEvidence,
  buildKindergartenCoreName,
  classifyReviewWithoutBody,
  normalizeReviewUrl,
} from '../../../src/lib/utils/review-verification';
import {
  buildCoreNameFrequencyMap,
  buildReviewCollisionResolutionMap,
  type KindergartenEntry,
  type LoadedReviewEntry,
} from '../../lib/review-verification-pipeline';

function ratio(numerator: number, denominator: number): number {
  if (denominator === 0) {
    return 0;
  }

  return Number((numerator / denominator).toFixed(6));
}

export function buildReviewAuditKey(
  kindergartenId: string,
  reviewId: string
): string {
  return `${kindergartenId}::${reviewId}`;
}

function buildLoadedEntries(
  reviewsData: ReviewsData,
  kindergartens: KindergartenEntry[]
): LoadedReviewEntry[] {
  const kindergartenMap = new Map(
    kindergartens.map((kindergarten) => [
      kindergarten.kindercode,
      kindergarten,
    ])
  );
  const entries: LoadedReviewEntry[] = [];

  for (const [kindergartenId, reviews] of Object.entries(reviewsData.reviews)) {
    const kindergarten = kindergartenMap.get(kindergartenId);
    if (!kindergarten) {
      continue;
    }

    for (const review of reviews) {
      entries.push({
        review,
        kindergarten,
        sidoCode: kindergarten.sido_code,
      });
    }
  }

  return entries;
}

export function parseReviewAuditJsonl(content: string): ReviewAuditEntry[] {
  return content
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line) as ReviewAuditEntry);
}

export function serializeReviewAuditJsonl(
  entries: readonly ReviewAuditEntry[]
): string {
  return `${entries.map((entry) => JSON.stringify(entry)).join('\n')}\n`;
}

export function buildReviewAuditEntryMap(
  entries: readonly ReviewAuditEntry[]
): Map<string, ReviewAuditEntry> {
  return new Map(
    entries.map((entry) => [
      buildReviewAuditKey(entry.kindergartenId, entry.reviewId),
      entry,
    ])
  );
}

function buildAuditEntryFromCurrentReview(
  review: ReviewLink,
  kindergarten: KindergartenEntry,
  coreNameFrequencies: Map<string, number>,
  collisionMap: ReturnType<typeof buildReviewCollisionResolutionMap>,
  previousEntry?: ReviewAuditEntry
): ReviewAuditEntry {
  const coreName = buildKindergartenCoreName(kindergarten.name);
  const context = {
    kindergartenId: kindergarten.kindercode,
    kindergartenName: kindergarten.name,
    kindergartenAddress: kindergarten.address,
    sidoCode: kindergarten.sido_code,
    sigunguCode: kindergarten.sigungu_code,
    coreNameFrequency: coreNameFrequencies.get(coreName) ?? 1,
  };
  const autoClassification = classifyReviewWithoutBody(review, context);
  const collision = collisionMap.get(review.id) ?? null;
  const autoStatus =
    collision?.shouldRemove === true
      ? 'mismatch'
      : autoClassification.finalStatus;
  const autoConfidence =
    collision?.shouldRemove === true
      ? Math.max(autoClassification.confidence, 0.94)
      : autoClassification.confidence;
  const autoReasons = collision?.shouldRemove === true
    ? [...autoClassification.reasons, collision.reason]
    : autoClassification.reasons;

  return {
    reviewId: review.id,
    kindergartenId: kindergarten.kindercode,
    kindergartenName: kindergarten.name,
    kindergartenAddress: kindergarten.address,
    sidoCode: kindergarten.sido_code,
    sigunguCode: kindergarten.sigungu_code,
    normalizedUrl: normalizeReviewUrl(review.url),
    url: review.url,
    source: review.source,
    sourceName: review.sourceName,
    title: review.title,
    snippet: review.snippet,
    summary: review.summary,
    date: review.date,
    collectedAt: review.collectedAt,
    currentShipped: true,
    autoStatus,
    autoConfidence,
    autoReasons,
    finalAuditStatus: previousEntry?.finalAuditStatus ?? null,
    auditReason: previousEntry?.auditReason ?? null,
    reviewedAt: previousEntry?.reviewedAt ?? null,
    reviewedBy: previousEntry?.reviewedBy ?? null,
  };
}

export interface BuildReviewAuditEntriesOptions {
  currentReviewsData: ReviewsData;
  kindergartens: KindergartenEntry[];
  previousEntries?: ReviewAuditEntry[];
}

export function buildReviewAuditEntries(
  options: BuildReviewAuditEntriesOptions
): ReviewAuditEntry[] {
  const {
    currentReviewsData,
    kindergartens,
    previousEntries = [],
  } = options;
  const previousEntryMap = buildReviewAuditEntryMap(previousEntries);
  const kindergartenMap = new Map(
    kindergartens.map((kindergarten) => [
      kindergarten.kindercode,
      kindergarten,
    ])
  );
  const coreNameFrequencies = buildCoreNameFrequencyMap(kindergartens);
  const loadedEntries = buildLoadedEntries(currentReviewsData, kindergartens);
  const collisionMap = buildReviewCollisionResolutionMap(
    loadedEntries,
    coreNameFrequencies
  );
  const nextEntries = new Map<string, ReviewAuditEntry>();

  for (const entry of loadedEntries) {
    const key = buildReviewAuditKey(
      entry.kindergarten.kindercode,
      entry.review.id
    );
    nextEntries.set(
      key,
      buildAuditEntryFromCurrentReview(
        entry.review,
        entry.kindergarten,
        coreNameFrequencies,
        collisionMap,
        previousEntryMap.get(key)
      )
    );
  }

  for (const previousEntry of previousEntries) {
    const key = buildReviewAuditKey(
      previousEntry.kindergartenId,
      previousEntry.reviewId
    );
    if (nextEntries.has(key)) {
      continue;
    }

    const kindergarten =
      kindergartenMap.get(previousEntry.kindergartenId) ?? null;
    if (!kindergarten) {
      nextEntries.set(key, {
        ...previousEntry,
        currentShipped: false,
      });
      continue;
    }

    const coreName = buildKindergartenCoreName(kindergarten.name);
    const context = {
      kindergartenId: kindergarten.kindercode,
      kindergartenName: kindergarten.name,
      kindergartenAddress: kindergarten.address,
      sidoCode: kindergarten.sido_code,
      sigunguCode: kindergarten.sigungu_code,
      coreNameFrequency: coreNameFrequencies.get(coreName) ?? 1,
    };
    const autoClassification = classifyReviewWithoutBody(
      {
        title: previousEntry.title,
        source: previousEntry.source,
        sourceName: previousEntry.sourceName,
        snippet: previousEntry.snippet,
        summary: previousEntry.summary,
      },
      context
    );

    nextEntries.set(key, {
      ...previousEntry,
      currentShipped: false,
      autoStatus: autoClassification.finalStatus,
      autoConfidence: autoClassification.confidence,
      autoReasons: autoClassification.reasons,
    });
  }

  return Array.from(nextEntries.values()).toSorted(
    (left, right) =>
      Number(right.currentShipped) - Number(left.currentShipped) ||
      left.kindergartenId.localeCompare(right.kindergartenId) ||
      left.reviewId.localeCompare(right.reviewId)
  );
}

export function buildReviewAuditStats(
  entries: readonly ReviewAuditEntry[],
  auditPath: string
): ReviewAuditStats {
  const statuses: Array<ReviewVerificationStatus | 'unaudited'> = [
    'verified',
    'mismatch',
    'advertorial',
    'generic_info',
    'uncertain',
    'unaudited',
  ];
  const byFinalStatus = Object.fromEntries(
    statuses.map((status) => [status, 0])
  ) as Record<ReviewVerificationStatus | 'unaudited', number>;
  const visibleByFinalStatus = Object.fromEntries(
    statuses.map((status) => [status, 0])
  ) as Record<ReviewVerificationStatus | 'unaudited', number>;

  let auditedCount = 0;
  let visibleCount = 0;
  let visibleVerifiedCount = 0;

  for (const entry of entries) {
    const status = entry.finalAuditStatus ?? 'unaudited';
    byFinalStatus[status] += 1;
    if (entry.finalAuditStatus !== null) {
      auditedCount += 1;
    }
    if (!entry.currentShipped) {
      continue;
    }

    visibleCount += 1;
    visibleByFinalStatus[status] += 1;
    if (entry.finalAuditStatus === 'verified') {
      visibleVerifiedCount += 1;
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    auditPath,
    totalCount: entries.length,
    auditedCount,
    remainingCount: entries.length - auditedCount,
    visibleCount,
    visibleVerifiedCount,
    invalidVisibleCount: visibleCount - visibleVerifiedCount,
    visiblePrecision: ratio(visibleVerifiedCount, visibleCount),
    byFinalStatus,
    visibleByFinalStatus,
  };
}

function buildStateLookup(
  stateEntries: readonly ReviewVerificationStateEntry[]
): Map<string, ReviewVerificationStateEntry> {
  return new Map(
    stateEntries.map((entry) => [
      buildReviewAuditKey(entry.kindergartenId, entry.reviewId),
      entry,
    ])
  );
}

export interface BuildReviewAuditBatchOptions {
  entries: readonly ReviewAuditEntry[];
  kindergartens: KindergartenEntry[];
  stateEntries?: ReviewVerificationStateEntry[];
  batchSize?: number;
  includeReviewed?: boolean;
}

export function buildReviewAuditBatch(
  options: BuildReviewAuditBatchOptions
): ReviewAuditBatchItem[] {
  const {
    entries,
    kindergartens,
    stateEntries = [],
    batchSize = 50,
    includeReviewed = false,
  } = options;
  const kindergartenMap = new Map(
    kindergartens.map((kindergarten) => [
      kindergarten.kindercode,
      kindergarten,
    ])
  );
  const coreNameFrequencies = buildCoreNameFrequencyMap(kindergartens);
  const currentVisibleEntries = entries.filter((entry) => entry.currentShipped);
  const collisionMap = buildReviewCollisionResolutionMap(
    currentVisibleEntries.flatMap((entry) => {
      const kindergarten = kindergartenMap.get(entry.kindergartenId);
      if (!kindergarten) {
        return [];
      }

      return [
        {
          review: {
            id: entry.reviewId,
            kindergartenId: entry.kindergartenId,
            title: entry.title,
            url: entry.url,
            source: entry.source,
            sourceName: entry.sourceName,
            snippet: entry.snippet,
            summary: entry.summary,
            date: entry.date,
            collectedAt: entry.collectedAt,
          },
          kindergarten,
          sidoCode: entry.sidoCode,
        } satisfies LoadedReviewEntry,
      ];
    }),
    coreNameFrequencies
  );
  const stateLookup = buildStateLookup(stateEntries);

  const prioritized = entries
    .filter((entry) => includeReviewed || entry.finalAuditStatus === null)
    .map((entry) => {
      const kindergarten = kindergartenMap.get(entry.kindergartenId);
      const priorityReasons: string[] = [];
      let priorityScore = entry.currentShipped ? 100 : 0;

      if (!kindergarten) {
        priorityReasons.push('kindergarten metadata missing');
        priorityScore += 5;

        return {
          ...entry,
          priorityScore,
          priorityReasons,
          directNameEvidence: false,
          locationValid: false,
          institutionMentionCount: 0,
          otherInstitutionMentionCount: 0,
          collisionGroupSize: 0,
          stateVerifiedWithoutDirectName: false,
        } satisfies ReviewAuditBatchItem;
      }

      const coreName = buildKindergartenCoreName(kindergarten.name);
      const context = {
        kindergartenId: kindergarten.kindercode,
        kindergartenName: kindergarten.name,
        kindergartenAddress: kindergarten.address,
        sidoCode: kindergarten.sido_code,
        sigunguCode: kindergarten.sigungu_code,
        coreNameFrequency: coreNameFrequencies.get(coreName) ?? 1,
      };
      const analysis = analyzeReviewEvidence(
        {
          title: entry.title,
          snippet: entry.snippet,
          summary: entry.summary,
          source: entry.source,
          sourceName: entry.sourceName,
        },
        context
      );
      const stateEntry =
        stateLookup.get(buildReviewAuditKey(entry.kindergartenId, entry.reviewId)) ??
        null;
      const collision = collisionMap.get(entry.reviewId) ?? null;
      const stateVerifiedWithoutDirectName =
        stateEntry?.finalStatus === 'verified' &&
        !analysis.hasDirectInstitutionEvidence;

      if (entry.currentShipped && entry.autoConfidence < 0.9) {
        priorityScore += 60;
        priorityReasons.push('visible + low confidence');
      }
      if (collision) {
        priorityScore += 50 + collision.groupSize;
        priorityReasons.push('global collision');
      }
      if (analysis.signals.institutionMentions.length >= 3) {
        priorityScore += 40;
        priorityReasons.push('multi-school mention');
      }
      if (!analysis.signals.locationValid) {
        priorityScore += 30;
        priorityReasons.push('location mismatch');
      }
      if (stateVerifiedWithoutDirectName) {
        priorityScore += 20;
        priorityReasons.push('state reused without direct-name evidence');
      }
      if (
        analysis.signals.contentType === 'question' ||
        analysis.signals.contentType === 'info_list' ||
        analysis.signals.contentType === 'template'
      ) {
        priorityScore += 10;
        priorityReasons.push(`contentType:${analysis.signals.contentType}`);
      }

      return {
        ...entry,
        priorityScore,
        priorityReasons,
        directNameEvidence: analysis.hasDirectInstitutionEvidence,
        locationValid: analysis.signals.locationValid,
        institutionMentionCount: analysis.signals.institutionMentions.length,
        otherInstitutionMentionCount:
          analysis.signals.otherInstitutionMentions.length,
        collisionGroupSize: collision?.groupSize ?? 0,
        stateVerifiedWithoutDirectName,
      } satisfies ReviewAuditBatchItem;
    })
    .toSorted(
      (left, right) =>
        Number(right.currentShipped) - Number(left.currentShipped) ||
        right.priorityScore - left.priorityScore ||
        left.autoConfidence - right.autoConfidence ||
        left.kindergartenId.localeCompare(right.kindergartenId) ||
        left.reviewId.localeCompare(right.reviewId)
    );

  return prioritized.slice(0, Math.max(batchSize, 0));
}

export interface ApplyReviewAuditToRegionResult {
  nextData: ReviewsData;
  summary: ReviewAuditApplySummary;
}

function buildEmptyApplySummary(): ReviewAuditApplySummary {
  return {
    removedInvalid: 0,
    removedUnaudited: 0,
    removedMissingAudit: 0,
    keptVerified: 0,
  };
}

export function applyReviewAuditToRegionData(
  regionData: ReviewsData,
  auditEntries: readonly ReviewAuditEntry[]
): ApplyReviewAuditToRegionResult {
  const auditEntryMap = buildReviewAuditEntryMap(auditEntries);
  const summary = buildEmptyApplySummary();
  const nextReviews: ReviewsData['reviews'] = {};

  for (const [kindergartenId, reviews] of Object.entries(regionData.reviews)) {
    const kept = reviews.filter((review) => {
      const auditEntry =
        auditEntryMap.get(buildReviewAuditKey(kindergartenId, review.id)) ?? null;

      if (!auditEntry) {
        summary.removedMissingAudit += 1;
        return false;
      }

      if (auditEntry.finalAuditStatus === 'verified') {
        summary.keptVerified += 1;
        return true;
      }

      if (auditEntry.finalAuditStatus === null) {
        summary.removedUnaudited += 1;
        return false;
      }

      summary.removedInvalid += 1;
      return false;
    });

    if (kept.length > 0) {
      nextReviews[kindergartenId] = kept;
    }
  }

  return {
    nextData: {
      version: new Date().toISOString().split('T')[0],
      totalCount: Object.values(nextReviews).reduce(
        (accumulator, items) => accumulator + items.length,
        0
      ),
      kindergartenCount: Object.keys(nextReviews).length,
      reviews: nextReviews,
    },
    summary,
  };
}

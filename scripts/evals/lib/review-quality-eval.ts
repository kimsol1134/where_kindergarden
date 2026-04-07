import type {
  ReviewLink,
  ReviewQualityBinaryMetrics,
  ReviewQualityClassMetrics,
  ReviewQualityEvaluationReport,
  ReviewQualityGoldEntry,
  ReviewsData,
  ReviewVerificationStatus,
} from '../../../src/types/review';
import { classifyReviewWithoutBody } from '../../../src/lib/utils/review-verification';
import {
  buildCoreNameFrequencyMap,
  buildReviewCollisionResolutionMap,
  type KindergartenEntry,
  type LoadedReviewEntry,
} from '../../lib/review-verification-pipeline';

const CLASS_LABELS: Array<Exclude<ReviewVerificationStatus, 'uncertain'>> = [
  'verified',
  'mismatch',
  'advertorial',
  'generic_info',
];

function buildGoldKey(kindergartenId: string, reviewId: string): string {
  return `${kindergartenId}::${reviewId}`;
}

function buildReviewLookup(data: ReviewsData): Map<string, ReviewLink> {
  const lookup = new Map<string, ReviewLink>();

  for (const [kindergartenId, reviews] of Object.entries(data.reviews)) {
    for (const review of reviews) {
      lookup.set(buildGoldKey(kindergartenId, review.id), review);
    }
  }

  return lookup;
}

function buildLoadedEntries(
  data: ReviewsData,
  kindergartens: KindergartenEntry[]
): LoadedReviewEntry[] {
  const kindergartenMap = new Map(
    kindergartens.map((kindergarten) => [
      kindergarten.kindercode,
      kindergarten,
    ])
  );
  const entries: LoadedReviewEntry[] = [];

  for (const [kindergartenId, reviews] of Object.entries(data.reviews)) {
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

function ratio(numerator: number, denominator: number): number {
  if (denominator === 0) {
    return 0;
  }

  return Number((numerator / denominator).toFixed(6));
}

function buildBinaryMetrics(
  samples: Array<{
    expectedKeep: boolean;
    predictedKeep: boolean;
  }>
): ReviewQualityBinaryMetrics {
  let tp = 0;
  let fp = 0;
  let fn = 0;
  let tn = 0;

  for (const sample of samples) {
    if (sample.expectedKeep && sample.predictedKeep) {
      tp += 1;
      continue;
    }
    if (!sample.expectedKeep && sample.predictedKeep) {
      fp += 1;
      continue;
    }
    if (sample.expectedKeep) {
      fn += 1;
      continue;
    }
    tn += 1;
  }

  const precision = ratio(tp, tp + fp);
  const recall = ratio(tp, tp + fn);
  const f1 = precision + recall === 0 ? 0 : ratio(2 * precision * recall, precision + recall);

  return {
    precision,
    recall,
    f1,
    tp,
    fp,
    fn,
    tn,
  };
}

function buildClassMetrics(
  goldStatuses: Array<Exclude<ReviewVerificationStatus, 'uncertain'>>,
  predictedStatuses: Array<Exclude<ReviewVerificationStatus, 'uncertain'>>
): Record<Exclude<ReviewVerificationStatus, 'uncertain'>, ReviewQualityClassMetrics> {
  return Object.fromEntries(
    CLASS_LABELS.map((label) => {
      const support = goldStatuses.filter((status) => status === label).length;
      const predicted = predictedStatuses.filter((status) => status === label).length;
      const correct = goldStatuses.filter(
        (status, index) => status === label && predictedStatuses[index] === label
      ).length;
      const precision = ratio(correct, predicted);
      const recall = ratio(correct, support);
      const f1 =
        precision + recall === 0
          ? 0
          : ratio(2 * precision * recall, precision + recall);

      return [
        label,
        {
          precision,
          recall,
          f1,
          support,
          predicted,
          correct,
        },
      ];
    })
  ) as Record<Exclude<ReviewVerificationStatus, 'uncertain'>, ReviewQualityClassMetrics>;
}

export interface EvaluateReviewQualityOptions {
  goldEntries: ReviewQualityGoldEntry[];
  reviewsData: ReviewsData;
  kindergartens: KindergartenEntry[];
  goldPath?: string;
  reviewsPath?: string;
}

export function evaluateReviewQuality(
  options: EvaluateReviewQualityOptions
): ReviewQualityEvaluationReport {
  const {
    goldEntries,
    reviewsData,
    kindergartens,
    goldPath = 'scripts/evals/review-quality-gold-v1.jsonl',
    reviewsPath = 'public/data/reviews.json',
  } = options;

  const reviewLookup = buildReviewLookup(reviewsData);
  const kindergartenMap = new Map(
    kindergartens.map((kindergarten) => [
      kindergarten.kindercode,
      kindergarten,
    ])
  );
  const coreNameFrequencies = buildCoreNameFrequencyMap(kindergartens);
  const collisionResolutions = Array.from(
    buildReviewCollisionResolutionMap(
      buildLoadedEntries(reviewsData, kindergartens),
      coreNameFrequencies
    ).values()
  );

  const binarySamples: Array<{ expectedKeep: boolean; predictedKeep: boolean }> = [];
  const goldStatuses: Array<Exclude<ReviewVerificationStatus, 'uncertain'>> = [];
  const predictedStatuses: Array<Exclude<ReviewVerificationStatus, 'uncertain'>> = [];
  let predictedPresentCount = 0;
  let expectedPresentCount = 0;

  for (const entry of goldEntries) {
    const kindergarten =
      kindergartenMap.get(entry.kindergartenId) ??
      ({
        kindercode: entry.kindergartenId,
        name: entry.kindergartenName,
        address: entry.kindergartenAddress,
        sido_code: entry.sidoCode,
        sigungu_code: '',
      } satisfies KindergartenEntry);
    const shippedReview =
      reviewLookup.get(buildGoldKey(entry.kindergartenId, entry.reviewId)) ?? null;
    const expectedKeep = entry.expectedStatus === 'verified';
    const predictedKeep = shippedReview !== null;

    binarySamples.push({ expectedKeep, predictedKeep });
    goldStatuses.push(entry.expectedStatus);
    if (expectedKeep) {
      expectedPresentCount += 1;
    }
    if (predictedKeep) {
      predictedPresentCount += 1;
    }

    const classificationTarget = shippedReview ?? {
      id: entry.reviewId,
      kindergartenId: entry.kindergartenId,
      title: entry.title,
      url: entry.url,
      source: entry.source,
      sourceName: entry.sourceName ?? '',
      snippet: entry.snippet,
      summary: entry.summary,
      date: null,
      collectedAt: '',
    };

    const classification = classifyReviewWithoutBody(classificationTarget, {
      kindergartenId: entry.kindergartenId,
      kindergartenName: kindergarten.name,
      kindergartenAddress: kindergarten.address,
      sidoCode: kindergarten.sido_code,
      sigunguCode: kindergarten.sigungu_code,
      coreNameFrequency:
        coreNameFrequencies.get(
          kindergarten.name
            .replace(/(?:유치원|어린이집)$/u, '')
            .replace(/병설$/u, '')
            .trim()
        ) ?? 1,
    });

    predictedStatuses.push(
      classification.finalStatus === 'uncertain'
        ? predictedKeep
          ? 'verified'
          : 'generic_info'
        : classification.finalStatus
    );
  }

  const binaryKeepRemove = buildBinaryMetrics(binarySamples);
  const perClass = buildClassMetrics(goldStatuses, predictedStatuses);

  return {
    generatedAt: new Date().toISOString(),
    goldPath,
    reviewsPath,
    totalSamples: goldEntries.length,
    binaryKeepRemove,
    removePrecision: ratio(
      binaryKeepRemove.tn,
      binaryKeepRemove.tn + binaryKeepRemove.fn
    ),
    perClass,
    predictedPresentCount,
    expectedPresentCount,
    contaminationKpis: {
      collisionGroupsOverThreshold: new Set(
        collisionResolutions.map((resolution) => resolution.normalizedUrl)
      ).size,
      unresolvedCollisionGroups: new Set(
        collisionResolutions
          .filter((resolution) => resolution.shouldRemove)
          .map((resolution) => resolution.normalizedUrl)
      ).size,
      unresolvedCollisionRows: collisionResolutions.filter(
        (resolution) => resolution.shouldRemove
      ).length,
    },
  };
}

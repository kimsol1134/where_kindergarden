import type {
  ReviewsData,
  ReviewVerificationStatus,
} from '../../src/types/review';
import { shouldRemoveReviewAfterVerification } from '../../src/lib/utils/review-verification';
import {
  loadKindergartens,
  loadReviewsData,
  splitReviewsBySigungu,
  writeCombinedReviews,
  writeJsonFile,
} from './review-verification-pipeline';

export interface ReviewVerificationDecision {
  reviewId: string;
  kindergartenId: string;
  sidoCode: string;
  status: ReviewVerificationStatus;
}

export interface ReviewVerificationApplySummary {
  removed: number;
  keptVerified: number;
  keptUncertain: number;
  untouched: number;
  byStatus: Record<ReviewVerificationStatus, number>;
}

export interface ReviewVerificationApplyResult {
  targetSidos: string[];
  summary: ReviewVerificationApplySummary;
  rebuiltCount: number | null;
}

export interface ApplyReviewVerificationOptions {
  dryRun?: boolean;
  noRebuild?: boolean;
}

function buildInitialSummary(): ReviewVerificationApplySummary {
  return {
    removed: 0,
    keptVerified: 0,
    keptUncertain: 0,
    untouched: 0,
    byStatus: {
      verified: 0,
      mismatch: 0,
      advertorial: 0,
      generic_info: 0,
      uncertain: 0,
    },
  };
}

export function applyReviewVerificationDecisions(
  decisions: readonly ReviewVerificationDecision[],
  options: ApplyReviewVerificationOptions = {}
): ReviewVerificationApplyResult {
  const decisionMap = new Map(
    decisions.map((decision) => [decision.reviewId, decision])
  );
  const targetSidos = Array.from(
    new Set(decisions.map((decision) => decision.sidoCode))
  ).toSorted();
  const kindergartens = loadKindergartens();
  const summary = buildInitialSummary();

  for (const sidoCode of targetSidos) {
    const sourceData = loadReviewsData(sidoCode);
    const updatedReviews: ReviewsData['reviews'] = {};

    for (const [kindergartenId, reviews] of Object.entries(sourceData.reviews)) {
      const nextReviews = reviews.filter((review) => {
        const decision = decisionMap.get(review.id);
        if (!decision) {
          summary.untouched += 1;
          return true;
        }

        summary.byStatus[decision.status] += 1;
        if (shouldRemoveReviewAfterVerification(decision.status)) {
          summary.removed += 1;
          return false;
        }

        if (decision.status === 'verified') {
          summary.keptVerified += 1;
          return true;
        }

        summary.keptUncertain += 1;
        return true;
      });

      if (nextReviews.length > 0) {
        updatedReviews[kindergartenId] = nextReviews;
      }
    }

    const nextData: ReviewsData = {
      version: new Date().toISOString().split('T')[0],
      totalCount: Object.values(updatedReviews).reduce(
        (accumulator, items) => accumulator + items.length,
        0
      ),
      kindergartenCount: Object.keys(updatedReviews).length,
      reviews: updatedReviews,
    };

    if (!options.dryRun) {
      writeJsonFile(`public/data/reviews/${sidoCode}.json`, nextData);
      splitReviewsBySigungu(sidoCode, nextData, kindergartens);
    }
  }

  let rebuiltCount: number | null = null;
  if (!options.dryRun && !options.noRebuild) {
    const combined = writeCombinedReviews();
    rebuiltCount = combined.totalCount;
  }

  return {
    targetSidos,
    summary,
    rebuiltCount,
  };
}

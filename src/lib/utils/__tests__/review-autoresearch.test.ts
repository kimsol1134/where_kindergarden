import { describe, expect, it } from 'vitest';
import type {
  ReviewAuditStats,
  ReviewQualityEvaluationReport,
} from '@/types/review';
import {
  buildInitialReviewAutoresearchState,
  decideReviewAutoresearchCycle,
  shouldStopReviewAutoresearch,
} from '../../../../scripts/review-autoresearch/lib/review-autoresearch';

function createStats(
  overrides: Partial<ReviewAuditStats> = {}
): ReviewAuditStats {
  return {
    generatedAt: '2026-04-05T00:00:00.000Z',
    auditPath: '/tmp/audit.jsonl',
    totalCount: 4277,
    auditedCount: 100,
    remainingCount: 4177,
    visibleCount: 4000,
    visibleVerifiedCount: 3600,
    invalidVisibleCount: 400,
    visiblePrecision: 0.9,
    byFinalStatus: {
      verified: 3600,
      mismatch: 100,
      advertorial: 100,
      generic_info: 100,
      uncertain: 0,
      unaudited: 377,
    },
    visibleByFinalStatus: {
      verified: 3600,
      mismatch: 100,
      advertorial: 100,
      generic_info: 100,
      uncertain: 0,
      unaudited: 100,
    },
    ...overrides,
  };
}

function createSecondaryReport(
  f1 = 0.99
): ReviewQualityEvaluationReport {
  return {
    generatedAt: '2026-04-05T00:00:00.000Z',
    goldPath: '/tmp/gold.jsonl',
    reviewsPath: '/tmp/reviews.json',
    totalSamples: 480,
    binaryKeepRemove: {
      precision: 0.99,
      recall: 0.99,
      f1,
      tp: 1,
      fp: 0,
      fn: 0,
      tn: 1,
    },
    removePrecision: 1,
    perClass: {
      verified: { precision: 1, recall: 1, f1: 1, support: 1, predicted: 1, correct: 1 },
      mismatch: { precision: 1, recall: 1, f1: 1, support: 1, predicted: 1, correct: 1 },
      advertorial: { precision: 1, recall: 1, f1: 1, support: 1, predicted: 1, correct: 1 },
      generic_info: { precision: 1, recall: 1, f1: 1, support: 1, predicted: 1, correct: 1 },
    },
    predictedPresentCount: 1,
    expectedPresentCount: 1,
    contaminationKpis: {
      collisionGroupsOverThreshold: 0,
      unresolvedCollisionGroups: 0,
      unresolvedCollisionRows: 0,
    },
  };
}

describe('review autoresearch loop helpers', () => {
  it('visible precision이 오르면 keep 한다', () => {
    const decision = decideReviewAutoresearchCycle(createStats({
      visiblePrecision: 0.95,
      invalidVisibleCount: 200,
    }), {
      bestVisiblePrecision: 0.9,
      bestInvalidVisibleCount: 400,
    });

    expect(decision.improved).toBe(true);
    expect(decision.reason).toContain('visible precision');
  });

  it('precision 동률이면 invalid visible count 감소시에만 keep 한다', () => {
    expect(
      decideReviewAutoresearchCycle(createStats({
        visiblePrecision: 0.9,
        invalidVisibleCount: 300,
      }), {
        bestVisiblePrecision: 0.9,
        bestInvalidVisibleCount: 400,
      }).improved
    ).toBe(true);

    expect(
      decideReviewAutoresearchCycle(createStats({
        visiblePrecision: 0.9,
        invalidVisibleCount: 400,
      }), {
        bestVisiblePrecision: 0.9,
        bestInvalidVisibleCount: 400,
      }).improved
    ).toBe(false);
  });

  it('전수 audit이 끝나기 전에는 precision이 높아도 stop 하지 않는다', () => {
    expect(
      shouldStopReviewAutoresearch(createStats({
        auditedCount: 4200,
        visiblePrecision: 0.99,
        invalidVisibleCount: 0,
      }), {
        auditUniverseCount: 4277,
        consecutiveNoImprovement: 0,
      })
    ).toBe(false);
  });

  it('전수 audit 완료 + threshold 달성 + invalid 0이면 stop 한다', () => {
    expect(
      shouldStopReviewAutoresearch(createStats({
        auditedCount: 4277,
        remainingCount: 0,
        visiblePrecision: 0.96,
        invalidVisibleCount: 0,
      }), {
        auditUniverseCount: 4277,
        consecutiveNoImprovement: 0,
      })
    ).toBe(true);
  });

  it('initial state는 audit universe와 secondary F1을 함께 저장한다', () => {
    const state = buildInitialReviewAutoresearchState(
      'tag-1',
      '/tmp/primary.json',
      '/tmp/secondary.json',
      {
        generatedAt: '2026-04-05T00:00:00.000Z',
        primaryStats: createStats(),
        secondaryReport: createSecondaryReport(0.987),
      }
    );

    expect(state.auditUniverseCount).toBe(4277);
    expect(state.bestVisiblePrecision).toBe(0.9);
    expect(state.bestSecondaryBinaryF1).toBe(0.987);
  });
});

import { describe, expect, it } from 'vitest';
import type {
  ReviewAuditStats,
  ReviewQualityEvaluationReport,
} from '@/types/review';
import {
  buildInitialReviewAutoresearchState,
  decideReviewAutoresearchCycle,
  decideReviewCollectionAutoresearchCycle,
  shouldStopReviewAutoresearch,
  shouldStopReviewCollectionAutoresearch,
} from '../../../../scripts/review-autoresearch/lib/review-autoresearch';
import type {
  ReviewCollectionGateResult,
  ReviewCollectionMetrics,
} from '../../../../scripts/review-autoresearch/lib/collection-policy';

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
  f1 = 0.99,
  precision = 0.99
): ReviewQualityEvaluationReport {
  return {
    generatedAt: '2026-04-05T00:00:00.000Z',
    goldPath: '/tmp/gold.jsonl',
    reviewsPath: '/tmp/reviews.json',
    totalSamples: 480,
    binaryKeepRemove: {
      precision,
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

function createCollectionMetrics(
  overrides: Partial<ReviewCollectionMetrics> = {}
): ReviewCollectionMetrics {
  return {
    targetSidoCode: '28',
    targetKindergartenCount: 390,
    incheonVisibleReviewCount: 105,
    incheonCoverageAt1Count: 60,
    incheonCoverageAt1Ratio: 0.1538,
    incheonCoverageAt3Count: 8,
    incheonCoverageAt3Ratio: 0.0205,
    incheonVerifiedLinkCount: 90,
    incheonQnaCompleteCount: 3,
    addedLinkCount: 10,
    addedLinkVerifiedCount: 10,
    addedLinkVerifiedRate: 1,
    crossKindergartenErrorCount: 0,
    qnaSummaryCompleteness: 1,
    researchScore: 1071.85,
    diagnostics: {
      kindergartensSearched: 20,
      candidatesFound: 80,
      candidatesOpened: 30,
      acceptedLinks: 10,
      duplicateRejections: 5,
      officialSourceRejections: 3,
      wrongLinkRejections: 12,
      blogReadSuccessRate: 0.9,
      cafeReadSuccessRate: 0.8,
      questionPostAcceptRate: 0.5,
    },
    ...overrides,
  };
}

function createGateResult(
  passed = true,
  failures: string[] = []
): ReviewCollectionGateResult {
  return {
    passed,
    failures,
  };
}

describe('review autoresearch loop helpers', () => {
  describe('decideReviewAutoresearchCycle', () => {
    it('binary F1이 오르고 precision floor 이상이면 keep 한다', () => {
      const decision = decideReviewAutoresearchCycle(
        createStats(),
        { bestSecondaryBinaryF1: 0.85, bestSecondaryBinaryPrecision: 0.98 },
        0.92,
        0.98
      );

      expect(decision.improved).toBe(true);
      expect(decision.reason).toContain('F1 improved');
    });

    it('binary F1이 올라도 precision floor 미달이면 reject 한다', () => {
      const decision = decideReviewAutoresearchCycle(
        createStats(),
        { bestSecondaryBinaryF1: 0.85, bestSecondaryBinaryPrecision: 0.98 },
        0.92,
        0.95
      );

      expect(decision.improved).toBe(false);
      expect(decision.reason).toContain('below floor');
    });

    it('F1 동률이면 precision이 더 높을 때만 keep 한다', () => {
      expect(
        decideReviewAutoresearchCycle(
          createStats(),
          { bestSecondaryBinaryF1: 0.92, bestSecondaryBinaryPrecision: 0.97 },
          0.92,
          0.99
        ).improved
      ).toBe(true);

      expect(
        decideReviewAutoresearchCycle(
          createStats(),
          { bestSecondaryBinaryF1: 0.92, bestSecondaryBinaryPrecision: 0.99 },
          0.92,
          0.99
        ).improved
      ).toBe(false);
    });

    it('F1이 내려가면 reject 한다', () => {
      const decision = decideReviewAutoresearchCycle(
        createStats(),
        { bestSecondaryBinaryF1: 0.95, bestSecondaryBinaryPrecision: 0.99 },
        0.93,
        0.99
      );

      expect(decision.improved).toBe(false);
    });
  });

  describe('shouldStopReviewAutoresearch', () => {
    it('전수 audit이 끝나기 전에는 F1이 높아도 stop 하지 않는다', () => {
      expect(
        shouldStopReviewAutoresearch(
          createStats({ auditedCount: 4200 }),
          { auditUniverseCount: 4277, consecutiveNoImprovement: 0 },
          0.96,
          0.99
        )
      ).toBe(false);
    });

    it('전수 audit 완료 + F1 >= 0.95 + precision >= 0.97이면 stop 한다', () => {
      expect(
        shouldStopReviewAutoresearch(
          createStats({ auditedCount: 4277, remainingCount: 0 }),
          { auditUniverseCount: 4277, consecutiveNoImprovement: 0 },
          0.96,
          0.98
        )
      ).toBe(true);
    });

    it('F1이 0.95 미만이면 stop 하지 않는다', () => {
      expect(
        shouldStopReviewAutoresearch(
          createStats({ auditedCount: 4277, remainingCount: 0 }),
          { auditUniverseCount: 4277, consecutiveNoImprovement: 0 },
          0.94,
          0.99
        )
      ).toBe(false);
    });

    it('연속 5회 개선 없으면 stop 한다', () => {
      expect(
        shouldStopReviewAutoresearch(
          createStats({ auditedCount: 4277, remainingCount: 0 }),
          { auditUniverseCount: 4277, consecutiveNoImprovement: 5 },
          0.85,
          0.99
        )
      ).toBe(true);
    });
  });

  describe('buildInitialReviewAutoresearchState', () => {
    it('audit universe와 secondary F1/precision을 함께 저장한다', () => {
      const state = buildInitialReviewAutoresearchState(
        'tag-1',
        '/tmp/primary.json',
        '/tmp/secondary.json',
        {
          generatedAt: '2026-04-05T00:00:00.000Z',
          primaryStats: createStats(),
          secondaryReport: createSecondaryReport(0.987, 0.995),
        }
      );

      expect(state.auditUniverseCount).toBe(4277);
      expect(state.bestVisiblePrecision).toBe(0.9);
      expect(state.bestSecondaryBinaryF1).toBe(0.987);
      expect(state.bestSecondaryBinaryPrecision).toBe(0.995);
    });
  });

  describe('decideReviewCollectionAutoresearchCycle', () => {
    it('gate를 통과하고 research score가 오르면 keep 한다', () => {
      const decision = decideReviewCollectionAutoresearchCycle(
        createCollectionMetrics({ researchScore: 1200 }),
        { bestResearchScore: 1100 },
        createSecondaryReport(0.997, 0.995),
        createGateResult(true)
      );

      expect(decision.improved).toBe(true);
      expect(decision.gatePassed).toBe(true);
      expect(decision.reason).toContain('research score improved');
    });

    it('gate 실패면 score와 무관하게 discard 한다', () => {
      const decision = decideReviewCollectionAutoresearchCycle(
        createCollectionMetrics({ researchScore: 1200 }),
        { bestResearchScore: 1100 },
        createSecondaryReport(0.997, 0.995),
        createGateResult(false, ['global binary precision below 0.99'])
      );

      expect(decision.improved).toBe(false);
      expect(decision.gatePassed).toBe(false);
      expect(decision.reason).toContain('below 0.99');
    });
  });

  describe('shouldStopReviewCollectionAutoresearch', () => {
    it('Coverage@1이 1이고 gate를 통과하면 stop 한다', () => {
      expect(
        shouldStopReviewCollectionAutoresearch(
          createCollectionMetrics({ incheonCoverageAt1Ratio: 1 }),
          { consecutiveNoImprovement: 0 },
          createGateResult(true)
        )
      ).toBe(true);
    });

    it('연속 5회 개선 없으면 stop 한다', () => {
      expect(
        shouldStopReviewCollectionAutoresearch(
          createCollectionMetrics({ incheonCoverageAt1Ratio: 0.4 }),
          { consecutiveNoImprovement: 5 },
          createGateResult(false, ['no improvement'])
        )
      ).toBe(true);
    });
  });
});

import { describe, expect, it } from 'vitest';
import type {
  ReviewVerificationApplyReport,
  ReviewVerificationQaSampleReport,
  ReviewVerificationRunReport,
} from '@/types/review';
import {
  buildReviewVerificationWorkflowOutputs,
  buildReviewVerificationWorkflowSummary,
  formatReviewVerificationWorkflowSummaryMarkdown,
} from '@/lib/utils/review-verification-ci';

function createBaseRunReport(): ReviewVerificationRunReport {
  return {
    generatedAt: '2026-03-12T05:00:00.000Z',
    targetSidos: ['11', '41'],
    totalReviewsSeen: 2475,
    reusedCount: 2475,
    newlyEvaluatedCount: 0,
    newlyScrapedCount: 0,
    cachedBodyCount: 0,
    statusSummary: {
      verified: 2475,
      mismatch: 0,
      advertorial: 0,
      generic_info: 0,
      uncertain: 0,
    },
    changedDecisions: [],
    newlyRemoved: [],
    newlyVerified: [],
  };
}

function createBaseQaReport(): ReviewVerificationQaSampleReport {
  return {
    generatedAt: '2026-03-12T05:00:00.000Z',
    targetSidos: ['11', '41'],
    sampleSize: 5,
    seed: 42,
    newlyVerifiedSamples: [],
    newlyRemovedSamples: [],
  };
}

function createApplyReport(dryRun: boolean): ReviewVerificationApplyReport {
  return {
    generatedAt: '2026-03-12T05:00:00.000Z',
    inputPath: 'scripts/data-output/review-verification-results-11-41.json',
    dryRun,
    rebuiltCount: dryRun ? null : 2475,
    summary: {
      removed: 0,
      keptVerified: 2475,
      keptUncertain: 0,
      untouched: 0,
      byStatus: {
        verified: 2475,
        mismatch: 0,
        advertorial: 0,
        generic_info: 0,
        uncertain: 0,
      },
    },
  };
}

describe('review verification workflow summary', () => {
  it('신규 검토가 없을 때 summary와 outputs를 안정적으로 만든다', () => {
    const summary = buildReviewVerificationWorkflowSummary({
      mode: 'review-only',
      runReport: createBaseRunReport(),
      qaReport: createBaseQaReport(),
      applyReport: createApplyReport(true),
    });

    expect(summary.hasNewlyEvaluatedReviews).toBe(false);
    expect(summary.newlyVerifiedCount).toBe(0);
    expect(summary.newlyRemovedCount).toBe(0);

    expect(buildReviewVerificationWorkflowOutputs(summary)).toMatchObject({
      mode: 'review-only',
      has_new_reviews: 'false',
      reused_count: '2475',
      newly_evaluated_count: '0',
      newly_verified_count: '0',
      newly_removed_count: '0',
      apply_dry_run: 'true',
    });

    const markdown = formatReviewVerificationWorkflowSummaryMarkdown(summary);
    expect(markdown).toContain('신규/변경 리뷰 검토 발생: **없음**');
    expect(markdown).toContain('| reusedCount | 2475 |');
    expect(markdown).toContain('- dryRun: true');
  });

  it('신규 검토가 있을 때 QA 샘플과 apply 결과를 보여준다', () => {
    const runReport: ReviewVerificationRunReport = {
      ...createBaseRunReport(),
      reusedCount: 2473,
      newlyEvaluatedCount: 2,
      changedDecisions: [
        {
          reviewId: 'rev-1',
          kindergartenId: 'kid-1',
          kindergartenName: '행복한유치원',
          normalizedUrl: 'blog.naver.com/post/1',
          url: 'https://blog.naver.com/post/1',
          title: '행복한유치원 후기',
          snippet: '첫 등원 후기',
          previousStatus: null,
          nextStatus: 'verified',
          confidence: 0.95,
          reviewedAt: '2026-03-12T05:00:00.000Z',
          reused: false,
        },
        {
          reviewId: 'rev-2',
          kindergartenId: 'kid-2',
          kindergartenName: '무지개유치원',
          normalizedUrl: 'blog.naver.com/post/2',
          url: 'https://blog.naver.com/post/2',
          title: '무지개유치원 광고',
          snippet: '광고성 글',
          previousStatus: 'verified',
          nextStatus: 'advertorial',
          confidence: 0.91,
          reviewedAt: '2026-03-12T05:00:00.000Z',
          reused: false,
        },
      ],
      newlyVerified: [
        {
          reviewId: 'rev-1',
          kindergartenId: 'kid-1',
          kindergartenName: '행복한유치원',
          normalizedUrl: 'blog.naver.com/post/1',
          url: 'https://blog.naver.com/post/1',
          title: '행복한유치원 후기',
          snippet: '첫 등원 후기',
          previousStatus: null,
          nextStatus: 'verified',
          confidence: 0.95,
          reviewedAt: '2026-03-12T05:00:00.000Z',
          reused: false,
        },
      ],
      newlyRemoved: [
        {
          reviewId: 'rev-2',
          kindergartenId: 'kid-2',
          kindergartenName: '무지개유치원',
          normalizedUrl: 'blog.naver.com/post/2',
          url: 'https://blog.naver.com/post/2',
          title: '무지개유치원 광고',
          snippet: '광고성 글',
          previousStatus: 'verified',
          nextStatus: 'advertorial',
          confidence: 0.91,
          reviewedAt: '2026-03-12T05:00:00.000Z',
          reused: false,
        },
      ],
    };
    const qaReport: ReviewVerificationQaSampleReport = {
      ...createBaseQaReport(),
      newlyVerifiedSamples: runReport.newlyVerified,
      newlyRemovedSamples: runReport.newlyRemoved,
    };
    const summary = buildReviewVerificationWorkflowSummary({
      mode: 'apply',
      runReport,
      qaReport,
      applyReport: {
        ...createApplyReport(false),
        summary: {
          removed: 1,
          keptVerified: 2474,
          keptUncertain: 0,
          untouched: 0,
          byStatus: {
            verified: 2474,
            mismatch: 0,
            advertorial: 1,
            generic_info: 0,
            uncertain: 0,
          },
        },
      },
    });

    expect(summary.hasNewlyEvaluatedReviews).toBe(true);
    expect(summary.qaNewlyVerifiedSampleCount).toBe(1);
    expect(summary.qaNewlyRemovedSampleCount).toBe(1);

    const markdown = formatReviewVerificationWorkflowSummaryMarkdown(summary);
    expect(markdown).toContain('신규/변경 리뷰 검토 발생: **있음**');
    expect(markdown).toContain('행복한유치원');
    expect(markdown).toContain('무지개유치원');
    expect(markdown).toContain('- removed: 1');
  });
});

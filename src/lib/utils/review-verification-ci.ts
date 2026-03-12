import type {
  ReviewVerificationApplyReport,
  ReviewVerificationQaSampleReport,
  ReviewVerificationRunReport,
  ReviewVerificationRunReportItem,
} from '@/types/review';

export type ReviewVerificationWorkflowMode = 'review-only' | 'apply';

export interface ReviewVerificationWorkflowPreviewItem {
  reviewId: string;
  kindergartenName: string;
  nextStatus: ReviewVerificationRunReportItem['nextStatus'];
  confidence: number;
  reused: boolean;
}

export interface ReviewVerificationWorkflowSummary {
  mode: ReviewVerificationWorkflowMode;
  generatedAt: string;
  targetSidos: string[];
  totalReviewsSeen: number;
  reusedCount: number;
  newlyEvaluatedCount: number;
  newlyScrapedCount: number;
  cachedBodyCount: number;
  changedDecisionCount: number;
  newlyVerifiedCount: number;
  newlyRemovedCount: number;
  hasNewlyEvaluatedReviews: boolean;
  qaSampleSize: number;
  qaSeed: number;
  qaNewlyVerifiedSampleCount: number;
  qaNewlyRemovedSampleCount: number;
  newlyVerifiedSamples: ReviewVerificationWorkflowPreviewItem[];
  newlyRemovedSamples: ReviewVerificationWorkflowPreviewItem[];
  applyReport: ReviewVerificationApplyReport | null;
}

export interface BuildReviewVerificationWorkflowSummaryOptions {
  mode: ReviewVerificationWorkflowMode;
  runReport: ReviewVerificationRunReport;
  qaReport: ReviewVerificationQaSampleReport;
  applyReport?: ReviewVerificationApplyReport | null;
}

function buildPreviewItems(
  items: readonly ReviewVerificationRunReportItem[]
): ReviewVerificationWorkflowPreviewItem[] {
  return items.map((item) => ({
    reviewId: item.reviewId,
    kindergartenName: item.kindergartenName,
    nextStatus: item.nextStatus,
    confidence: item.confidence,
    reused: item.reused,
  }));
}

function escapeMarkdownCell(value: string): string {
  return value.replace(/\|/g, '\\|');
}

function formatSampleTable(
  title: string,
  items: readonly ReviewVerificationWorkflowPreviewItem[]
): string {
  const lines = [`### ${title}`];

  if (items.length === 0) {
    lines.push('- 샘플 없음');
    return lines.join('\n');
  }

  lines.push('| reviewId | 유치원 | 판정 | confidence | 재사용 |');
  lines.push('| --- | --- | --- | ---: | --- |');

  for (const item of items) {
    lines.push(
      `| ${escapeMarkdownCell(item.reviewId)} | ${escapeMarkdownCell(
        item.kindergartenName
      )} | ${item.nextStatus} | ${item.confidence.toFixed(2)} | ${
        item.reused ? 'yes' : 'no'
      } |`
    );
  }

  return lines.join('\n');
}

export function buildReviewVerificationWorkflowSummary(
  options: BuildReviewVerificationWorkflowSummaryOptions
): ReviewVerificationWorkflowSummary {
  const {
    mode,
    runReport,
    qaReport,
    applyReport = null,
  } = options;

  return {
    mode,
    generatedAt: runReport.generatedAt,
    targetSidos: runReport.targetSidos,
    totalReviewsSeen: runReport.totalReviewsSeen,
    reusedCount: runReport.reusedCount,
    newlyEvaluatedCount: runReport.newlyEvaluatedCount,
    newlyScrapedCount: runReport.newlyScrapedCount,
    cachedBodyCount: runReport.cachedBodyCount,
    changedDecisionCount: runReport.changedDecisions.length,
    newlyVerifiedCount: runReport.newlyVerified.length,
    newlyRemovedCount: runReport.newlyRemoved.length,
    hasNewlyEvaluatedReviews: runReport.newlyEvaluatedCount > 0,
    qaSampleSize: qaReport.sampleSize,
    qaSeed: qaReport.seed,
    qaNewlyVerifiedSampleCount: qaReport.newlyVerifiedSamples.length,
    qaNewlyRemovedSampleCount: qaReport.newlyRemovedSamples.length,
    newlyVerifiedSamples: buildPreviewItems(qaReport.newlyVerifiedSamples),
    newlyRemovedSamples: buildPreviewItems(qaReport.newlyRemovedSamples),
    applyReport,
  };
}

export function buildReviewVerificationWorkflowOutputs(
  summary: ReviewVerificationWorkflowSummary
): Record<string, string> {
  return {
    mode: summary.mode,
    target_sidos: summary.targetSidos.join(','),
    has_new_reviews: String(summary.hasNewlyEvaluatedReviews),
    total_reviews_seen: String(summary.totalReviewsSeen),
    reused_count: String(summary.reusedCount),
    newly_evaluated_count: String(summary.newlyEvaluatedCount),
    newly_scraped_count: String(summary.newlyScrapedCount),
    cached_body_count: String(summary.cachedBodyCount),
    changed_decision_count: String(summary.changedDecisionCount),
    newly_verified_count: String(summary.newlyVerifiedCount),
    newly_removed_count: String(summary.newlyRemovedCount),
    qa_newly_verified_sample_count: String(summary.qaNewlyVerifiedSampleCount),
    qa_newly_removed_sample_count: String(summary.qaNewlyRemovedSampleCount),
    apply_dry_run: String(summary.applyReport?.dryRun ?? true),
    apply_removed_count: String(summary.applyReport?.summary.removed ?? 0),
  };
}

export function formatReviewVerificationWorkflowSummaryMarkdown(
  summary: ReviewVerificationWorkflowSummary
): string {
  const lines = [
    '# Review Verification Incremental',
    '',
    `- 모드: \`${summary.mode}\``,
    `- 대상 시도: \`${summary.targetSidos.join(',')}\``,
    `- 신규/변경 리뷰 검토 발생: **${
      summary.hasNewlyEvaluatedReviews ? '있음' : '없음'
    }**`,
    `- 생성 시각: \`${summary.generatedAt}\``,
    '',
    '| 항목 | 값 |',
    '| --- | ---: |',
    `| totalReviewsSeen | ${summary.totalReviewsSeen} |`,
    `| reusedCount | ${summary.reusedCount} |`,
    `| newlyEvaluatedCount | ${summary.newlyEvaluatedCount} |`,
    `| newlyScrapedCount | ${summary.newlyScrapedCount} |`,
    `| cachedBodyCount | ${summary.cachedBodyCount} |`,
    `| changedDecisionCount | ${summary.changedDecisionCount} |`,
    `| newlyVerified | ${summary.newlyVerifiedCount} |`,
    `| newlyRemoved | ${summary.newlyRemovedCount} |`,
    '',
    '## QA Samples',
    `- 요청 샘플 수: ${summary.qaSampleSize}`,
    `- newlyVerifiedSamples: ${summary.qaNewlyVerifiedSampleCount}`,
    `- newlyRemovedSamples: ${summary.qaNewlyRemovedSampleCount}`,
    `- seed: ${summary.qaSeed}`,
    '',
    formatSampleTable('Newly Verified Samples', summary.newlyVerifiedSamples),
    '',
    formatSampleTable('Newly Removed Samples', summary.newlyRemovedSamples),
  ];

  if (summary.applyReport) {
    lines.push(
      '',
      '## Apply Report',
      `- dryRun: ${summary.applyReport.dryRun ? 'true' : 'false'}`,
      `- removed: ${summary.applyReport.summary.removed}`,
      `- keptVerified: ${summary.applyReport.summary.keptVerified}`,
      `- keptUncertain: ${summary.applyReport.summary.keptUncertain}`,
      `- untouched: ${summary.applyReport.summary.untouched}`,
      `- rebuiltCount: ${
        summary.applyReport.rebuiltCount === null
          ? 'n/a'
          : String(summary.applyReport.rebuiltCount)
      }`
    );
  }

  return lines.join('\n');
}

import type {
  ReviewAuditStats,
  ReviewQualityEvaluationReport,
} from '../../../src/types/review';

export interface ReviewAutoresearchState {
  tag: string;
  cyclesCompleted: number;
  auditUniverseCount: number;
  bestVisiblePrecision: number;
  bestInvalidVisibleCount: number;
  bestVisibleCount: number;
  bestAuditedCount: number;
  bestPrimaryReportPath: string;
  bestSecondaryBinaryF1: number;
  bestSecondaryReportPath: string;
  consecutiveNoImprovement: number;
  lastUpdatedAt: string;
}

export interface ReviewAutoresearchCycleDecision {
  improved: boolean;
  reason: string;
}

export function decideReviewAutoresearchCycle(
  currentStats: ReviewAuditStats,
  state: Pick<
    ReviewAutoresearchState,
    'bestVisiblePrecision' | 'bestInvalidVisibleCount'
  >
): ReviewAutoresearchCycleDecision {
  if (currentStats.visiblePrecision > state.bestVisiblePrecision) {
    return {
      improved: true,
      reason: 'visible precision improved',
    };
  }

  if (
    currentStats.visiblePrecision === state.bestVisiblePrecision &&
    currentStats.invalidVisibleCount < state.bestInvalidVisibleCount
  ) {
    return {
      improved: true,
      reason: 'visible precision tied and invalid visible count decreased',
    };
  }

  return {
    improved: false,
    reason: 'no precision gain or invalid visible reduction',
  };
}

export function shouldStopReviewAutoresearch(
  currentStats: ReviewAuditStats,
  state: Pick<ReviewAutoresearchState, 'auditUniverseCount' | 'consecutiveNoImprovement'>
): boolean {
  if (currentStats.auditedCount < state.auditUniverseCount) {
    return false;
  }

  if (
    currentStats.visiblePrecision >= 0.95 &&
    currentStats.invalidVisibleCount === 0
  ) {
    return true;
  }

  return state.consecutiveNoImprovement >= 5;
}

export interface ReviewAutoresearchCycleReport {
  generatedAt: string;
  primaryStats: ReviewAuditStats;
  secondaryReport: ReviewQualityEvaluationReport;
}

export function buildInitialReviewAutoresearchState(
  tag: string,
  primaryReportPath: string,
  secondaryReportPath: string,
  cycleReport: ReviewAutoresearchCycleReport
): ReviewAutoresearchState {
  return {
    tag,
    cyclesCompleted: 0,
    auditUniverseCount: cycleReport.primaryStats.totalCount,
    bestVisiblePrecision: cycleReport.primaryStats.visiblePrecision,
    bestInvalidVisibleCount: cycleReport.primaryStats.invalidVisibleCount,
    bestVisibleCount: cycleReport.primaryStats.visibleCount,
    bestAuditedCount: cycleReport.primaryStats.auditedCount,
    bestPrimaryReportPath: primaryReportPath,
    bestSecondaryBinaryF1: cycleReport.secondaryReport.binaryKeepRemove.f1,
    bestSecondaryReportPath: secondaryReportPath,
    consecutiveNoImprovement: 0,
    lastUpdatedAt: new Date().toISOString(),
  };
}

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
  bestSecondaryBinaryPrecision: number;
  bestSecondaryReportPath: string;
  consecutiveNoImprovement: number;
  lastUpdatedAt: string;
}

export interface ReviewAutoresearchCycleDecision {
  improved: boolean;
  reason: string;
}

const PRECISION_FLOOR = 0.97;

export function decideReviewAutoresearchCycle(
  currentStats: ReviewAuditStats,
  state: Pick<
    ReviewAutoresearchState,
    'bestSecondaryBinaryF1' | 'bestSecondaryBinaryPrecision'
  >,
  currentBinaryF1: number,
  currentBinaryPrecision: number
): ReviewAutoresearchCycleDecision {
  if (currentBinaryPrecision < PRECISION_FLOOR) {
    return {
      improved: false,
      reason: `binary precision ${currentBinaryPrecision.toFixed(4)} below floor ${PRECISION_FLOOR}`,
    };
  }

  if (currentBinaryF1 > state.bestSecondaryBinaryF1) {
    return {
      improved: true,
      reason: `binary F1 improved: ${state.bestSecondaryBinaryF1.toFixed(4)} → ${currentBinaryF1.toFixed(4)}`,
    };
  }

  if (
    currentBinaryF1 === state.bestSecondaryBinaryF1 &&
    currentBinaryPrecision > state.bestSecondaryBinaryPrecision
  ) {
    return {
      improved: true,
      reason: 'binary F1 tied, precision improved',
    };
  }

  return {
    improved: false,
    reason: `no F1 gain (current ${currentBinaryF1.toFixed(4)} vs best ${state.bestSecondaryBinaryF1.toFixed(4)})`,
  };
}

export function shouldStopReviewAutoresearch(
  currentStats: ReviewAuditStats,
  state: Pick<ReviewAutoresearchState, 'auditUniverseCount' | 'consecutiveNoImprovement'>,
  currentBinaryF1: number,
  currentBinaryPrecision: number
): boolean {
  if (currentStats.auditedCount < state.auditUniverseCount) {
    return false;
  }

  if (currentBinaryF1 >= 0.95 && currentBinaryPrecision >= PRECISION_FLOOR) {
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
    bestSecondaryBinaryPrecision: cycleReport.secondaryReport.binaryKeepRemove.precision,
    bestSecondaryReportPath: secondaryReportPath,
    consecutiveNoImprovement: 0,
    lastUpdatedAt: new Date().toISOString(),
  };
}

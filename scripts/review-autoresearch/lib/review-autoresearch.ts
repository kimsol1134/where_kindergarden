import type {
  ReviewAuditStats,
  ReviewQualityEvaluationReport,
} from '../../../src/types/review';
import type {
  ReviewCollectionGateResult,
  ReviewCollectionMetrics,
} from './collection-policy';

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
  bestResearchScore?: number;
  bestCoverageAt1Ratio?: number;
  bestCoverageAt3Ratio?: number;
  bestIncheonVerifiedLinkCount?: number;
  bestIncheonQnaCompleteCount?: number;
  searchedKindergartenIds?: string[];
  targetSidoCode?: string;
  cycleSize?: number;
  workingRegionPath?: string;
  workingCombinedPath?: string;
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
  collectionMetrics?: ReviewCollectionMetrics;
  gateResult?: ReviewCollectionGateResult;
  rawBatchPath?: string;
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
    bestResearchScore: cycleReport.collectionMetrics?.researchScore,
    bestCoverageAt1Ratio: cycleReport.collectionMetrics?.incheonCoverageAt1Ratio,
    bestCoverageAt3Ratio: cycleReport.collectionMetrics?.incheonCoverageAt3Ratio,
    bestIncheonVerifiedLinkCount: cycleReport.collectionMetrics?.incheonVerifiedLinkCount,
    bestIncheonQnaCompleteCount: cycleReport.collectionMetrics?.incheonQnaCompleteCount,
    searchedKindergartenIds: [],
    targetSidoCode: cycleReport.collectionMetrics?.targetSidoCode,
    consecutiveNoImprovement: 0,
    lastUpdatedAt: new Date().toISOString(),
  };
}

export interface ReviewCollectionAutoresearchDecision {
  improved: boolean;
  reason: string;
  gatePassed: boolean;
}

export function decideReviewCollectionAutoresearchCycle(
  metrics: ReviewCollectionMetrics,
  state: Pick<
    ReviewAutoresearchState,
    | 'bestResearchScore'
    | 'bestCoverageAt1Ratio'
    | 'bestCoverageAt3Ratio'
    | 'bestIncheonVerifiedLinkCount'
    | 'bestIncheonQnaCompleteCount'
  >,
  secondaryReport: Pick<ReviewQualityEvaluationReport, 'binaryKeepRemove'>,
  gateResult: ReviewCollectionGateResult
): ReviewCollectionAutoresearchDecision {
  if (!gateResult.passed) {
    return {
      improved: false,
      reason: gateResult.failures.join('; '),
      gatePassed: false,
    };
  }

  const bestResearchScore = state.bestResearchScore ?? Number.NEGATIVE_INFINITY;
  if (metrics.researchScore > bestResearchScore) {
    return {
      improved: true,
      reason: `research score improved: ${
        Number.isFinite(bestResearchScore)
          ? bestResearchScore.toFixed(6)
          : 'none'
      } → ${metrics.researchScore.toFixed(6)}`,
      gatePassed: true,
    };
  }

  if (metrics.researchScore < bestResearchScore) {
    return {
      improved: false,
      reason: `research score did not improve (${metrics.researchScore.toFixed(6)} vs best ${bestResearchScore.toFixed(6)})`,
      gatePassed: true,
    };
  }

  if ((metrics.incheonCoverageAt1Ratio ?? 0) > (state.bestCoverageAt1Ratio ?? 0)) {
    return {
      improved: true,
      reason: 'research score tied, Coverage@1 improved',
      gatePassed: true,
    };
  }

  if ((metrics.incheonCoverageAt3Ratio ?? 0) > (state.bestCoverageAt3Ratio ?? 0)) {
    return {
      improved: true,
      reason: 'research score tied, Coverage@3 improved',
      gatePassed: true,
    };
  }

  if (
    (metrics.incheonVerifiedLinkCount ?? 0) >
    (state.bestIncheonVerifiedLinkCount ?? 0)
  ) {
    return {
      improved: true,
      reason: 'research score tied, verified link count improved',
      gatePassed: true,
    };
  }

  if (
    metrics.incheonQnaCompleteCount > (state.bestIncheonQnaCompleteCount ?? 0) &&
    secondaryReport.binaryKeepRemove.precision >= 0.99
  ) {
    return {
      improved: true,
      reason: 'research score tied, complete Q&A count improved',
      gatePassed: true,
    };
  }

  return {
    improved: false,
    reason: `research score tied without a collection metric gain (${metrics.researchScore.toFixed(6)})`,
    gatePassed: true,
  };
}

export function shouldStopReviewCollectionAutoresearch(
  metrics: ReviewCollectionMetrics,
  state: Pick<ReviewAutoresearchState, 'consecutiveNoImprovement'>,
  gateResult: ReviewCollectionGateResult
): boolean {
  if (metrics.incheonCoverageAt1Ratio >= 1 && gateResult.passed) {
    return true;
  }

  return state.consecutiveNoImprovement >= 5;
}

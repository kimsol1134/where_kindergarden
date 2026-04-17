import * as fs from 'fs';
import * as path from 'path';
import type {
  ReviewAuditStats,
  ReviewLink,
  ReviewQualityEvaluationReport,
  ReviewVerificationStatus,
  ReviewsData,
} from '../../src/types/review';
import {
  buildKindergartenCoreName,
  classifyReviewWithoutBody,
} from '../../src/lib/utils/review-verification';
import { evaluateReviewQuality } from '../evals/lib/review-quality-eval';
import {
  buildReviewAuditStats,
  parseReviewAuditJsonl,
} from '../evals/lib/review-audit';
import {
  collectGlobalNormalizedUrls,
  mergeRawReviewsIntoRegionData,
  mergeRegionIntoCombinedReviews,
  readJsonFile,
  writeJsonFile,
  buildReviewLinkFromRaw,
} from '../lib/review-curation';
import {
  buildCoreNameFrequencyMap,
  loadKindergartens,
  type KindergartenEntry,
} from '../lib/review-verification-pipeline';
import {
  COLLECTION_POLICY_SURFACES,
  computeReviewCollectionMetrics,
  evaluateReviewCollectionGates,
  type ReviewCollectionDiagnostics,
  type ReviewCollectionMetrics,
} from './lib/collection-policy';
import { runNaverCollectionCycle } from './lib/naver-collector';
import {
  buildInitialReviewAutoresearchState,
  decideReviewAutoresearchCycle,
  decideReviewCollectionAutoresearchCycle,
  shouldStopReviewAutoresearch,
  shouldStopReviewCollectionAutoresearch,
  type ReviewAutoresearchCycleReport,
  type ReviewAutoresearchState,
} from './lib/review-autoresearch';
import {
  ensureDirectory,
  restoreAssets,
  snapshotAssets,
  type SnapshotAsset,
} from './lib/session-snapshot';

const LEGACY_POLICY_SURFACES = [
  'src/lib/utils/review-utils.ts',
  'src/lib/utils/review-verification.ts',
  'scripts/lib/review-verification-pipeline.ts',
  'scripts/evals/review-audit-autofill.ts',
] as const;

const TARGET_SIDO_CODE = '28';

interface CollectionSessionPaths {
  baseDir: string;
  sessionsDir: string;
  cyclesDir: string;
  rawDir: string;
  snapshotsDir: string;
  bestSnapshotDir: string;
  workingDir: string;
  workingCombinedPath: string;
  workingRegionPath: string;
  statePath: string;
  resultsPath: string;
}

function getArgValue(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag);
  if (index === -1) {
    return undefined;
  }

  return args[index + 1];
}

function hasFlag(args: string[], flag: string): boolean {
  return args.includes(flag);
}

function loadGoldEntries(filePath: string) {
  return fs
    .readFileSync(filePath, 'utf-8')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line));
}

function resolveSessionTag(providedTag: string | undefined): string {
  if (providedTag) {
    return providedTag;
  }

  return new Date().toISOString().split('T')[0].replace(/-/g, '');
}

function appendTsvRow(filePath: string, values: string[]): void {
  const escaped = values.map((value) => value.replace(/\t/g, ' ').replace(/\n/g, ' '));
  fs.appendFileSync(filePath, `${escaped.join('\t')}\n`);
}

function ensureResultsFile(filePath: string): void {
  if (fs.existsSync(filePath)) {
    return;
  }

  fs.writeFileSync(
    filePath,
    'tag\tcycle\tpolicy_surface\tresearch_score\tcoverage_at_1\tcoverage_at_3\tvisible_review_count\tverified_link_count\tqna_complete_count\tadded_link_verified_rate\tglobal_binary_precision\tglobal_binary_f1\tstatus\tdescription\ttimestamp\n'
  );
}

function buildLegacyPolicyAssets(): SnapshotAsset[] {
  return LEGACY_POLICY_SURFACES.map((filePath) => ({
    sourcePath: path.resolve(filePath),
    relativePath: filePath,
  }));
}

function buildCollectionPolicyAssets(paths: CollectionSessionPaths): SnapshotAsset[] {
  const policyAssets = COLLECTION_POLICY_SURFACES.map((filePath) => ({
    sourcePath: path.resolve(filePath),
    relativePath: filePath,
  }));

  return [
    ...policyAssets,
    {
      sourcePath: paths.workingCombinedPath,
      relativePath: 'working/public/data/reviews.json',
    },
    {
      sourcePath: paths.workingRegionPath,
      relativePath: 'working/public/data/reviews/28.json',
    },
  ];
}

function runEvaluation(
  goldPath: string,
  reviewsPath: string
): ReviewQualityEvaluationReport {
  const goldEntries = loadGoldEntries(goldPath);
  const reviewsData = readJsonFile<ReviewsData>(reviewsPath);
  const kindergartens = loadKindergartens();

  return evaluateReviewQuality({
    goldEntries,
    reviewsData,
    kindergartens,
    goldPath,
    reviewsPath,
  });
}

function runPrimaryAuditStats(auditPath: string): ReviewAuditStats {
  return buildReviewAuditStats(
    parseReviewAuditJsonl(fs.readFileSync(auditPath, 'utf-8')),
    auditPath
  );
}

function buildCollectionSessionPaths(tag: string): CollectionSessionPaths {
  const baseDir = path.resolve('scripts/review-autoresearch');
  const sessionsDir = path.join(baseDir, 'sessions', tag);
  const workingDir = path.join(sessionsDir, 'working');

  return {
    baseDir,
    sessionsDir,
    cyclesDir: path.join(sessionsDir, 'cycles'),
    rawDir: path.join(sessionsDir, 'raw'),
    snapshotsDir: path.join(sessionsDir, 'snapshots'),
    bestSnapshotDir: path.join(sessionsDir, 'snapshots', 'best'),
    workingDir,
    workingCombinedPath: path.join(workingDir, 'public/data/reviews.json'),
    workingRegionPath: path.join(workingDir, 'public/data/reviews/28.json'),
    statePath: path.join(sessionsDir, 'state.json'),
    resultsPath: path.join(sessionsDir, 'results.tsv'),
  };
}

function ensureCollectionWorkingSet(paths: CollectionSessionPaths): void {
  ensureDirectory(paths.cyclesDir);
  ensureDirectory(paths.rawDir);
  ensureDirectory(paths.snapshotsDir);
  ensureDirectory(path.dirname(paths.workingCombinedPath));
  ensureDirectory(path.dirname(paths.workingRegionPath));
  ensureResultsFile(paths.resultsPath);

  if (!fs.existsSync(paths.workingCombinedPath)) {
    fs.copyFileSync(
      path.resolve('public/data/reviews.json'),
      paths.workingCombinedPath
    );
  }

  if (!fs.existsSync(paths.workingRegionPath)) {
    fs.copyFileSync(
      path.resolve('public/data/reviews/28.json'),
      paths.workingRegionPath
    );
  }
}

function buildZeroDiagnostics(): ReviewCollectionDiagnostics {
  return {
    kindergartensSearched: 0,
    candidatesFound: 0,
    candidatesOpened: 0,
    acceptedLinks: 0,
    duplicateRejections: 0,
    officialSourceRejections: 0,
    wrongLinkRejections: 0,
    blogReadSuccessRate: 0,
    cafeReadSuccessRate: 0,
    questionPostAcceptRate: 0,
  };
}

function buildVerificationContext(
  kindergarten: KindergartenEntry,
  coreNameFrequencies: Map<string, number>
) {
  const coreName = buildKindergartenCoreName(kindergarten.name);
  return {
    kindergartenId: kindergarten.kindercode,
    kindergartenName: kindergarten.name,
    kindergartenAddress: kindergarten.address,
    sidoCode: kindergarten.sido_code,
    sigunguCode: kindergarten.sigungu_code,
    coreNameFrequency: coreNameFrequencies.get(coreName) ?? 1,
  };
}

function evaluateAddedReviews(
  reviews: readonly ReviewLink[],
  kindergartens: readonly KindergartenEntry[]
): ReviewVerificationStatus[] {
  const kindergartenMap = new Map(
    kindergartens.map((kindergarten) => [kindergarten.kindercode, kindergarten])
  );
  const coreNameFrequencies = buildCoreNameFrequencyMap(kindergartens);

  return reviews.map((review) => {
    const kindergarten = kindergartenMap.get(review.kindergartenId);
    if (!kindergarten) {
      return 'mismatch';
    }

    return classifyReviewWithoutBody(
      review,
      buildVerificationContext(kindergarten, coreNameFrequencies)
    ).finalStatus;
  });
}

function writeCollectionCycleArtifacts(
  paths: CollectionSessionPaths,
  cycleNumber: number,
  cycleReport: ReviewAutoresearchCycleReport,
  primaryReport: ReviewAuditStats,
  secondaryReport: ReviewQualityEvaluationReport
): void {
  const cycleTag = String(cycleNumber).padStart(3, '0');
  writeJsonFile(path.join(paths.cyclesDir, `${cycleTag}-primary.json`), primaryReport);
  writeJsonFile(path.join(paths.cyclesDir, `${cycleTag}-secondary.json`), secondaryReport);
  writeJsonFile(path.join(paths.cyclesDir, `${cycleTag}-cycle.json`), cycleReport);
}

function persistWorkingSet(
  paths: CollectionSessionPaths,
  combinedData: ReviewsData,
  regionData: ReviewsData
): void {
  writeJsonFile(paths.workingCombinedPath, combinedData);
  writeJsonFile(paths.workingRegionPath, regionData);
}

function updateCollectionBestState(
  state: ReviewAutoresearchState,
  cycleReport: ReviewAutoresearchCycleReport,
  primaryReportPath: string,
  secondaryReportPath: string
): void {
  if (!cycleReport.collectionMetrics) {
    return;
  }

  state.bestPrimaryReportPath = primaryReportPath;
  state.bestSecondaryReportPath = secondaryReportPath;
  state.bestSecondaryBinaryF1 = cycleReport.secondaryReport.binaryKeepRemove.f1;
  state.bestSecondaryBinaryPrecision =
    cycleReport.secondaryReport.binaryKeepRemove.precision;
  state.bestResearchScore = cycleReport.collectionMetrics.researchScore;
  state.bestCoverageAt1Ratio =
    cycleReport.collectionMetrics.incheonCoverageAt1Ratio;
  state.bestCoverageAt3Ratio =
    cycleReport.collectionMetrics.incheonCoverageAt3Ratio;
  state.bestIncheonVerifiedLinkCount =
    cycleReport.collectionMetrics.incheonVerifiedLinkCount;
  state.bestIncheonQnaCompleteCount =
    cycleReport.collectionMetrics.incheonQnaCompleteCount;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2).filter((arg, index) => !(index === 0 && arg === '--'));
  const command = args[0] ?? 'baseline';
  const tag = resolveSessionTag(getArgValue(args, '--tag'));
  const goldPath = path.resolve(
    getArgValue(args, '--gold') ?? 'scripts/evals/review-quality-gold-v1.jsonl'
  );
  const reviewsPath = path.resolve(
    getArgValue(args, '--reviews') ?? 'public/data/reviews.json'
  );
  const auditPath = path.resolve(
    getArgValue(args, '--audit') ?? 'scripts/evals/review-audit-v1.jsonl'
  );

  if (command === 'status') {
    const statePath = buildCollectionSessionPaths(tag).statePath;
    if (!fs.existsSync(statePath)) {
      throw new Error(`No session state found for tag: ${tag}`);
    }
    process.stdout.write(`${fs.readFileSync(statePath, 'utf-8')}\n`);
    return;
  }

  if (command === 'baseline-collect') {
    const cycleSize = Number.parseInt(
      getArgValue(args, '--cycle-size') ?? '20',
      10
    );
    const paths = buildCollectionSessionPaths(tag);
    ensureCollectionWorkingSet(paths);

    const kindergartens = loadKindergartens();
    const workingRegionData = readJsonFile<ReviewsData>(paths.workingRegionPath);
    const primaryReport = runPrimaryAuditStats(auditPath);
    const secondaryReport = runEvaluation(goldPath, paths.workingCombinedPath);
    const collectionMetrics = computeReviewCollectionMetrics({
      kindergartens,
      regionData: workingRegionData,
      addedReviews: [],
      addedVerificationStatuses: [],
      diagnostics: buildZeroDiagnostics(),
      targetSidoCode: TARGET_SIDO_CODE,
    });
    const gateResult = evaluateReviewCollectionGates(
      collectionMetrics,
      secondaryReport
    );
    const cycleReport: ReviewAutoresearchCycleReport = {
      generatedAt: new Date().toISOString(),
      primaryStats: primaryReport,
      secondaryReport,
      collectionMetrics,
      gateResult,
    };

    writeCollectionCycleArtifacts(paths, 0, cycleReport, primaryReport, secondaryReport);
    snapshotAssets(paths.bestSnapshotDir, buildCollectionPolicyAssets(paths));

    const state = buildInitialReviewAutoresearchState(
      tag,
      path.join(paths.cyclesDir, '000-primary.json'),
      path.join(paths.cyclesDir, '000-secondary.json'),
      cycleReport
    );
    state.targetSidoCode = TARGET_SIDO_CODE;
    state.cycleSize = cycleSize;
    state.workingRegionPath = paths.workingRegionPath;
    state.workingCombinedPath = paths.workingCombinedPath;

    writeJsonFile(paths.statePath, state);
    appendTsvRow(paths.resultsPath, [
      tag,
      '0',
      'collection-policy',
      collectionMetrics.researchScore.toFixed(6),
      collectionMetrics.incheonCoverageAt1Ratio.toFixed(6),
      collectionMetrics.incheonCoverageAt3Ratio.toFixed(6),
      String(collectionMetrics.incheonVisibleReviewCount),
      String(collectionMetrics.incheonVerifiedLinkCount),
      String(collectionMetrics.incheonQnaCompleteCount),
      collectionMetrics.addedLinkVerifiedRate.toFixed(6),
      secondaryReport.binaryKeepRemove.precision.toFixed(6),
      secondaryReport.binaryKeepRemove.f1.toFixed(6),
      'keep',
      'baseline collection evaluation',
      new Date().toISOString(),
    ]);

    process.stdout.write(
      JSON.stringify(
        {
          tag,
          cycle: 0,
          researchScore: collectionMetrics.researchScore,
          coverageAt1: collectionMetrics.incheonCoverageAt1Ratio,
          coverageAt3: collectionMetrics.incheonCoverageAt3Ratio,
          workingCombinedPath: paths.workingCombinedPath,
          workingRegionPath: paths.workingRegionPath,
        },
        null,
        2
      ) + '\n'
    );
    return;
  }

  if (command === 'collect-cycle') {
    const paths = buildCollectionSessionPaths(tag);
    if (!fs.existsSync(paths.statePath)) {
      throw new Error(`No baseline found for tag ${tag}. Run baseline-collect first.`);
    }

    ensureCollectionWorkingSet(paths);
    const state = readJsonFile<ReviewAutoresearchState>(paths.statePath);
    const kindergartens = loadKindergartens();
    const workingRegionData = readJsonFile<ReviewsData>(paths.workingRegionPath);
    const workingCombinedData = readJsonFile<ReviewsData>(paths.workingCombinedPath);
    const collectionRun = await runNaverCollectionCycle({
      kindergartens,
      workingRegionData,
      searchedKindergartenIds: state.searchedKindergartenIds ?? [],
      cycleSize: state.cycleSize ?? 20,
      targetSidoCode: state.targetSidoCode ?? TARGET_SIDO_CODE,
      existingGlobalNormalizedUrls: collectGlobalNormalizedUrls(
        workingCombinedData.reviews
      ),
      headless: !hasFlag(args, '--headed'),
      chromeProfileCloneDir: path.join(paths.sessionsDir, 'chrome-profile'),
    });
    const nextCycle = state.cyclesCompleted + 1;
    const rawBatchPath = path.join(
      paths.rawDir,
      `${String(nextCycle).padStart(3, '0')}-batch.json`
    );
    writeJsonFile(rawBatchPath, {
      generatedAt: new Date().toISOString(),
      cycle: nextCycle,
      searchedKindergartens: collectionRun.searchedKindergartens.map(
        (kindergarten) => kindergarten.kindercode
      ),
      diagnostics: collectionRun.diagnostics,
      rejectionCounts: collectionRun.rejectionCounts,
      reviews: collectionRun.acceptedRawReviews,
    });

    const mergedRegion = mergeRawReviewsIntoRegionData(
      workingRegionData,
      collectionRun.acceptedRawReviews,
      {
        existingGlobalNormalizedUrls: collectGlobalNormalizedUrls(
          workingCombinedData.reviews
        ),
        filterSpam: true,
      }
    );
    const nextCombinedData = mergeRegionIntoCombinedReviews(
      workingCombinedData,
      mergedRegion.data
    );
    persistWorkingSet(paths, nextCombinedData, mergedRegion.data);

    const acceptedReviews = collectionRun.acceptedRawReviews.map((rawReview) =>
      buildReviewLinkFromRaw(rawReview, { preserveContent: true })
    );
    const addedVerificationStatuses = evaluateAddedReviews(
      acceptedReviews,
      kindergartens
    );
    const primaryReport = runPrimaryAuditStats(auditPath);
    const secondaryReport = runEvaluation(goldPath, paths.workingCombinedPath);
    const collectionMetrics = computeReviewCollectionMetrics({
      kindergartens,
      regionData: mergedRegion.data,
      addedReviews: acceptedReviews,
      addedVerificationStatuses,
      diagnostics: collectionRun.diagnostics,
      targetSidoCode: state.targetSidoCode ?? TARGET_SIDO_CODE,
    });
    const gateResult = evaluateReviewCollectionGates(
      collectionMetrics,
      secondaryReport
    );
    const cycleReport: ReviewAutoresearchCycleReport = {
      generatedAt: new Date().toISOString(),
      primaryStats: primaryReport,
      secondaryReport,
      collectionMetrics,
      gateResult,
      rawBatchPath,
    };
    writeCollectionCycleArtifacts(paths, nextCycle, cycleReport, primaryReport, secondaryReport);

    const decision = decideReviewCollectionAutoresearchCycle(
      collectionMetrics,
      state,
      secondaryReport,
      gateResult
    );
    const improved = decision.improved;

    if (improved) {
      snapshotAssets(paths.bestSnapshotDir, buildCollectionPolicyAssets(paths));
      updateCollectionBestState(
        state,
        cycleReport,
        path.join(paths.cyclesDir, `${String(nextCycle).padStart(3, '0')}-primary.json`),
        path.join(paths.cyclesDir, `${String(nextCycle).padStart(3, '0')}-secondary.json`)
      );
      state.consecutiveNoImprovement = 0;
    } else {
      state.consecutiveNoImprovement += 1;
      restoreAssets(paths.bestSnapshotDir, buildCollectionPolicyAssets(paths));
    }

    state.cyclesCompleted = nextCycle;
    state.lastUpdatedAt = new Date().toISOString();
    state.searchedKindergartenIds = Array.from(
      new Set([
        ...(state.searchedKindergartenIds ?? []),
        ...collectionRun.searchedKindergartens.map(
          (kindergarten) => kindergarten.kindercode
        ),
      ])
    );
    writeJsonFile(paths.statePath, state);

    appendTsvRow(paths.resultsPath, [
      tag,
      String(nextCycle),
      'collection-policy',
      collectionMetrics.researchScore.toFixed(6),
      collectionMetrics.incheonCoverageAt1Ratio.toFixed(6),
      collectionMetrics.incheonCoverageAt3Ratio.toFixed(6),
      String(collectionMetrics.incheonVisibleReviewCount),
      String(collectionMetrics.incheonVerifiedLinkCount),
      String(collectionMetrics.incheonQnaCompleteCount),
      collectionMetrics.addedLinkVerifiedRate.toFixed(6),
      secondaryReport.binaryKeepRemove.precision.toFixed(6),
      secondaryReport.binaryKeepRemove.f1.toFixed(6),
      improved ? 'keep' : 'discard',
      getArgValue(args, '--description') ?? 'collection cycle',
      new Date().toISOString(),
    ]);

    const shouldStop = shouldStopReviewCollectionAutoresearch(
      collectionMetrics,
      state,
      gateResult
    );

    process.stdout.write(
      JSON.stringify(
        {
          tag,
          cycle: nextCycle,
          improved,
          gatePassed: decision.gatePassed,
          shouldStop,
          improvementReason: decision.reason,
          researchScore: collectionMetrics.researchScore,
          coverageAt1: collectionMetrics.incheonCoverageAt1Ratio,
          coverageAt3: collectionMetrics.incheonCoverageAt3Ratio,
          addedLinkVerifiedRate: collectionMetrics.addedLinkVerifiedRate,
          restoredBestSnapshot: !improved,
          rawBatchPath,
        },
        null,
        2
      ) + '\n'
    );
    return;
  }

  if (command === 'promote-best') {
    const paths = buildCollectionSessionPaths(tag);
    const bestCombinedSnapshot = path.join(
      paths.bestSnapshotDir,
      'working/public/data/reviews.json'
    );
    const bestRegionSnapshot = path.join(
      paths.bestSnapshotDir,
      'working/public/data/reviews/28.json'
    );

    if (!fs.existsSync(bestCombinedSnapshot) || !fs.existsSync(bestRegionSnapshot)) {
      throw new Error(`No best snapshot found for tag ${tag}.`);
    }

    fs.copyFileSync(bestCombinedSnapshot, path.resolve('public/data/reviews.json'));
    fs.copyFileSync(bestRegionSnapshot, path.resolve('public/data/reviews/28.json'));
    process.stdout.write(
      JSON.stringify(
        {
          tag,
          promotedCombinedPath: path.resolve('public/data/reviews.json'),
          promotedRegionPath: path.resolve('public/data/reviews/28.json'),
        },
        null,
        2
      ) + '\n'
    );
    return;
  }

  // Legacy verifier-tuning mode is kept for older sessions.
  const baseDir = path.resolve('scripts/review-autoresearch');
  const sessionsDir = path.join(baseDir, 'sessions', tag);
  const cyclesDir = path.join(sessionsDir, 'cycles');
  const snapshotsDir = path.join(sessionsDir, 'snapshots');
  const bestSnapshotDir = path.join(snapshotsDir, 'best');
  const statePath = path.join(sessionsDir, 'state.json');
  const resultsPath = path.join(sessionsDir, 'results.tsv');

  ensureDirectory(cyclesDir);
  ensureDirectory(snapshotsDir);
  ensureResultsFile(resultsPath);

  if (command === 'baseline') {
    const cycleReport: ReviewAutoresearchCycleReport = {
      generatedAt: new Date().toISOString(),
      primaryStats: runPrimaryAuditStats(auditPath),
      secondaryReport: runEvaluation(goldPath, reviewsPath),
    };
    const primaryReportPath = path.join(cyclesDir, '000-primary.json');
    const secondaryReportPath = path.join(cyclesDir, '000-secondary.json');
    writeJsonFile(primaryReportPath, cycleReport.primaryStats);
    writeJsonFile(secondaryReportPath, cycleReport.secondaryReport);
    snapshotAssets(bestSnapshotDir, buildLegacyPolicyAssets());

    const state = buildInitialReviewAutoresearchState(
      tag,
      primaryReportPath,
      secondaryReportPath,
      cycleReport
    );
    writeJsonFile(statePath, state);
    appendTsvRow(resultsPath, [
      tag,
      '0',
      'legacy-policy',
      '0.000000',
      '0.000000',
      '0.000000',
      String(cycleReport.primaryStats.visibleCount),
      '0',
      '0',
      '0.000000',
      cycleReport.secondaryReport.binaryKeepRemove.precision.toFixed(6),
      cycleReport.secondaryReport.binaryKeepRemove.f1.toFixed(6),
      'keep',
      'baseline evaluation',
      new Date().toISOString(),
    ]);

    process.stdout.write(`baseline saved: ${primaryReportPath}\n`);
    return;
  }

  if (!fs.existsSync(statePath)) {
    throw new Error(`No baseline found for tag ${tag}. Run baseline first.`);
  }

  const state = readJsonFile<ReviewAutoresearchState>(statePath);
  const description = getArgValue(args, '--description') ?? 'manual cycle';
  const policySurface = getArgValue(args, '--policy-surface');
  if (!policySurface || !LEGACY_POLICY_SURFACES.includes(policySurface as never)) {
    throw new Error(
      `--policy-surface must be one of: ${LEGACY_POLICY_SURFACES.join(', ')}`
    );
  }

  const nextCycle = state.cyclesCompleted + 1;
  const cycleReport: ReviewAutoresearchCycleReport = {
    generatedAt: new Date().toISOString(),
    primaryStats: runPrimaryAuditStats(auditPath),
    secondaryReport: runEvaluation(goldPath, reviewsPath),
  };
  const primaryReportPath = path.join(
    cyclesDir,
    `${String(nextCycle).padStart(3, '0')}-primary.json`
  );
  const secondaryReportPath = path.join(
    cyclesDir,
    `${String(nextCycle).padStart(3, '0')}-secondary.json`
  );
  writeJsonFile(primaryReportPath, cycleReport.primaryStats);
  writeJsonFile(secondaryReportPath, cycleReport.secondaryReport);

  const decision = decideReviewAutoresearchCycle(
    cycleReport.primaryStats,
    state,
    cycleReport.secondaryReport.binaryKeepRemove.f1,
    cycleReport.secondaryReport.binaryKeepRemove.precision
  );
  const improved = decision.improved;
  const shouldRestoreBest = hasFlag(args, '--restore-best') && !improved;

  if (improved) {
    snapshotAssets(bestSnapshotDir, buildLegacyPolicyAssets());
    state.bestVisiblePrecision = cycleReport.primaryStats.visiblePrecision;
    state.bestInvalidVisibleCount =
      cycleReport.primaryStats.invalidVisibleCount;
    state.bestVisibleCount = cycleReport.primaryStats.visibleCount;
    state.bestAuditedCount = cycleReport.primaryStats.auditedCount;
    state.bestPrimaryReportPath = primaryReportPath;
    state.bestSecondaryBinaryF1 =
      cycleReport.secondaryReport.binaryKeepRemove.f1;
    state.bestSecondaryBinaryPrecision =
      cycleReport.secondaryReport.binaryKeepRemove.precision;
    state.bestSecondaryReportPath = secondaryReportPath;
    state.consecutiveNoImprovement = 0;
  } else {
    state.consecutiveNoImprovement += 1;
    if (shouldRestoreBest) {
      restoreAssets(bestSnapshotDir, buildLegacyPolicyAssets());
    }
  }

  state.cyclesCompleted = nextCycle;
  state.lastUpdatedAt = new Date().toISOString();
  writeJsonFile(statePath, state);

  appendTsvRow(resultsPath, [
    tag,
    String(nextCycle),
    policySurface,
    '0.000000',
    '0.000000',
    '0.000000',
    String(cycleReport.primaryStats.visibleCount),
    '0',
    '0',
    '0.000000',
    cycleReport.secondaryReport.binaryKeepRemove.precision.toFixed(6),
    cycleReport.secondaryReport.binaryKeepRemove.f1.toFixed(6),
    improved ? 'keep' : 'discard',
    description,
    new Date().toISOString(),
  ]);

  const shouldStop = shouldStopReviewAutoresearch(
    cycleReport.primaryStats,
    state,
    cycleReport.secondaryReport.binaryKeepRemove.f1,
    cycleReport.secondaryReport.binaryKeepRemove.precision
  );

  process.stdout.write(
    JSON.stringify(
      {
        tag,
        cycle: nextCycle,
        improved,
        shouldStop,
        improvementReason: decision.reason,
        visiblePrecision: cycleReport.primaryStats.visiblePrecision,
        invalidVisibleCount: cycleReport.primaryStats.invalidVisibleCount,
        auditedCount: cycleReport.primaryStats.auditedCount,
        secondaryBinaryF1: cycleReport.secondaryReport.binaryKeepRemove.f1,
        consecutiveNoImprovement: state.consecutiveNoImprovement,
        restoredBestSnapshot: shouldRestoreBest,
      },
      null,
      2
    ) + '\n'
  );
}

main().catch((error) => {
  process.stderr.write(
    `${error instanceof Error ? error.stack ?? error.message : String(error)}\n`
  );
  process.exit(1);
});

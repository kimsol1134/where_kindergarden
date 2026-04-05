import * as fs from 'fs';
import * as path from 'path';
import type {
  ReviewAuditStats,
  ReviewQualityEvaluationReport,
  ReviewsData,
} from '../../src/types/review';
import { evaluateReviewQuality } from '../evals/lib/review-quality-eval';
import {
  buildReviewAuditStats,
  parseReviewAuditJsonl,
} from '../evals/lib/review-audit';
import {
  loadKindergartens,
  readJsonFile,
  writeJsonFile,
} from '../lib/review-verification-pipeline';
import {
  buildInitialReviewAutoresearchState,
  decideReviewAutoresearchCycle,
  shouldStopReviewAutoresearch,
  type ReviewAutoresearchCycleReport,
  type ReviewAutoresearchState,
} from './lib/review-autoresearch';

const ALLOWED_POLICY_SURFACES = [
  'src/lib/utils/review-utils.ts',
  'src/lib/utils/review-verification.ts',
  'scripts/lib/review-verification-pipeline.ts',
] as const;

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

function ensureDirectory(directoryPath: string): void {
  if (!fs.existsSync(directoryPath)) {
    fs.mkdirSync(directoryPath, { recursive: true });
  }
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

  const now = new Date();
  return now.toISOString().split('T')[0].replace(/-/g, '');
}

function appendTsvRow(filePath: string, values: string[]): void {
  const escaped = values.map((value) => value.replace(/\t/g, ' ').replace(/\n/g, ' '));
  fs.appendFileSync(filePath, `${escaped.join('\t')}\n`);
}

function snapshotPolicySurfaces(targetDir: string): void {
  ensureDirectory(targetDir);

  for (const filePath of ALLOWED_POLICY_SURFACES) {
    const absoluteSource = path.resolve(filePath);
    const absoluteTarget = path.join(targetDir, filePath);
    ensureDirectory(path.dirname(absoluteTarget));
    fs.copyFileSync(absoluteSource, absoluteTarget);
  }
}

function restorePolicySurfaces(sourceDir: string): void {
  for (const filePath of ALLOWED_POLICY_SURFACES) {
    const absoluteSource = path.join(sourceDir, filePath);
    if (!fs.existsSync(absoluteSource)) {
      continue;
    }
    fs.copyFileSync(absoluteSource, path.resolve(filePath));
  }
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

function main(): void {
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
  const baseDir = path.resolve('scripts/review-autoresearch');
  const sessionsDir = path.join(baseDir, 'sessions', tag);
  const cyclesDir = path.join(sessionsDir, 'cycles');
  const snapshotsDir = path.join(sessionsDir, 'snapshots');
  const bestSnapshotDir = path.join(snapshotsDir, 'best');
  const statePath = path.join(sessionsDir, 'state.json');
  const resultsPath = path.join(sessionsDir, 'results.tsv');

  ensureDirectory(cyclesDir);
  ensureDirectory(snapshotsDir);

  if (!fs.existsSync(resultsPath)) {
    fs.writeFileSync(
      resultsPath,
      'tag\tcycle\tpolicy_surface\tvisible_precision\tinvalid_visible_count\tvisible_count\taudited_count\tsecondary_binary_f1\tstatus\tdescription\ttimestamp\n'
    );
  }

  if (command === 'status') {
    if (!fs.existsSync(statePath)) {
      throw new Error(`No session state found for tag: ${tag}`);
    }
    process.stdout.write(`${fs.readFileSync(statePath, 'utf-8')}\n`);
    return;
  }

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
    snapshotPolicySurfaces(bestSnapshotDir);

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
      'baseline',
      cycleReport.primaryStats.visiblePrecision.toFixed(6),
      String(cycleReport.primaryStats.invalidVisibleCount),
      String(cycleReport.primaryStats.visibleCount),
      String(cycleReport.primaryStats.auditedCount),
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
  if (!policySurface || !ALLOWED_POLICY_SURFACES.includes(policySurface as never)) {
    throw new Error(
      `--policy-surface must be one of: ${ALLOWED_POLICY_SURFACES.join(', ')}`
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
    state
  );
  const improved = decision.improved;
  const shouldRestoreBest = hasFlag(args, '--restore-best') && !improved;

  if (improved) {
    snapshotPolicySurfaces(bestSnapshotDir);
    state.bestVisiblePrecision = cycleReport.primaryStats.visiblePrecision;
    state.bestInvalidVisibleCount =
      cycleReport.primaryStats.invalidVisibleCount;
    state.bestVisibleCount = cycleReport.primaryStats.visibleCount;
    state.bestAuditedCount = cycleReport.primaryStats.auditedCount;
    state.bestPrimaryReportPath = primaryReportPath;
    state.bestSecondaryBinaryF1 =
      cycleReport.secondaryReport.binaryKeepRemove.f1;
    state.bestSecondaryReportPath = secondaryReportPath;
    state.consecutiveNoImprovement = 0;
  } else {
    state.consecutiveNoImprovement += 1;
    if (shouldRestoreBest) {
      restorePolicySurfaces(bestSnapshotDir);
    }
  }

  state.cyclesCompleted = nextCycle;
  state.lastUpdatedAt = new Date().toISOString();
  writeJsonFile(statePath, state);

  appendTsvRow(resultsPath, [
    tag,
    String(nextCycle),
    policySurface,
    cycleReport.primaryStats.visiblePrecision.toFixed(6),
    String(cycleReport.primaryStats.invalidVisibleCount),
    String(cycleReport.primaryStats.visibleCount),
    String(cycleReport.primaryStats.auditedCount),
    cycleReport.secondaryReport.binaryKeepRemove.f1.toFixed(6),
    improved ? 'keep' : 'discard',
    description,
    new Date().toISOString(),
  ]);

  const shouldStop = shouldStopReviewAutoresearch(
    cycleReport.primaryStats,
    state
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

main();

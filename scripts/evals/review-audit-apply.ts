import * as fs from 'fs';
import * as path from 'path';
import type {
  ReviewAuditApplyReport,
  ReviewAuditEntry,
  ReviewsData,
} from '../../src/types/review';
import {
  applyReviewAuditToRegionData,
  buildReviewAuditEntries,
  buildReviewAuditStats,
  parseReviewAuditJsonl,
  serializeReviewAuditJsonl,
} from './lib/review-audit';
import {
  DEFAULT_REVIEW_SIDO_CODES,
  loadKindergartens,
  loadReviewsData,
  readJsonFile,
  splitReviewsBySigungu,
  writeCombinedReviews,
  writeJsonFile,
} from '../lib/review-verification-pipeline';

function getArgValue(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag);
  if (index === -1) {
    return undefined;
  }

  return args[index + 1];
}

function main(): void {
  const args = process.argv.slice(2);
  const auditPath = path.resolve(
    getArgValue(args, '--audit') ?? 'scripts/evals/review-audit-v1.jsonl'
  );
  const dryRun = args.includes('--dry-run');
  const entries = parseReviewAuditJsonl(fs.readFileSync(auditPath, 'utf-8'));
  const kindergartens = loadKindergartens();
  const summary = {
    removedInvalid: 0,
    removedUnaudited: 0,
    removedMissingAudit: 0,
    keptVerified: 0,
    recoveredFromAudit: 0,
  };

  for (const sidoCode of DEFAULT_REVIEW_SIDO_CODES) {
    const sourceData = loadReviewsData(sidoCode);
    const applied = applyReviewAuditToRegionData(sourceData, entries, sidoCode);
    summary.removedInvalid += applied.summary.removedInvalid;
    summary.removedUnaudited += applied.summary.removedUnaudited;
    summary.removedMissingAudit += applied.summary.removedMissingAudit;
    summary.keptVerified += applied.summary.keptVerified;
    summary.recoveredFromAudit += applied.summary.recoveredFromAudit;

    if (!dryRun) {
      writeJsonFile(
        path.resolve(`public/data/reviews/${sidoCode}.json`),
        applied.nextData
      );
      splitReviewsBySigungu(sidoCode, applied.nextData, kindergartens);
    }
  }

  let rebuiltCount: number | null = null;
  if (!dryRun) {
    rebuiltCount = writeCombinedReviews().totalCount;
    const currentReviewsData = readJsonFile<ReviewsData>('public/data/reviews.json');
    const nextEntries = buildReviewAuditEntries({
      currentReviewsData,
      kindergartens,
      previousEntries: entries,
    });
    fs.writeFileSync(auditPath, serializeReviewAuditJsonl(nextEntries));
  }

  const report: ReviewAuditApplyReport = {
    generatedAt: new Date().toISOString(),
    auditPath,
    dryRun,
    rebuiltCount,
    summary,
  };

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main();

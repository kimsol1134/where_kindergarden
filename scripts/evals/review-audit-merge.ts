import * as fs from 'fs';
import * as path from 'path';
import type { ReviewAuditDecisionStatus, ReviewAuditEntry } from '../../src/types/review';
import {
  buildReviewAuditKey,
  buildReviewAuditStats,
  buildReviewAuditEntryMap,
  parseReviewAuditJsonl,
  serializeReviewAuditJsonl,
} from './lib/review-audit';

interface ReviewAuditDecisionPatch {
  kindergartenId: string;
  reviewId: string;
  finalAuditStatus: ReviewAuditDecisionStatus;
  auditReason?: string | null;
  reviewedAt?: string | null;
  reviewedBy?: string | null;
}

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
  const inputPath = path.resolve(
    getArgValue(args, '--input') ?? ''
  );

  if (!fs.existsSync(inputPath)) {
    throw new Error(`input not found: ${inputPath}`);
  }

  const entries = parseReviewAuditJsonl(fs.readFileSync(auditPath, 'utf-8'));
  const patches = parseReviewAuditJsonl(
    fs.readFileSync(inputPath, 'utf-8')
  ) as unknown as ReviewAuditDecisionPatch[];
  const entryMap = buildReviewAuditEntryMap(entries);

  for (const patch of patches) {
    const key = buildReviewAuditKey(patch.kindergartenId, patch.reviewId);
    const entry = entryMap.get(key);
    if (!entry) {
      continue;
    }

    entryMap.set(key, {
      ...entry,
      finalAuditStatus: patch.finalAuditStatus,
      auditReason: patch.auditReason ?? entry.auditReason ?? null,
      reviewedAt: patch.reviewedAt ?? new Date().toISOString(),
      reviewedBy: patch.reviewedBy ?? entry.reviewedBy ?? 'manual',
    });
  }

  const nextEntries = Array.from(entryMap.values()).toSorted(
    (left, right) =>
      Number(right.currentShipped) - Number(left.currentShipped) ||
      left.kindergartenId.localeCompare(right.kindergartenId) ||
      left.reviewId.localeCompare(right.reviewId)
  );
  fs.writeFileSync(auditPath, serializeReviewAuditJsonl(nextEntries));

  const stats = buildReviewAuditStats(nextEntries, auditPath);
  process.stdout.write(
    JSON.stringify(
      {
        auditPath,
        total: stats.totalCount,
        audited: stats.auditedCount,
        visiblePrecision: stats.visiblePrecision,
      },
      null,
      2
    ) + '\n'
  );
}

main();

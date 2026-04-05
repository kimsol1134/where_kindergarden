import * as fs from 'fs';
import * as path from 'path';
import type {
  ReviewAuditDecisionStatus,
  ReviewAuditEntry,
  ReviewVerificationStateFile,
} from '../../src/types/review';
import {
  buildReviewAuditBatch,
  buildReviewAuditStats,
  parseReviewAuditJsonl,
  serializeReviewAuditJsonl,
} from './lib/review-audit';
import {
  loadKindergartens,
  readJsonFile,
} from '../lib/review-verification-pipeline';

function getArgValue(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag);
  if (index === -1) {
    return undefined;
  }

  return args[index + 1];
}

function inferFinalStatus(
  entry: ReturnType<typeof buildReviewAuditBatch>[number]
): { status: ReviewAuditDecisionStatus; reason: string } {
  if (entry.autoStatus !== 'verified') {
    return {
      status: entry.autoStatus,
      reason: `auto:${entry.autoStatus}`,
    };
  }

  const hasInfoContentType = entry.priorityReasons.some((reason) =>
    reason.startsWith('contentType:')
  );

  if (!entry.locationValid) {
    return {
      status: 'mismatch',
      reason: 'autofill: location mismatch',
    };
  }

  if (entry.collisionGroupSize > 3 && !entry.directNameEvidence) {
    return {
      status:
        entry.institutionMentionCount >= 3 ? 'generic_info' : 'mismatch',
      reason: 'autofill: global collision risk',
    };
  }

  if (
    entry.otherInstitutionMentionCount > 0 &&
    entry.institutionMentionCount >= 2
  ) {
    return {
      status: 'generic_info',
      reason: 'autofill: multi-school mention risk',
    };
  }

  if (hasInfoContentType && !entry.directNameEvidence) {
    return {
      status: 'generic_info',
      reason: 'autofill: info/question/template content type',
    };
  }

  if (entry.stateVerifiedWithoutDirectName) {
    return {
      status: 'uncertain',
      reason: 'autofill: stale state without direct-name evidence',
    };
  }

  if (
    entry.directNameEvidence &&
    entry.locationValid &&
    entry.otherInstitutionMentionCount === 0 &&
    entry.autoConfidence >= 0.88
  ) {
    return {
      status: 'verified',
      reason: 'autofill: high-confidence direct-name evidence',
    };
  }

  if (
    entry.directNameEvidence &&
    entry.locationValid &&
    entry.otherInstitutionMentionCount === 0 &&
    entry.autoConfidence >= 0.83 &&
    entry.institutionMentionCount <= 1
  ) {
    return {
      status: 'verified',
      reason: 'autofill: conservative verified fallback',
    };
  }

  return {
    status: 'uncertain',
    reason: 'autofill: conservative demotion',
  };
}

function main(): void {
  const args = process.argv.slice(2);
  const auditPath = path.resolve(
    getArgValue(args, '--audit') ?? 'scripts/evals/review-audit-v1.jsonl'
  );
  const statePath = path.resolve(
    getArgValue(args, '--state') ?? 'scripts/data-output/review-verification-state.json'
  );
  const preserveReviewed = !args.includes('--overwrite-reviewed');
  const reviewedBy = getArgValue(args, '--reviewed-by') ?? 'autofill';

  const entries = parseReviewAuditJsonl(fs.readFileSync(auditPath, 'utf-8'));
  const kindergartens = loadKindergartens();
  const stateEntries = fs.existsSync(statePath)
    ? readJsonFile<ReviewVerificationStateFile>(statePath).entries
    : [];
  const scoredEntries = buildReviewAuditBatch({
    entries,
    kindergartens,
    stateEntries,
    batchSize: entries.length,
    includeReviewed: true,
  });
  const nextEntries = scoredEntries.map<ReviewAuditEntry>((entry) => {
    if (preserveReviewed && entry.finalAuditStatus !== null) {
      return entry;
    }

    const decision = inferFinalStatus(entry);
    return {
      ...entry,
      finalAuditStatus: decision.status,
      auditReason: decision.reason,
      reviewedAt: new Date().toISOString(),
      reviewedBy,
    };
  });

  fs.writeFileSync(auditPath, serializeReviewAuditJsonl(nextEntries));

  const stats = buildReviewAuditStats(nextEntries, auditPath);
  process.stdout.write(
    JSON.stringify(
      {
        auditPath,
        total: stats.totalCount,
        audited: stats.auditedCount,
        visiblePrecision: stats.visiblePrecision,
        invalidVisibleCount: stats.invalidVisibleCount,
      },
      null,
      2
    ) + '\n'
  );
}

main();

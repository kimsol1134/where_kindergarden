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
  classifyNaverPlaceReview,
  detectMismappedNaverPlaceKindergartens,
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
  entry: ReturnType<typeof buildReviewAuditBatch>[number],
  context: { mismappedKindergartenIds: Set<string> }
): { status: ReviewAuditDecisionStatus; reason: string } {
  if (entry.source === 'naver_place') {
    const classification = classifyNaverPlaceReview(
      {
        snippet: entry.snippet,
        title: entry.title,
        summary: entry.summary,
      },
      {
        mismappedKindergarten: context.mismappedKindergartenIds.has(
          entry.kindergartenId
        ),
      }
    );
    return {
      status: classification.status,
      reason: classification.reason,
    };
  }

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

  if (entry.collisionGroupSize > 3) {
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

  if (hasInfoContentType) {
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
  const sourceFilter = getArgValue(args, '--source') ?? null;

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
  // 매핑 오류 탐지는 audit queue 전체(현재 visible 여부 무관)를 기준으로 합니다.
  const mismappedKindergartenIds = detectMismappedNaverPlaceKindergartens(
    entries.map((entry) => ({
      kindergartenId: entry.kindergartenId,
      source: entry.source,
      snippet: entry.snippet,
      title: entry.title,
      summary: entry.summary,
    }))
  );
  const inferContext = { mismappedKindergartenIds };
  let touched = 0;
  const nextEntries = scoredEntries.map<ReviewAuditEntry>((entry) => {
    if (sourceFilter !== null && entry.source !== sourceFilter) {
      return entry;
    }
    if (preserveReviewed && entry.finalAuditStatus !== null) {
      return entry;
    }

    const decision = inferFinalStatus(entry, inferContext);
    touched += 1;
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
        touched,
        sourceFilter: sourceFilter ?? 'all',
        mismappedNaverPlaceKindergartens: mismappedKindergartenIds.size,
        visiblePrecision: stats.visiblePrecision,
        invalidVisibleCount: stats.invalidVisibleCount,
      },
      null,
      2
    ) + '\n'
  );
}

main();

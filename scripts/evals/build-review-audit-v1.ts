import * as fs from 'fs';
import * as path from 'path';
import type { ReviewAuditEntry, ReviewsData } from '../../src/types/review';
import {
  buildReviewAuditEntries,
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

function main(): void {
  const args = process.argv.slice(2);
  const reviewsPath = path.resolve(
    getArgValue(args, '--reviews') ?? 'public/data/reviews.json'
  );
  const auditPath = path.resolve(
    getArgValue(args, '--audit') ?? 'scripts/evals/review-audit-v1.jsonl'
  );
  const previousEntries: ReviewAuditEntry[] = fs.existsSync(auditPath)
    ? parseReviewAuditJsonl(fs.readFileSync(auditPath, 'utf-8'))
    : [];
  const reviewsData = readJsonFile<ReviewsData>(reviewsPath);
  const kindergartens = loadKindergartens();
  const nextEntries = buildReviewAuditEntries({
    currentReviewsData: reviewsData,
    kindergartens,
    previousEntries,
  });

  fs.writeFileSync(auditPath, serializeReviewAuditJsonl(nextEntries));

  const stats = buildReviewAuditStats(nextEntries, auditPath);
  process.stdout.write('=== Review Audit Queue ===\n');
  process.stdout.write(`audit: ${auditPath}\n`);
  process.stdout.write(`total: ${stats.totalCount}\n`);
  process.stdout.write(`visible: ${stats.visibleCount}\n`);
  process.stdout.write(`audited: ${stats.auditedCount}\n`);
  process.stdout.write(`remaining: ${stats.remainingCount}\n`);
  process.stdout.write(
    `visible_precision: ${stats.visiblePrecision.toFixed(4)}\n`
  );
}

main();

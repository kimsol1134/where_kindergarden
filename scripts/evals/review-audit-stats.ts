import * as fs from 'fs';
import * as path from 'path';
import { buildReviewAuditStats, parseReviewAuditJsonl } from './lib/review-audit';
import { writeJsonFile } from '../lib/review-verification-pipeline';

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
  const outputJsonPath = getArgValue(args, '--output-json');
  const entries = parseReviewAuditJsonl(fs.readFileSync(auditPath, 'utf-8'));
  const stats = buildReviewAuditStats(entries, auditPath);

  process.stdout.write('=== Review Audit Stats ===\n');
  process.stdout.write(`audit: ${stats.auditPath}\n`);
  process.stdout.write(`total: ${stats.totalCount}\n`);
  process.stdout.write(`audited: ${stats.auditedCount}\n`);
  process.stdout.write(`remaining: ${stats.remainingCount}\n`);
  process.stdout.write(`visible: ${stats.visibleCount}\n`);
  process.stdout.write(`visible_verified: ${stats.visibleVerifiedCount}\n`);
  process.stdout.write(`invalid_visible: ${stats.invalidVisibleCount}\n`);
  process.stdout.write(
    `visible_precision: ${stats.visiblePrecision.toFixed(4)}\n`
  );

  if (outputJsonPath) {
    writeJsonFile(path.resolve(outputJsonPath), stats);
  }
}

main();

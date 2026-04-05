import * as fs from 'fs';
import * as path from 'path';
import type { ReviewVerificationStateFile } from '../../src/types/review';
import {
  buildReviewAuditBatch,
  parseReviewAuditJsonl,
} from './lib/review-audit';
import {
  loadKindergartens,
  readJsonFile,
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
  const statePath = path.resolve(
    getArgValue(args, '--state') ?? 'scripts/data-output/review-verification-state.json'
  );
  const outputPath = getArgValue(args, '--output');
  const size = Number.parseInt(getArgValue(args, '--size') ?? '50', 10);
  const includeReviewed = args.includes('--include-reviewed');
  const entries = parseReviewAuditJsonl(fs.readFileSync(auditPath, 'utf-8'));
  const kindergartens = loadKindergartens();
  const stateEntries = fs.existsSync(statePath)
    ? readJsonFile<ReviewVerificationStateFile>(statePath).entries
    : [];
  const batch = buildReviewAuditBatch({
    entries,
    kindergartens,
    stateEntries,
    batchSize: Number.isFinite(size) ? size : 50,
    includeReviewed,
  });

  if (outputPath) {
    writeJsonFile(path.resolve(outputPath), batch);
  } else {
    process.stdout.write(`${JSON.stringify(batch, null, 2)}\n`);
  }
}

main();

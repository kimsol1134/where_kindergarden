import * as path from 'path';
import type {
  ReviewVerificationRecord,
  ReviewVerificationStatus,
} from '../src/types/review';
import { applyReviewVerificationDecisions } from './lib/review-verification-apply';
import {
  buildSidoTag,
  readJsonFile,
  writeJsonFile,
} from './lib/review-verification-pipeline';

interface ResultsFile {
  reviews: ReviewVerificationRecord[];
}

function writeLine(message: string): void {
  process.stdout.write(`${message}\n`);
}

function main(): void {
  const args = process.argv.slice(2);
  const inputIndex = args.indexOf('--input');
  if (inputIndex === -1 || !args[inputIndex + 1]) {
    throw new Error('--input 인자가 필요합니다.');
  }

  const dryRun = args.includes('--dry-run');
  const noRebuild = args.includes('--no-rebuild');
  const outputIndex = args.indexOf('--output-dir');
  const outputDir =
    outputIndex !== -1
      ? path.resolve(args[outputIndex + 1])
      : path.resolve('scripts/data-output');

  const inputPath = path.resolve(args[inputIndex + 1]);
  const resultsFile = readJsonFile<ResultsFile>(inputPath);
  const decisions = Array.from(
    resultsFile.reviews
      .filter(
        (
          record
        ): record is ReviewVerificationRecord & {
          finalStatus: ReviewVerificationStatus;
        } => Boolean(record.finalStatus)
      )
      .map((record) => ({
        reviewId: record.reviewId,
        kindergartenId: record.kindergartenId,
        sidoCode: record.sidoCode,
        status: record.finalStatus as ReviewVerificationStatus,
      }))
  );
  const tag = buildSidoTag(
    Array.from(new Set(decisions.map((decision) => decision.sidoCode)))
  );
  const applyResult = applyReviewVerificationDecisions(decisions, {
    dryRun,
    noRebuild,
  });

  const reportPath = path.join(
    outputDir,
    `review-verification-apply-${tag}.json`
  );
  writeJsonFile(reportPath, {
    generatedAt: new Date().toISOString(),
    inputPath,
    dryRun,
    rebuiltCount: applyResult.rebuiltCount,
    summary: applyResult.summary,
  });

  writeLine(`apply report: ${reportPath}`);
  writeLine(`removed: ${applyResult.summary.removed}`);
  writeLine(`kept verified: ${applyResult.summary.keptVerified}`);
  writeLine(`kept uncertain: ${applyResult.summary.keptUncertain}`);
  writeLine(`untouched: ${applyResult.summary.untouched}`);
}

main();

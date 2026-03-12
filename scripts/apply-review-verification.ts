import * as path from 'path';
import type {
  ReviewsData,
  ReviewVerificationRecord,
  ReviewVerificationStatus,
} from '../src/types/review';
import { shouldRemoveReviewAfterVerification } from '../src/lib/utils/review-verification';
import {
  buildSidoTag,
  loadKindergartens,
  loadReviewsData,
  readJsonFile,
  splitReviewsBySigungu,
  writeCombinedReviews,
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
  const decisions = new Map<
    string,
    { status: ReviewVerificationStatus; kindergartenId: string; sidoCode: string }
  >(
    resultsFile.reviews
      .filter((record): record is ReviewVerificationRecord & { finalStatus: ReviewVerificationStatus } => Boolean(record.finalStatus))
      .map((record) => [
        record.reviewId,
        {
          status: record.finalStatus as ReviewVerificationStatus,
          kindergartenId: record.kindergartenId,
          sidoCode: record.sidoCode,
        },
      ])
  );
  const targetSidos = Array.from(
    new Set(resultsFile.reviews.map((record) => record.sidoCode))
  );
  const tag = buildSidoTag(targetSidos);
  const kindergartens = loadKindergartens();

  const summary = {
    removed: 0,
    keptVerified: 0,
    keptUncertain: 0,
    untouched: 0,
    byStatus: {
      verified: 0,
      mismatch: 0,
      advertorial: 0,
      generic_info: 0,
      uncertain: 0,
    } satisfies Record<ReviewVerificationStatus, number>,
  };

  for (const sidoCode of targetSidos) {
    const sourceData = loadReviewsData(sidoCode);
    const updatedReviews: ReviewsData['reviews'] = {};

    for (const [kindergartenId, reviews] of Object.entries(sourceData.reviews)) {
      const nextReviews = reviews.filter((review) => {
        const decision = decisions.get(review.id);
        if (!decision) {
          summary.untouched += 1;
          return true;
        }

        summary.byStatus[decision.status] += 1;
        if (shouldRemoveReviewAfterVerification(decision.status)) {
          summary.removed += 1;
          return false;
        }

        if (decision.status === 'verified') {
          summary.keptVerified += 1;
          return true;
        }

        summary.keptUncertain += 1;
        return true;
      });

      if (nextReviews.length > 0) {
        updatedReviews[kindergartenId] = nextReviews;
      }
    }

    const nextData: ReviewsData = {
      version: new Date().toISOString().split('T')[0],
      totalCount: Object.values(updatedReviews).reduce(
        (accumulator, items) => accumulator + items.length,
        0
      ),
      kindergartenCount: Object.keys(updatedReviews).length,
      reviews: updatedReviews,
    };

    if (!dryRun) {
      writeJsonFile(path.resolve(`public/data/reviews/${sidoCode}.json`), nextData);
      splitReviewsBySigungu(sidoCode, nextData, kindergartens);
    }
  }

  let rebuiltCount: number | null = null;
  if (!dryRun && !noRebuild) {
    const combined = writeCombinedReviews();
    rebuiltCount = combined.totalCount;
  }

  const reportPath = path.join(
    outputDir,
    `review-verification-apply-${tag}.json`
  );
  writeJsonFile(reportPath, {
    generatedAt: new Date().toISOString(),
    inputPath,
    dryRun,
    rebuiltCount,
    summary,
  });

  writeLine(`apply report: ${reportPath}`);
  writeLine(`removed: ${summary.removed}`);
  writeLine(`kept verified: ${summary.keptVerified}`);
  writeLine(`kept uncertain: ${summary.keptUncertain}`);
  writeLine(`untouched: ${summary.untouched}`);
}

main();

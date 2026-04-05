import * as fs from 'fs';
import * as path from 'path';
import type {
  ReviewQualityEvaluationReport,
  ReviewQualityGoldEntry,
  ReviewsData,
} from '../../src/types/review';
import {
  evaluateReviewQuality,
} from './lib/review-quality-eval';
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

function loadGoldEntries(filePath: string): ReviewQualityGoldEntry[] {
  return fs
    .readFileSync(filePath, 'utf-8')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line) as ReviewQualityGoldEntry);
}

function printSummary(report: ReviewQualityEvaluationReport): void {
  process.stdout.write('=== Review Quality Eval ===\n');
  process.stdout.write(`gold: ${report.goldPath}\n`);
  process.stdout.write(`reviews: ${report.reviewsPath}\n`);
  process.stdout.write(`samples: ${report.totalSamples}\n`);
  process.stdout.write('\n');
  process.stdout.write('| metric | value |\n');
  process.stdout.write('| --- | ---: |\n');
  process.stdout.write(`| binary_f1 | ${report.binaryKeepRemove.f1.toFixed(4)} |\n`);
  process.stdout.write(`| keep_precision | ${report.binaryKeepRemove.precision.toFixed(4)} |\n`);
  process.stdout.write(`| keep_recall | ${report.binaryKeepRemove.recall.toFixed(4)} |\n`);
  process.stdout.write(`| remove_precision | ${report.removePrecision.toFixed(4)} |\n`);
  process.stdout.write(`| predicted_present | ${report.predictedPresentCount} |\n`);
  process.stdout.write(`| expected_present | ${report.expectedPresentCount} |\n`);
  process.stdout.write(
    `| unresolved_collision_groups | ${report.contaminationKpis.unresolvedCollisionGroups} |\n`
  );
  process.stdout.write(
    `| unresolved_collision_rows | ${report.contaminationKpis.unresolvedCollisionRows} |\n`
  );
  process.stdout.write('\n');
  process.stdout.write('| class | precision | recall | f1 | support |\n');
  process.stdout.write('| --- | ---: | ---: | ---: | ---: |\n');

  for (const [label, metrics] of Object.entries(report.perClass)) {
    process.stdout.write(
      `| ${label} | ${metrics.precision.toFixed(4)} | ${metrics.recall.toFixed(
        4
      )} | ${metrics.f1.toFixed(4)} | ${metrics.support} |\n`
    );
  }
}

function main(): void {
  const args = process.argv.slice(2);
  const goldPath = path.resolve(
    getArgValue(args, '--gold') ?? 'scripts/evals/review-quality-gold-v1.jsonl'
  );
  const reviewsPath = path.resolve(
    getArgValue(args, '--reviews') ?? 'public/data/reviews.json'
  );
  const outputJsonPath = getArgValue(args, '--output-json');

  const goldEntries = loadGoldEntries(goldPath);
  const reviewsData = readJsonFile<ReviewsData>(reviewsPath);
  const kindergartens = loadKindergartens();
  const report = evaluateReviewQuality({
    goldEntries,
    reviewsData,
    kindergartens,
    goldPath,
    reviewsPath,
  });

  printSummary(report);

  if (outputJsonPath) {
    writeJsonFile(path.resolve(outputJsonPath), report);
  }
}

main();

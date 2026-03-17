import * as fs from 'fs';
import * as path from 'path';
import {
  buildReviewVerificationWorkflowOutputs,
  buildReviewVerificationWorkflowSummary,
  formatReviewVerificationWorkflowSummaryMarkdown,
  type ReviewVerificationWorkflowMode,
} from '../src/lib/utils/review-verification-ci';
import type {
  ReviewVerificationApplyReport,
  ReviewVerificationQaSampleReport,
  ReviewVerificationRunReport,
} from '../src/types/review';
import {
  ensureDirectory,
  readJsonFile,
  writeJsonFile,
} from './lib/review-verification-pipeline';

function getArgValue(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag);
  if (index === -1) {
    return undefined;
  }

  return args[index + 1];
}

function requireArg(args: string[], flag: string): string {
  const value = getArgValue(args, flag);
  if (!value) {
    throw new Error(`Missing required argument: ${flag}`);
  }

  return value;
}

function parseMode(value: string | undefined): ReviewVerificationWorkflowMode {
  return value === 'apply' ? 'apply' : 'review-only';
}

function appendFile(filePath: string, content: string): void {
  ensureDirectory(path.dirname(filePath));
  fs.appendFileSync(filePath, `${content}\n`);
}

function appendGithubOutputs(
  filePath: string,
  outputs: Record<string, string>
): void {
  const lines = Object.entries(outputs).map(([key, value]) => `${key}=${value}`);
  appendFile(filePath, lines.join('\n'));
}

function main(): void {
  const args = process.argv.slice(2);
  const reportPath = path.resolve(requireArg(args, '--report'));
  const qaPath = path.resolve(requireArg(args, '--qa'));
  const applyPath = getArgValue(args, '--apply');
  const summaryFile = getArgValue(args, '--summary-file');
  const outputJsonPath = getArgValue(args, '--output-json');
  const githubOutputPath = getArgValue(args, '--github-output');
  const mode = parseMode(getArgValue(args, '--mode'));

  const runReport = readJsonFile<ReviewVerificationRunReport>(reportPath);
  const qaReport = readJsonFile<ReviewVerificationQaSampleReport>(qaPath);
  const applyReport = applyPath
    ? readJsonFile<ReviewVerificationApplyReport>(path.resolve(applyPath))
    : null;

  const summary = buildReviewVerificationWorkflowSummary({
    mode,
    runReport,
    qaReport,
    applyReport,
  });
  const markdown = formatReviewVerificationWorkflowSummaryMarkdown(summary);

  if (summaryFile) {
    appendFile(path.resolve(summaryFile), markdown);
  } else {
    process.stdout.write(`${markdown}\n`);
  }

  if (outputJsonPath) {
    writeJsonFile(path.resolve(outputJsonPath), summary);
  }

  if (githubOutputPath) {
    appendGithubOutputs(
      path.resolve(githubOutputPath),
      buildReviewVerificationWorkflowOutputs(summary)
    );
  }
}

main();

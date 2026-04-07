/**
 * 독립 실행 Haiku 리뷰 검증 스크립트
 *
 * verify-review-incremental.ts의 llm-queue JSON을 입력으로 받아
 * Haiku 4.5로 검증한 후 결과 JSON을 출력합니다.
 * 기존 --llm 플래그와 호환됩니다.
 *
 * 사용법:
 *   pnpm verify:review-haiku -- --input scripts/data-output/review-verification-llm-queue-11-41.json
 *   pnpm verify:review-haiku -- --input llm-queue.json --output haiku-result.json
 *   pnpm verify:review-haiku -- --input llm-queue.json --max-calls 5
 */

import * as path from 'path';
import { config } from 'dotenv';
import {
  validateReviewsWithHaiku,
  type HaikuValidationInput,
} from './lib/haiku-review-validator';
import { readJsonFile, writeJsonFile } from './lib/review-verification-pipeline';

config({ path: '.env.local' });
config();

interface LlmQueueItem {
  reviewId: string;
  kindergartenId: string;
  kindergartenName: string;
  kindergartenAddress?: string;
  sidoCode?: string;
  title: string;
  snippet: string;
  bodyExcerpt?: string;
  whyFlagged?: string[];
  autoReasons?: string[];
}

interface LlmQueueFile {
  items?: LlmQueueItem[];
}

function writeLine(message: string): void {
  process.stdout.write(`${message}\n`);
}

function getArgValue(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag);
  if (index === -1 || !args[index + 1]) {
    return undefined;
  }
  return args[index + 1];
}

function parseInteger(
  args: string[],
  flag: string,
  defaultValue: number
): number {
  const index = args.indexOf(flag);
  if (index === -1 || !args[index + 1]) {
    return defaultValue;
  }
  const parsed = Number.parseInt(args[index + 1], 10);
  return Number.isNaN(parsed) ? defaultValue : parsed;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const inputPath = getArgValue(args, '--input');
  if (!inputPath) {
    writeLine('사용법: pnpm verify:review-haiku -- --input <llm-queue.json>');
    writeLine('옵션:');
    writeLine('  --output <path>     출력 파일 경로 (기본: input 경로 기반 자동 생성)');
    writeLine('  --max-calls <N>     최대 API 호출 수 (0=무제한)');
    writeLine('  --batch-size <N>    배치당 리뷰 수 (기본: 12)');
    process.exit(1);
  }

  const resolvedInput = path.resolve(inputPath);
  const maxCalls = parseInteger(args, '--max-calls', 0);
  const batchSize = parseInteger(args, '--batch-size', 12);
  const outputPath =
    getArgValue(args, '--output') ??
    resolvedInput.replace(/\.json$/, '-haiku-result.json');

  writeLine(`입력: ${resolvedInput}`);

  const raw = readJsonFile<LlmQueueFile | LlmQueueItem[]>(resolvedInput);
  const items: LlmQueueItem[] = Array.isArray(raw) ? raw : raw.items ?? [];

  if (items.length === 0) {
    writeLine('검증 대상 없음');
    return;
  }

  writeLine(`대상: ${items.length}건`);

  const inputs: HaikuValidationInput[] = items.map((item) => ({
    reviewId: item.reviewId,
    kindergartenName: item.kindergartenName,
    kindergartenAddress: item.kindergartenAddress ?? '',
    sidoCode: item.sidoCode ?? '',
    title: item.title,
    snippet: item.snippet,
    bodyExcerpt: item.bodyExcerpt ?? '',
    whyFlagged: item.whyFlagged ?? [],
    autoReasons: item.autoReasons ?? [],
  }));

  const decisions = await validateReviewsWithHaiku(inputs, {
    batchSize,
    maxCalls,
  });

  writeJsonFile(path.resolve(outputPath), { decisions });
  writeLine(`결과 저장: ${outputPath} (${decisions.length}건)`);
}

main().catch((error) => {
  process.stderr.write(
    `[FATAL] ${error instanceof Error ? error.message : String(error)}\n`
  );
  process.exit(1);
});

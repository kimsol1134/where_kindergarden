/**
 * 서울/인천/경기 등 큰 지역의 insane-search 수집을 offset 배치로 실행합니다.
 *
 * 사용법:
 *   npm run run:insane-review-batches -- --sido 11 --from-offset 25 --to-offset 759
 *   npm run run:insane-review-batches -- --sido 41 --from-offset 500 --to-offset 1000 --chunk-size 25 --max 2
 */

import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface KindergartenEntry {
  sido_code: string;
}

interface Args {
  sido: string;
  fromOffset: number;
  toOffset: number | null;
  chunkSize: number;
  maxPerSearch: number;
  dryRun: boolean;
}

const REGION_NAMES: Record<string, string> = {
  '11': 'seoul',
  '28': 'incheon',
  '41': 'gyeonggi',
};

function getArg(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  return index === -1 ? null : args[index + 1] ?? null;
}

function parseArgs(): Args {
  const args = process.argv.slice(2);
  const sido = getArg(args, '--sido');
  if (!sido) {
    console.error('ERROR: --sido is required.');
    process.exit(1);
  }

  return {
    sido,
    fromOffset: Number.parseInt(getArg(args, '--from-offset') ?? '0', 10),
    toOffset: getArg(args, '--to-offset')
      ? Number.parseInt(getArg(args, '--to-offset') ?? '', 10)
      : null,
    chunkSize: Number.parseInt(getArg(args, '--chunk-size') ?? '25', 10),
    maxPerSearch: Number.parseInt(getArg(args, '--max') ?? '2', 10),
    dryRun: args.includes('--dry-run'),
  };
}

function loadRegionCount(sido: string): number {
  const kindergartens = JSON.parse(
    fs.readFileSync(path.resolve('public/data/kindergartens.json'), 'utf-8')
  ) as KindergartenEntry[];
  return kindergartens.filter((kindergarten) => kindergarten.sido_code === sido).length;
}

function fileExistsWithReviewsEnvelope(filePath: string): boolean {
  if (!fs.existsSync(filePath)) {
    return false;
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as { reviews?: unknown };
    return Array.isArray(parsed.reviews);
  } catch {
    return false;
  }
}

function main(): void {
  const args = parseArgs();
  const regionCount = loadRegionCount(args.sido);
  const toOffset = Math.min(args.toOffset ?? regionCount, regionCount);
  const regionName = REGION_NAMES[args.sido] ?? args.sido;
  const datePrefix = new Date().toISOString().split('T')[0];
  const outputDir = path.resolve('scripts/data-output');

  if (Number.isNaN(args.fromOffset) || Number.isNaN(toOffset)) {
    throw new Error('Invalid offset arguments.');
  }

  console.log('=== insane-search batch runner ===');
  console.log(`sido=${args.sido} region=${regionName}`);
  console.log(`range=[${args.fromOffset}, ${toOffset}) / total=${regionCount}`);
  console.log(`chunkSize=${args.chunkSize} max=${args.maxPerSearch}`);
  console.log(`dryRun=${args.dryRun ? 'true' : 'false'}`);

  let completed = 0;
  let skipped = 0;
  let failed = 0;

  for (let offset = args.fromOffset; offset < toOffset; offset += args.chunkSize) {
    const end = Math.min(offset + args.chunkSize, toOffset);
    const limit = end - offset;
    const batchId = `${regionName}-${String(offset).padStart(4, '0')}-${String(end).padStart(4, '0')}`;
    const jsonPath = path.join(
      outputDir,
      `insane-reviews-${datePrefix}-${args.sido}-${batchId}.json`
    );
    const logPath = path.join(
      outputDir,
      `insane-reviews-${datePrefix}-${args.sido}-${batchId}.log`
    );

    if (fileExistsWithReviewsEnvelope(jsonPath)) {
      console.log(`[skip] ${batchId} -> ${jsonPath}`);
      skipped += 1;
      continue;
    }

    const commandArgs = [
      'run',
      'collect:insane-reviews',
      '--',
      '--sido',
      args.sido,
      '--offset',
      String(offset),
      '--limit',
      String(limit),
      '--max',
      String(args.maxPerSearch),
      '--batch-id',
      batchId,
    ];

    console.log(`[run] ${batchId}`);
    if (args.dryRun) {
      console.log(`npm ${commandArgs.join(' ')}`);
      continue;
    }

    const startedAt = new Date().toISOString();
    fs.writeFileSync(
      logPath,
      [
        `COMMAND: npm ${commandArgs.join(' ')}`,
        `STARTED: ${startedAt}`,
        '',
      ].join('\n')
    );

    const result = spawnSync('npm', commandArgs, {
      cwd: process.cwd(),
      encoding: 'utf-8',
      env: process.env,
      maxBuffer: 60 * 1024 * 1024,
    });

    fs.appendFileSync(logPath, result.stdout ?? '');
    fs.appendFileSync(logPath, result.stderr ?? '');
    fs.appendFileSync(logPath, `\nEXIT_CODE: ${result.status ?? 1}\n`);
    fs.appendFileSync(logPath, `FINISHED: ${new Date().toISOString()}\n`);

    if (result.status === 0 && fileExistsWithReviewsEnvelope(jsonPath)) {
      completed += 1;
      continue;
    }

    failed += 1;
    console.error(`[fail] ${batchId}; see ${logPath}`);
  }

  console.log(`done: completed=${completed}, skipped=${skipped}, failed=${failed}`);
  if (failed > 0) {
    process.exitCode = 1;
  }
}

main();

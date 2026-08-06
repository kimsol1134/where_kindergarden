/**
 * 로컬에서 검증·커밋한 freshness manifest가 실제 프로덕션에 게시됐는지 확인한다.
 * GitHub 데이터 갱신 워크플로가 저장소만 갱신하고 사용자에게는 오래된 JSON을
 * 계속 제공하는 상황을 실패로 드러내기 위한 배포 후 게이트다.
 *
 * 사용법:
 *   pnpm verify:data:production
 *   pnpm verify:data:production -- --timeout-ms 0
 *   pnpm verify:data:production -- --base-url https://example.com
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

interface FreshnessManifest {
  schemaVersion: number;
  generatedAt: string;
  overallStatus: string;
  staleSources: string[];
  attentionSources?: string[];
  sources: Record<string, unknown>;
}

const DEFAULT_BASE_URL = 'https://where-kindergarden.vercel.app';
const DEFAULT_TIMEOUT_MS = 10 * 60_000;
const DEFAULT_INTERVAL_MS = 15_000;

function getArgument(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
}

function parseNonNegativeInteger(value: string | undefined, fallback: number, flag: string): number {
  if (value === undefined) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`${flag} must be a non-negative integer`);
  }
  return parsed;
}

function canonicalManifest(manifest: FreshnessManifest): string {
  return JSON.stringify(manifest);
}

export function manifestsMatch(
  expected: FreshnessManifest,
  actual: FreshnessManifest
): boolean {
  return canonicalManifest(actual) === canonicalManifest(expected);
}

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const baseURL = (getArgument(args, '--base-url') ?? DEFAULT_BASE_URL).replace(/\/$/, '');
  const timeoutMs = parseNonNegativeInteger(
    getArgument(args, '--timeout-ms'),
    DEFAULT_TIMEOUT_MS,
    '--timeout-ms'
  );
  const intervalMs = parseNonNegativeInteger(
    getArgument(args, '--interval-ms'),
    DEFAULT_INTERVAL_MS,
    '--interval-ms'
  );
  const manifestPath = path.join(process.cwd(), 'public', 'data', 'freshness.json');
  const expected = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as FreshnessManifest;
  const deadline = Date.now() + timeoutMs;
  let attempt = 0;
  let lastObservation = 'no response';

  do {
    attempt += 1;
    const url = new URL('/data/freshness.json', baseURL);
    url.searchParams.set('expected', expected.generatedAt);
    url.searchParams.set('attempt', String(attempt));

    try {
      const response = await fetch(url, {
        cache: 'no-store',
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(15_000),
      });
      if (!response.ok) {
        lastObservation = `HTTP ${response.status}`;
      } else {
        const actual = (await response.json()) as FreshnessManifest;
        lastObservation =
          `generatedAt=${actual.generatedAt ?? 'missing'}, status=${actual.overallStatus ?? 'missing'}`;
        if (manifestsMatch(expected, actual)) {
          process.stdout.write(
            `Production data publication verified after ${attempt} attempt(s): ${expected.generatedAt}\n`
          );
          return;
        }
      }
    } catch (error) {
      lastObservation = error instanceof Error ? error.message : String(error);
    }

    if (Date.now() >= deadline) break;
    await sleep(Math.min(intervalMs, Math.max(0, deadline - Date.now())));
  } while (Date.now() <= deadline);

  throw new Error(
    `Production manifest did not match ${expected.generatedAt} within ${timeoutMs}ms ` +
      `(last observation: ${lastObservation})`
  );
}

if (process.argv[1]?.endsWith('verify-production-data.ts')) {
  main().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${message}\n`);
    process.exit(1);
  });
}

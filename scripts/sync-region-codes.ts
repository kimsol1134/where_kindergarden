/**
 * 유치원알리미가 배포하는 최신 시도·시군구 코드표를 로컬 TypeScript 모듈로 동기화한다.
 *
 * 사용법:
 *   pnpm sync:region-codes
 *   pnpm sync:region-codes -- --check
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';

const SOURCE_URL = 'https://e-childschoolinfo.moe.go.kr/openApi/sidoSigunguCode.do';
const TARGET_PATH = path.join(process.cwd(), 'scripts', 'data', 'sigungu-codes.ts');
const META_PATH = path.join(process.cwd(), 'public', 'data', 'region-codes.meta.json');
const REQUEST_TIMEOUT_MS = 30_000;

interface OfficialRegionCode {
  sidoName: string;
  sidoCode: string;
  sggName: string;
  sggCode: string;
}

function decodeHtml(value: string): string {
  const named: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&nbsp;': ' ',
  };

  return value
    .replace(/&amp;|&lt;|&gt;|&quot;|&#39;|&nbsp;/g, (entity) => named[entity] ?? entity)
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCharCode(parseInt(code, 16)));
}

function textContent(html: string): string {
  return decodeHtml(html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
}

function parseOfficialCodes(html: string): OfficialRegionCode[] {
  const rows: OfficialRegionCode[] = [];

  for (const rowMatch of html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const cells = Array.from(
      rowMatch[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi),
      (match) => textContent(match[1])
    );
    if (cells.length < 4 || !/^\d{2}$/.test(cells[1]) || !/^\d{5}$/.test(cells[3])) {
      continue;
    }

    rows.push({
      sidoName: cells[0],
      sidoCode: cells[1],
      sggName: cells[2],
      sggCode: cells[3],
    });
  }

  return rows.sort(
    (left, right) =>
      Number(left.sidoCode) - Number(right.sidoCode) ||
      Number(left.sggCode) - Number(right.sggCode)
  );
}

function validateCodes(rows: OfficialRegionCode[]): void {
  if (rows.length < 250 || rows.length > 300) {
    throw new Error(`Unexpected official region count: ${rows.length}`);
  }

  const uniqueCodes = new Set(rows.map((row) => row.sggCode));
  if (uniqueCodes.size !== rows.length) {
    throw new Error(`Duplicate sigungu codes: rows=${rows.length}, unique=${uniqueCodes.size}`);
  }

  const requiredCodes = ['12870', '28290', '41597', '36110'];
  const missing = requiredCodes.filter((code) => !uniqueCodes.has(code));
  if (missing.length > 0) {
    throw new Error(`Official code table is missing expected current codes: ${missing.join(', ')}`);
  }
}

function quote(value: string): string {
  return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

function renderModule(rows: OfficialRegionCode[]): string {
  const sidoCodes = Array.from(new Set(rows.map((row) => row.sidoCode))).sort(
    (left, right) => Number(left) - Number(right)
  );
  const mappingLines = sidoCodes.map((code) => `  ${quote(code)}: ${quote(code)},`).join('\n');
  const rowLines = rows
    .map(
      (row) =>
        `  { eduSidoCode: ${quote(row.sidoCode)}, adminSidoCode: ${quote(row.sidoCode)}, ` +
        `sggCode: ${quote(row.sggCode)}, sidoName: ${quote(row.sidoName)}, ` +
        `sggName: ${quote(row.sggName)} },`
    )
    .join('\n');

  return `/**
 * 전국 시군구 코드 목록
 *
 * 이 파일은 scripts/sync-region-codes.ts가 유치원알리미 공식 코드표에서 생성합니다.
 * Source: ${SOURCE_URL}
 */

export interface SigunguCode {
  /** 현재 유치원알리미 API 시도코드. 호환성을 위해 기존 필드명을 유지한다. */
  eduSidoCode: string;
  adminSidoCode: string;
  sggCode: string;
  sidoName: string;
  sggName: string;
}

export const REGION_CODES_SOURCE_URL = ${quote(SOURCE_URL)};

export const ADMIN_TO_EDU_SIDO: Record<string, string> = {
${mappingLines}
};

export const SIGUNGU_CODES: SigunguCode[] = [
${rowLines}
];

export function getSigunguBySido(eduSidoCode: string): SigunguCode[] {
  return SIGUNGU_CODES.filter((sgg) => sgg.eduSidoCode === eduSidoCode);
}

export function getSigunguByCode(sggCode: string): SigunguCode | undefined {
  return SIGUNGU_CODES.find((sgg) => sgg.sggCode === sggCode);
}

export function getSidoNames(): string[] {
  return [...new Set(SIGUNGU_CODES.map((sgg) => sgg.sidoName))];
}

export const TOTAL_SIGUNGU_COUNT = SIGUNGU_CODES.length;
`;
}

function atomicWrite(targetPath: string, content: string): void {
  const temporaryPath = `${targetPath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(temporaryPath, content);
  fs.renameSync(temporaryPath, targetPath);
}

async function main(): Promise<void> {
  const response = await fetch(SOURCE_URL, {
    headers: { Accept: 'text/html,application/xhtml+xml' },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(`Official region-code download failed (${response.status})`);
  }

  const rows = parseOfficialCodes(await response.text());
  validateCodes(rows);
  const nextContent = renderModule(rows);
  const currentContent = fs.existsSync(TARGET_PATH) ? fs.readFileSync(TARGET_PATH, 'utf8') : '';
  const changed = currentContent !== nextContent;

  if (process.argv.includes('--check')) {
    if (changed) {
      throw new Error(`Region codes are stale; run pnpm sync:region-codes (${rows.length} official rows)`);
    }
    process.stdout.write(`Region codes are current (${rows.length} rows)\n`);
    return;
  }

  if (changed) {
    atomicWrite(TARGET_PATH, nextContent);
    process.stdout.write(`Updated ${TARGET_PATH} from ${SOURCE_URL} (${rows.length} rows)\n`);
  } else {
    process.stdout.write(`No region-code changes (${rows.length} rows)\n`);
  }

  atomicWrite(
    META_PATH,
    JSON.stringify(
      {
        schemaVersion: 1,
        status: 'complete',
        source: SOURCE_URL,
        checkedAt: new Date().toISOString(),
        totalCount: rows.length,
        sidoCount: new Set(rows.map((row) => row.sidoCode)).size,
        checksumSha256: crypto.createHash('sha256').update(nextContent).digest('hex'),
      },
      null,
      2
    )
  );
  process.stdout.write(`Updated ${META_PATH} freshness metadata\n`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`Region-code sync failed: ${message}\n`);
  process.exit(1);
});

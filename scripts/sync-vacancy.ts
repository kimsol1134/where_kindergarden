/**
 * 유치원입학 결원정보 동기화 스크립트
 *
 * 사용법:
 *   pnpm sync:vacancy
 *   pnpm sync:vacancy -- --year 2026
 *   pnpm sync:vacancy -- --test
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { SIGUNGU_CODES, type SigunguCode } from './data/sigungu-codes';
import { parseVacancyDetailPage, parseVacancyListPage } from '../src/lib/vacancy/parser';
import type { VacancyDataset, VacancySummary } from '../src/types/vacancy';

// The live site presents a certificate chain that undici cannot verify in Node.
// Restrict the TLS override to this one sync process.
if (!process.env.NODE_TLS_REJECT_UNAUTHORIZED) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

const BASE_URL = 'https://www.go-firstschool.go.kr/PAMS_SS';
const LIST_URL = `${BASE_URL}/selectVacancyInfoList.do`;
const DETAIL_URL = `${BASE_URL}/selectPreschVacancyInfoList.do`;
const REQUEST_DELAY_MS = 150;
const TEST_SIGUNGU_CODE = '11680';
const BROWSER_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36';

interface SyncOptions {
  aidYear: string;
  isTestMode: boolean;
}

interface SessionState {
  cookieHeader: string;
}

function log(message: string): void {
  process.stdout.write(`${message}\n`);
}

function warn(message: string): void {
  process.stderr.write(`${message}\n`);
}

function parseArgs(argv: string[]): SyncOptions {
  const yearIndex = argv.indexOf('--year');
  const aidYear =
    yearIndex >= 0 && argv[yearIndex + 1]
      ? argv[yearIndex + 1]
      : String(new Date().getFullYear());

  return {
    aidYear,
    isTestMode: argv.includes('--test'),
  };
}

function buildListParams(sigungu: SigunguCode, aidYear: string, pageIndex: number): URLSearchParams {
  return new URLSearchParams({
    pageIndex: String(pageIndex),
    SEARCH_AID_YEAR: aidYear,
    SIDO_CD: sigungu.adminSidoCode,
    GUGUN_CD: sigungu.sggCode.slice(-3),
    PRESCH_FOUND_TYPE: '',
    PRESCH_NM: '',
  });
}

async function postForm(url: string, body: URLSearchParams): Promise<string> {
  const session = await createSession();
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      Accept: 'text/html, */*; q=0.1',
      'User-Agent': BROWSER_USER_AGENT,
      Origin: 'https://www.go-firstschool.go.kr',
      Referer: LIST_URL,
      Cookie: session.cookieHeader,
    },
    body: body.toString(),
  });

  if (!response.ok) {
    throw new Error(`Request failed (${response.status}) for ${url}`);
  }

  return await response.text();
}

let cachedSession: SessionState | null = null;

function extractCookieHeader(response: Response): string {
  const headerValues =
    typeof response.headers.getSetCookie === 'function'
      ? response.headers.getSetCookie()
      : [];

  return headerValues
    .map((cookie) => cookie.split(';', 1)[0])
    .filter((cookie) => cookie.length > 0)
    .join('; ');
}

async function createSession(): Promise<SessionState> {
  if (cachedSession) {
    return cachedSession;
  }

  const response = await fetch(LIST_URL, {
    headers: {
      Accept: 'text/html, */*; q=0.1',
      'User-Agent': BROWSER_USER_AGENT,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to initialize session (${response.status})`);
  }

  const cookieHeader = extractCookieHeader(response);
  if (!cookieHeader) {
    throw new Error('Failed to initialize session cookies');
  }

  cachedSession = { cookieHeader };
  return cachedSession;
}

async function fetchListPage(sigungu: SigunguCode, aidYear: string, pageIndex: number): Promise<string> {
  return await postForm(LIST_URL, buildListParams(sigungu, aidYear, pageIndex));
}

async function fetchDetail(summary: VacancySummary): Promise<string> {
  if (!summary.preschCd || !summary.upperEduOfficeCd || !summary.eduOfficeCd) {
    throw new Error(`Missing detail codes for ${summary.kindercode}`);
  }

  return await postForm(
    DETAIL_URL,
    new URLSearchParams({
      AID_YEAR: summary.aidYear,
      PRESCH_CD: summary.preschCd,
      UPPER_EDU_OFFICE_CD: summary.upperEduOfficeCd,
      EDU_OFFICE_CD: summary.eduOfficeCd,
    })
  );
}

function mergeSummary(existing: VacancySummary | undefined, incoming: VacancySummary): VacancySummary {
  if (!existing) {
    return incoming;
  }

  return {
    ...existing,
    ...incoming,
    vacancyCount: incoming.vacancyCount,
    updatedAt: incoming.updatedAt ?? existing.updatedAt,
    preschCd: incoming.preschCd ?? existing.preschCd,
    upperEduOfficeCd: incoming.upperEduOfficeCd ?? existing.upperEduOfficeCd,
    eduOfficeCd: incoming.eduOfficeCd ?? existing.eduOfficeCd,
    foundType: incoming.foundType ?? existing.foundType,
    phone: incoming.phone ?? existing.phone,
    detail: existing.detail,
  };
}

async function collectSigunguSummaries(
  sigungu: SigunguCode,
  aidYear: string,
  itemsMap: Map<string, VacancySummary>
): Promise<void> {
  const firstPageHtml = await fetchListPage(sigungu, aidYear, 1);
  const firstPage = parseVacancyListPage(firstPageHtml, aidYear);

  for (const item of firstPage.items) {
    itemsMap.set(item.kindercode, mergeSummary(itemsMap.get(item.kindercode), item));
  }

  for (let pageIndex = 2; pageIndex <= firstPage.totalPages; pageIndex += 1) {
    await sleep(REQUEST_DELAY_MS);
    const pageHtml = await fetchListPage(sigungu, aidYear, pageIndex);
    const page = parseVacancyListPage(pageHtml, aidYear);

    for (const item of page.items) {
      itemsMap.set(item.kindercode, mergeSummary(itemsMap.get(item.kindercode), item));
    }
  }
}

async function enrichDetails(itemsMap: Map<string, VacancySummary>): Promise<void> {
  const summaries = Array.from(itemsMap.values()).filter(
    (summary) =>
      summary.vacancyCount > 0 &&
      summary.preschCd &&
      summary.upperEduOfficeCd &&
      summary.eduOfficeCd
  );

  for (let index = 0; index < summaries.length; index += 1) {
    const summary = summaries[index];

    try {
      const detailHtml = await fetchDetail(summary);
      summary.detail = parseVacancyDetailPage(detailHtml);
      itemsMap.set(summary.kindercode, summary);
      log(`[detail ${index + 1}/${summaries.length}] ${summary.name} (${summary.vacancyCount}명)`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      warn(`[detail warn] ${summary.kindercode}: ${message}`);
    }

    await sleep(REQUEST_DELAY_MS);
  }
}

function buildDataset(itemsMap: Map<string, VacancySummary>, aidYear: string): VacancyDataset {
  const items = Object.fromEntries(
    Array.from(itemsMap.values())
      .sort((a, b) => a.name.localeCompare(b.name, 'ko'))
      .map((item) => [item.kindercode, item])
  );

  const totalCount = Object.keys(items).length;
  const positiveCount = Object.values(items).filter((item) => item.vacancyCount > 0).length;

  return {
    version: new Date().toISOString(),
    source: BASE_URL,
    aidYear,
    totalCount,
    positiveCount,
    items,
  };
}

function writeJsonFiles(dataset: VacancyDataset): void {
  const publicPath = path.join(process.cwd(), 'public', 'data', 'vacancy.json');
  const outputDir = path.join(process.cwd(), 'scripts', 'data-output');
  const outputPath = path.join(outputDir, `vacancy-${new Date().toISOString().slice(0, 10)}.json`);

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const payload = JSON.stringify(dataset, null, 2);
  fs.writeFileSync(publicPath, payload);
  fs.writeFileSync(outputPath, payload);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const targetSigungu = options.isTestMode
    ? SIGUNGU_CODES.filter((sigungu) => sigungu.sggCode === TEST_SIGUNGU_CODE)
    : SIGUNGU_CODES;

  const itemsMap = new Map<string, VacancySummary>();

  log(`Starting vacancy sync for ${targetSigungu.length} sigungu (aidYear=${options.aidYear})`);

  for (let index = 0; index < targetSigungu.length; index += 1) {
    const sigungu = targetSigungu[index];

    try {
      await collectSigunguSummaries(sigungu, options.aidYear, itemsMap);
      log(
        `[list ${index + 1}/${targetSigungu.length}] ${sigungu.sidoName} ${sigungu.sggName} complete`
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      warn(`[list warn] ${sigungu.sidoName} ${sigungu.sggName}: ${message}`);
    }

    await sleep(REQUEST_DELAY_MS);
  }

  await enrichDetails(itemsMap);

  const dataset = buildDataset(itemsMap, options.aidYear);
  if (dataset.totalCount === 0) {
    throw new Error('No vacancy data collected. Aborting without writing vacancy.json');
  }

  writeJsonFiles(dataset);

  log(`Vacancy sync completed. total=${dataset.totalCount}, positive=${dataset.positiveCount}`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  warn(`Fatal error: ${message}`);
  process.exit(1);
});

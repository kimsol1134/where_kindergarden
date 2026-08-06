/**
 * 유치원입학 결원정보 동기화 스크립트
 *
 * 사용법:
 *   pnpm sync:vacancy
 *   pnpm sync:vacancy -- --year 2026
 *   pnpm sync:vacancy -- --test                 # 강남구만 검증, 파일 미작성
 *   pnpm sync:vacancy -- --test --output /tmp/vacancy-test.json
 *   pnpm sync:vacancy -- --no-publish --output /tmp/vacancy.json
 */

import * as fs from 'node:fs';
import * as http from 'node:http';
import * as https from 'node:https';
import * as path from 'node:path';
import { X509Certificate } from 'node:crypto';
import { rootCertificates } from 'node:tls';
import { SIGUNGU_CODES, type SigunguCode } from './data/sigungu-codes';
import { parseVacancyDetailPage, parseVacancyListPage } from '../src/lib/vacancy/parser';
import type { VacancyDataset, VacancySummary } from '../src/types/vacancy';

const BASE_URL = 'https://www.go-firstschool.go.kr/PAMS_SS';
const LIST_URL = `${BASE_URL}/selectVacancyInfoList.do`;
const DETAIL_URL = `${BASE_URL}/selectPreschVacancyInfoList.do`;
const REQUEST_DELAY_MS = 150;
const REQUEST_TIMEOUT_MS = 30_000;
const MAX_REQUEST_ATTEMPTS = 3;
const MIN_DETAIL_COVERAGE = 0.98;
const INTERMEDIATE_CA_URL = 'http://public.wisekey.com/crt/tsrsasecureca2.cer';
const INTERMEDIATE_CA_COMMON_NAME = 'TuringSign RSA Secure CA 2';
const INTERMEDIATE_CA_SHA256 =
  'A6:F9:C9:67:EB:8A:A9:28:3A:1C:A6:49:B8:7B:76:47:20:E9:F5:C3:AF:A8:1C:15:06:76:F4:CA:36:E9:8C:F6';
const MAX_CA_BYTES = 32 * 1024;
const TEST_SIGUNGU_CODE = '11680';
const BROWSER_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36';

interface SyncOptions {
  aidYear: string;
  isTestMode: boolean;
  isDryRun: boolean;
  publishPublic: boolean;
  allowPartial: boolean;
  outputPath: string | null;
}

interface SessionState {
  cookieHeader: string;
}

interface TrustedResponse {
  status: number;
  headers: http.IncomingHttpHeaders;
  body: string;
}

interface CollectionFailure {
  stage: 'list' | 'detail';
  key: string;
  message: string;
}

interface CollectionStats {
  startedAt: string;
  regionsRequested: number;
  regionsSucceeded: number;
  failures: CollectionFailure[];
  detailRequested: number;
  detailSucceeded: number;
  detailFailed: number;
}

function log(message: string): void {
  process.stdout.write(`${message}\n`);
}

function warn(message: string): void {
  process.stderr.write(`${message}\n`);
}

let trustedAgentPromise: Promise<https.Agent> | null = null;

function downloadIntermediateCertificate(): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const request = http.get(INTERMEDIATE_CA_URL, (response) => {
      if (response.statusCode !== 200) {
        response.resume();
        reject(new Error(`Intermediate CA download failed (${response.statusCode ?? 'unknown'})`));
        return;
      }

      const chunks: Buffer[] = [];
      let totalBytes = 0;
      response.on('data', (chunk: Buffer) => {
        totalBytes += chunk.length;
        if (totalBytes > MAX_CA_BYTES) {
          request.destroy(new Error('Intermediate CA response exceeded the safety limit'));
          return;
        }
        chunks.push(chunk);
      });
      response.on('end', () => resolve(Buffer.concat(chunks)));
    });

    request.setTimeout(REQUEST_TIMEOUT_MS, () => {
      request.destroy(new Error('Intermediate CA download timed out'));
    });
    request.on('error', reject);
  });
}

async function getTrustedAgent(): Promise<https.Agent> {
  if (!trustedAgentPromise) {
    trustedAgentPromise = (async () => {
      // The source currently omits its intermediate certificate. Fetch the
      // issuer named in the leaf certificate and add it to Node's normal CA
      // set instead of disabling TLS verification for the whole process.
      const certificate = new X509Certificate(await downloadIntermediateCertificate());
      if (!certificate.subject.includes(`CN=${INTERMEDIATE_CA_COMMON_NAME}`)) {
        throw new Error(`Unexpected intermediate CA subject: ${certificate.subject}`);
      }
      if (certificate.fingerprint256 !== INTERMEDIATE_CA_SHA256) {
        throw new Error(`Unexpected intermediate CA fingerprint: ${certificate.fingerprint256}`);
      }
      if (Date.parse(certificate.validFrom) > Date.now() || Date.parse(certificate.validTo) <= Date.now()) {
        throw new Error('Intermediate CA certificate is outside its validity window');
      }

      return new https.Agent({
        keepAlive: true,
        ca: [...rootCertificates, certificate.toString()],
      });
    })().catch((error) => {
      trustedAgentPromise = null;
      throw error;
    });
  }

  return trustedAgentPromise;
}

async function requestTrusted(
  url: string,
  options: {
    method?: 'GET' | 'POST';
    headers?: http.OutgoingHttpHeaders;
    body?: string;
  } = {}
): Promise<TrustedResponse> {
  const agent = await getTrustedAgent();

  return await new Promise((resolve, reject) => {
    const request = https.request(
      url,
      {
        method: options.method ?? 'GET',
        headers: options.headers,
        agent,
      },
      (response) => {
        const chunks: Buffer[] = [];
        response.on('data', (chunk: Buffer) => chunks.push(chunk));
        response.on('end', () => {
          resolve({
            status: response.statusCode ?? 0,
            headers: response.headers,
            body: Buffer.concat(chunks).toString('utf8'),
          });
        });
      }
    );

    request.setTimeout(REQUEST_TIMEOUT_MS, () => {
      request.destroy(new Error(`Request timed out for ${url}`));
    });
    request.on('error', reject);
    if (options.body) request.write(options.body);
    request.end();
  });
}

function parseArgs(argv: string[]): SyncOptions {
  const yearIndex = argv.indexOf('--year');
  const outputIndex = argv.indexOf('--output');
  const aidYear =
    yearIndex >= 0 && argv[yearIndex + 1]
      ? argv[yearIndex + 1]
      : String(new Date().getFullYear());

  const isTestMode = argv.includes('--test');
  const outputPath =
    outputIndex >= 0 && argv[outputIndex + 1]
      ? path.resolve(argv[outputIndex + 1])
      : null;

  if (isTestMode && argv.includes('--publish')) {
    throw new Error('--test 결과는 public/data/vacancy.json에 게시할 수 없습니다');
  }

  return {
    aidYear,
    isTestMode,
    // 테스트 모드는 명시적 --output이 없으면 완전한 dry-run이다.
    isDryRun: argv.includes('--dry-run') || (isTestMode && outputPath === null),
    publishPublic: !isTestMode && !argv.includes('--no-publish') && !argv.includes('--dry-run'),
    allowPartial: argv.includes('--allow-partial'),
    outputPath,
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
  const response = await requestTrusted(url, {
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

  if (response.status < 200 || response.status >= 300) {
    if (response.status === 401 || response.status === 403) {
      cachedSession = null;
    }
    throw new Error(`Request failed (${response.status}) for ${url}`);
  }

  return response.body;
}

let cachedSession: SessionState | null = null;

function extractCookieHeader(headers: http.IncomingHttpHeaders): string {
  const headerValues = headers['set-cookie'] ?? [];

  return headerValues
    .map((cookie) => cookie.split(';', 1)[0])
    .filter((cookie) => cookie.length > 0)
    .join('; ');
}

async function createSession(): Promise<SessionState> {
  if (cachedSession) {
    return cachedSession;
  }

  const response = await requestTrusted(LIST_URL, {
    headers: {
      Accept: 'text/html, */*; q=0.1',
      'User-Agent': BROWSER_USER_AGENT,
    },
  });

  if (response.status < 200 || response.status >= 300) {
    throw new Error(`Failed to initialize session (${response.status})`);
  }

  const cookieHeader = extractCookieHeader(response.headers);
  if (!cookieHeader) {
    throw new Error('Failed to initialize session cookies');
  }

  cachedSession = { cookieHeader };
  return cachedSession;
}

async function fetchListPage(sigungu: SigunguCode, aidYear: string, pageIndex: number): Promise<string> {
  return await withRetry(
    `list ${sigungu.sggCode} page ${pageIndex}`,
    () => postForm(LIST_URL, buildListParams(sigungu, aidYear, pageIndex))
  );
}

async function fetchDetail(summary: VacancySummary): Promise<string> {
  if (!summary.preschCd || !summary.upperEduOfficeCd || !summary.eduOfficeCd) {
    throw new Error(`Missing detail codes for ${summary.kindercode}`);
  }

  return await withRetry(
    `detail ${summary.kindercode}`,
    () => postForm(
      DETAIL_URL,
      new URLSearchParams({
        AID_YEAR: summary.aidYear,
        PRESCH_CD: summary.preschCd!,
        UPPER_EDU_OFFICE_CD: summary.upperEduOfficeCd!,
        EDU_OFFICE_CD: summary.eduOfficeCd!,
      })
    )
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

  if (!/id=["']dsMainTbody["']/i.test(firstPageHtml) || !/유치원 조회결과 - 총/u.test(firstPageHtml)) {
    throw new Error('Expected vacancy list markup was not found');
  }
  if (firstPage.totalCount > 0 && firstPage.items.length === 0) {
    throw new Error(`Parser returned 0 rows for a ${firstPage.totalCount}-row response`);
  }

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

async function enrichDetails(
  itemsMap: Map<string, VacancySummary>,
  stats: CollectionStats
): Promise<void> {
  const summaries = Array.from(itemsMap.values()).filter(
    (summary) =>
      summary.vacancyCount > 0 &&
      summary.preschCd &&
      summary.upperEduOfficeCd &&
      summary.eduOfficeCd
  );
  stats.detailRequested = summaries.length;

  for (let index = 0; index < summaries.length; index += 1) {
    const summary = summaries[index];

    try {
      const detailHtml = await fetchDetail(summary);
      const detail = parseVacancyDetailPage(detailHtml);
      if (detail.length === 0) {
        throw new Error('No detail rows parsed');
      }
      summary.detail = detail;
      itemsMap.set(summary.kindercode, summary);
      stats.detailSucceeded += 1;
      log(`[detail ${index + 1}/${summaries.length}] ${summary.name} (${summary.vacancyCount}명)`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      stats.detailFailed += 1;
      stats.failures.push({ stage: 'detail', key: summary.kindercode, message });
      warn(`[detail warn] ${summary.kindercode}: ${message}`);
    }

    await sleep(REQUEST_DELAY_MS);
  }
}

function buildDataset(
  itemsMap: Map<string, VacancySummary>,
  aidYear: string,
  stats: CollectionStats
): VacancyDataset {
  const items = Object.fromEntries(
    Array.from(itemsMap.values())
      .sort((a, b) => a.name.localeCompare(b.name, 'ko'))
      .map((item) => [item.kindercode, item])
  );

  const totalCount = Object.keys(items).length;
  const positiveCount = Object.values(items).filter((item) => item.vacancyCount > 0).length;
  const completedAt = new Date().toISOString();
  const listFailures = stats.failures.filter((failure) => failure.stage === 'list').length;
  const listCompleteness =
    stats.regionsRequested === 0 ? 0 : stats.regionsSucceeded / stats.regionsRequested;
  const detailCoverage =
    stats.detailRequested === 0 ? 1 : stats.detailSucceeded / stats.detailRequested;

  return {
    version: completedAt,
    source: BASE_URL,
    aidYear,
    totalCount,
    positiveCount,
    quality: {
      status: listFailures === 0 && detailCoverage >= MIN_DETAIL_COVERAGE ? 'complete' : 'partial',
      startedAt: stats.startedAt,
      completedAt,
      regionsRequested: stats.regionsRequested,
      regionsSucceeded: stats.regionsSucceeded,
      regionsFailed: listFailures,
      listCompleteness,
      detailRequested: stats.detailRequested,
      detailSucceeded: stats.detailSucceeded,
      detailFailed: stats.detailFailed,
      detailCoverage,
      failures: stats.failures,
    },
    items,
  };
}

function atomicWriteJson(targetPath: string, payload: string): void {
  const directory = path.dirname(targetPath);
  fs.mkdirSync(directory, { recursive: true });
  const temporaryPath = path.join(
    directory,
    `.${path.basename(targetPath)}.${process.pid}.${Date.now()}.tmp`
  );
  fs.writeFileSync(temporaryPath, payload);
  fs.renameSync(temporaryPath, targetPath);
}

function writeJsonFiles(dataset: VacancyDataset, options: SyncOptions): void {
  const publicPath = path.join(process.cwd(), 'public', 'data', 'vacancy.json');
  const outputDir = path.join(process.cwd(), 'scripts', 'data-output');
  const defaultOutputPath = path.join(
    outputDir,
    `vacancy-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
  );

  const payload = JSON.stringify(dataset, null, 2);
  if (options.outputPath) {
    atomicWriteJson(options.outputPath, payload);
    log(`Wrote snapshot: ${options.outputPath}`);
  } else if (!options.isTestMode) {
    atomicWriteJson(defaultOutputPath, payload);
    log(`Wrote snapshot: ${defaultOutputPath}`);
  }

  if (options.publishPublic) {
    atomicWriteJson(publicPath, payload);
    log(`Published atomically: ${publicPath}`);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function withRetry<T>(label: string, operation: () => Promise<T>): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_REQUEST_ATTEMPTS; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      cachedSession = null;
      if (attempt === MAX_REQUEST_ATTEMPTS) {
        break;
      }
      const message = error instanceof Error ? error.message : String(error);
      warn(`[retry ${attempt}/${MAX_REQUEST_ATTEMPTS - 1}] ${label}: ${message}`);
      await sleep(500 * 2 ** (attempt - 1));
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const targetSigungu = options.isTestMode
    ? SIGUNGU_CODES.filter((sigungu) => sigungu.sggCode === TEST_SIGUNGU_CODE)
    : SIGUNGU_CODES;

  const itemsMap = new Map<string, VacancySummary>();
  const stats: CollectionStats = {
    startedAt: new Date().toISOString(),
    regionsRequested: targetSigungu.length,
    regionsSucceeded: 0,
    failures: [],
    detailRequested: 0,
    detailSucceeded: 0,
    detailFailed: 0,
  };

  log(
    `Starting vacancy sync for ${targetSigungu.length} sigungu ` +
      `(aidYear=${options.aidYear}, publish=${options.publishPublic}, dryRun=${options.isDryRun})`
  );

  for (let index = 0; index < targetSigungu.length; index += 1) {
    const sigungu = targetSigungu[index];

    try {
      await collectSigunguSummaries(sigungu, options.aidYear, itemsMap);
      stats.regionsSucceeded += 1;
      log(
        `[list ${index + 1}/${targetSigungu.length}] ${sigungu.sidoName} ${sigungu.sggName} complete`
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      stats.failures.push({
        stage: 'list',
        key: sigungu.sggCode,
        message: `${sigungu.sidoName} ${sigungu.sggName}: ${message}`,
      });
      warn(`[list warn] ${sigungu.sidoName} ${sigungu.sggName}: ${message}`);
    }

    await sleep(REQUEST_DELAY_MS);
  }

  await enrichDetails(itemsMap, stats);

  const dataset = buildDataset(itemsMap, options.aidYear, stats);
  if (dataset.totalCount === 0) {
    throw new Error('No vacancy data collected. Aborting without writing vacancy.json');
  }

  const quality = dataset.quality!;
  if (!options.allowPartial && quality.regionsFailed > 0) {
    throw new Error(
      `${quality.regionsFailed}/${quality.regionsRequested} regions failed; refusing partial publication`
    );
  }
  if (!options.allowPartial && quality.detailCoverage < MIN_DETAIL_COVERAGE) {
    throw new Error(
      `Detail coverage ${(quality.detailCoverage * 100).toFixed(1)}% is below ` +
        `${(MIN_DETAIL_COVERAGE * 100).toFixed(0)}%; refusing publication`
    );
  }

  if (!options.isDryRun) {
    writeJsonFiles(dataset, options);
  } else {
    log('Dry-run complete; no files were written');
  }

  log(
    `Vacancy sync completed. total=${dataset.totalCount}, positive=${dataset.positiveCount}, ` +
      `regions=${quality.regionsSucceeded}/${quality.regionsRequested}, ` +
      `detailCoverage=${(quality.detailCoverage * 100).toFixed(1)}%`
  );
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  warn(`Fatal error: ${message}`);
  process.exit(1);
});

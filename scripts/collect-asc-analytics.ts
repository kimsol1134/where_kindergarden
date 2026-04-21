/**
 * App Store Connect Analytics データ収集スクリプト
 *
 * ASC Sales Reports API を使用して設置/セッション/インプレッション指標を収集します。
 * Mixpanel の日次データと date (YYYY-MM-DD) をJOINキーとして教差分析に使用します。
 *
 * 사용법:
 *   pnpm collect:asc-analytics                       # 当月データ収集
 *   pnpm collect:asc-analytics -- --month 2025-03    # 특정 월 수집
 *   pnpm collect:asc-analytics -- --dry-run          # JWT 구성 확인 (API 호출 없음)
 *   pnpm collect:asc-analytics -- --dry-run --print-jwt  # JWT 출력 후 종료
 *   pnpm collect:asc-analytics -- --analytics        # Analytics Reports API 사용 (비동기 3단계)
 *
 * 환경 변수 (.env.testflight.local 또는 .env.local):
 *   APP_STORE_CONNECT_API_KEY_ID      — API Key ID (예: TW3Y8S4M9V)
 *   APP_STORE_CONNECT_API_KEY_ISSUER_ID — Issuer ID
 *   APP_STORE_CONNECT_API_KEY_PATH    — .p8 파일 절대 경로
 *   APP_STORE_APP_ID                  — Apple App ID (숫자)
 */

import { config } from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';
import jwt from 'jsonwebtoken';

// .env.testflight.local 우선, .env.local fallback
config({ path: '.env.testflight.local' });
config({ path: '.env.local' });
config();

// ============================================================================
// 타입 정의 (any 타입 사용 금지 — CLAUDE.md 절대 규칙)
// ============================================================================

export interface AscApiConfig {
  keyId: string;       // APP_STORE_CONNECT_API_KEY_ID
  issuerId: string;    // APP_STORE_CONNECT_API_KEY_ISSUER_ID
  privateKey: string;  // .p8 파일 내용
  appId: string;       // APP_STORE_APP_ID
}

export interface AscDailyMetric {
  date: string;         // YYYY-MM-DD (JOIN key)
  cohort_date: string;  // YYYY-MM-DD (= date for daily snapshot)
  metric_name: string;  // "installs" | "sessions" | "impressions" | "page_views"
  value: number;
  source: string;       // "asc_sales_report" | "asc_analytics_report"
}

export interface AscCollectionResult {
  collected_at: string;                       // ISO-8601
  period: { start: string; end: string };     // YYYY-MM-DD
  metrics: AscDailyMetric[];
  raw_header?: string[];                      // Sales Report 헤더 (디버그용)
}

// Analytics Reports API 응답 타입
interface AnalyticsReportRequest {
  id: string;
  type: string;
  attributes: {
    accessType: string;
    stoppedDueToInactivity: boolean;
  };
}

interface AnalyticsReportRequestResponse {
  data: AnalyticsReportRequest;
}

interface AnalyticsReportInstance {
  id: string;
  type: string;
  attributes: {
    granularity: string;
    processingDate: string;
    size: number;
  };
  links: {
    url: string;
  };
}

interface AnalyticsReportInstancesResponse {
  data: AnalyticsReportInstance[];
}

// ============================================================================
// 유틸리티
// ============================================================================

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function log(message: string): void {
  process.stdout.write(`${message}\n`);
}

function logError(message: string): void {
  process.stderr.write(`ERROR: ${message}\n`);
}

function logWarn(message: string): void {
  process.stderr.write(`WARN: ${message}\n`);
}

// ============================================================================
// JWT 생성 (ES256, 20분 만료)
// ============================================================================

export function generateJwt(config: AscApiConfig): string {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: config.issuerId,
    iat: now,
    exp: now + 1200, // 20분
    aud: 'appstoreconnect-v1',
  };

  const token = jwt.sign(payload, config.privateKey, {
    algorithm: 'ES256',
    header: {
      alg: 'ES256',
      kid: config.keyId,
      typ: 'JWT',
    },
  });

  return token;
}

// ============================================================================
// ASC API 헬퍼
// ============================================================================

async function ascFetch(
  jwtToken: string,
  url: string,
  acceptOverride?: string
): Promise<Response> {
  await delay(500);
  return fetch(url, {
    headers: {
      Authorization: `Bearer ${jwtToken}`,
      Accept: acceptOverride ?? 'application/json',
    },
  });
}

// Sales Report 응답은 gzip 바이너리. Content-Encoding: gzip이면 fetch가 자동 decompress하지만,
// Apple은 Content-Type: application/a-gzip으로 raw gzip을 보내는 경우가 있어 수동 처리.
async function readMaybeGzippedText(response: Response): Promise<string> {
  const buf = Buffer.from(await response.arrayBuffer());
  const isGzipMagic = buf.length >= 2 && buf[0] === 0x1f && buf[1] === 0x8b;
  if (isGzipMagic) {
    return zlib.gunzipSync(buf).toString('utf-8');
  }
  return buf.toString('utf-8');
}

// ============================================================================
// Sales Reports API (Primary)
// GET /v1/salesReports?filter[reportType]=SALES&filter[reportSubType]=SUMMARY
// 동기 응답, 전일/전월 데이터. Units 컬럼을 installs 근사치로 사용.
// ============================================================================

export async function fetchSalesReport(
  config: AscApiConfig,
  year: number,
  month: number
): Promise<AscDailyMetric[]> {
  const jwtToken = generateJwt(config);
  const monthStr = String(month).padStart(2, '0');
  const reportDate = `${year}-${monthStr}`;

  const params = new URLSearchParams({
    'filter[frequency]': 'MONTHLY',
    'filter[reportType]': 'SALES',
    'filter[reportSubType]': 'SUMMARY',
    'filter[vendorNumber]': config.appId,
    'filter[reportDate]': reportDate,
  });

  const url = `https://api.appstoreconnect.apple.com/v1/salesReports?${params.toString()}`;
  log(`[ASC] Fetching Sales Report: ${url}`);

  const response = await ascFetch(jwtToken, url, 'application/a-gzip');

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Sales Report API error ${response.status}: ${text.slice(0, 200)}`);
  }

  const text = await readMaybeGzippedText(response);
  return parseSalesReportCsv(text, config.appId);
}

// ============================================================================
// Sales Report TSV/CSV 파싱 → AscDailyMetric[]
// ============================================================================

export function parseSalesReportCsv(tsvContent: string, appId: string): AscDailyMetric[] {
  const lines = tsvContent.split('\n').filter((line) => line.trim().length > 0);
  if (lines.length < 2) {
    return [];
  }

  // 첫 번째 행이 헤더
  const headers = lines[0].split('\t').map((h) => h.trim().toLowerCase());

  const unitsIdx = headers.findIndex((h) => h === 'units');
  const dateIdx = headers.findIndex((h) => h === 'begin date' || h === 'begindate');
  const appleIdIdx = headers.findIndex((h) => h === 'apple identifier' || h === 'appleid');

  if (unitsIdx === -1 || dateIdx === -1) {
    logWarn(`Sales Report missing required columns. headers=${headers.join(',')}`);
    return [];
  }

  const metrics: AscDailyMetric[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split('\t');

    // Apple ID 필터링 (appId가 숫자인 경우)
    if (appleIdIdx !== -1 && appId) {
      const rowAppId = cols[appleIdIdx]?.trim() ?? '';
      if (rowAppId && rowAppId !== appId) {
        continue;
      }
    }

    const rawDate = cols[dateIdx]?.trim() ?? '';
    const unitsStr = cols[unitsIdx]?.trim() ?? '0';
    const units = parseInt(unitsStr, 10);

    if (!rawDate || isNaN(units) || units < 0) {
      continue;
    }

    // 날짜 정규화 (MM/DD/YYYY → YYYY-MM-DD)
    const date = normalizeDate(rawDate);
    if (!date) {
      continue;
    }

    metrics.push({
      date,
      cohort_date: date,
      metric_name: 'installs',
      value: units,
      source: 'asc_sales_report',
    });
  }

  return metrics;
}

/**
 * 날짜 문자열을 YYYY-MM-DD 형식으로 정규화
 * 입력: MM/DD/YYYY 또는 YYYY-MM-DD
 */
export function normalizeDate(raw: string): string | null {
  // YYYY-MM-DD 형식
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw;
  }
  // MM/DD/YYYY 형식
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(raw);
  if (match) {
    const [, m, d, y] = match;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  return null;
}

// ============================================================================
// Analytics Reports API (Optional — 3단계 비동기 흐름)
// Step 1: POST /v1/analyticsReportRequests
// Step 2: poll GET /v1/analyticsReportRequests/{id} until state == COMPLETED
// Step 3: GET /v1/analyticsReports/{id}/instances → download
// ============================================================================

export async function fetchAnalyticsReport(
  config: AscApiConfig,
  startDate: string,
  endDate: string
): Promise<AscDailyMetric[]> {
  const jwtToken = generateJwt(config);

  // Step 1: Report Request 생성
  log(`[ASC Analytics] Step 1: Creating report request for ${startDate} ~ ${endDate}...`);
  const createRes = await fetch(
    'https://api.appstoreconnect.apple.com/v1/analyticsReportRequests',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${jwtToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: {
          type: 'analyticsReportRequests',
          attributes: {
            accessType: 'ONE_TIME_SNAPSHOT',
          },
          relationships: {
            app: {
              data: {
                type: 'apps',
                id: config.appId,
              },
            },
          },
        },
      }),
    }
  );

  if (!createRes.ok) {
    const text = await createRes.text();
    throw new Error(`Analytics Report Request failed ${createRes.status}: ${text.slice(0, 200)}`);
  }

  const createBody = await createRes.json() as AnalyticsReportRequestResponse;
  const requestId = createBody.data.id;
  log(`[ASC Analytics] Request ID: ${requestId}`);

  // Step 2: polling — 최대 10분, 30초 간격
  const POLL_INTERVAL_MS = 30_000;
  const MAX_WAIT_MS = 600_000;
  const deadline = Date.now() + MAX_WAIT_MS;

  log('[ASC Analytics] Step 2: Polling for completion...');
  let instancesUrl = '';

  while (Date.now() < deadline) {
    await delay(POLL_INTERVAL_MS);

    const freshJwt = generateJwt(config);
    const pollRes = await fetch(
      `https://api.appstoreconnect.apple.com/v1/analyticsReportRequests/${requestId}/reports`,
      {
        headers: {
          Authorization: `Bearer ${freshJwt}`,
          Accept: 'application/json',
        },
      }
    );

    if (!pollRes.ok) {
      logWarn(`Poll response ${pollRes.status}, continuing...`);
      continue;
    }

    const pollBody = await pollRes.json() as AnalyticsReportInstancesResponse;
    if (pollBody.data && pollBody.data.length > 0) {
      // 첫 번째 인스턴스 사용
      instancesUrl = pollBody.data[0].links.url;
      log(`[ASC Analytics] Report ready: ${instancesUrl}`);
      break;
    }

    log('[ASC Analytics] Not ready yet, waiting...');
  }

  if (!instancesUrl) {
    process.stderr.write('ERROR: Analytics Report timed out after 10 minutes.\n');
    process.exit(1);
  }

  // Step 3: 데이터 다운로드
  log('[ASC Analytics] Step 3: Downloading report data...');
  const freshJwt2 = generateJwt(config);
  const dataRes = await fetch(instancesUrl, {
    headers: {
      Authorization: `Bearer ${freshJwt2}`,
      Accept: 'application/json',
    },
  });

  if (!dataRes.ok) {
    throw new Error(`Analytics data download failed ${dataRes.status}`);
  }

  const text = await dataRes.text();
  return parseAnalyticsReportData(text);
}

function parseAnalyticsReportData(
  content: string
): AscDailyMetric[] {
  const metrics: AscDailyMetric[] = [];
  const lines = content.split('\n').filter((l) => l.trim().length > 0);
  if (lines.length < 2) return metrics;

  const headers = lines[0].split('\t').map((h) => h.trim().toLowerCase());
  const dateIdx = headers.findIndex((h) => h === 'date' || h === 'day');
  const metricIdx = headers.findIndex((h) => h === 'value' || h === 'count');
  const nameIdx = headers.findIndex((h) => h === 'metric' || h === 'metric name');

  if (dateIdx === -1 || metricIdx === -1) {
    logWarn(`Analytics report missing required columns. headers=${headers.join(',')}`);
    return metrics;
  }

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split('\t');
    const rawDate = cols[dateIdx]?.trim() ?? '';
    const valueStr = cols[metricIdx]?.trim() ?? '0';
    const metricName = nameIdx !== -1 ? (cols[nameIdx]?.trim() ?? 'sessions') : 'sessions';
    const value = parseFloat(valueStr);

    const date = normalizeDate(rawDate);
    if (!date || isNaN(value)) continue;

    metrics.push({
      date,
      cohort_date: date,
      metric_name: metricName.toLowerCase().replace(/\s+/g, '_'),
      value,
      source: 'asc_analytics_report',
    });
  }

  return metrics;
}

// ============================================================================
// 결과 저장
// ============================================================================

export function saveResult(result: AscCollectionResult, outputDir: string): void {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const filename = `asc-analytics-${result.period.start.slice(0, 7)}.json`;
  const outputPath = path.join(outputDir, filename);
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf-8');
  log(`[ASC] Saved to: ${outputPath}`);
}

// ============================================================================
// 환경 변수 로드 + Config 생성
// ============================================================================

function loadConfig(): AscApiConfig {
  const keyId = process.env.APP_STORE_CONNECT_API_KEY_ID ?? '';
  const issuerId =
    process.env.APP_STORE_CONNECT_API_ISSUER_ID ??
    process.env.APP_STORE_CONNECT_API_KEY_ISSUER_ID ??
    '';
  const keyPath =
    process.env.APP_STORE_CONNECT_API_KEY_FILEPATH ??
    process.env.APP_STORE_CONNECT_API_KEY_PATH ??
    '';
  const appId = process.env.APP_STORE_APP_ID ?? process.env.APP_IDENTIFIER ?? '';

  if (!keyId || !issuerId || !keyPath || !appId) {
    return { keyId, issuerId, privateKey: '', appId };
  }

  const expandedPath = keyPath.startsWith('~')
    ? path.join(process.env.HOME ?? '', keyPath.slice(1))
    : keyPath;

  if (!fs.existsSync(expandedPath)) {
    logWarn(`Private key file not found: ${expandedPath}`);
    return { keyId, issuerId, privateKey: '', appId };
  }

  const privateKey = fs.readFileSync(expandedPath, 'utf-8');
  return { keyId, issuerId, privateKey, appId };
}

// ============================================================================
// CLI 인수 파싱 (manual process.argv.slice(2) 패턴)
// ============================================================================

interface CliArgs {
  dryRun: boolean;
  printJwt: boolean;
  useAnalytics: boolean;
  month: string | null; // YYYY-MM
  appIdOverride: string | null;
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    dryRun: false,
    printJwt: false,
    useAnalytics: false,
    month: null,
    appIdOverride: null,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--dry-run') {
      args.dryRun = true;
    } else if (arg === '--print-jwt') {
      args.printJwt = true;
    } else if (arg === '--analytics') {
      args.useAnalytics = true;
    } else if (arg === '--month' && argv[i + 1]) {
      args.month = argv[i + 1];
      i++;
    } else if (arg === '--app-id' && argv[i + 1]) {
      args.appIdOverride = argv[i + 1];
      i++;
    }
  }

  return args;
}

// ============================================================================
// 메인 엔트리포인트
// ============================================================================

export async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const args = parseArgs(argv);

  const loadedConfig = loadConfig();
  const ascConfig: AscApiConfig = args.appIdOverride
    ? { ...loadedConfig, appId: args.appIdOverride }
    : loadedConfig;

  // --dry-run: JWT 구성까지만 확인하고 종료
  if (args.dryRun) {
    log('[dry-run] Config loaded:');
    log(`  keyId      = ${ascConfig.keyId || '(missing APP_STORE_CONNECT_API_KEY_ID)'}`);
    log(`  issuerId   = ${ascConfig.issuerId || '(missing APP_STORE_CONNECT_API_ISSUER_ID)'}`);
    log(`  appId      = ${ascConfig.appId || '(missing APP_STORE_APP_ID or --app-id flag)'}`);
    log(`  privateKey = ${ascConfig.privateKey ? '[loaded]' : '(missing APP_STORE_CONNECT_API_KEY_FILEPATH or file not found)'}`);

    if (ascConfig.privateKey && ascConfig.keyId && ascConfig.issuerId) {
      const token = generateJwt(ascConfig);
      if (args.printJwt) {
        process.stdout.write(token + '\n');
      } else {
        log(`[dry-run] JWT generated (first 60 chars): ${token.slice(0, 60)}...`);
      }
    } else {
      log('[dry-run] JWT skipped — missing credentials (expected in dry-run mode)');
    }

    log('[dry-run] Done. No API calls made.');
    return;
  }

  // 실제 수집 모드 — 환경변수 필수
  const missing: string[] = [];
  if (!ascConfig.keyId) missing.push('APP_STORE_CONNECT_API_KEY_ID');
  if (!ascConfig.issuerId) missing.push('APP_STORE_CONNECT_API_ISSUER_ID');
  if (!ascConfig.privateKey) missing.push('APP_STORE_CONNECT_API_KEY_FILEPATH (or file not found)');
  if (!ascConfig.appId) missing.push('APP_STORE_APP_ID (or --app-id CLI flag)');

  if (missing.length > 0) {
    logError(`Missing required environment variables:\n  ${missing.join('\n  ')}`);
    logError('Set them in .env.testflight.local or .env.local and retry.');
    process.exit(1);
  }

  // 수집 대상 월 결정
  const now = new Date();
  let year: number;
  let month: number;

  if (args.month) {
    const match = /^(\d{4})-(\d{2})$/.exec(args.month);
    if (!match) {
      logError(`Invalid --month format: ${args.month}. Use YYYY-MM.`);
      process.exit(1);
    }
    year = parseInt(match[1], 10);
    month = parseInt(match[2], 10);
  } else {
    year = now.getFullYear();
    month = now.getMonth() + 1;
  }

  const monthStr = String(month).padStart(2, '0');
  const startDate = `${year}-${monthStr}-01`;
  // 해당 월의 마지막 날
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${monthStr}-${String(lastDay).padStart(2, '0')}`;

  log(`[ASC] Collecting data for period: ${startDate} ~ ${endDate}`);

  let metrics: AscDailyMetric[];

  if (args.useAnalytics) {
    log('[ASC] Using Analytics Reports API (async 3-step flow)...');
    metrics = await fetchAnalyticsReport(ascConfig, startDate, endDate);
  } else {
    log('[ASC] Using Sales Reports API (primary)...');
    metrics = await fetchSalesReport(ascConfig, year, month);
  }

  const result: AscCollectionResult = {
    collected_at: new Date().toISOString(),
    period: { start: startDate, end: endDate },
    metrics,
  };

  const outputDir = path.resolve('scripts/data-output');
  saveResult(result, outputDir);

  log(`[ASC] Collection complete. Total metrics: ${metrics.length}`);
}

// スクリプトとして直接実行された場合のみmainを呼ぶ
const isMain =
  process.argv[1] !== undefined &&
  (process.argv[1].endsWith('collect-asc-analytics.ts') ||
    process.argv[1].endsWith('collect-asc-analytics.js'));

if (isMain) {
  main().catch((err: unknown) => {
    const message = err instanceof Error ? err.message : String(err);
    process.stderr.write(`FATAL: ${message}\n`);
    process.exit(1);
  });
}

/**
 * 유치원알리미 공개 공시자료로 전국 유치원 데이터를 갱신한다.
 *
 * 인증키가 필요한 Open API 대신, 같은 기관이 제공하는 전국 공개 JSON과
 * 공개 검색/상세 페이지를 결합한다. 식별자·누락 좌표까지 공식 원천만 사용한다.
 *
 * 사용법:
 *   pnpm sync:kindergartens
 *   pnpm sync:kindergartens -- --dry-run
 *   pnpm sync:kindergartens -- --timing 20261 --no-publish --output /tmp/kindergartens.json
 */

import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { config as loadEnvironment } from 'dotenv';
import { SIGUNGU_CODES, type SigunguCode } from './data/sigungu-codes';

loadEnvironment({ path: '.env.local', quiet: true });
loadEnvironment({ quiet: true });

const SITE_BASE_URL = 'https://e-childschoolinfo.moe.go.kr';
const OPEN_DATA_PAGE_URL = `${SITE_BASE_URL}/openData.do`;
const BULK_DOWNLOAD_URL = `${SITE_BASE_URL}/download/getTotalOpenData.do`;
const DISCLOSURE_LIST_URL = (timing: string) =>
  `${SITE_BASE_URL}/gongsi/${timing}/findGongsiList.do`;
const REGISTRY_URL = `${SITE_BASE_URL}/kinderMt/combineFind.do`;
const DETAIL_URL = `${SITE_BASE_URL}/kinderMt/kinderSummary.do`;
const REQUEST_TIMEOUT_MS = 45_000;
const MAX_ATTEMPTS = 3;
const REGISTRY_PAGE_SIZE = 1_000;
const MIN_RECORD_COUNT = 6_500;
const MIN_COMPONENT_COVERAGE = 0.99;

type Cell = string | number | boolean | null;

interface BulkDataset {
  header: string[];
  body: Cell[][];
}

interface SourceSpec {
  code: string;
  label: string;
  requiredHeaders: string[];
}

interface RegistryRow {
  id: string;
  name: string;
  address: string;
}

interface SyncOptions {
  timing: string | null;
  dryRun: boolean;
  publishPublic: boolean;
  outputPath: string | null;
}

interface KindergartenRecord {
  kindercode: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  type: 'public' | 'private';
  phone: string | null;
  homepage: string | null;
  operation_hours: string | null;
  sido_code: string;
  sigungu_code: string;
  capacity: number;
  current_count: number;
  class_count_age3: number;
  class_count_age4: number;
  class_count_age5: number;
  capacity_age3: number;
  capacity_age4: number;
  capacity_age5: number;
  current_age3: number;
  current_age4: number;
  current_age5: number;
  class_count_mix: number;
  capacity_mix: number;
  current_mix: number;
  capacity_special: number;
  current_special: number;
  establish_date: string;
  has_bus: boolean;
  bus_count: number;
  meal_type: 'direct' | 'outsourced' | null;
  has_after_school: boolean;
  area_per_child: number;
  has_playground: boolean;
  building_year: number | null;
  floor_info: string | null;
  classroom_area: number;
  indoor_playground_area: number;
  outdoor_playground_area: number;
  teacher_count: number;
  senior_teacher_count: number;
  cctv_count: number;
}

interface RegionResolution {
  region: SigunguCode;
  method: 'official-address' | 'current-reform-rule' | 'previous-address';
}

interface CoordinateResolution {
  id: string;
  lat: number;
  lng: number;
  method: 'official-detail' | 'previous' | 'kakao-address';
}

const SOURCE_SPECS: Record<string, SourceSpec> = {
  general: {
    code: '05',
    label: '일반 현황',
    requiredHeaders: ['교육청명', '유치원명', '설립유형', '주소', '인가총정원수', '위도', '경도'],
  },
  building: {
    code: '042',
    label: '건물 현황',
    requiredHeaders: ['유치원명', '주소', '건축년도', '건물층수'],
  },
  classArea: {
    code: '041',
    label: '교실면적 현황',
    requiredHeaders: ['유치원명', '주소', '교실면적', '실내체육장'],
  },
  teachers: {
    code: '06',
    label: '직위ㆍ자격별 교직원 현황',
    requiredHeaders: ['유치원명', '주소', '일반 교사수', '정교사1급 자격수'],
  },
  tenure: {
    code: '07',
    label: '교사의 현 기관 근속연수',
    requiredHeaders: ['유치원명', '주소', '4년이상6년미만교사수', '6년이상교사수'],
  },
  meal: {
    code: '14',
    label: '급식실시 현황',
    requiredHeaders: ['유치원명', '주소', '급식운영방식구분'],
  },
  afterSchool: {
    code: '111',
    label: '방과후 과정 편성ㆍ운영에 관한 사항',
    requiredHeaders: ['유치원명', '주소', '학급 계', '참여원아 계'],
  },
  bus: {
    code: '19',
    label: '통학차량 현황',
    requiredHeaders: ['유치원명', '주소', '차량운영여부', '운행차량수'],
  },
  safety: {
    code: '22',
    label: '안전점검 현황',
    requiredHeaders: ['유치원명', '주소', '놀이시설 안전검사 대상여부', 'CCTV 총 설치수'],
  },
};

const BUCHEON_REGION_OVERRIDES: Record<string, string> = {
  부천동초등학교병설유치원: '41192',
  부천여월초등학교병설유치원: '41196',
  상지초등학교병설유치원: '41192',
  소새울유치원: '41194',
  소안초등학교병설유치원: '41194',
  약대초등학교병설유치원: '41192',
  원종초등학교병설유치원: '41196',
};

function log(message: string): void {
  process.stdout.write(`${new Date().toISOString()} ${message}\n`);
}

function warn(message: string): void {
  process.stderr.write(`${new Date().toISOString()} WARN ${message}\n`);
}

function parseArgs(argv: string[]): SyncOptions {
  const timingIndex = argv.indexOf('--timing');
  const outputIndex = argv.indexOf('--output');
  const isTest = argv.includes('--test');
  const outputPath =
    outputIndex >= 0 && argv[outputIndex + 1] ? path.resolve(argv[outputIndex + 1]) : null;
  const dryRun = argv.includes('--dry-run') || (isTest && outputPath === null);

  return {
    timing: timingIndex >= 0 && argv[timingIndex + 1] ? argv[timingIndex + 1] : null,
    dryRun,
    publishPublic: !isTest && !argv.includes('--no-publish') && !dryRun,
    outputPath,
  };
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

function cleanText(value: Cell | undefined): string {
  return String(value ?? '').normalize('NFKC').replace(/\s+/g, ' ').trim();
}

function stripTags(value: string): string {
  return cleanText(decodeHtml(value.replace(/<[^>]+>/g, ' ')));
}

function recordKey(name: Cell | undefined, address: Cell | undefined): string {
  return `${cleanText(name)}\u0000${cleanText(address)}`;
}

function parseNumber(value: Cell | undefined): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }
  const match = cleanText(value).replace(/,/g, '').match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : 0;
}

function nullableText(value: Cell | undefined): string | null {
  const cleaned = cleanText(value);
  return cleaned && cleaned !== '-' ? cleaned : null;
}

function normalizeOperationHours(value: Cell | undefined): string | null {
  const raw = cleanText(value);
  if (!raw) return null;

  const fourDigitTimes = raw.match(/\d{4}/g) ?? [];
  if (fourDigitTimes.length >= 2) {
    const start = fourDigitTimes[0];
    const end = fourDigitTimes[fourDigitTimes.length - 1];
    return `${start.slice(0, 2)}:${start.slice(2)}~${end.slice(0, 2)}:${end.slice(2)}`;
  }

  const clockTimes = Array.from(raw.matchAll(/(\d{1,2})\s*시\s*(\d{1,2})\s*분/g));
  if (clockTimes.length >= 2) {
    const format = (match: RegExpMatchArray) =>
      `${match[1].padStart(2, '0')}:${match[2].padStart(2, '0')}`;
    return `${format(clockTimes[0])}~${format(clockTimes[clockTimes.length - 1])}`;
  }

  return raw;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(
  url: string,
  init: RequestInit,
  label: string
): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(url, {
        ...init,
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}`);
      }
      return response;
    } catch (error) {
      lastError = error;
      if (attempt === MAX_ATTEMPTS) break;
      warn(`${label} attempt ${attempt}/${MAX_ATTEMPTS} failed; retrying`);
      await sleep(500 * 2 ** (attempt - 1));
    }
  }
  throw new Error(`${label} failed: ${lastError instanceof Error ? lastError.message : lastError}`);
}

async function discoverLatestTiming(): Promise<{ timing: string; label: string }> {
  const response = await fetchWithRetry(OPEN_DATA_PAGE_URL, {}, 'disclosure timing discovery');
  const html = await response.text();
  const options = Array.from(
    html.matchAll(/<option\s+value=["'](\d{5})["'][^>]*>([^<]+)<\/option>/gi),
    (match) => ({ timing: match[1], label: cleanText(match[2]) })
  ).sort((left, right) => Number(right.timing) - Number(left.timing));
  if (options.length === 0) {
    throw new Error('No disclosure periods found on the official download page');
  }
  return options[0];
}

async function validateDisclosureCatalog(timing: string): Promise<void> {
  const response = await fetchWithRetry(DISCLOSURE_LIST_URL(timing), {}, 'disclosure catalog');
  const catalog = (await response.json()) as Record<string, string>;
  const availableCodes = new Set(Object.values(catalog));
  const missing = Object.values(SOURCE_SPECS)
    .map((spec) => spec.code)
    .filter((code) => !availableCodes.has(code));
  if (missing.length > 0) {
    throw new Error(`Disclosure ${timing} is missing source codes: ${missing.join(', ')}`);
  }
}

async function downloadBulkDataset(timing: string, spec: SourceSpec): Promise<BulkDataset> {
  const params = new URLSearchParams({
    combineSidoCode: '99',
    combineSidoName: '전체 시/도',
    timingListCode: timing,
    gongsiListCode: spec.code,
    safetyListCode: '',
    ExcelCsv: '3',
  });
  const response = await fetchWithRetry(
    `${BULK_DOWNLOAD_URL}?${params.toString()}`,
    { headers: { Accept: 'application/json' } },
    spec.label
  );
  const dataset = (await response.json()) as BulkDataset;
  if (!Array.isArray(dataset.header) || !Array.isArray(dataset.body)) {
    throw new Error(`${spec.label} returned an invalid JSON shape`);
  }
  const missingHeaders = spec.requiredHeaders.filter((header) => !dataset.header.includes(header));
  if (missingHeaders.length > 0) {
    throw new Error(`${spec.label} is missing headers: ${missingHeaders.join(', ')}`);
  }
  log(`downloaded ${spec.label}: ${dataset.body.length.toLocaleString('ko-KR')} rows`);
  return dataset;
}

function registryRequestBody(pageIndex: number): URLSearchParams {
  const body = new URLSearchParams({
    tabNum: '2',
    pageIndex: String(pageIndex),
    pageCnt: String(REGISTRY_PAGE_SIZE),
  });
  for (const value of ['01', '02', '03', '04', '05']) {
    body.append('kinderEstablishCB', value);
  }
  body.append('kinderStatusCB', 'KDSP_YN');
  body.append('kinderStatusCB', 'KDCL_YN');
  return body;
}

function parseRegistryPage(html: string): RegistryRow[] {
  const records: RegistryRow[] = [];
  const cardPattern =
    /<li>[^]*?fn_detail\(document\.forms\['combineSearch'\],\s*'([^']+)',\s*'01',\s*'[^']*'\)[^]*?class=["']underline["']>([^<]+)<\/a>[^]*?<p>([^]*?)<\/p>[^]*?<\/li>/g;

  for (const match of html.matchAll(cardPattern)) {
    const summary = stripTags(match[3]);
    const address = summary.split('·').at(-1)?.trim() ?? '';
    records.push({ id: match[1], name: stripTags(match[2]), address });
  }
  return records;
}

async function downloadRegistry(): Promise<RegistryRow[]> {
  const firstResponse = await fetchWithRetry(
    REGISTRY_URL,
    { method: 'POST', body: registryRequestBody(1) },
    'registry page 1'
  );
  const firstHtml = await firstResponse.text();
  const totalPages = Number(firstHtml.match(/var\s+totalPage\s*=\s*(\d+)/)?.[1] ?? 0);
  if (totalPages < 1 || totalPages > 20) {
    throw new Error(`Unexpected registry page count: ${totalPages}`);
  }

  const records = parseRegistryPage(firstHtml);
  for (let page = 2; page <= totalPages; page += 1) {
    const response = await fetchWithRetry(
      REGISTRY_URL,
      { method: 'POST', body: registryRequestBody(page) },
      `registry page ${page}`
    );
    records.push(...parseRegistryPage(await response.text()));
    await sleep(100);
  }

  const uniqueIDs = new Set(records.map((record) => record.id));
  if (records.length < MIN_RECORD_COUNT || uniqueIDs.size !== records.length) {
    throw new Error(`Registry quality failure: rows=${records.length}, uniqueIDs=${uniqueIDs.size}`);
  }
  log(`downloaded official identifier registry: ${records.length.toLocaleString('ko-KR')} rows`);
  return records;
}

class OfficialTable {
  readonly rowsByKey = new Map<string, Cell[]>();
  private readonly indexByHeader: Map<string, number>;

  constructor(readonly dataset: BulkDataset) {
    this.indexByHeader = new Map(dataset.header.map((header, index) => [header, index]));
    for (const row of dataset.body) {
      const key = recordKey(this.get(row, '유치원명'), this.get(row, '주소'));
      if (this.rowsByKey.has(key)) {
        throw new Error(`Duplicate official row: ${key.replace('\u0000', ' / ')}`);
      }
      this.rowsByKey.set(key, row);
    }
  }

  get(row: Cell[] | undefined, header: string): Cell | undefined {
    if (!row) return undefined;
    const index = this.indexByHeader.get(header);
    return index === undefined ? undefined : row[index];
  }
}

function findOfficialRegion(code: string): SigunguCode {
  const region = SIGUNGU_CODES.find((candidate) => candidate.sggCode === code);
  if (!region) throw new Error(`Unknown current sigungu code: ${code}`);
  return region;
}

function reformRule(name: string, address: string): SigunguCode | null {
  const bucheonCode = BUCHEON_REGION_OVERRIDES[name];
  if (bucheonCode) return findOfficialRegion(bucheonCode);
  if (address.includes('여주군')) return findOfficialRegion('41670');
  if (!address.includes('화성시')) return null;
  if (/동탄/.test(address)) return findOfficialRegion('41597');
  if (/남양읍|향남읍|우정읍/.test(address) || name === '새솔유치원') {
    return findOfficialRegion('41591');
  }
  if (/봉담읍|기안/.test(address)) return findOfficialRegion('41593');
  if (/화산|안녕|병점/.test(address)) return findOfficialRegion('41595');
  return null;
}

function regionFromAddress(office: string, address: string): SigunguCode | null {
  const currentSido = office.replace(/교육청$/, '');
  const candidates = SIGUNGU_CODES.filter((region) => region.sidoName === currentSido);
  if (candidates.length === 1) return candidates[0];

  const matches = candidates
    .filter((region) => address.includes(region.sggName))
    .sort((left, right) => right.sggName.length - left.sggName.length);
  return matches[0] ?? null;
}

function resolveRegion(
  name: string,
  office: string,
  address: string,
  previous: KindergartenRecord | undefined
): RegionResolution {
  const direct = regionFromAddress(office, address);
  if (direct) return { region: direct, method: 'official-address' };

  const currentReform = reformRule(name, address);
  if (currentReform) return { region: currentReform, method: 'current-reform-rule' };

  if (previous) {
    const previousAddress = regionFromAddress(office, previous.address);
    if (previousAddress) return { region: previousAddress, method: 'previous-address' };
  }

  throw new Error(`Could not resolve current region for ${name}: ${address}`);
}

function validCoordinates(lat: number, lng: number): boolean {
  return Number.isFinite(lat) && Number.isFinite(lng) && lat >= 32 && lat <= 39.5 && lng >= 124 && lng <= 132;
}

async function detailCoordinates(id: string): Promise<{ lat: number; lng: number }> {
  const response = await fetchWithRetry(
    DETAIL_URL,
    { method: 'POST', body: new URLSearchParams({ ittId: id }) },
    `detail coordinates ${id}`
  );
  const html = await response.text();
  const match = html.match(/fn_daumMapInit\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,/);
  const lat = Number(match?.[1]);
  const lng = Number(match?.[2]);
  if (!validCoordinates(lat, lng)) {
    throw new Error(`Official detail page has no valid coordinates for ${id}`);
  }
  return { lat, lng };
}

async function kakaoAddressCoordinates(address: string): Promise<{ lat: number; lng: number }> {
  const apiKey = process.env.KAKAO_REST_API_KEY;
  if (!apiKey) {
    throw new Error('KAKAO_REST_API_KEY is unavailable');
  }
  const url = new URL('https://dapi.kakao.com/v2/local/search/address.json');
  url.searchParams.set('query', address);
  const response = await fetchWithRetry(
    url.toString(),
    { headers: { Authorization: `KakaoAK ${apiKey}` } },
    `Kakao address lookup: ${address}`
  );
  const payload = (await response.json()) as {
    documents?: Array<{ x?: string; y?: string }>;
  };
  const lat = Number(payload.documents?.[0]?.y);
  const lng = Number(payload.documents?.[0]?.x);
  if (!validCoordinates(lat, lng)) {
    throw new Error(`Kakao address lookup returned no valid coordinates: ${address}`);
  }
  return { lat, lng };
}

async function resolveMissingCoordinates(
  id: string,
  address: string,
  previous: KindergartenRecord | undefined
): Promise<CoordinateResolution> {
  try {
    return { id, ...(await detailCoordinates(id)), method: 'official-detail' };
  } catch {
    warn(`${address}: official detail coordinates unavailable`);
  }

  if (previous && validCoordinates(previous.lat, previous.lng)) {
    return { id, lat: previous.lat, lng: previous.lng, method: 'previous' };
  }

  return { id, ...(await kakaoAddressCoordinates(address)), method: 'kakao-address' };
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  operation: (item: T) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, async () => {
      while (cursor < items.length) {
        const index = cursor;
        cursor += 1;
        results[index] = await operation(items[index]);
      }
    })
  );
  return results;
}

function parseInstitutionType(value: Cell | undefined): 'public' | 'private' {
  return cleanText(value).includes('사립') ? 'private' : 'public';
}

function parseMealType(value: Cell | undefined): 'direct' | 'outsourced' | null {
  const text = cleanText(value);
  if (text.includes('직영')) return 'direct';
  if (text.includes('위탁')) return 'outsourced';
  return null;
}

function sumFields(table: OfficialTable, row: Cell[] | undefined, headers: string[]): number {
  return headers.reduce((sum, header) => sum + parseNumber(table.get(row, header)), 0);
}

function atomicWrite(targetPath: string, content: string): void {
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  const temporaryPath = path.join(
    path.dirname(targetPath),
    `.${path.basename(targetPath)}.${process.pid}.${Date.now()}.tmp`
  );
  fs.writeFileSync(temporaryPath, content);
  fs.renameSync(temporaryPath, targetPath);
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const discovered = await discoverLatestTiming();
  const timing = options.timing ?? discovered.timing;
  const timingLabel = timing === discovered.timing ? discovered.label : timing;
  log(`starting kindergarten sync: ${timingLabel} (${timing}), publish=${options.publishPublic}`);

  await validateDisclosureCatalog(timing);
  const registry = await downloadRegistry();
  const downloaded: Record<string, BulkDataset> = {};
  for (const [name, spec] of Object.entries(SOURCE_SPECS)) {
    downloaded[name] = await downloadBulkDataset(timing, spec);
    await sleep(100);
  }

  const tables = Object.fromEntries(
    Object.entries(downloaded).map(([name, dataset]) => [name, new OfficialTable(dataset)])
  ) as Record<keyof typeof SOURCE_SPECS, OfficialTable>;
  const general = tables.general;
  if (general.dataset.body.length < MIN_RECORD_COUNT) {
    throw new Error(`Official general dataset is unexpectedly small: ${general.dataset.body.length}`);
  }

  const registryByKey = new Map<string, RegistryRow>();
  for (const row of registry) {
    const key = recordKey(row.name, row.address);
    if (registryByKey.has(key)) throw new Error(`Duplicate registry key: ${row.name} / ${row.address}`);
    registryByKey.set(key, row);
  }

  const publicPath = path.join(process.cwd(), 'public', 'data', 'kindergartens.json');
  const previousRecords = fs.existsSync(publicPath)
    ? (JSON.parse(fs.readFileSync(publicPath, 'utf8')) as KindergartenRecord[])
    : [];
  const previousByID = new Map(previousRecords.map((record) => [record.kindercode, record]));

  const joined = general.dataset.body.map((generalRow) => {
    const key = recordKey(general.get(generalRow, '유치원명'), general.get(generalRow, '주소'));
    const registryRow = registryByKey.get(key);
    if (!registryRow) {
      throw new Error(`Official identifier join failed: ${key.replace('\u0000', ' / ')}`);
    }
    return { key, generalRow, registryRow };
  });
  if (new Set(joined.map((entry) => entry.registryRow.id)).size !== joined.length) {
    throw new Error('Official identifier join produced duplicate IDs');
  }

  const coordinateFallbacks = joined.filter((entry) => {
    const lat = parseNumber(general.get(entry.generalRow, '위도'));
    const lng = parseNumber(general.get(entry.generalRow, '경도'));
    return !validCoordinates(lat, lng);
  });
  const fallbackCoordinateRows = await mapWithConcurrency(
    coordinateFallbacks,
    5,
    async (entry) =>
      resolveMissingCoordinates(
        entry.registryRow.id,
        cleanText(general.get(entry.generalRow, '주소')),
        previousByID.get(entry.registryRow.id)
      )
  );
  const fallbackCoordinatesByID = new Map(
    fallbackCoordinateRows.map((row) => [row.id, { lat: row.lat, lng: row.lng }])
  );
  const coordinateResolution = {
    officialBulk: joined.length - fallbackCoordinateRows.length,
    officialDetail: fallbackCoordinateRows.filter((row) => row.method === 'official-detail').length,
    previous: fallbackCoordinateRows.filter((row) => row.method === 'previous').length,
    kakaoAddress: fallbackCoordinateRows.filter((row) => row.method === 'kakao-address').length,
  };
  log(
    `resolved ${fallbackCoordinateRows.length} blank coordinate rows: ` +
      `detail=${coordinateResolution.officialDetail}, previous=${coordinateResolution.previous}, ` +
      `address=${coordinateResolution.kakaoAddress}`
  );

  const regionMethodCounts: Record<RegionResolution['method'], number> = {
    'official-address': 0,
    'current-reform-rule': 0,
    'previous-address': 0,
  };

  const records: KindergartenRecord[] = joined.map(({ key, generalRow, registryRow }) => {
    const component = (name: keyof typeof SOURCE_SPECS) => tables[name].rowsByKey.get(key);
    const buildingRow = component('building');
    const classAreaRow = component('classArea');
    const teacherRow = component('teachers');
    const tenureRow = component('tenure');
    const mealRow = component('meal');
    const afterSchoolRow = component('afterSchool');
    const busRow = component('bus');
    const safetyRow = component('safety');

    const name = cleanText(general.get(generalRow, '유치원명'));
    const address = cleanText(general.get(generalRow, '주소'));
    const office = cleanText(general.get(generalRow, '교육청명'));
    const previous = previousByID.get(registryRow.id);
    const resolvedRegion = resolveRegion(name, office, address, previous);
    regionMethodCounts[resolvedRegion.method] += 1;

    const capacityAge3 = parseNumber(general.get(generalRow, '3세정원수'));
    const capacityAge4 = parseNumber(general.get(generalRow, '4세정원수'));
    const capacityAge5 = parseNumber(general.get(generalRow, '5세정원수'));
    const capacityMix = parseNumber(general.get(generalRow, '혼합정원수'));
    const capacitySpecial = parseNumber(general.get(generalRow, '특수학급정원수'));
    const authorizedCapacity = parseNumber(general.get(generalRow, '인가총정원수'));
    const capacity = Math.max(
      authorizedCapacity,
      capacityAge3 + capacityAge4 + capacityAge5 + capacityMix + capacitySpecial
    );
    const currentAge3 = parseNumber(general.get(generalRow, '만3세원아수'));
    const currentAge4 = parseNumber(general.get(generalRow, '만4세원아수'));
    const currentAge5 = parseNumber(general.get(generalRow, '만5세원아수'));
    const currentMix = parseNumber(general.get(generalRow, '혼합원아수'));
    const currentSpecial = parseNumber(general.get(generalRow, '특수원아수'));
    const classroomArea = parseNumber(tables.classArea.get(classAreaRow, '교실면적'));
    const rawAreaPerChild = capacity > 0 ? classroomArea / capacity : 0;
    const areaPerChild = rawAreaPerChild > 50 ? 0 : Math.round(rawAreaPerChild * 10) / 10;
    const indoorPlaygroundArea = parseNumber(tables.classArea.get(classAreaRow, '실내체육장'));
    const playgroundSafetyTarget = cleanText(
      tables.safety.get(safetyRow, '놀이시설 안전검사 대상여부')
    );

    const bulkLat = parseNumber(general.get(generalRow, '위도'));
    const bulkLng = parseNumber(general.get(generalRow, '경도'));
    const detailLocation = fallbackCoordinatesByID.get(registryRow.id);
    const lat = validCoordinates(bulkLat, bulkLng) ? bulkLat : detailLocation?.lat ?? 0;
    const lng = validCoordinates(bulkLat, bulkLng) ? bulkLng : detailLocation?.lng ?? 0;
    if (!validCoordinates(lat, lng)) throw new Error(`Invalid final coordinates for ${name}`);

    return {
      kindercode: registryRow.id,
      name,
      address,
      lat,
      lng,
      type: parseInstitutionType(general.get(generalRow, '설립유형')),
      phone: nullableText(general.get(generalRow, '전화번호')),
      homepage: nullableText(general.get(generalRow, '홈페이지')),
      operation_hours: normalizeOperationHours(general.get(generalRow, '운영시간')),
      sido_code: resolvedRegion.region.adminSidoCode,
      sigungu_code: resolvedRegion.region.sggCode,
      capacity,
      current_count: currentAge3 + currentAge4 + currentAge5 + currentMix + currentSpecial,
      class_count_age3: parseNumber(general.get(generalRow, '만3세학급수')),
      class_count_age4: parseNumber(general.get(generalRow, '만4세학급수')),
      class_count_age5: parseNumber(general.get(generalRow, '만5세학급수')),
      capacity_age3: capacityAge3,
      capacity_age4: capacityAge4,
      capacity_age5: capacityAge5,
      current_age3: currentAge3,
      current_age4: currentAge4,
      current_age5: currentAge5,
      class_count_mix: parseNumber(general.get(generalRow, '혼합학급수')),
      capacity_mix: capacityMix,
      current_mix: currentMix,
      capacity_special: capacitySpecial,
      current_special: currentSpecial,
      establish_date: cleanText(general.get(generalRow, '설립일')),
      has_bus: cleanText(tables.bus.get(busRow, '차량운영여부')) === '운영',
      bus_count: parseNumber(tables.bus.get(busRow, '운행차량수')),
      meal_type: parseMealType(tables.meal.get(mealRow, '급식운영방식구분')),
      has_after_school:
        parseNumber(tables.afterSchool.get(afterSchoolRow, '학급 계')) > 0 ||
        parseNumber(tables.afterSchool.get(afterSchoolRow, '참여원아 계')) > 0,
      area_per_child: areaPerChild,
      has_playground:
        indoorPlaygroundArea > 0 ||
        (playgroundSafetyTarget !== '' &&
          playgroundSafetyTarget !== '-' &&
          !playgroundSafetyTarget.includes('미대상')),
      building_year: (() => {
        const year = parseNumber(tables.building.get(buildingRow, '건축년도'));
        return year > 0 ? year : null;
      })(),
      floor_info: nullableText(tables.building.get(buildingRow, '건물층수')),
      classroom_area: classroomArea,
      indoor_playground_area: indoorPlaygroundArea,
      // 2026 공개 교실면적 자료에는 실외놀이터 면적 항목이 없다. 과거 오매핑 값을 유지하지 않는다.
      outdoor_playground_area: 0,
      teacher_count: sumFields(tables.teachers, teacherRow, [
        '수석 교사수',
        '보직 교사수',
        '일반 교사수',
        '기간제일반교사수',
        '기간제정원외일반교사수',
        '특수 교사수',
        '기간제특수교사수',
        '기간제정원외특수교사수',
      ]),
      senior_teacher_count: sumFields(tables.tenure, tenureRow, [
        '4년이상6년미만교사수',
        '6년이상교사수',
      ]),
      cctv_count: parseNumber(tables.safety.get(safetyRow, 'CCTV 총 설치수')),
    };
  });

  records.sort((left, right) => left.name.localeCompare(right.name, 'ko'));
  const recordIDs = new Set(records.map((record) => record.kindercode));
  if (recordIDs.size !== records.length || records.length !== general.dataset.body.length) {
    throw new Error(`Final record quality failure: rows=${records.length}, IDs=${recordIDs.size}`);
  }

  const componentCoverage = Object.fromEntries(
    Object.entries(tables).map(([name, table]) => [name, table.rowsByKey.size / records.length])
  );
  const lowCoverage = Object.entries(componentCoverage).filter(
    ([, coverage]) => coverage < MIN_COMPONENT_COVERAGE
  );
  if (lowCoverage.length > 0) {
    throw new Error(
      `Component coverage below ${(MIN_COMPONENT_COVERAGE * 100).toFixed(0)}%: ` +
        lowCoverage.map(([name, coverage]) => `${name}=${(coverage * 100).toFixed(1)}%`).join(', ')
    );
  }

  const payload = `${JSON.stringify(records, null, 2)}\n`;
  const currentIDs = new Set(records.map((record) => record.kindercode));
  const previousIDs = new Set(previousRecords.map((record) => record.kindercode));
  const metadata = {
    schemaVersion: 1,
    status: 'complete',
    source: OPEN_DATA_PAGE_URL,
    identifierSource: REGISTRY_URL,
    sourceVersion: timing,
    sourceLabel: timingLabel,
    collectedAt: new Date().toISOString(),
    totalCount: records.length,
    registryCount: registry.length,
    registryJoinCoverage: 1,
    componentCoverage,
    regionCodeCount: SIGUNGU_CODES.length,
    regionResolution: regionMethodCounts,
    coordinateResolution,
    newSincePrevious: records.filter((record) => !previousIDs.has(record.kindercode)).length,
    removedSincePrevious: previousRecords.filter((record) => !currentIDs.has(record.kindercode)).length,
    checksumSha256: createHash('sha256').update(payload).digest('hex'),
    fieldNotes: {
      outdoor_playground_area:
        '2026 공개 교실면적 자료에서 제공되지 않아 0으로 설정; 과거 조리실 면적 오매핑을 제거함',
      has_playground: '실내체육장 또는 놀이시설 안전검사 대상 여부로 계산',
    },
  };
  const metadataPayload = `${JSON.stringify(metadata, null, 2)}\n`;

  if (options.dryRun) {
    log(`dry-run passed; no files written (${records.length.toLocaleString('ko-KR')} records)`);
    return;
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const snapshotPath =
    options.outputPath ??
    path.join(process.cwd(), 'scripts', 'data-output', `kindergartens-${timing}-${timestamp}.json`);
  atomicWrite(snapshotPath, payload);
  atomicWrite(snapshotPath.replace(/\.json$/, '.meta.json'), metadataPayload);
  log(`wrote validated snapshot: ${snapshotPath}`);

  if (options.publishPublic) {
    atomicWrite(publicPath, payload);
    atomicWrite(path.join(process.cwd(), 'public', 'data', 'kindergartens.meta.json'), metadataPayload);
    log(`published current official dataset atomically: ${publicPath}`);
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  process.stderr.write(`Kindergarten sync failed: ${message}\n`);
  process.exit(1);
});

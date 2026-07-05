/**
 * SNS search-snippet based kindergarten review collector.
 *
 * This collector intentionally accepts SNS snippets without address evidence.
 * It stores the SNS URL and the search result URL as evidence so the source is
 * explicit even when the SNS page itself is not directly scrapeable.
 */

import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { JSDOM } from 'jsdom';
import type { ReviewSource } from '../src/types/review';
import {
  buildReviewEvidenceBundle,
  buildStableHash,
  canonicalizeKnownReviewUrl,
} from '../src/lib/utils/review-acquisition';
import { buildTextExcerpt } from '../src/lib/utils/review-html';
import { stripHtml } from '../src/lib/utils/review-utils';
import {
  collectGlobalNormalizedUrls,
  ensureDirectory,
  readJsonFile,
  type RawReviewLink,
  writeJsonFile,
} from './lib/review-curation';
import { normalizeReviewUrl } from '../src/lib/utils/review-verification';

interface KindergartenEntry {
  kindercode: string;
  name: string;
  address: string;
  sigungu_code: string;
  sido_code: string;
}

interface Args {
  sidoCode: string;
  offset: number;
  limit: number | null;
  maxPerSearch: number;
  batchId: string | null;
  includeOfficial: boolean;
  regionSearch: boolean;
  regionSearchOnly: boolean;
}

interface SearchCandidate {
  title: string;
  url: string;
  source: ReviewSource;
  sourceName: string;
  snippet: string;
  searchUrl: string;
  platform: string;
}

interface OutputFile {
  version: string;
  collector: string;
  collectedAt: string;
  sidoCode: string;
  stats: {
    kindergartensSearched: number;
    rawCandidates: number;
    accepted: number;
    rejected: Record<string, number>;
    platformCounts: Record<string, number>;
  };
  reviews: RawReviewLink[];
}

const DEFAULT_INSANE_SEARCH_DIR = '/tmp/insane-search-inspect/skills/insane-search';
const DEFAULT_INSANE_PYTHON = '/tmp/insane-venv/bin/python';
const INSANE_SEARCH_DIR = process.env.INSANE_SEARCH_DIR || DEFAULT_INSANE_SEARCH_DIR;
const INSANE_PYTHON = process.env.INSANE_PYTHON || DEFAULT_INSANE_PYTHON;

const SIDO_NAMES: Record<string, string> = {
  '11': '서울',
  '26': '부산',
  '27': '대구',
  '28': '인천',
  '29': '광주',
  '30': '대전',
  '31': '울산',
  '36': '세종',
  '41': '경기',
  '43': '충북',
  '44': '충남',
  '46': '전남',
  '47': '경북',
  '48': '경남',
  '50': '제주',
  '51': '강원',
  '52': '전북',
};

const PLATFORM_HOSTS: Array<{ platform: string; hosts: string[] }> = [
  { platform: 'Threads', hosts: ['threads.net', 'threads.com'] },
  { platform: 'Instagram', hosts: ['instagram.com'] },
  { platform: 'X', hosts: ['x.com', 'twitter.com'] },
];

const FIRSTHAND_OR_PARENT_MARKERS = [
  '후기',
  '추천',
  '만족',
  '좋았',
  '좋아',
  '보내',
  '보냈',
  '다녀',
  '다녔',
  '재원',
  '졸업',
  '입학',
  '설명회',
  '상담',
  '개방',
  '참관',
  '학부모',
  '엄마',
  '아빠',
  '맘',
  '우리 아이',
  '아이가',
  '아이를',
  '아이들',
  '자녀',
  '등원',
  '하원',
  '우리애',
  '선생님',
  '원장님',
];

const UNUSABLE_SNIPPET_MARKERS = [
  'robots.txt로 인해 정보를 수집할 수 없습니다',
  'robots.txt',
  'Keep에 저장',
  'Keep에 바로가기',
  '로그인 후 이용',
  '이 페이지를 사용할 수 없습니다',
];

const OFFICIAL_OR_VENDOR_MARKERS = [
  '원아모집',
  '모집안내',
  '입학안내',
  '문의',
  '예약',
  '공식',
  '가정통신문',
  '교육계획',
  '활동소식',
  '진행하고 왔',
  '진행했습니다',
  '찾아가는',
  '방문공연',
  '공연',
  '출강',
  '체험문의',
  '공방',
  '수족관',
  '설치',
  '시공',
  '커피차',
  '간식트럭',
  '푸드트럭',
  '샌드아트',
  '버블',
  '풍선',
  '레이저쇼',
  '채용',
  '구인',
  '교육청',
  '지원청',
  '보도자료',
];

function parseArgs(): Args {
  const args = process.argv.slice(2);
  const getValue = (name: string): string | null => {
    const index = args.indexOf(name);
    return index === -1 ? null : args[index + 1] ?? null;
  };
  const sidoCode = getValue('--sido');
  if (!sidoCode) {
    console.error('ERROR: --sido 인자가 필요합니다.');
    process.exit(1);
  }

  const offset = Number.parseInt(getValue('--offset') ?? '0', 10);
  const limitValue = getValue('--limit');
  const maxValue = getValue('--max');

  return {
    sidoCode,
    offset: Number.isFinite(offset) ? offset : 0,
    limit: limitValue ? Number.parseInt(limitValue, 10) : null,
    maxPerSearch: maxValue ? Number.parseInt(maxValue, 10) : 3,
    batchId: getValue('--batch-id'),
    includeOfficial: args.includes('--include-official'),
    regionSearch: args.includes('--region-search') || args.includes('--region-search-only'),
    regionSearchOnly: args.includes('--region-search-only'),
  };
}

function assertInsaneSearchAvailable(): void {
  if (!fs.existsSync(INSANE_PYTHON)) {
    throw new Error(`INSANE_PYTHON not found: ${INSANE_PYTHON}`);
  }
  if (!fs.existsSync(path.join(INSANE_SEARCH_DIR, 'engine'))) {
    throw new Error(`INSANE_SEARCH_DIR not found or invalid: ${INSANE_SEARCH_DIR}`);
  }
}

function cleanupText(value: string): string {
  return stripHtml(value)
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function fetchWithInsaneSearch(url: string): string {
  const result = spawnSync(INSANE_PYTHON, ['-m', 'engine', url], {
    cwd: INSANE_SEARCH_DIR,
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
  });

  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`insane-search failed for ${url}: ${(result.stderr ?? '').slice(0, 500)}`);
  }
  return result.stdout;
}

function buildNaverSearchUrl(query: string): string {
  const url = new URL('https://search.naver.com/search.naver');
  url.searchParams.set('query', query);
  return url.toString();
}

function unwrapNaverRedirect(url: string): string {
  try {
    const parsed = new URL(url);
    const target =
      parsed.searchParams.get('u') ??
      parsed.searchParams.get('url') ??
      parsed.searchParams.get('target');
    return target ? decodeURIComponent(target) : url;
  } catch {
    return url;
  }
}

function classifyPlatform(url: string): string | null {
  try {
    const host = new URL(url).hostname.toLowerCase().replace(/^www\./, '');
    for (const platform of PLATFORM_HOSTS) {
      if (platform.hosts.some((candidateHost) => host === candidateHost || host.endsWith(`.${candidateHost}`))) {
        return platform.platform;
      }
    }
    return null;
  } catch {
    return null;
  }
}

function extractSourceName(container: Element, platform: string): string {
  for (const selector of ['.sub_txt', '.name', '.source', 'cite']) {
    const element = container.querySelector(selector);
    const text = cleanupText(element?.textContent ?? '');
    if (text.length > 0 && text.length <= 80) {
      return `${platform} · ${text}`;
    }
  }
  return platform;
}

function extractCandidates(html: string, searchUrl: string): SearchCandidate[] {
  const dom = new JSDOM(html, { url: searchUrl });
  const { document } = dom.window;
  const candidates = new Map<string, SearchCandidate>();

  for (const anchor of Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href]'))) {
    const href = unwrapNaverRedirect(anchor.href || anchor.getAttribute('href') || '');
    const platform = classifyPlatform(href);
    if (!platform) {
      continue;
    }

    const title = cleanupText(anchor.textContent ?? '');
    if (title.length < 2 || ['Instagram', 'Threads', 'X', 'Twitter'].includes(title)) {
      continue;
    }

    const container =
      anchor.closest('li') ??
      anchor.closest('.total_wrap') ??
      anchor.closest('.api_subject_bx') ??
      anchor.parentElement ??
      anchor;
    const containerText = cleanupText(container.textContent ?? '');
    const snippet = buildTextExcerpt(containerText.replace(title, '').trim(), 320);
    const canonicalUrl = canonicalizeKnownReviewUrl(href);
    const key = normalizeReviewUrl(canonicalUrl);
    candidates.set(key, {
      title,
      url: canonicalUrl,
      source: 'other',
      sourceName: extractSourceName(container, platform),
      snippet,
      searchUrl,
      platform,
    });
  }

  return Array.from(candidates.values());
}

function normalizeForMatch(value: string): string {
  return value
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[^\p{L}\p{N}]/gu, '');
}

function targetMentioned(text: string, kindergartenName: string): boolean {
  const normalizedText = normalizeForMatch(text);
  const fullName = normalizeForMatch(kindergartenName);
  const coreName = normalizeForMatch(
    kindergartenName
      .replace(/초등학교병설유치원$/u, '')
      .replace(/병설유치원$/u, '')
      .replace(/유치원$/u, '')
  );
  if (fullName.length >= 4 && normalizedText.includes(fullName)) {
    return true;
  }
  return coreName.length >= 4 && normalizedText.includes(coreName);
}

function fullTargetMentioned(text: string, kindergartenName: string): boolean {
  const normalizedText = normalizeForMatch(text);
  const fullName = normalizeForMatch(kindergartenName);
  return fullName.length >= 4 && normalizedText.includes(fullName);
}

function isFirsthandOrParentInfo(text: string): boolean {
  return FIRSTHAND_OR_PARENT_MARKERS.some((marker) => text.includes(marker));
}

function hasUsableSnippet(candidate: SearchCandidate): boolean {
  const text = `${candidate.title} ${candidate.snippet}`;
  if (UNUSABLE_SNIPPET_MARKERS.some((marker) => text.includes(marker))) {
    return false;
  }
  return candidate.snippet.trim().length >= 20;
}

function isPlatformProfileLanding(candidate: SearchCandidate): boolean {
  try {
    const parsed = new URL(candidate.url);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
    const segments = parsed.pathname.split('/').filter(Boolean);
    if (host.endsWith('instagram.com')) {
      return segments.length <= 1 || !['p', 'reel', 'tv'].includes(segments[0] ?? '');
    }
    if (host.endsWith('threads.net') || host.endsWith('threads.com')) {
      return segments.length <= 1 || !segments.includes('post');
    }
    if (host.endsWith('x.com') || host.endsWith('twitter.com')) {
      return segments.length <= 1 || !segments.includes('status');
    }
    return false;
  } catch {
    return false;
  }
}

function isOfficialOrVendor(text: string, kindergartenName: string, sourceName: string): boolean {
  if (OFFICIAL_OR_VENDOR_MARKERS.some((marker) => text.includes(marker))) {
    return true;
  }
  const normalizedSource = normalizeForMatch(sourceName);
  const normalizedName = normalizeForMatch(kindergartenName);
  return normalizedName.length >= 4 && normalizedSource.includes(normalizedName) && !text.includes('후기');
}

function buildQueries(kindergarten: KindergartenEntry): string[] {
  const exactName = `"${kindergarten.name}"`;
  const coreName = kindergarten.name.replace(/유치원$/u, '');
  return [
    `site:threads.net ${exactName}`,
    `site:threads.com ${exactName}`,
    `site:instagram.com ${exactName}`,
    `site:x.com ${exactName}`,
    `site:twitter.com ${exactName}`,
    `${exactName} 인스타 후기`,
    `${exactName} 쓰레드 후기`,
    `${exactName} X 후기`,
    coreName !== kindergarten.name ? `site:instagram.com "${coreName}" 유치원 후기` : '',
  ].filter(Boolean);
}

function extractLocalityTerms(address: string): string[] {
  const terms: string[] = [];
  const parts = address.split(/\s+/).filter(Boolean);
  for (const part of parts.slice(1, 4)) {
    if (/^[가-힣]+[시군구]$/u.test(part)) {
      terms.push(part);
      terms.push(part.replace(/[시군구]$/u, ''));
    }
  }
  return [...new Set(terms.filter((term) => term.length >= 2))];
}

function buildRegionalQueries(targets: KindergartenEntry[], args: Args): string[] {
  const regionName = SIDO_NAMES[args.sidoCode] ?? args.sidoCode;
  const localityCounts = new Map<string, number>();
  for (const kindergarten of targets) {
    for (const term of extractLocalityTerms(kindergarten.address)) {
      localityCounts.set(term, (localityCounts.get(term) ?? 0) + 1);
    }
  }
  const localityTerms = [...localityCounts.entries()]
    .toSorted((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([term]) => term);
  const terms = [...new Set([regionName, ...localityTerms])];

  return terms.flatMap((term) => [
    `site:instagram.com/p ${term} 유치원 후기`,
    `site:instagram.com/reel ${term} 유치원 후기`,
    `site:threads.net ${term} 유치원 후기`,
    `site:threads.com ${term} 유치원 후기`,
    `site:x.com ${term} 유치원 후기`,
    `site:twitter.com ${term} 유치원 후기`,
    `${term} 유치원 후기 인스타그램`,
    `${term} 유치원 후기 쓰레드`,
    `${term} 유치원 후기 X`,
  ]);
}

function loadExistingUrls(): Set<string> {
  const dataPath = path.resolve('public/data/reviews.json');
  if (!fs.existsSync(dataPath)) {
    return new Set();
  }
  return collectGlobalNormalizedUrls(readJsonFile(dataPath).reviews);
}

function buildRawReview(
  kindergarten: KindergartenEntry,
  candidate: SearchCandidate
): RawReviewLink {
  const now = new Date().toISOString();
  const snippet = candidate.snippet || candidate.title;
  const evidenceText = `${candidate.title} ${snippet}`;
  const checksum = buildStableHash(`${kindergarten.kindercode}|${candidate.url}|${evidenceText}`);
  return {
    kindergartenId: kindergarten.kindercode,
    kindergartenName: kindergarten.name,
    title: candidate.title,
    url: candidate.url,
    source: candidate.source,
    sourceName: candidate.sourceName,
    snippet,
    summary: snippet,
    content: snippet,
    date: null,
    collectedAt: now,
    relevanceScore: 3,
    accessMode: 'public',
    evidenceType: 'structured_list_row',
    extractionMethod: 'sns-search:naver-search-snippet',
    evidenceChecksum: checksum,
    tags: ['sns', 'search-snippet', 'address-not-required', candidate.platform.toLowerCase()],
    approvalStatus: 'approved',
    approvedAt: now,
    approvedBy: 'sns-snippet-policy',
    evidence: buildReviewEvidenceBundle({
      canonicalUrl: candidate.url,
      rawText: evidenceText,
      sourcePageUrl: candidate.searchUrl,
      extractedAt: now,
      structuredFields: {
        kindergartenName: kindergarten.name,
        kindergartenAddress: kindergarten.address,
        platform: candidate.platform,
        searchUrl: candidate.searchUrl,
        addressEvidenceRequired: false,
        snippetOnly: true,
      },
    }),
  };
}

function evaluateCandidate(
  kindergarten: KindergartenEntry,
  candidate: SearchCandidate,
  args: Args,
  existingUrls: Set<string>,
  seenUrls: Set<string>,
  rejected: Record<string, number>
): RawReviewLink | null {
  const normalizedUrl = normalizeReviewUrl(candidate.url);
  if (seenUrls.has(normalizedUrl) || existingUrls.has(normalizedUrl)) {
    rejected.duplicate = (rejected.duplicate ?? 0) + 1;
    return null;
  }
  seenUrls.add(normalizedUrl);

  const text = `${candidate.title} ${candidate.snippet}`;
  if (!targetMentioned(text, kindergarten.name)) {
    rejected.name_mismatch = (rejected.name_mismatch ?? 0) + 1;
    return null;
  }
  if (!hasUsableSnippet(candidate)) {
    rejected.unusable_snippet = (rejected.unusable_snippet ?? 0) + 1;
    return null;
  }
  if (isPlatformProfileLanding(candidate)) {
    rejected.platform_profile = (rejected.platform_profile ?? 0) + 1;
    return null;
  }
  if (!args.includeOfficial && isOfficialOrVendor(text, kindergarten.name, candidate.sourceName)) {
    rejected.official_or_vendor = (rejected.official_or_vendor ?? 0) + 1;
    return null;
  }
  if (!isFirsthandOrParentInfo(text)) {
    rejected.not_parent_info = (rejected.not_parent_info ?? 0) + 1;
    return null;
  }

  existingUrls.add(normalizedUrl);
  return buildRawReview(kindergarten, candidate);
}

async function collectForKindergarten(
  kindergarten: KindergartenEntry,
  args: Args,
  existingUrls: Set<string>
): Promise<{ rawCandidates: number; accepted: RawReviewLink[]; rejected: Record<string, number> }> {
  const accepted: RawReviewLink[] = [];
  const rejected: Record<string, number> = {};
  const seenUrls = new Set<string>();
  let rawCandidates = 0;

  for (const query of buildQueries(kindergarten)) {
    const searchUrl = buildNaverSearchUrl(query);
    let candidates: SearchCandidate[] = [];
    try {
      candidates = extractCandidates(fetchWithInsaneSearch(searchUrl), searchUrl).slice(0, args.maxPerSearch);
    } catch (error) {
      rejected.search_fetch_failed = (rejected.search_fetch_failed ?? 0) + 1;
      console.warn(
        `[warn] search fetch failed: ${kindergarten.name} ${searchUrl} ` +
          `${error instanceof Error ? error.message.slice(0, 180) : String(error).slice(0, 180)}`
      );
      continue;
    }
    rawCandidates += candidates.length;

    for (const candidate of candidates) {
      const review = evaluateCandidate(kindergarten, candidate, args, existingUrls, seenUrls, rejected);
      if (review) {
        accepted.push(review);
      }
    }

    await sleep(250);
  }

  return { rawCandidates, accepted, rejected };
}

function findRegionalMatch(
  candidate: SearchCandidate,
  targets: KindergartenEntry[]
): KindergartenEntry | null {
  const text = `${candidate.title} ${candidate.snippet}`;
  const fullMatches = targets.filter((kindergarten) => fullTargetMentioned(text, kindergarten.name));
  if (fullMatches.length === 1) {
    return fullMatches[0];
  }

  const looseMatches = targets.filter((kindergarten) => targetMentioned(text, kindergarten.name));
  return looseMatches.length === 1 ? looseMatches[0] : null;
}

async function collectRegional(
  targets: KindergartenEntry[],
  args: Args,
  existingUrls: Set<string>
): Promise<{ rawCandidates: number; accepted: RawReviewLink[]; rejected: Record<string, number> }> {
  const accepted: RawReviewLink[] = [];
  const rejected: Record<string, number> = {};
  const seenUrls = new Set<string>();
  let rawCandidates = 0;

  for (const query of buildRegionalQueries(targets, args)) {
    const searchUrl = buildNaverSearchUrl(query);
    let candidates: SearchCandidate[] = [];
    try {
      candidates = extractCandidates(fetchWithInsaneSearch(searchUrl), searchUrl).slice(0, args.maxPerSearch);
    } catch (error) {
      rejected.search_fetch_failed = (rejected.search_fetch_failed ?? 0) + 1;
      console.warn(
        `[warn] regional search fetch failed: ${searchUrl} ` +
          `${error instanceof Error ? error.message.slice(0, 180) : String(error).slice(0, 180)}`
      );
      continue;
    }
    rawCandidates += candidates.length;

    for (const candidate of candidates) {
      const kindergarten = findRegionalMatch(candidate, targets);
      if (!kindergarten) {
        rejected.no_unique_kindergarten_match = (rejected.no_unique_kindergarten_match ?? 0) + 1;
        continue;
      }
      const review = evaluateCandidate(kindergarten, candidate, args, existingUrls, seenUrls, rejected);
      if (review) {
        accepted.push(review);
      }
    }

    await sleep(250);
  }

  return { rawCandidates, accepted, rejected };
}

async function main(): Promise<void> {
  assertInsaneSearchAvailable();
  const args = parseArgs();
  const allKindergartens = readJsonFile<KindergartenEntry[]>(
    path.resolve('public/data/kindergartens.json')
  );
  let targets = allKindergartens.filter((kindergarten) => kindergarten.sido_code === args.sidoCode);
  if (args.limit && args.limit > 0) {
    targets = targets.slice(args.offset, args.offset + args.limit);
  } else if (args.offset > 0) {
    targets = targets.slice(args.offset);
  }

  const existingUrls = loadExistingUrls();
  const accepted: RawReviewLink[] = [];
  const totalRejected: Record<string, number> = {};
  const platformCounts: Record<string, number> = {};
  let rawCandidates = 0;

  console.log('=== SNS 후기 후보 수집 ===');
  console.log(`시도: ${args.sidoCode} (${SIDO_NAMES[args.sidoCode] ?? args.sidoCode})`);
  console.log(`오프셋: ${args.offset}`);
  console.log(`대상 유치원: ${targets.length}개`);
  console.log(`쿼리당 최대 후보: ${args.maxPerSearch}개`);
  console.log(`기관/공식 포함: ${args.includeOfficial ? 'ON' : 'OFF'}`);
  console.log(`지역 검색: ${args.regionSearch ? 'ON' : 'OFF'}${args.regionSearchOnly ? ' (지역 검색만)' : ''}`);
  console.log('');

  const addResult = (result: { rawCandidates: number; accepted: RawReviewLink[]; rejected: Record<string, number> }) => {
    rawCandidates += result.rawCandidates;
    accepted.push(...result.accepted);
    for (const review of result.accepted) {
      const platform = String(review.evidence?.structuredFields?.platform ?? 'SNS');
      platformCounts[platform] = (platformCounts[platform] ?? 0) + 1;
    }
    for (const [reason, count] of Object.entries(result.rejected)) {
      totalRejected[reason] = (totalRejected[reason] ?? 0) + count;
    }
  };

  if (!args.regionSearchOnly) {
    for (const [index, kindergarten] of targets.entries()) {
      const result = await collectForKindergarten(kindergarten, args, existingUrls);
      addResult(result);
      if (result.accepted.length > 0) {
        console.log(
          `[${index + 1}/${targets.length}] ${kindergarten.name}: ` +
            `${result.rawCandidates}개 SNS 후보 -> ${result.accepted.length}개 채택`
        );
      }
      await sleep(250);
    }
  }

  if (args.regionSearch) {
    console.log('지역 단위 SNS 검색 실행...');
    const result = await collectRegional(targets, args, existingUrls);
    addResult(result);
    console.log(`지역 검색: ${result.rawCandidates}개 SNS 후보 -> ${result.accepted.length}개 채택`);
  }

  const datePrefix = new Date().toISOString().split('T')[0];
  const outputPath = path.resolve(
    'scripts/data-output',
    `sns-reviews-${datePrefix}-${args.sidoCode}${args.batchId ? `-${args.batchId}` : ''}.json`
  );
  const output: OutputFile = {
    version: 'sns-v1',
    collector: 'sns-search',
    collectedAt: new Date().toISOString(),
    sidoCode: args.sidoCode,
    stats: {
      kindergartensSearched: targets.length,
      rawCandidates,
      accepted: accepted.length,
      rejected: totalRejected,
      platformCounts,
    },
    reviews: accepted,
  };
  ensureDirectory(path.dirname(outputPath));
  writeJsonFile(outputPath, output);

  console.log('');
  console.log('=== 완료 ===');
  console.log(`검색 후보: ${rawCandidates}개`);
  console.log(`채택 후보: ${accepted.length}개`);
  console.log(`플랫폼: ${JSON.stringify(platformCounts)}`);
  console.log(`제외: ${JSON.stringify(totalRejected)}`);
  console.log(`출력: ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

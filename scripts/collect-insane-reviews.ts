/**
 * insane-search 기반 유치원 후기 후보 수집기
 *
 * 공개 네이버 검색 결과를 직접 읽어 블로그/카페/SNS 후보를 수집합니다.
 * 로그인 또는 비공개 카페 본문은 수집하지 않고, 공개 검색 스니펫만 후보로 남깁니다.
 *
 * 사용법:
 *   pnpm collect:insane-reviews -- --sido 11 --limit 20 --max 5
 *   pnpm collect:insane-reviews -- --sido 11 --offset 100 --limit 50 --batch-id seoul-100
 *   pnpm collect:insane-reviews -- --sido 11 --sigungu 11680 --merge
 *
 * 필요:
 *   INSANE_SEARCH_DIR=/path/to/insane-search/skills/insane-search
 *   INSANE_PYTHON=/path/to/python-with-curl-cffi
 */

import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { JSDOM } from 'jsdom';
import type { ReviewLink, ReviewsData, ReviewSource } from '../src/types/review';
import {
  buildReviewEvidenceBundle,
  canonicalizeKnownReviewUrl,
  extractNaverBlogIdentity,
} from '../src/lib/utils/review-acquisition';
import {
  buildTextExcerpt,
  extractReadableTextFromHtml,
} from '../src/lib/utils/review-html';
import {
  calculateRelevanceScoreV2,
  classifyContentType,
  extractRegionName,
  isSpamReview,
  isSpamTitle,
  stripHtml,
  validateLocationMatch,
} from '../src/lib/utils/review-utils';
import {
  collectGlobalNormalizedUrls,
  ensureDirectory,
  mergeRawReviewsIntoRegionData,
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

interface SearchCandidate {
  title: string;
  url: string;
  source: ReviewSource;
  sourceName: string;
  snippet: string;
  searchUrl: string;
}

interface Args {
  sidoCode: string;
  sigunguCode: string | null;
  offset: number;
  limit: number | null;
  maxPerSearch: number;
  strictMode: boolean;
  merge: boolean;
  preserveContent: boolean;
  batchId: string | null;
}

interface OutputFile {
  version: string;
  collector: string;
  collectedAt: string;
  sidoCode: string;
  sigunguCode: string | null;
  strictMode: boolean;
  stats: {
    kindergartensSearched: number;
    rawCandidates: number;
    accepted: number;
    rejected: Record<string, number>;
    merge?: {
      added: number;
      duplicates: number;
      rejected: number;
    };
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

const PRIVATE_OR_LOGIN_MARKERS = [
  '로그인',
  '카페 멤버에게만 공개',
  '회원만 볼 수',
  '가입 후 이용',
  '접근 권한',
  '비공개',
  '권한이 없습니다',
];

const SNS_HOSTS = [
  'instagram.com',
  'threads.net',
  'x.com',
  'twitter.com',
  'facebook.com',
];

const FIRSTHAND_REVIEW_MARKERS = [
  '후기',
  '솔직',
  '다녀보',
  '다녔',
  '보내고',
  '보냈',
  '재원',
  '졸업',
  '입학설명회',
  '설명회',
  '상담',
  '상담받',
  '원서',
  '추첨',
  '엄마',
  '아빠',
  '맘',
  '학부모',
  '워킹맘',
  '맞벌이',
  '아이',
  '첫째',
  '둘째',
];

const INSTITUTION_AUTHORED_MARKERS = [
  '원장입니다',
  '교사입니다',
  '담임입니다',
  '유치원입니다',
  '원감입니다',
  '원장 이',
  '교사 이',
  '원아 모집',
  '모집 안내',
  '가정통신문',
  '교육계획',
  '활동소식',
  '원내에서',
  '학부모님들께',
  '부모님들께 감사',
  '방문체험',
  '찾아가는체험',
  '체험 문의',
  '문의 ',
  '진행하고 왔습니다',
  '진행했습니다',
  '최신 정보 및 분석',
  '기본 정보 유치원명',
  '공시자료',
];

function parseArgs(): Args {
  const args = process.argv.slice(2);
  const getValue = (name: string): string | null => {
    const index = args.indexOf(name);
    return index === -1 ? null : args[index + 1] ?? null;
  };

  const sidoCode = getValue('--sido');
  if (!sidoCode) {
    console.error('ERROR: --sido 인자가 필요합니다. 예: --sido 11');
    process.exit(1);
  }

  const limitValue = getValue('--limit');
  const offsetValue = getValue('--offset');
  const maxValue = getValue('--max');

  return {
    sidoCode,
    sigunguCode: getValue('--sigungu'),
    offset: offsetValue ? Number.parseInt(offsetValue, 10) : 0,
    limit: limitValue ? Number.parseInt(limitValue, 10) : null,
    maxPerSearch: maxValue ? Number.parseInt(maxValue, 10) : 5,
    strictMode: args.includes('--strict'),
    merge: args.includes('--merge'),
    preserveContent: args.includes('--preserve-content'),
    batchId: getValue('--batch-id'),
  };
}

function assertInsaneSearchAvailable(): void {
  if (!fs.existsSync(INSANE_PYTHON)) {
    throw new Error(
      `INSANE_PYTHON not found: ${INSANE_PYTHON}. ` +
        'Set INSANE_PYTHON to the Python executable prepared for insane-search.'
    );
  }

  if (!fs.existsSync(path.join(INSANE_SEARCH_DIR, 'engine'))) {
    throw new Error(
      `INSANE_SEARCH_DIR not found or invalid: ${INSANE_SEARCH_DIR}. ` +
        'Set INSANE_SEARCH_DIR to insane-search/skills/insane-search.'
    );
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

function buildNaverSearchUrl(query: string, where: 'post' | 'article' | 'web'): string {
  const url = new URL('https://search.naver.com/search.naver');
  url.searchParams.set('query', query);
  if (where !== 'web') {
    url.searchParams.set('where', where);
  }
  return url.toString();
}

function fetchWithInsaneSearch(url: string): string {
  const result = spawnSync(
    INSANE_PYTHON,
    ['-m', 'engine', url, '--no-playwright', '--max-attempts', '5'],
    {
      cwd: INSANE_SEARCH_DIR,
      encoding: 'utf-8',
      maxBuffer: 20 * 1024 * 1024,
    }
  );

  const stdout = result.stdout ?? '';
  if (stdout.trim().length > 0) {
    return stdout;
  }

  const stderr = result.stderr ?? '';
  throw new Error(`insane-search failed for ${url}: ${stderr.slice(0, 500)}`);
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

function classifySource(url: string): ReviewSource | null {
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (host === 'blog.naver.com' || host === 'm.blog.naver.com') {
      return 'naver_blog';
    }
    if (host === 'cafe.naver.com' || host === 'm.cafe.naver.com') {
      return 'naver_cafe';
    }
    if (SNS_HOSTS.some((snsHost) => host === snsHost || host.endsWith(`.${snsHost}`))) {
      return 'other';
    }
    return null;
  } catch {
    return null;
  }
}

function isNaverCafeArticleUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const segments = parsed.pathname.split('/').filter(Boolean);
    return segments.length >= 2 && /^\d+$/.test(segments[1]);
  } catch {
    return false;
  }
}

function extractSourceName(container: Element, source: ReviewSource): string {
  const selectors =
    source === 'naver_blog'
      ? ['.sub_txt', '.name', '.source', '.txt_block', 'cite']
      : ['.sub_txt', '.name', '.source', '.cafe_name', 'cite'];

  for (const selector of selectors) {
    const element = container.querySelector(selector);
    const text = cleanupText(element?.textContent ?? '');
    if (text.length > 0 && text.length <= 80) {
      return text;
    }
  }

  return source === 'naver_cafe' ? '네이버 카페' : source === 'naver_blog' ? '네이버 블로그' : 'SNS';
}

function extractSearchCandidates(html: string, searchUrl: string): SearchCandidate[] {
  const dom = new JSDOM(html);
  const { document } = dom.window;
  const candidates = new Map<string, SearchCandidate>();

  for (const anchor of Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href]'))) {
    const href = unwrapNaverRedirect(anchor.href || anchor.getAttribute('href') || '');
    const source = classifySource(href);
    if (!source) {
      continue;
    }
    if (source === 'naver_blog' && !extractNaverBlogIdentity(href)) {
      continue;
    }
    if (source === 'naver_cafe' && !isNaverCafeArticleUrl(href)) {
      continue;
    }

    const canonicalUrl = canonicalizeKnownReviewUrl(href);
    const title = cleanupText(anchor.textContent ?? '');
    if (title.length < 2 || ['블로그', '카페', 'NAVER'].includes(title)) {
      continue;
    }

    const container =
      anchor.closest('li') ??
      anchor.closest('.total_wrap') ??
      anchor.closest('.api_subject_bx') ??
      anchor.parentElement;
    const containerText = cleanupText(container?.textContent ?? '');
    const snippet = buildTextExcerpt(containerText.replace(title, '').trim(), 240);

    if (!snippet && source === 'other') {
      continue;
    }

    candidates.set(normalizeReviewUrl(canonicalUrl), {
      title,
      url: canonicalUrl,
      source,
      sourceName: extractSourceName(container ?? anchor, source),
      snippet,
      searchUrl,
    });
  }

  return Array.from(candidates.values());
}

function isLoginOrPrivateContent(text: string): boolean {
  return PRIVATE_OR_LOGIN_MARKERS.some((marker) => text.includes(marker));
}

function isLikelyFirsthandReview(text: string): boolean {
  return FIRSTHAND_REVIEW_MARKERS.some((marker) => text.includes(marker));
}

function isLikelyInstitutionAuthored(text: string, kindergartenName: string): boolean {
  if (INSTITUTION_AUTHORED_MARKERS.some((marker) => text.includes(marker))) {
    return true;
  }

  return (
    text.includes(`#${kindergartenName}`) &&
    text.includes('프로그램') &&
    !text.includes('후기')
  );
}

function normalizeInstitutionName(value: string): string {
  return value
    .replace(/\s+/g, '')
    .replace(/유치원$/u, '')
    .replace(/어린이집$/u, '')
    .toLowerCase();
}

function mentionsTargetKindergarten(text: string, kindergartenName: string): boolean {
  const normalizedText = normalizeInstitutionName(text);
  const normalizedName = normalizeInstitutionName(kindergartenName);
  if (normalizedName.length < 2) {
    return text.includes(kindergartenName);
  }

  return normalizedText.includes(normalizedName);
}

function buildLocationTokens(kindergarten: KindergartenEntry): string[] {
  const tokens = new Set<string>();
  const sigungu = kindergarten.address.match(/(?:서울특별시|부산광역시|대구광역시|인천광역시|광주광역시|대전광역시|울산광역시|경기도|강원특별자치도|충청북도|충청남도|전북특별자치도|전라남도|경상북도|경상남도|제주특별자치도)\s+([^\s]+)/u)?.[1];
  if (sigungu) {
    tokens.add(sigungu);
    tokens.add(sigungu.replace(/[시군구]$/u, ''));
  }

  const roadName = kindergarten.address.match(/\s([가-힣]+(?:로|길)\d*(?:길)?)/u)?.[1];
  if (roadName) {
    const base = roadName.replace(/\d.*$/u, '').replace(/(?:대로|로|길)$/u, '');
    if (base.length >= 2) {
      tokens.add(base);
    }
  }

  return Array.from(tokens).filter((token) => token.length >= 2);
}

function mentionsTargetLocation(text: string, kindergarten: KindergartenEntry): boolean {
  const normalizedText = text.replace(/\s+/g, '');
  return buildLocationTokens(kindergarten).some((token) =>
    normalizedText.includes(token.replace(/\s+/g, ''))
  );
}

function extractPageEvidence(candidate: SearchCandidate): {
  title?: string;
  snippet: string;
  summary?: string;
  content?: string;
  accessMode: 'public' | 'login';
  evidenceType: 'longform_post' | 'structured_list_row';
  extractionMethod: string;
} {
  if (candidate.source === 'other') {
    return {
      snippet: candidate.snippet,
      accessMode: 'public',
      evidenceType: 'structured_list_row',
      extractionMethod: 'insane-search:naver-search-snippet',
    };
  }

  try {
    const html = fetchWithInsaneSearch(candidate.url);
    const dom = new JSDOM(html);
    const pageTitle = cleanupText(
      dom.window.document.querySelector('meta[property="og:title"]')?.getAttribute('content') ??
        dom.window.document.querySelector('title')?.textContent ??
        ''
    )
      .replace(/\s*:\s*네이버 블로그\s*$/u, '')
      .replace(/\s*-\s*NAVER.*$/u, '');
    const bodyText = extractReadableTextFromHtml(html);
    const publicEnough = bodyText.length >= 120 && !isLoginOrPrivateContent(bodyText.slice(0, 1500));
    if (!publicEnough) {
      return {
        snippet: candidate.snippet,
        accessMode: 'login',
        evidenceType: 'structured_list_row',
        extractionMethod: 'insane-search:naver-search-snippet-login-wall',
      };
    }

    return {
      title: pageTitle || candidate.title,
      snippet: buildTextExcerpt(bodyText, 220),
      summary: buildTextExcerpt(bodyText, 360),
      content: bodyText,
      accessMode: 'public',
      evidenceType: 'longform_post',
      extractionMethod: 'insane-search:public-page-body',
    };
  } catch {
    return {
      snippet: candidate.snippet,
      accessMode: candidate.source === 'naver_cafe' ? 'login' : 'public',
      evidenceType: 'structured_list_row',
      extractionMethod: 'insane-search:naver-search-snippet-fetch-failed',
    };
  }
}

function buildQueries(kindergarten: KindergartenEntry): Array<{ query: string; where: 'post' | 'article' | 'web' }> {
  const regionName = extractRegionName(kindergarten.address);
  const exactName = `"${kindergarten.name}"`;

  return [
    { query: `${exactName} ${regionName} 후기`, where: 'post' },
    { query: `${exactName} 재원생 후기`, where: 'post' },
    { query: `${exactName} 다녀보니`, where: 'post' },
    { query: `${exactName} ${regionName} 맘카페 후기`, where: 'article' },
    { query: `${exactName} 재원생 맘카페`, where: 'article' },
    { query: `${exactName} 유치원 후기 인스타그램 OR threads OR x.com`, where: 'web' },
  ];
}

function rejectReasonForCandidate(
  candidate: SearchCandidate,
  kindergarten: KindergartenEntry,
  targetSidoCode: string,
  relevanceScore: number,
  strictMode: boolean
): string | null {
  if (isSpamTitle(candidate.title)) {
    return 'spam_title';
  }

  const spamCheck = isSpamReview({
    title: candidate.title,
    snippet: candidate.snippet,
    sourceName: candidate.sourceName,
  });
  if (spamCheck.isSpam) {
    return 'spam_review';
  }

  const contentType = classifyContentType(candidate.title, candidate.snippet);
  if (contentType === 'template') {
    return 'template';
  }

  const locationCheck = validateLocationMatch(
    `${candidate.title} ${candidate.snippet}`,
    targetSidoCode,
    kindergarten.address
  );
  if (!locationCheck.isValid) {
    return 'location_mismatch';
  }

  const minScore = strictMode ? 4 : 3;
  if (relevanceScore < minScore) {
    return 'low_score';
  }

  return null;
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

  for (const { query, where } of buildQueries(kindergarten)) {
    const searchUrl = buildNaverSearchUrl(query, where);
    let html: string;
    try {
      html = fetchWithInsaneSearch(searchUrl);
    } catch (error) {
      rejected.search_fetch_failed = (rejected.search_fetch_failed ?? 0) + 1;
      console.warn(
        `[warn] search fetch failed: ${kindergarten.name} ${searchUrl} ` +
          `${error instanceof Error ? error.message.slice(0, 240) : String(error).slice(0, 240)}`
      );
      continue;
    }
    const candidates = extractSearchCandidates(html, searchUrl).slice(0, args.maxPerSearch);
    rawCandidates += candidates.length;

    for (const candidate of candidates) {
      const normalizedUrl = normalizeReviewUrl(candidate.url);
      if (seenUrls.has(normalizedUrl) || existingUrls.has(normalizedUrl)) {
        rejected.duplicate = (rejected.duplicate ?? 0) + 1;
        continue;
      }
      seenUrls.add(normalizedUrl);

      const regionName = extractRegionName(kindergarten.address);
      const relevance = calculateRelevanceScoreV2(
        candidate.title,
        candidate.snippet,
        kindergarten.name,
        regionName
      );
      const rejectReason = rejectReasonForCandidate(
        candidate,
        kindergarten,
        args.sidoCode,
        relevance.score,
        args.strictMode
      );
      if (rejectReason) {
        rejected[rejectReason] = (rejected[rejectReason] ?? 0) + 1;
        continue;
      }

      const evidence = extractPageEvidence(candidate);
      const rawText = [
        candidate.title,
        evidence.snippet,
        evidence.summary ?? '',
        evidence.accessMode === 'public' ? evidence.content ?? '' : '',
      ].join(' ');
      const title = evidence.title || candidate.title;
      const visibleEvidenceText = [
        title,
        candidate.title,
        candidate.snippet,
        evidence.snippet,
      ].join(' ');

      if (isLikelyInstitutionAuthored(rawText, kindergarten.name)) {
        rejected.institution_authored = (rejected.institution_authored ?? 0) + 1;
        continue;
      }

      if (!mentionsTargetKindergarten(visibleEvidenceText, kindergarten.name)) {
        rejected.name_mismatch = (rejected.name_mismatch ?? 0) + 1;
        continue;
      }

      if (!mentionsTargetLocation(visibleEvidenceText, kindergarten)) {
        rejected.location_evidence_missing = (rejected.location_evidence_missing ?? 0) + 1;
        continue;
      }

      if (!isLikelyFirsthandReview(rawText)) {
        rejected.not_firsthand_review = (rejected.not_firsthand_review ?? 0) + 1;
        continue;
      }

      accepted.push({
        kindergartenId: kindergarten.kindercode,
        kindergartenName: kindergarten.name,
        title,
        url: candidate.url,
        source: candidate.source,
        sourceName: candidate.sourceName,
        snippet: evidence.snippet || candidate.snippet,
        summary: evidence.summary,
        content: args.preserveContent && evidence.accessMode === 'public' ? evidence.content : undefined,
        date: null,
        collectedAt: new Date().toISOString(),
        relevanceScore: relevance.score,
        accessMode: evidence.accessMode,
        evidenceType: evidence.evidenceType,
        extractionMethod: evidence.extractionMethod,
        tags: evidence.accessMode === 'login' ? ['login-required', 'search-snippet'] : ['public'],
        evidence: buildReviewEvidenceBundle({
          canonicalUrl: candidate.url,
          rawText: [title, rawText].join(' '),
          sourcePageUrl: candidate.searchUrl,
          extractedAt: new Date().toISOString(),
          structuredFields: {
            kindergartenName: kindergarten.name,
            kindergartenAddress: kindergarten.address,
            searchUrl: candidate.searchUrl,
            accessMode: evidence.accessMode,
          },
        }),
      });
    }

    await sleep(350);
  }

  return { rawCandidates, accepted, rejected };
}

function loadExistingUrls(): Set<string> {
  const reviewsRoot = path.resolve('public/data/reviews');
  const urls = new Set<string>();
  if (!fs.existsSync(reviewsRoot)) {
    return urls;
  }

  for (const fileName of fs.readdirSync(reviewsRoot)) {
    if (!fileName.endsWith('.json')) {
      continue;
    }
    const filePath = path.join(reviewsRoot, fileName);
    const data = readJsonFile<ReviewsData>(filePath);
    for (const url of collectGlobalNormalizedUrls(data.reviews)) {
      urls.add(url);
    }
  }

  return urls;
}

async function main(): Promise<void> {
  assertInsaneSearchAvailable();
  const args = parseArgs();

  const kindergartens = readJsonFile<KindergartenEntry[]>(
    path.resolve('public/data/kindergartens.json')
  );
  let targets = kindergartens.filter((kindergarten) => kindergarten.sido_code === args.sidoCode);
  if (args.sigunguCode) {
    targets = targets.filter((kindergarten) => kindergarten.sigungu_code === args.sigunguCode);
  }
  if (args.offset < 0 || Number.isNaN(args.offset)) {
    throw new Error(`Invalid --offset: ${args.offset}`);
  }
  if (args.limit && args.limit > 0) {
    targets = targets.slice(args.offset, args.offset + args.limit);
  } else if (args.offset > 0) {
    targets = targets.slice(args.offset);
  }

  const existingUrls = loadExistingUrls();
  const allAccepted: RawReviewLink[] = [];
  const totalRejected: Record<string, number> = {};
  let totalRawCandidates = 0;

  console.log('=== insane-search 후기 후보 수집 ===');
  console.log(`시도: ${args.sidoCode} (${SIDO_NAMES[args.sidoCode] ?? args.sidoCode})`);
  console.log(`시군구: ${args.sigunguCode ?? '전체'}`);
  console.log(`오프셋: ${args.offset}`);
  console.log(`대상 유치원: ${targets.length}개`);
  console.log(`쿼리당 최대 후보: ${args.maxPerSearch}개`);
  console.log(`엄격 모드: ${args.strictMode ? 'ON' : 'OFF'}`);
  console.log(`병합: ${args.merge ? 'ON' : 'OFF'}`);
  console.log(`insane-search: ${INSANE_PYTHON} -m engine (cwd: ${INSANE_SEARCH_DIR})`);
  console.log('');

  for (const [index, kindergarten] of targets.entries()) {
    const result = await collectForKindergarten(kindergarten, args, existingUrls);
    totalRawCandidates += result.rawCandidates;
    allAccepted.push(...result.accepted);
    for (const [reason, count] of Object.entries(result.rejected)) {
      totalRejected[reason] = (totalRejected[reason] ?? 0) + count;
    }

    if (result.accepted.length > 0) {
      console.log(
        `[${index + 1}/${targets.length}] ${kindergarten.name}: ` +
          `${result.rawCandidates}개 후보 -> ${result.accepted.length}개 채택`
      );
    }
    await sleep(500);
  }

  const datePrefix = new Date().toISOString().split('T')[0];
  const outputPath = path.resolve(
    'scripts/data-output',
    `insane-reviews-${datePrefix}-${args.sidoCode}${args.sigunguCode ? `-${args.sigunguCode}` : ''}${args.batchId ? `-${args.batchId}` : ''}.json`
  );

  const output: OutputFile = {
    version: 'insane-v1',
    collector: 'insane-search',
    collectedAt: new Date().toISOString(),
    sidoCode: args.sidoCode,
    sigunguCode: args.sigunguCode,
    strictMode: args.strictMode,
    stats: {
      kindergartensSearched: targets.length,
      rawCandidates: totalRawCandidates,
      accepted: allAccepted.length,
      rejected: totalRejected,
    },
    reviews: allAccepted,
  };

  if (args.merge) {
    const reviewsPath = path.resolve(`public/data/reviews/${args.sidoCode}.json`);
    const regionData = fs.existsSync(reviewsPath)
      ? readJsonFile<ReviewsData>(reviewsPath)
      : { version: datePrefix, totalCount: 0, kindergartenCount: 0, reviews: {} };
    const merged = mergeRawReviewsIntoRegionData(regionData, allAccepted, {
      preserveContent: args.preserveContent,
    });
    writeJsonFile(reviewsPath, merged.data);
    output.stats.merge = {
      added: merged.addedCount,
      duplicates: merged.duplicateCount,
      rejected: merged.rejectedCount,
    };
  }

  ensureDirectory(path.dirname(outputPath));
  writeJsonFile(outputPath, output);

  console.log('');
  console.log('=== 완료 ===');
  console.log(`검색 후보: ${totalRawCandidates}개`);
  console.log(`채택 후보: ${allAccepted.length}개`);
  console.log(`제외: ${JSON.stringify(totalRejected)}`);
  if (output.stats.merge) {
    console.log(
      `병합: 추가 ${output.stats.merge.added}, 중복 ${output.stats.merge.duplicates}, 거절 ${output.stats.merge.rejected}`
    );
  }
  console.log(`출력: ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

/**
 * Precision-first kindergarten review acquisition.
 *
 * Priority:
 * 1. studyholic_public_list
 * 2. studyholic_member_detail
 * 3. naver_blog_search
 * 4. naver_cafe_login_review
 * 5. learns_partner
 *
 * Output:
 *   scripts/data-output/reviews-urls-raw/reviews-urls-{sido}.json
 */

import { config } from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import type { ReviewLink, ReviewStructuredFields } from '../src/types/review';
import {
  buildReviewEvidenceBundle,
  buildStableHash,
  canonicalizeKnownReviewUrl,
  extractLearnsLatestReviews,
  extractNaverBlogIdentity,
  normalizeEvidenceText,
  parseNaverBlogRss,
  parseStudyholicDetailHtml,
  parseStudyholicListHtml,
  type StudyholicListEntry,
} from '../src/lib/utils/review-acquisition';
import { extractInstitutionMentions } from '../src/lib/utils/review-verification';
import {
  extractRegionName,
  formatNaverDate,
  isSpamTitle,
  stripHtml,
} from '../src/lib/utils/review-utils';

config({ path: '.env.local' });
config();

interface KindergartenEntry {
  kindercode: string;
  name: string;
  address: string;
  sigungu_code: string;
  sido_code?: string;
}

interface NaverSearchItem {
  title: string;
  link: string;
  description: string;
  bloggername?: string;
  cafename?: string;
  postdate?: string;
}

interface NaverSearchResponse {
  items: NaverSearchItem[];
}

type AdapterId =
  | 'studyholic_public_list'
  | 'studyholic_member_detail'
  | 'naver_blog_search'
  | 'naver_cafe_login_review'
  | 'learns_partner';

interface ReviewCandidate extends ReviewLink {
  adapterId: AdapterId;
  sourcePriority: number;
}

interface ReviewsManifest {
  generatedAt: string;
  targetSido: string;
  totalCount: number;
  pendingApprovalCount: number;
  stats: {
    bySource: Record<string, number>;
    byAdapter: Record<string, number>;
  };
  reviews: ReviewCandidate[];
}

type StudyholicRowIndex = Map<string, StudyholicListEntry[]>;

const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36';

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
  '42': '강원',
  '43': '충북',
  '44': '충남',
  '45': '전북',
  '46': '전남',
  '47': '경북',
  '48': '경남',
  '50': '제주',
};

const STUDYHOLIC_SIDO_MAP: Record<string, string> = {
  '11': '01',
  '26': '02',
  '27': '03',
  '28': '04',
  '29': '05',
  '30': '06',
  '31': '07',
  '41': '08',
  '42': '09',
  '43': '10',
  '44': '11',
  '45': '12',
  '46': '13',
  '47': '14',
  '48': '15',
  '50': '16',
  '36': '17',
};

const SOURCE_PRIORITY: Record<AdapterId, number> = {
  studyholic_public_list: 1,
  studyholic_member_detail: 2,
  naver_blog_search: 3,
  naver_cafe_login_review: 4,
  learns_partner: 5,
};

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

function parseInteger(args: string[], flag: string, fallback: number): number {
  const value = getArgValue(args, flag);
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function hasFlag(args: string[], flag: string): boolean {
  return args.includes(flag);
}

function createHeaders(cookie?: string): HeadersInit {
  return {
    'user-agent': USER_AGENT,
    accept:
      'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'accept-language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
    ...(cookie ? { cookie } : {}),
  };
}

async function fetchText(
  url: string,
  init: RequestInit = {},
  cookie?: string
): Promise<string> {
  const timeoutSignal = AbortSignal.timeout(15000);
  const response = await fetch(url, {
    redirect: 'follow',
    signal: timeoutSignal,
    ...init,
    headers: {
      ...createHeaders(cookie),
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`);
  }

  const contentType = response.headers.get('content-type') ?? '';
  const charsetMatch = contentType.match(/charset=([^;]+)/i);
  const rawCharset = charsetMatch?.[1]?.trim().toLowerCase() ?? 'utf-8';
  const charset =
    rawCharset === 'ksc5601' || rawCharset === 'euc_kr' ? 'euc-kr' : rawCharset;
  const buffer = await response.arrayBuffer();

  try {
    return new TextDecoder(charset).decode(buffer);
  } catch {
    return new TextDecoder('utf-8').decode(buffer);
  }
}

async function searchNaver(
  endpoint: 'blog' | 'cafearticle',
  query: string,
  display: number,
  sort: 'date' | 'sim'
): Promise<NaverSearchItem[]> {
  const clientId = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return [];
  }

  const url = new URL(`https://openapi.naver.com/v1/search/${endpoint}.json`);
  url.searchParams.set('query', query);
  url.searchParams.set('display', String(display));
  url.searchParams.set('sort', sort);

  const response = await fetch(url.toString(), {
    signal: AbortSignal.timeout(10000),
    headers: {
      'X-Naver-Client-Id': clientId,
      'X-Naver-Client-Secret': clientSecret,
      'user-agent': USER_AGENT,
    },
  });

  if (!response.ok) {
    return [];
  }

  const data: NaverSearchResponse = await response.json();
  return data.items ?? [];
}

function buildReviewId(
  kindergartenId: string,
  normalizedUrl: string,
  evidenceChecksum: string
): string {
  return `rev-${buildStableHash(
    `${kindergartenId}|${normalizedUrl}|${evidenceChecksum}`
  )}`;
}

function normalizeSigunguLabel(address: string): string {
  const parts = address.split(/\s+/);
  return parts[1]?.trim() ?? '';
}

function buildFieldSummary(fields: ReviewStructuredFields): string {
  return Object.entries(fields)
    .filter(([key, value]) => {
      if (value === null || value === '' || value === undefined) {
        return false;
      }

      return (
        key !== 'institutionName' &&
        key !== 'reviewTitle' &&
        key !== 'sourceUrl' &&
        key !== 'loginRequiredFields'
      );
    })
    .slice(0, 6)
    .map(([key, value]) => `${key}:${Array.isArray(value) ? value.join(', ') : value}`)
    .join(' | ');
}

function buildCandidate(params: {
  kindergarten: KindergartenEntry;
  title: string;
  url: string;
  source: ReviewCandidate['source'];
  sourceName: string;
  snippet: string;
  date: string | null;
  adapterId: AdapterId;
  accessMode: ReviewCandidate['accessMode'];
  evidenceType: ReviewCandidate['evidenceType'];
  extractionMethod: string;
  structuredFields?: ReviewStructuredFields;
  rating?: number | null;
  relevanceScore?: number;
  evidenceSourceUrl?: string;
  collectedAt: string;
}): ReviewCandidate {
  const evidence = buildReviewEvidenceBundle({
    canonicalUrl: params.url,
    sourcePageUrl: params.evidenceSourceUrl,
    rawText: `${params.title} ${params.snippet}`,
    structuredFields: params.structuredFields,
    extractedAt: params.collectedAt,
  });
  const sourcePriority = SOURCE_PRIORITY[params.adapterId];

  return {
    id: buildReviewId(
      params.kindergarten.kindercode,
      evidence.normalizedUrl,
      evidence.htmlSnapshotHash
    ),
    kindergartenId: params.kindergarten.kindercode,
    title: params.title,
    url: evidence.canonicalUrl,
    source: params.source,
    sourceName: params.sourceName,
    snippet: params.snippet,
    date: params.date,
    collectedAt: params.collectedAt,
    relevanceScore: params.relevanceScore,
    accessMode: params.accessMode,
    evidenceType: params.evidenceType,
    extractionMethod: params.extractionMethod,
    evidenceChecksum: evidence.htmlSnapshotHash,
    rating: params.rating ?? undefined,
    structuredFields: params.structuredFields,
    evidence,
    approvalStatus: 'pending',
    adapterId: params.adapterId,
    sourcePriority,
  };
}

function buildExactNaverQueries(kindergarten: KindergartenEntry): string[] {
  const sigungu = normalizeSigunguLabel(kindergarten.address);
  return [
    `"${kindergarten.name}" "${sigungu}" 후기`,
    `"${kindergarten.name}" 입학설명회`,
    `"${kindergarten.name}" 보내보니`,
    `"${kindergarten.name}" 선생님 급식 시설`,
  ];
}

function isExactKindergartenMatch(text: string, kindergartenName: string): boolean {
  return normalizeEvidenceText(text).includes(normalizeEvidenceText(kindergartenName));
}

function looksLikeOfficialInstitutionSource(
  sourceName: string,
  kindergartenName: string
): boolean {
  if (!sourceName) {
    return false;
  }

  const normalizedSource = normalizeEvidenceText(sourceName);
  const normalizedKindergarten = normalizeEvidenceText(kindergartenName);
  return (
    normalizedSource === normalizedKindergarten ||
    normalizedSource.includes(normalizedKindergarten)
  );
}

function hasLongformReviewSignals(text: string): boolean {
  const normalized = normalizeEvidenceText(text);
  return /입학설명회|선생님|급식|식단|시설만족|시설이|교실|놀이터|통학버스|셔틀버스|통학차량|프로그램|커리큘럼|반편성|원비|교사|적응|재원생|졸업생|우리아이|저희아이|아이를|학부모|엄마|보내보니|다녀보니|보냈어요|다녔어요/.test(
    normalized
  );
}

function hasExactInstitutionNameInTitle(
  title: string,
  kindergartenName: string
): boolean {
  return isExactKindergartenMatch(title, kindergartenName);
}

function hasMultipleInstitutionMentionsInTitle(title: string): boolean {
  if (extractInstitutionMentions(title).length >= 2) {
    return true;
  }

  const explicitInstitutionCount =
    title.match(/(?:유치원|어린이집)/g)?.length ?? 0;
  return explicitInstitutionCount >= 2 && /[\/|,]/.test(title);
}

function matchesStudyholicRow(
  kindergarten: KindergartenEntry,
  row: {
    kindergartenName: string;
    sigungu: string;
    category: string;
  }
): boolean {
  if (
    normalizeEvidenceText(row.kindergartenName) !==
    normalizeEvidenceText(kindergarten.name)
  ) {
    return false;
  }

  if (row.category !== '유치원') {
    return false;
  }

  const targetSigungu = normalizeSigunguLabel(kindergarten.address);
  return normalizeEvidenceText(row.sigungu) === normalizeEvidenceText(targetSigungu);
}

async function collectStudyholicPublicListCandidates(
  kindergarten: KindergartenEntry,
  maxPerSource: number,
  studyholicRowIndex: StudyholicRowIndex
): Promise<ReviewCandidate[]> {
  const rows = (studyholicRowIndex.get(normalizeEvidenceText(kindergarten.name)) ?? [])
    .filter((row) => matchesStudyholicRow(kindergarten, row))
    .slice(0, maxPerSource);

  const collectedAt = new Date().toISOString();
  return rows.map((row) =>
    buildCandidate({
      kindergarten,
      title: `${row.kindergartenName} 리뷰`,
      url: row.canonicalUrl,
      source: 'studyholic',
      sourceName: '스터디홀릭',
      snippet: `${row.reviewTitle} | ${row.region} ${row.sigungu} | 별점 ${'★'.repeat(
        row.rating ?? 0
      )}`,
      date: null,
      adapterId: 'studyholic_public_list',
      accessMode: 'public',
      evidenceType: 'structured_list_row',
      extractionMethod: 'studyholic_search_form_html',
      structuredFields: row.structuredFields,
      rating: row.rating,
      evidenceSourceUrl: row.sourceUrl,
      collectedAt,
    })
  );
}

async function collectStudyholicMemberDetailCandidates(
  kindergarten: KindergartenEntry,
  listCandidates: readonly ReviewCandidate[],
  maxPerSource: number
): Promise<ReviewCandidate[]> {
  const candidates = listCandidates.slice(0, maxPerSource);
  const details: ReviewCandidate[] = [];
  const studyholicCookie = process.env.STUDYHOLIC_COOKIE;

  for (const candidate of candidates) {
    try {
      await delay(150);
      const html = await fetchText(candidate.url, {}, studyholicCookie);
      const detail = parseStudyholicDetailHtml(html, candidate.url);
      if (!detail.isReviewPage) {
        continue;
      }
      if (
        normalizeEvidenceText(detail.kindergartenName) !==
        normalizeEvidenceText(kindergarten.name)
      ) {
        continue;
      }

      const snippetBase = buildFieldSummary(detail.publicFields);
      details.push(
        buildCandidate({
          kindergarten,
          title: `[${detail.kindergartenName} 리뷰] ${detail.reviewTitle}`,
          url: detail.canonicalUrl ?? candidate.url,
          source: 'studyholic',
          sourceName: '스터디홀릭',
          snippet:
            snippetBase.length > 0
              ? snippetBase
              : `${detail.region} ${detail.location}`.trim(),
          date: null,
          adapterId: 'studyholic_member_detail',
          accessMode: studyholicCookie ? 'login' : 'public',
          evidenceType: 'native_review_page',
          extractionMethod: studyholicCookie
            ? 'studyholic_detail_html_cookie'
            : 'studyholic_detail_html_public',
          structuredFields: detail.structuredFields,
          rating: detail.rating,
          evidenceSourceUrl: candidate.url,
          collectedAt: new Date().toISOString(),
        })
      );
    } catch {
      continue;
    }
  }

  return details;
}

async function fetchBlogRssConfirmation(
  url: string,
  rssCache: Map<string, NaverSearchItem[] | null>,
  rssTextCache: Map<string, string | null>
): Promise<{
  rssUrl?: string;
  rssConfirmed: boolean;
  rssDate: string | null;
}> {
  const identity = extractNaverBlogIdentity(url);
  if (!identity) {
    return {
      rssConfirmed: false,
      rssDate: null,
    };
  }

  if (!rssTextCache.has(identity.blogId)) {
    try {
      await delay(120);
      const rssText = await fetchText(identity.rssUrl);
      rssTextCache.set(identity.blogId, rssText);
    } catch {
      rssTextCache.set(identity.blogId, null);
    }
  }

  const rssText = rssTextCache.get(identity.blogId) ?? null;
  if (!rssText) {
    return {
      rssUrl: identity.rssUrl,
      rssConfirmed: false,
      rssDate: null,
    };
  }

  if (!rssCache.has(identity.blogId)) {
    const items = parseNaverBlogRss(rssText).map((item) => ({
      title: item.title,
      link: item.canonicalUrl,
      description: '',
      postdate: item.date ?? undefined,
    }));
    rssCache.set(identity.blogId, items);
  }

  const items = rssCache.get(identity.blogId) ?? [];
  const matched = items.find(
    (item) => canonicalizeKnownReviewUrl(item.link) === identity.canonicalUrl
  );

  return {
    rssUrl: identity.rssUrl,
    rssConfirmed: Boolean(matched),
    rssDate: matched?.postdate ?? null,
  };
}

async function collectNaverBlogCandidates(
  kindergarten: KindergartenEntry,
  maxPerQuery: number,
  maxPerSource: number,
  rssCache: Map<string, NaverSearchItem[] | null>,
  rssTextCache: Map<string, string | null>
): Promise<ReviewCandidate[]> {
  const collectedAt = new Date().toISOString();
  const seenUrls = new Set<string>();
  const results: ReviewCandidate[] = [];

  for (const query of buildExactNaverQueries(kindergarten)) {
    await delay(250);
    const items = await searchNaver('blog', query, maxPerQuery, 'sim');
    for (const item of items) {
      const title = stripHtml(item.title);
      const snippet = stripHtml(item.description);
      if (isSpamTitle(title)) {
        continue;
      }
      if (!hasExactInstitutionNameInTitle(title, kindergarten.name)) {
        continue;
      }
      if (hasMultipleInstitutionMentionsInTitle(title)) {
        continue;
      }
      if (
        looksLikeOfficialInstitutionSource(
          item.bloggername ?? '',
          kindergarten.name
        )
      ) {
        continue;
      }

      if (
        !isExactKindergartenMatch(`${title} ${snippet}`, kindergarten.name)
      ) {
        continue;
      }
      if (!hasLongformReviewSignals(`${title} ${snippet}`)) {
        continue;
      }

      const canonicalUrl = canonicalizeKnownReviewUrl(item.link);
      if (seenUrls.has(canonicalUrl)) {
        continue;
      }

      const rssInfo = await fetchBlogRssConfirmation(
        canonicalUrl,
        rssCache,
        rssTextCache
      );
      const identity = extractNaverBlogIdentity(canonicalUrl);
      seenUrls.add(canonicalUrl);
      results.push(
        buildCandidate({
          kindergarten,
          title,
          url: canonicalUrl,
          source: 'naver_blog',
          sourceName: item.bloggername ?? '',
          snippet,
          date: rssInfo.rssDate ?? formatNaverDate(item.postdate),
          adapterId: 'naver_blog_search',
          accessMode: 'public',
          evidenceType: 'longform_post',
          extractionMethod: rssInfo.rssConfirmed
            ? 'naver_search_api_exact_query+rss_refresh'
            : 'naver_search_api_exact_query',
          structuredFields: {
            searchQuery: query,
            regionName: extractRegionName(kindergarten.address),
            rssUrl: rssInfo.rssUrl ?? null,
            rssConfirmed: rssInfo.rssConfirmed,
            blogId: identity?.blogId ?? '',
            logNo: identity?.logNo ?? '',
          },
          relevanceScore: 1,
          collectedAt,
        })
      );
    }
  }

  return results.slice(0, maxPerSource);
}

async function buildStudyholicRowIndex(
  sidoCode: string,
  maxPages: number
): Promise<StudyholicRowIndex> {
  const studyholicSido = STUDYHOLIC_SIDO_MAP[sidoCode];
  if (!studyholicSido) {
    return new Map();
  }

  const index: StudyholicRowIndex = new Map();
  const seenUrls = new Set<string>();
  let emptyPageCount = 0;

  for (let page = 1; page <= maxPages; page += 1) {
    const url = new URL('https://www.studyholic.com/eduinfo/KinderList.asp');
    url.searchParams.set('sido', studyholicSido);
    url.searchParams.set('page', String(page));
    url.searchParams.set('SearchPart', '');
    url.searchParams.set('SearchWord', '');

    const html = await fetchText(url.toString());
    const rows = parseStudyholicListHtml(
      html,
      'https://www.studyholic.com/eduinfo/KinderList.asp'
    );
    writeLine(
      `[Studyholic:${sidoCode}] page ${page}/${maxPages} -> rows ${rows.length}`
    );
    if (rows.length === 0) {
      emptyPageCount += 1;
      if (emptyPageCount >= 2) {
        break;
      }
      continue;
    }

    emptyPageCount = 0;
    let newlyIndexed = 0;
    for (const row of rows) {
      if (seenUrls.has(row.canonicalUrl)) {
        continue;
      }

      seenUrls.add(row.canonicalUrl);
      newlyIndexed += 1;
      const key = normalizeEvidenceText(row.kindergartenName);
      const bucket = index.get(key) ?? [];
      bucket.push(row);
      index.set(key, bucket);
    }

    if (newlyIndexed === 0) {
      break;
    }

    await delay(80);
  }

  return index;
}

async function collectNaverCafeLoginCandidates(
  kindergarten: KindergartenEntry,
  maxPerQuery: number,
  maxPerSource: number,
  enableLoginLanes: boolean
): Promise<ReviewCandidate[]> {
  if (!enableLoginLanes || !process.env.NAVER_COOKIE) {
    return [];
  }

  const collectedAt = new Date().toISOString();
  const seenUrls = new Set<string>();
  const results: ReviewCandidate[] = [];

  for (const query of buildExactNaverQueries(kindergarten)) {
    await delay(250);
    const items = await searchNaver('cafearticle', query, maxPerQuery, 'sim');
    for (const item of items) {
      const title = stripHtml(item.title);
      const snippet = stripHtml(item.description);
      if (isSpamTitle(title)) {
        continue;
      }
      if (!hasExactInstitutionNameInTitle(title, kindergarten.name)) {
        continue;
      }
      if (hasMultipleInstitutionMentionsInTitle(title)) {
        continue;
      }
      if (
        looksLikeOfficialInstitutionSource(item.cafename ?? '', kindergarten.name)
      ) {
        continue;
      }

      if (
        !isExactKindergartenMatch(`${title} ${snippet}`, kindergarten.name)
      ) {
        continue;
      }
      if (!hasLongformReviewSignals(`${title} ${snippet}`)) {
        continue;
      }

      const canonicalUrl = canonicalizeKnownReviewUrl(item.link);
      if (seenUrls.has(canonicalUrl)) {
        continue;
      }

      seenUrls.add(canonicalUrl);
      results.push(
        buildCandidate({
          kindergarten,
          title,
          url: canonicalUrl,
          source: 'naver_cafe',
          sourceName: item.cafename ?? '',
          snippet,
          date: formatNaverDate(item.postdate),
          adapterId: 'naver_cafe_login_review',
          accessMode: 'login',
          evidenceType: 'longform_post',
          extractionMethod: 'naver_search_api_exact_query_login_lane',
          structuredFields: {
            searchQuery: query,
            loginLane: true,
          },
          relevanceScore: 1,
          collectedAt,
        })
      );
    }
  }

  return results.slice(0, maxPerSource);
}

function loadLearnsMapping(filePath: string | undefined): Record<string, string> {
  if (!filePath) {
    return {};
  }

  const resolved = path.resolve(filePath);
  if (!fs.existsSync(resolved)) {
    return {};
  }

  return JSON.parse(fs.readFileSync(resolved, 'utf-8')) as Record<string, string>;
}

async function collectLearnsPartnerCandidates(
  kindergarten: KindergartenEntry,
  maxPerSource: number,
  learnsMapping: Record<string, string>,
  enablePartnerSource: boolean
): Promise<ReviewCandidate[]> {
  if (!enablePartnerSource) {
    return [];
  }

  const schoolId = learnsMapping[kindergarten.kindercode];
  if (!schoolId) {
    return [];
  }

  const schoolUrl = `https://learns.academy/schools/${schoolId}`;
  const html = await fetchText(schoolUrl);
  const reviews = extractLearnsLatestReviews(html).slice(0, maxPerSource);
  const collectedAt = new Date().toISOString();

  return reviews.map((review) =>
    buildCandidate({
      kindergarten,
      title: `${kindergarten.name} 재원 리뷰`,
      url: `${schoolUrl}#review-${review.id}`,
      source: 'learns',
      sourceName: '런즈',
      snippet: review.previewText,
      date: review.createdAt,
      adapterId: 'learns_partner',
      accessMode: 'partner',
      evidenceType: 'native_review_page',
      extractionMethod: 'learns_next_f_hydration',
      structuredFields: {
        institutionName: kindergarten.name,
        reviewId: review.id,
        reviewTitle: `${kindergarten.name} 재원 리뷰`,
        rating: review.rating,
        userTypeLabel: review.userTypeLabel,
      },
      rating: review.rating,
      collectedAt,
    })
  );
}

function collapseCandidates(
  candidates: readonly ReviewCandidate[]
): ReviewCandidate[] {
  const byEvidence = new Map<string, ReviewCandidate>();

  for (const candidate of candidates) {
    const normalizedUrl =
      candidate.evidence?.normalizedUrl ??
      canonicalizeKnownReviewUrl(candidate.url)
        .replace(/^https?:\/\//i, '')
        .replace(/\/$/, '')
        .toLowerCase();
    const evidenceChecksum =
      candidate.evidenceChecksum ?? candidate.evidence?.htmlSnapshotHash ?? '';
    const key = `${candidate.kindergartenId}::${normalizedUrl}::${evidenceChecksum}`;
    const existing = byEvidence.get(key);
    if (!existing) {
      byEvidence.set(key, candidate);
      continue;
    }

    const currentScore =
      candidate.sourcePriority * -1000 +
      (candidate.rating ?? 0) * 10 +
      (candidate.relevanceScore ?? 0);
    const existingScore =
      existing.sourcePriority * -1000 +
      (existing.rating ?? 0) * 10 +
      (existing.relevanceScore ?? 0);
    if (currentScore > existingScore) {
      byEvidence.set(key, candidate);
    }
  }

  return Array.from(byEvidence.values()).sort(
    (left, right) =>
      left.sourcePriority - right.sourcePriority ||
      (right.rating ?? 0) - (left.rating ?? 0) ||
      (right.relevanceScore ?? 0) - (left.relevanceScore ?? 0) ||
      left.title.localeCompare(right.title)
  );
}

function buildManifest(
  sidoCode: string,
  reviews: ReviewCandidate[]
): ReviewsManifest {
  const bySource: Record<string, number> = {};
  const byAdapter: Record<string, number> = {};

  for (const review of reviews) {
    bySource[review.source] = (bySource[review.source] ?? 0) + 1;
    byAdapter[review.adapterId] = (byAdapter[review.adapterId] ?? 0) + 1;
  }

  return {
    generatedAt: new Date().toISOString(),
    targetSido: sidoCode,
    totalCount: reviews.length,
    pendingApprovalCount: reviews.filter(
      (review) => review.approvalStatus === 'pending'
    ).length,
    stats: {
      bySource,
      byAdapter,
    },
    reviews,
  };
}

async function processKindergarten(
  kindergarten: KindergartenEntry,
  options: {
    maxPerQuery: number;
    maxPerSource: number;
    enableLoginLanes: boolean;
    enablePartnerSource: boolean;
    studyholicRowIndex: StudyholicRowIndex;
    learnsMapping: Record<string, string>;
    rssCache: Map<string, NaverSearchItem[] | null>;
    rssTextCache: Map<string, string | null>;
  }
): Promise<ReviewCandidate[]> {
  const listCandidates = await collectStudyholicPublicListCandidates(
    kindergarten,
    options.maxPerSource,
    options.studyholicRowIndex
  ).catch(() => []);
  const detailCandidates = await collectStudyholicMemberDetailCandidates(
    kindergarten,
    listCandidates,
    options.maxPerSource
  ).catch(() => []);
  const blogCandidates = await collectNaverBlogCandidates(
    kindergarten,
    options.maxPerQuery,
    options.maxPerSource,
    options.rssCache,
    options.rssTextCache
  ).catch(() => []);
  const cafeCandidates = await collectNaverCafeLoginCandidates(
    kindergarten,
    options.maxPerQuery,
    options.maxPerSource,
    options.enableLoginLanes
  ).catch(() => []);
  const learnsCandidates = await collectLearnsPartnerCandidates(
    kindergarten,
    options.maxPerSource,
    options.learnsMapping,
    options.enablePartnerSource
  ).catch(() => []);

  const prioritized = [
    ...detailCandidates,
    ...listCandidates,
    ...blogCandidates,
    ...cafeCandidates,
    ...learnsCandidates,
  ];

  return collapseCandidates(prioritized);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const targetSido = getArgValue(args, '--sido');
  const concurrency = parseInteger(args, '--concurrency', 8);
  const maxLimit = parseInteger(args, '--limit', 0);
  const maxPerQuery = parseInteger(args, '--max-per-query', 3);
  const maxPerSource = parseInteger(args, '--max-per-source', 3);
  const studyholicMaxPages = parseInteger(args, '--studyholic-max-pages', 220);
  const enableLoginLanes = hasFlag(args, '--enable-login-lanes');
  const enablePartnerSource =
    hasFlag(args, '--enable-partner-source') ||
    process.env.LEARNS_PARTNER_ENABLED === 'true';

  const kindergartensPath = path.resolve('public/data/kindergartens.json');
  if (!fs.existsSync(kindergartensPath)) {
    throw new Error(`Data file not found: ${kindergartensPath}`);
  }

  const allKindergartens: KindergartenEntry[] = JSON.parse(
    fs.readFileSync(kindergartensPath, 'utf-8')
  ) as KindergartenEntry[];
  const sidosToProcess = targetSido
    ? [targetSido]
    : Object.keys(SIDO_NAMES).sort();
  const outputDir = path.resolve('scripts/data-output/reviews-urls-raw');
  fs.mkdirSync(outputDir, { recursive: true });

  const learnsMapping = loadLearnsMapping(process.env.LEARNS_SCHOOL_ID_MAP_FILE);
  const rssCache = new Map<string, NaverSearchItem[] | null>();
  const rssTextCache = new Map<string, string | null>();

  writeLine('=== Precision-First Review Acquisition ===');
  writeLine(`Target Sidos: ${sidosToProcess.map((code) => SIDO_NAMES[code]).join(', ')}`);
  writeLine(`Concurrency: ${concurrency}`);
  writeLine(`Max per query: ${maxPerQuery}`);
  writeLine(`Max per source: ${maxPerSource}`);
  writeLine(`Studyholic max pages: ${studyholicMaxPages}`);
  writeLine(`Login lanes: ${enableLoginLanes ? 'enabled' : 'disabled'}`);
  writeLine(`Partner source: ${enablePartnerSource ? 'enabled' : 'disabled'}`);

  for (const sidoCode of sidosToProcess) {
    let targets = allKindergartens.filter(
      (kindergarten) => kindergarten.sido_code === sidoCode
    );
    if (maxLimit > 0) {
      targets = targets.slice(0, maxLimit);
    }

    writeLine(
      `\n[${SIDO_NAMES[sidoCode]}] processing ${targets.length} kindergartens`
    );
    const studyholicRowIndex = await buildStudyholicRowIndex(
      sidoCode,
      studyholicMaxPages
    ).catch(() => new Map());
    writeLine(
      `[${SIDO_NAMES[sidoCode]}] indexed Studyholic names: ${studyholicRowIndex.size}`
    );

    const candidates: ReviewCandidate[] = [];

    for (let index = 0; index < targets.length; index += concurrency) {
      const batch = targets.slice(index, index + concurrency);
      const results = await Promise.all(
        batch.map((kindergarten) =>
          processKindergarten(kindergarten, {
            maxPerQuery,
            maxPerSource,
            enableLoginLanes,
            enablePartnerSource,
            studyholicRowIndex,
            learnsMapping,
            rssCache,
            rssTextCache,
          }).catch((error) => {
            writeLine(
              `[warn] ${kindergarten.name}: ${
                error instanceof Error ? error.message : String(error)
              }`
            );
            return [];
          })
        )
      );

      candidates.push(...results.flat());
      writeLine(
        `[${SIDO_NAMES[sidoCode]}] ${Math.min(index + batch.length, targets.length)}/${targets.length}`
      );
      await delay(150);
    }

    const manifest = buildManifest(sidoCode, collapseCandidates(candidates));
    const outputPath = path.join(outputDir, `reviews-urls-${sidoCode}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(manifest, null, 2));
    writeLine(
      `[${SIDO_NAMES[sidoCode]}] saved ${manifest.totalCount} pending candidates to ${outputPath}`
    );
  }

  writeLine('\nDone.');
}

void main().catch((error) => {
  process.stderr.write(
    `${error instanceof Error ? error.stack ?? error.message : String(error)}\n`
  );
  process.exit(1);
});

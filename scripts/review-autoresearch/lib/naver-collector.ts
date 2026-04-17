import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { JSDOM } from 'jsdom';
import { chromium, type Browser, type BrowserContext, type Cookie } from '@playwright/test';
import type {
  ReviewLink,
  ReviewsData,
} from '../../../src/types/review';
import {
  buildReviewEvidenceBundle,
  canonicalizeKnownReviewUrl,
} from '../../../src/lib/utils/review-acquisition';
import {
  buildTextExcerpt,
  extractReadableTextFromHtml,
} from '../../../src/lib/utils/review-html';
import {
  buildCollectionQueries,
  buildCollectionQueue,
  buildQuestionSummary,
  evaluateCollectedCandidate,
  isQuestionLikeCafePost,
  type CollectionQuestionEvidence,
  type CollectionSearchCandidate,
  type ReviewCollectionDiagnostics,
} from './collection-policy';
import type { KindergartenEntry } from '../../lib/review-verification-pipeline';
import type { RawReviewLink } from '../../lib/review-curation';
import { normalizeReviewUrl } from '../../../src/lib/utils/review-verification';

const SEARCH_BASE_URL = 'https://search.naver.com/search.naver';
const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36';
const SEARCH_RESULT_IGNORE_TEXTS = new Set([
  '내 블로그',
  '가입한 카페',
  '카페',
  '블로그',
  'NAVER',
  '메뉴 영역으로 바로가기',
  '본문 영역으로 바로가기',
]);

export interface NaverCollectionRunOptions {
  kindergartens: readonly KindergartenEntry[];
  workingRegionData: ReviewsData;
  searchedKindergartenIds?: readonly string[];
  cycleSize?: number;
  targetSidoCode?: string;
  existingGlobalNormalizedUrls: Set<string>;
  maxResultsPerQuery?: number;
  headless?: boolean;
  chromeProfileCloneDir?: string;
}

export interface NaverCollectionRunResult {
  searchedKindergartens: KindergartenEntry[];
  acceptedRawReviews: RawReviewLink[];
  acceptedReviews: ReviewLink[];
  diagnostics: ReviewCollectionDiagnostics;
  rejectionCounts: Record<string, number>;
}

interface ExtractedPageContent {
  title: string;
  sourceName: string;
  date: string | null;
  bodyText: string;
  questionEvidence: CollectionQuestionEvidence | null;
}

interface ManagedBrowserContext {
  context: BrowserContext;
  close: () => Promise<void>;
  authSource: 'cookie' | 'chrome_profile';
}

const PROFILE_COPY_SKIP_NAMES = new Set([
  'Cache',
  'Code Cache',
  'GPUCache',
  'GrShaderCache',
  'GraphiteDawnCache',
  'ShaderCache',
  'Crashpad',
  'Safe Browsing',
]);

function cleanupText(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function formatDottedDate(value: string): string | null {
  const match = value.match(/\b(20\d{2})[.\-/](\d{2})[.\-/](\d{2})\b/);
  if (!match) {
    return null;
  }

  return `${match[1]}-${match[2]}-${match[3]}`;
}

function extractDateFromDocument(document: Document): string | null {
  const candidates = [
    'meta[property="article:published_time"]',
    'meta[name="article:published_time"]',
    '.se_publishDate',
    '.blog_date',
    '.date',
    'span.date',
    'time',
  ];

  for (const selector of candidates) {
    const element = document.querySelector(selector);
    if (!element) {
      continue;
    }
    const content =
      cleanupText(element.getAttribute('content') ?? '') ||
      cleanupText(element.textContent ?? '');
    const parsed = formatDottedDate(content) ??
      (content.match(/^\d{4}-\d{2}-\d{2}/)?.[0] ?? null);
    if (parsed) {
      return parsed;
    }
  }

  return formatDottedDate(cleanupText(document.body?.textContent ?? ''));
}

function extractSourceNameFromDocument(
  document: Document,
  selectors: readonly string[],
  fallback = ''
): string {
  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (!element) {
      continue;
    }

    const text =
      cleanupText(element.getAttribute('content') ?? '') ||
      cleanupText(element.textContent ?? '');
    if (text.length > 0) {
      return text;
    }
  }

  return fallback;
}

function collectTextList(document: Document, selectors: readonly string[]): string[] {
  const results: string[] = [];

  for (const selector of selectors) {
    for (const element of Array.from(document.querySelectorAll(selector))) {
      const text = cleanupText(element.textContent ?? '');
      if (text.length > 0) {
        results.push(text);
      }
    }
  }

  return results.filter((value, index, array) => array.indexOf(value) === index);
}

function normalizeQuestionText(text: string): string {
  return cleanupText(text).replace(/^질문[:\s]*/u, '');
}

function normalizeAnswerText(text: string): string {
  return cleanupText(text).replace(/^(?:re[:\s]*|답변[:\s]*)/iu, '');
}

export function extractQuestionEvidenceFromHtml(html: string): CollectionQuestionEvidence | null {
  const dom = new JSDOM(html);
  const { document } = dom.window;
  const bodyText = extractReadableTextFromHtml(html);
  const questionSummary = buildTextExcerpt(normalizeQuestionText(bodyText), 180);
  const answerCandidates = collectTextList(document, [
    '.CommentBox .text_comment',
    '.CommentBox .comment_text_view',
    '.comment_text_view',
    '.text_comment',
    '.CommentItem',
    '.CommentBox p',
    '.CommentBox li',
  ])
    .map(normalizeAnswerText)
    .filter((text) => text.length >= 12);

  if (questionSummary.length === 0 || answerCandidates.length === 0) {
    return null;
  }

  return {
    questionSummary,
    answerSummary: buildTextExcerpt(answerCandidates[0], 180),
    answerEvidenceCount: answerCandidates.length,
  };
}

export function extractBlogPageContentFromHtml(
  html: string,
  fallbackTitle = '',
  fallbackSourceName = ''
): ExtractedPageContent {
  const dom = new JSDOM(html);
  const { document } = dom.window;
  const title =
    cleanupText(
      document.querySelector('meta[property="og:title"]')?.getAttribute('content') ??
        document.querySelector('title')?.textContent ??
        fallbackTitle
    ) || fallbackTitle;
  const sourceName = extractSourceNameFromDocument(
    document,
    [
      'meta[property="naverblog:nickname"]',
      '.blog2_container .nick .ell',
      '.nick .ell',
      '.blog_profile .nick',
      '.nickname',
    ],
    fallbackSourceName
  );

  return {
    title,
    sourceName,
    date: extractDateFromDocument(document),
    bodyText: extractReadableTextFromHtml(html),
    questionEvidence: null,
  };
}

export function extractCafePageContentFromHtml(
  html: string,
  fallbackTitle = '',
  fallbackSourceName = ''
): ExtractedPageContent {
  const dom = new JSDOM(html);
  const { document } = dom.window;
  const title =
    cleanupText(
      document.querySelector('meta[property="og:title"]')?.getAttribute('content') ??
        document.querySelector('.title_text')?.textContent ??
        document.querySelector('title')?.textContent ??
        fallbackTitle
    ) || fallbackTitle;
  const sourceName = extractSourceNameFromDocument(
    document,
    [
      'meta[property="og:site_name"]',
      '.cafe_name',
      '.CafeInfo .name',
      'title',
    ],
    fallbackSourceName
  );
  const questionEvidence = extractQuestionEvidenceFromHtml(html);

  return {
    title,
    sourceName,
    date: extractDateFromDocument(document),
    bodyText: extractReadableTextFromHtml(html),
    questionEvidence,
  };
}

function looksLikeCandidateUrl(url: string): boolean {
  return (
    /https?:\/\/(?:m\.)?blog\.naver\.com\//.test(url) ||
    /https?:\/\/(?:m\.)?cafe\.naver\.com\//.test(url)
  );
}

function inferSource(url: string): 'naver_blog' | 'naver_cafe' | null {
  if (/blog\.naver\.com/.test(url)) {
    return 'naver_blog';
  }
  if (/cafe\.naver\.com/.test(url)) {
    return 'naver_cafe';
  }
  return null;
}

export function extractNaverSearchCandidatesFromHtml(html: string): CollectionSearchCandidate[] {
  const dom = new JSDOM(html);
  const { document } = dom.window;
  const deduped = new Map<string, CollectionSearchCandidate>();

  for (const anchor of Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href]'))) {
    const href = anchor.href;
    if (!looksLikeCandidateUrl(href)) {
      continue;
    }

    const source = inferSource(href);
    if (!source) {
      continue;
    }

    const title = cleanupText(anchor.textContent ?? '');
    if (title.length === 0 || SEARCH_RESULT_IGNORE_TEXTS.has(title)) {
      continue;
    }

    let contextText = '';
    let current: Element | null = anchor;
    for (let depth = 0; current && depth < 5; depth += 1) {
      current = current.parentElement;
      if (!current) {
        break;
      }
      const candidateText = cleanupText(current.textContent ?? '');
      if (candidateText.length > title.length + 20 && candidateText.length < 2400) {
        contextText = candidateText;
        break;
      }
    }

    const canonicalUrl = canonicalizeKnownReviewUrl(href);
    if (deduped.has(canonicalUrl)) {
      continue;
    }

    deduped.set(canonicalUrl, {
      url: canonicalUrl,
      title,
      snippet: buildTextExcerpt(contextText.replace(title, '').trim(), 220),
      source,
      sourceName: '',
    });
  }

  return Array.from(deduped.values());
}

function parseCookieHeader(cookieHeader: string): Cookie[] {
  const expires = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30;
  return cookieHeader
    .split(';')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0 && entry.includes('='))
    .map((entry) => {
      const separatorIndex = entry.indexOf('=');
      const name = entry.slice(0, separatorIndex).trim();
      const value = entry.slice(separatorIndex + 1).trim();
      return {
        name,
        value,
        domain: '.naver.com',
        path: '/',
        secure: true,
        httpOnly: false,
        sameSite: 'Lax' as const,
        expires,
      };
    });
}

function getDefaultChromeUserDataDir(): string {
  return path.join(
    process.env.HOME ?? '',
    'Library/Application Support/Google/Chrome'
  );
}

function getChromeProfileDirectory(userDataDir: string): string {
  const explicit = process.env.CHROME_PROFILE_DIRECTORY?.trim();
  if (explicit) {
    return explicit;
  }

  const localStatePath = path.join(userDataDir, 'Local State');
  if (fs.existsSync(localStatePath)) {
    try {
      const localState = JSON.parse(fs.readFileSync(localStatePath, 'utf8')) as {
        profile?: { last_used?: string };
      };
      if (localState.profile?.last_used) {
        return localState.profile.last_used;
      }
    } catch {
      // Ignore malformed local state and fall through to Default.
    }
  }

  return 'Default';
}

function resolveChromeProfileConfig():
  | { userDataDir: string; profileDirectory: string }
  | null {
  const userDataDir =
    process.env.CHROME_USER_DATA_DIR?.trim() || getDefaultChromeUserDataDir();
  if (!userDataDir || !fs.existsSync(userDataDir)) {
    return null;
  }

  const profileDirectory = getChromeProfileDirectory(userDataDir);
  const profilePath = path.join(userDataDir, profileDirectory);
  if (!fs.existsSync(profilePath)) {
    return null;
  }

  return {
    userDataDir,
    profileDirectory,
  };
}

function ensureFreshDirectory(directoryPath: string): void {
  if (fs.existsSync(directoryPath)) {
    fs.rmSync(directoryPath, { recursive: true, force: true });
  }
  fs.mkdirSync(directoryPath, { recursive: true });
}

function cloneChromeProfile(
  config: { userDataDir: string; profileDirectory: string },
  cloneDir?: string
): string {
  const destinationRoot =
    cloneDir ??
    fs.mkdtempSync(path.join(os.tmpdir(), 'naver-collector-chrome-'));
  ensureFreshDirectory(destinationRoot);

  const localStatePath = path.join(config.userDataDir, 'Local State');
  if (fs.existsSync(localStatePath)) {
    fs.copyFileSync(localStatePath, path.join(destinationRoot, 'Local State'));
  }

  const sourceProfilePath = path.join(config.userDataDir, config.profileDirectory);
  const destinationProfilePath = path.join(destinationRoot, config.profileDirectory);
  fs.cpSync(sourceProfilePath, destinationProfilePath, {
    recursive: true,
    filter: (sourcePath) => {
      const baseName = path.basename(sourcePath);
      return !PROFILE_COPY_SKIP_NAMES.has(baseName);
    },
  });

  return destinationRoot;
}

async function buildBrowserContext(
  headless = true,
  chromeProfileCloneDir?: string
): Promise<ManagedBrowserContext> {
  const browser = await chromium.launch({ headless });
  const cookieHeader = process.env.NAVER_COOKIE;

  if (cookieHeader) {
    const context = await browser.newContext({
      userAgent: USER_AGENT,
      locale: 'ko-KR',
      extraHTTPHeaders: { Cookie: cookieHeader },
    });
    const cookies = parseCookieHeader(cookieHeader);
    if (cookies.length > 0) {
      await context.addCookies(cookies);
    }
    return {
      context,
      authSource: 'cookie',
      close: async () => {
        await context.close();
        await browser.close();
      },
    };
  }

  await browser.close();

  const chromeProfile = resolveChromeProfileConfig();
  if (!chromeProfile) {
    throw new Error(
      'Neither NAVER_COOKIE nor a usable Chrome profile was found. Set CHROME_USER_DATA_DIR or NAVER_COOKIE.'
    );
  }
  const clonedUserDataDir = cloneChromeProfile(
    chromeProfile,
    chromeProfileCloneDir
  );

  const persistentContext = await chromium.launchPersistentContext(
    clonedUserDataDir,
    {
      channel: 'chrome',
      headless,
      locale: 'ko-KR',
      userAgent: USER_AGENT,
      args: [`--profile-directory=${chromeProfile.profileDirectory}`],
    }
  );

  return {
    context: persistentContext,
    authSource: 'chrome_profile',
    close: async () => {
      await persistentContext.close();
    },
  };
}

async function fetchSearchCandidates(
  context: BrowserContext,
  query: string
): Promise<CollectionSearchCandidate[]> {
  const page = await context.newPage();

  try {
    const url = `${SEARCH_BASE_URL}?query=${encodeURIComponent(query)}`;
    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
    await page.waitForTimeout(1500);
    const html = await page.content();
    return extractNaverSearchCandidatesFromHtml(html);
  } finally {
    await page.close();
  }
}

async function readCandidatePage(
  context: BrowserContext,
  candidate: CollectionSearchCandidate
): Promise<ExtractedPageContent | null> {
  const page = await context.newPage();

  try {
    await page.goto(candidate.url, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
    await page.waitForTimeout(2000);

    let html = '';
    if (candidate.source === 'naver_blog') {
      const frameElement = await page.$('iframe#mainFrame');
      if (frameElement) {
        const frame = await frameElement.contentFrame();
        if (frame) {
          await frame.waitForLoadState('domcontentloaded').catch(() => {});
          html = await frame.content();
        }
      }
    } else {
      const frameElement =
        (await page.$('iframe#cafe_main')) ??
        (await page.$('iframe#mainFrame')) ??
        (await page.$('iframe#main-area'));
      if (frameElement) {
        const frame = await frameElement.contentFrame();
        if (frame) {
          await frame.waitForLoadState('domcontentloaded').catch(() => {});
          html = await frame.content();
        }
      }
    }

    if (html.length === 0) {
      html = await page.content();
    }

    if (candidate.source === 'naver_blog') {
      return extractBlogPageContentFromHtml(html, candidate.title, candidate.sourceName ?? '');
    }

    return extractCafePageContentFromHtml(html, candidate.title, candidate.sourceName ?? '');
  } catch {
    return null;
  } finally {
    await page.close();
  }
}

export async function runNaverCollectionCycle(
  options: NaverCollectionRunOptions
): Promise<NaverCollectionRunResult> {
  const queue = buildCollectionQueue(
    options.kindergartens,
    options.workingRegionData.reviews,
    options.searchedKindergartenIds,
    options.cycleSize,
    options.targetSidoCode
  );
  const searchedKindergartens = queue.map((item) => item.kindergarten);
  const acceptedRawReviews: RawReviewLink[] = [];
  const acceptedReviews: ReviewLink[] = [];
  const rejectionCounts: Record<string, number> = {};
  const knownUrls = new Set(options.existingGlobalNormalizedUrls);
  const questionCandidatesSeen: number[] = [];
  const questionAccepted: number[] = [];
  let blogOpenCount = 0;
  let blogSuccessCount = 0;
  let cafeOpenCount = 0;
  let cafeSuccessCount = 0;
  let candidatesFound = 0;
  let candidatesOpened = 0;
  let duplicateRejections = 0;
  let officialSourceRejections = 0;
  let wrongLinkRejections = 0;

  const managedContext = await buildBrowserContext(
    options.headless,
    options.chromeProfileCloneDir
  );
  const { context } = managedContext;

  try {
    for (const kindergarten of searchedKindergartens) {
      const queries = buildCollectionQueries(kindergarten);
      const candidateMap = new Map<string, CollectionSearchCandidate>();

      for (const query of queries) {
        const candidates = await fetchSearchCandidates(context, query);
        for (const candidate of candidates.slice(0, options.maxResultsPerQuery ?? 10)) {
          candidateMap.set(candidate.url, candidate);
        }
      }

      candidatesFound += candidateMap.size;

      for (const candidate of candidateMap.values()) {
        const normalizedCandidateUrl = normalizeReviewUrl(candidate.url);
        if (knownUrls.has(normalizedCandidateUrl)) {
          duplicateRejections += 1;
          continue;
        }

        candidatesOpened += 1;
        if (candidate.source === 'naver_blog') {
          blogOpenCount += 1;
        } else {
          cafeOpenCount += 1;
        }

        const extracted = await readCandidatePage(context, candidate);
        if (!extracted || extracted.bodyText.length === 0) {
          wrongLinkRejections += 1;
          continue;
        }

        if (candidate.source === 'naver_blog') {
          blogSuccessCount += 1;
        } else {
          cafeSuccessCount += 1;
        }

        const isQuestionPost =
          candidate.source === 'naver_cafe' &&
          isQuestionLikeCafePost(candidate.title, candidate.snippet);
        if (isQuestionPost) {
          questionCandidatesSeen.push(1);
        }

        const summary = extracted.questionEvidence
          ? buildQuestionSummary(extracted.questionEvidence)
          : undefined;
        const structuredFields: Record<
          string,
          string | number | boolean | null | string[]
        > = {
          searchQueryCount: queries.length,
        };
        if (extracted.questionEvidence) {
          structuredFields.questionSummary =
            extracted.questionEvidence.questionSummary;
          structuredFields.answerSummary =
            extracted.questionEvidence.answerSummary;
          structuredFields.answerEvidenceCount =
            extracted.questionEvidence.answerEvidenceCount;
        }
        const evidence = buildReviewEvidenceBundle({
          canonicalUrl: candidate.url,
          rawText: [candidate.title, candidate.snippet, extracted.bodyText]
            .filter((value) => value.trim().length > 0)
            .join(' '),
          structuredFields,
          extractedAt: new Date().toISOString(),
        });
        const draftReview: ReviewLink = {
          id: '',
          kindergartenId: kindergarten.kindercode,
          title: extracted.title || candidate.title,
          url: evidence.canonicalUrl,
          source: candidate.source,
          sourceName: extracted.sourceName || candidate.sourceName || '',
          snippet:
            candidate.snippet.length > 0
              ? candidate.snippet
              : buildTextExcerpt(extracted.bodyText, 220),
          summary,
          tags: extracted.questionEvidence ? ['질문글'] : undefined,
          content: buildTextExcerpt(extracted.bodyText, 2000),
          date: extracted.date,
          collectedAt: new Date().toISOString(),
          accessMode: candidate.source === 'naver_cafe' ? 'login' : 'public',
          evidenceType: 'longform_post',
          extractionMethod: 'playwright_naver_search_direct_read',
          evidenceChecksum: evidence.htmlSnapshotHash,
          structuredFields,
          evidence,
          approvalStatus: 'pending',
        };

        const evaluation = evaluateCollectedCandidate({
          kindergarten,
          review: draftReview,
          bodyText: extracted.bodyText,
          questionEvidence: extracted.questionEvidence,
        });

        if (!evaluation.accept) {
          rejectionCounts[evaluation.reason] = (rejectionCounts[evaluation.reason] ?? 0) + 1;
          if (evaluation.reason === 'official institution source') {
            officialSourceRejections += 1;
          } else {
            wrongLinkRejections += 1;
          }
          continue;
        }

        if (isQuestionPost) {
          questionAccepted.push(1);
        }

        acceptedReviews.push({
          ...draftReview,
          id: `candidate-${acceptedReviews.length + 1}`,
        });
        acceptedRawReviews.push({
          kindergartenId: kindergarten.kindercode,
          kindergartenName: kindergarten.name,
          title: draftReview.title,
          url: draftReview.url,
          source: draftReview.source,
          sourceName: draftReview.sourceName,
          snippet: draftReview.snippet,
          summary: draftReview.summary,
          tags: draftReview.tags,
          content: draftReview.content,
          date: draftReview.date,
          collectedAt: draftReview.collectedAt,
          accessMode: draftReview.accessMode,
          evidenceType: draftReview.evidenceType,
          extractionMethod: draftReview.extractionMethod,
          evidenceChecksum: draftReview.evidenceChecksum,
          structuredFields: draftReview.structuredFields,
          evidence: draftReview.evidence,
          approvalStatus: draftReview.approvalStatus,
        });
        knownUrls.add(normalizeReviewUrl(draftReview.url));
      }
    }
  } finally {
    await managedContext.close();
  }

  const diagnostics: ReviewCollectionDiagnostics = {
    kindergartensSearched: searchedKindergartens.length,
    candidatesFound,
    candidatesOpened,
    acceptedLinks: acceptedRawReviews.length,
    duplicateRejections,
    officialSourceRejections,
    wrongLinkRejections,
    blogReadSuccessRate:
      blogOpenCount === 0 ? 0 : Number((blogSuccessCount / blogOpenCount).toFixed(6)),
    cafeReadSuccessRate:
      cafeOpenCount === 0 ? 0 : Number((cafeSuccessCount / cafeOpenCount).toFixed(6)),
    questionPostAcceptRate:
      questionCandidatesSeen.length === 0
        ? 0
        : Number((questionAccepted.length / questionCandidatesSeen.length).toFixed(6)),
  };

  return {
    searchedKindergartens,
    acceptedRawReviews,
    acceptedReviews,
    diagnostics,
    rejectionCounts,
  };
}

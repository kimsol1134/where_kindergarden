import { JSDOM } from 'jsdom';
import type {
  ReviewAccessMode,
  ReviewEvidenceBundle,
  ReviewEvidenceType,
  ReviewStructuredFields,
} from '@/types/review';

const TRACKING_QUERY_PARAMS = new Set([
  'fromrss',
  'trackingcode',
  'referrercode',
  'searchkeyword',
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'fbclid',
  'gclid',
]);

function cleanupText(value: string): string {
  return value
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');
}

export function buildStableHash(value: string): string {
  let hash = 0x811c9dc5;

  for (const character of value) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }

  return hash.toString(16).padStart(8, '0');
}

export function normalizeEvidenceText(value: string): string {
  return cleanupText(decodeHtmlEntities(value)).toLowerCase();
}

function buildAbsoluteUrl(url: string, baseUrl: string): string {
  try {
    return new URL(url, baseUrl).toString();
  } catch {
    return url;
  }
}

function removeTrackingParams(url: URL): URL {
  const next = new URL(url.toString());
  for (const key of Array.from(next.searchParams.keys())) {
    if (TRACKING_QUERY_PARAMS.has(key.toLowerCase())) {
      next.searchParams.delete(key);
    }
  }
  next.hash = '';
  return next;
}

export interface NaverBlogIdentity {
  blogId: string;
  logNo: string;
  canonicalUrl: string;
  rssUrl: string;
}

export function extractNaverBlogIdentity(
  url: string
): NaverBlogIdentity | null {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();
    const pathname = parsed.pathname;

    let blogId = '';
    let logNo = '';

    if (
      hostname === 'blog.naver.com' ||
      hostname === 'm.blog.naver.com'
    ) {
      if (pathname.toLowerCase().includes('postview.naver')) {
        blogId = parsed.searchParams.get('blogId') ?? '';
        logNo = parsed.searchParams.get('logNo') ?? '';
      } else {
        const segments = pathname.split('/').filter(Boolean);
        if (segments.length >= 2 && /^\d+$/.test(segments[1])) {
          [blogId, logNo] = [segments[0], segments[1]];
        }
      }
    }

    if (!blogId || !logNo) {
      return null;
    }

    return {
      blogId,
      logNo,
      canonicalUrl: `https://blog.naver.com/PostView.naver?blogId=${encodeURIComponent(blogId)}&logNo=${encodeURIComponent(logNo)}`,
      rssUrl: `https://rss.blog.naver.com/${encodeURIComponent(blogId)}.xml`,
    };
  } catch {
    return null;
  }
}

export function canonicalizeStudyholicDetailUrl(url: string): string {
  try {
    const parsed = new URL(url, 'https://www.studyholic.com/eduinfo/');
    const idx = parsed.searchParams.get('idx');
    if (!idx) {
      return removeTrackingParams(parsed).toString();
    }

    return `https://www.studyholic.com/eduinfo/KinderView.asp?idx=${encodeURIComponent(idx)}`;
  } catch {
    return url;
  }
}

export function canonicalizeKnownReviewUrl(url: string): string {
  const naverBlog = extractNaverBlogIdentity(url);
  if (naverBlog) {
    return naverBlog.canonicalUrl;
  }

  if (url.includes('studyholic.com') && url.includes('KinderView.asp')) {
    return canonicalizeStudyholicDetailUrl(url);
  }

  try {
    return removeTrackingParams(new URL(url)).toString();
  } catch {
    return url;
  }
}

export interface StudyholicListEntry {
  listIndex: number | null;
  kindergartenName: string;
  reviewTitle: string;
  canonicalUrl: string;
  sourceUrl: string;
  region: string;
  sigungu: string;
  category: string;
  rating: number | null;
  structuredFields: ReviewStructuredFields;
}

function parseStarRating(text: string): number | null {
  const stars = (text.match(/★/g) ?? []).length;
  return stars > 0 ? stars : null;
}

export function parseStudyholicListHtml(
  html: string,
  baseUrl = 'https://www.studyholic.com/eduinfo/KinderList.asp'
): StudyholicListEntry[] {
  const dom = new JSDOM(html);
  const { document } = dom.window;
  const rows = Array.from(document.querySelectorAll('tr'));
  const results = new Map<string, StudyholicListEntry>();

  for (const row of rows) {
    const link = row.querySelector<HTMLAnchorElement>('a[href*="KinderView.asp"]');
    if (!link) {
      continue;
    }

    const cells = Array.from(row.querySelectorAll('td'));
    if (cells.length < 6) {
      continue;
    }

    const sourceUrl = buildAbsoluteUrl(link.getAttribute('href') ?? '', baseUrl);
    const canonicalUrl = canonicalizeStudyholicDetailUrl(sourceUrl);
    const titleCellText = cleanupText(cells[4]?.textContent ?? '');
    const nameFromBracket = titleCellText.match(/\[([^\]]+)\]/)?.[1]?.trim();
    const kindergartenName =
      cleanupText(nameFromBracket ?? link.textContent ?? '') || '';
    const reviewTitle = cleanupText(titleCellText.replace(/\[[^\]]+\]/, ''));

    if (!kindergartenName || !reviewTitle) {
      continue;
    }

    const listIndexValue = cleanupText(cells[0]?.textContent ?? '');
    const listIndex =
      /^\d+$/.test(listIndexValue) ? Number.parseInt(listIndexValue, 10) : null;
    const region = cleanupText(cells[1]?.textContent ?? '');
    const sigungu = cleanupText(cells[2]?.textContent ?? '');
    const category = cleanupText(cells[3]?.textContent ?? '');
    const rating = parseStarRating(cleanupText(cells[5]?.textContent ?? ''));

    results.set(canonicalUrl, {
      listIndex,
      kindergartenName,
      reviewTitle,
      canonicalUrl,
      sourceUrl,
      region,
      sigungu,
      category,
      rating,
      structuredFields: {
        institutionName: kindergartenName,
        reviewTitle,
        region,
        sigungu,
        category,
        listIndex,
        rating,
        sourceUrl,
      },
    });
  }

  return Array.from(results.values());
}

export interface StudyholicDetailParseResult {
  isReviewPage: boolean;
  kindergartenName: string;
  reviewTitle: string;
  canonicalUrl?: string;
  region: string;
  location: string;
  publicFields: ReviewStructuredFields;
  loginRequiredFields: string[];
  rating: number | null;
  reviewTextAccessible: boolean;
  structuredFields: ReviewStructuredFields;
}

function parseLabelValueTable(document: Document): {
  publicFields: ReviewStructuredFields;
  loginRequiredFields: string[];
} {
  const publicFields: ReviewStructuredFields = {};
  const loginRequiredFields = new Set<string>();

  for (const row of Array.from(document.querySelectorAll('tr'))) {
    const cells = Array.from(row.querySelectorAll('td'));
    if (cells.length < 2) {
      continue;
    }

    for (let index = 0; index < cells.length - 1; index += 2) {
      const labelCell = cells[index];
      if (!labelCell.classList.contains('write_lttl')) {
        continue;
      }

      const label = cleanupText(labelCell.textContent ?? '');
      const valueCell = cells[index + 1];
      if (!label || !valueCell) {
        continue;
      }

      const valueText = cleanupText(valueCell.textContent ?? '');
      if (!valueText) {
        continue;
      }

      if (valueText.includes('후 열람가능')) {
        loginRequiredFields.add(label);
        continue;
      }

      publicFields[label] = valueText;
    }
  }

  return {
    publicFields,
    loginRequiredFields: Array.from(loginRequiredFields),
  };
}

export function parseStudyholicDetailHtml(
  html: string,
  sourceUrl?: string
): StudyholicDetailParseResult {
  const dom = new JSDOM(html);
  const { document } = dom.window;
  const title = cleanupText(document.querySelector('title')?.textContent ?? '');
  const titleMatch =
    title.match(/\[\s*(.+?)\s+리뷰\s*\]\s*(.+?)\s*-/) ??
    title.match(/\[\s*(.+?)\s+리뷰\s*\]\s*(.+)/);
  const kindergartenName = cleanupText(titleMatch?.[1] ?? '');
  const reviewTitle = cleanupText(titleMatch?.[2] ?? '');
  const { publicFields, loginRequiredFields } = parseLabelValueTable(document);
  const evaluationAreaText = cleanupText(document.body?.textContent ?? '');
  const rating = parseStarRating(String(publicFields['전체만족도'] ?? ''));
  const reviewTextAccessible =
    evaluationAreaText.includes('[평가글]') &&
    !evaluationAreaText.includes('무료로 열람가능');

  if (
    evaluationAreaText.includes('[평가글]') &&
    evaluationAreaText.includes('무료로 열람가능')
  ) {
    loginRequiredFields.push('평가글');
  }

  const region = String(publicFields['지역'] ?? '');
  const location = String(publicFields['위치'] ?? '');
  const canonicalUrl = sourceUrl
    ? canonicalizeStudyholicDetailUrl(sourceUrl)
    : undefined;

  return {
    isReviewPage:
      kindergartenName.length > 0 &&
      reviewTitle.length > 0 &&
      (rating !== null || Object.keys(publicFields).length > 0),
    kindergartenName,
    reviewTitle,
    canonicalUrl,
    region,
    location,
    publicFields,
    loginRequiredFields: Array.from(new Set(loginRequiredFields)),
    rating,
    reviewTextAccessible,
    structuredFields: {
      institutionName: kindergartenName,
      reviewTitle,
      region,
      location,
      rating,
      reviewTextAccessible,
      loginRequiredFields: Array.from(new Set(loginRequiredFields)),
      ...publicFields,
    },
  };
}

function extractBalancedJson(
  source: string,
  startIndex: number,
  openChar: '[' | '{',
  closeChar: ']' | '}'
): string | null {
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = startIndex; index < source.length; index += 1) {
    const character = source[index];
    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (character === '\\') {
        escaped = true;
        continue;
      }
      if (character === '"') {
        inString = false;
      }
      continue;
    }

    if (character === '"') {
      inString = true;
      continue;
    }

    if (character === openChar) {
      depth += 1;
    } else if (character === closeChar) {
      depth -= 1;
      if (depth === 0) {
        return source.slice(startIndex, index + 1);
      }
    }
  }

  return null;
}

export function extractNextHydrationPayloads(html: string): string[] {
  const dom = new JSDOM(html);
  const { document } = dom.window;
  const payloads: string[] = [];

  for (const script of Array.from(document.querySelectorAll('script'))) {
    const text = script.textContent ?? '';
    if (!text) {
      continue;
    }

    if (script.id === '__NEXT_DATA__') {
      payloads.push(text);
      continue;
    }

    if (text.includes('self.__next_f.push')) {
      payloads.push(
        text
          .replace(/\\"/g, '"')
          .replace(/\\n/g, '\n')
          .replace(/\\u003c/gi, '<')
          .replace(/\\u003e/gi, '>')
      );
    }
  }

  return payloads;
}

export interface LearnsLatestReview {
  id: string;
  rating: number | null;
  previewText: string;
  createdAt: string | null;
  userTypeLabel: string;
}

export function extractLearnsLatestReviews(html: string): LearnsLatestReview[] {
  const payloadText = extractNextHydrationPayloads(html).join('\n');
  const latestReviewsKeyIndex = payloadText.indexOf('"latestReviews":[');
  if (latestReviewsKeyIndex === -1) {
    return [];
  }

  const arrayStart = payloadText.indexOf('[', latestReviewsKeyIndex);
  if (arrayStart === -1) {
    return [];
  }

  const arrayText = extractBalancedJson(payloadText, arrayStart, '[', ']');
  if (!arrayText) {
    return [];
  }

  try {
    const parsed = JSON.parse(arrayText) as Array<Record<string, unknown>>;
    return parsed
      .filter((item) => typeof item.id === 'string')
      .map((item) => ({
        id: String(item.id),
        rating:
          typeof item.rating === 'number' ? item.rating : null,
        previewText: cleanupText(String(item.previewText ?? '')),
        createdAt:
          typeof item.createdAt === 'string' ? item.createdAt : null,
        userTypeLabel: cleanupText(
          String(
            (item.user as { typeLabel?: unknown } | null)?.typeLabel ?? ''
          )
        ),
      }))
      .filter((item) => item.previewText.length > 0);
  } catch {
    return [];
  }
}

export interface NaverBlogRssItem {
  title: string;
  canonicalUrl: string;
  date: string | null;
}

export function parseNaverBlogRss(xml: string): NaverBlogRssItem[] {
  try {
    const dom = new JSDOM(xml);
    const { document } = dom.window;
    return Array.from(document.querySelectorAll('item')).map((item) => {
      const link = cleanupText(item.querySelector('link')?.textContent ?? '');
      const title = cleanupText(item.querySelector('title')?.textContent ?? '');
      const pubDate = cleanupText(item.querySelector('pubDate')?.textContent ?? '');
      const canonicalUrl = canonicalizeKnownReviewUrl(link);
      const parsedDate = pubDate.length > 0 ? new Date(pubDate) : null;

      return {
        title,
        canonicalUrl,
        date:
          parsedDate && Number.isFinite(parsedDate.getTime())
            ? parsedDate.toISOString()
            : null,
      };
    });
  } catch {
    return [];
  }
}

export interface ReviewEvidenceBundleInput {
  canonicalUrl: string;
  rawText: string;
  structuredFields?: ReviewStructuredFields;
  sourcePageUrl?: string;
  screenshotPath?: string;
  extractedAt?: string;
}

export function buildReviewEvidenceBundle(
  input: ReviewEvidenceBundleInput
): ReviewEvidenceBundle {
  const canonicalUrl = canonicalizeKnownReviewUrl(input.canonicalUrl);
  const normalizedText = normalizeEvidenceText(input.rawText);
  const serializedStructuredFields = JSON.stringify(input.structuredFields ?? {});
  const htmlSnapshotHash = buildStableHash(
    `${canonicalUrl}|${normalizedText}|${serializedStructuredFields}`
  );

  return {
    canonicalUrl,
    normalizedUrl: canonicalizeKnownReviewUrl(canonicalUrl)
      .replace(/^https?:\/\//i, '')
      .replace(/\/$/, '')
      .toLowerCase(),
    normalizedText,
    htmlSnapshotHash,
    extractedAt: input.extractedAt ?? new Date().toISOString(),
    sourcePageUrl: input.sourcePageUrl,
    screenshotPath: input.screenshotPath,
    structuredFields: input.structuredFields,
  };
}

export interface SourceBindingEvidence {
  source: string | undefined;
  accessMode: ReviewAccessMode | undefined;
  evidenceType: ReviewEvidenceType | undefined;
  exactInstitutionMatch: boolean;
  boundInstitutionName: string;
  structuredFields: ReviewStructuredFields;
  hasReviewTitle: boolean;
  hasRating: boolean;
}

export function extractSourceBindingEvidence(
  review: Partial<{
    source: string;
    accessMode: ReviewAccessMode;
    evidenceType: ReviewEvidenceType;
    structuredFields: ReviewStructuredFields;
    rating: number | null;
  }>,
  kindergartenName: string
): SourceBindingEvidence {
  const structuredFields = review.structuredFields ?? {};
  const boundInstitutionName = cleanupText(
    String(
      structuredFields.institutionName ??
        structuredFields.boundInstitutionName ??
        ''
    )
  );
  const exactInstitutionMatch =
    boundInstitutionName.length > 0 &&
    normalizeEvidenceText(boundInstitutionName) ===
      normalizeEvidenceText(kindergartenName);
  const reviewTitle = cleanupText(
    String(structuredFields.reviewTitle ?? structuredFields.title ?? '')
  );
  const rating =
    typeof review.rating === 'number'
      ? review.rating
      : typeof structuredFields.rating === 'number'
        ? structuredFields.rating
        : null;

  return {
    source: review.source,
    accessMode: review.accessMode,
    evidenceType: review.evidenceType,
    exactInstitutionMatch,
    boundInstitutionName,
    structuredFields,
    hasReviewTitle: reviewTitle.length > 0,
    hasRating: rating !== null,
  };
}

import { JSDOM } from 'jsdom';

const PREFERRED_CONTENT_SELECTORS = [
  '.se-main-container',
  '#postViewArea',
  '.ArticleContentBox',
  '#tbody',
  '.post-view',
  '.ContentRenderer',
  '.post_ct',
];

const FALLBACK_TEXT_SELECTORS = [
  '.se-text-paragraph',
  '.se-module-text',
  '.ContentRenderer p',
  '.ArticleContentBox p',
  '#postViewArea p',
  'article p',
  'article li',
  'p',
  'li',
];

function cleanupText(text: string): string {
  return text
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function collectTextFromSelectors(
  document: Document,
  selectors: string[]
): string {
  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (!element) {
      continue;
    }

    const text = cleanupText(element.textContent ?? '');
    if (text.length > 0) {
      return text;
    }
  }

  return '';
}

function collectFallbackText(document: Document): string {
  const chunks = FALLBACK_TEXT_SELECTORS.flatMap((selector) =>
    Array.from(document.querySelectorAll(selector))
      .map((element) => cleanupText(element.textContent ?? ''))
      .filter((text) => text.length > 0)
  );

  return cleanupText(chunks.join(' '));
}

export function extractReadableTextFromHtml(html: string): string {
  try {
    const dom = new JSDOM(html);
    const { document } = dom.window;

    document
      .querySelectorAll('script, style, iframe, noscript, svg')
      .forEach((element) => element.remove());

    const preferredText = collectTextFromSelectors(
      document,
      PREFERRED_CONTENT_SELECTORS
    );
    if (preferredText.length > 0) {
      return preferredText;
    }

    const fallbackText = collectFallbackText(document);
    if (fallbackText.length > 0) {
      return fallbackText;
    }

    return cleanupText(document.body?.textContent ?? '');
  } catch {
    return cleanupText(html.replace(/<[^>]+>/g, ' '));
  }
}

export function buildTextExcerpt(text: string, maxLength = 400): string {
  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength).trim()}...`;
}

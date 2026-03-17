import { chromium, type Page, type Route } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { extractReadableTextFromHtml } from '../src/lib/utils/review-html';
import {
  ensureDirectory,
  readJsonFile,
  writeJsonFile,
} from './lib/review-verification-pipeline';

/**
 * Batch Content Scraper
 *
 * Legacy mode:
 *   pnpm scrape:batch -- --sido 11
 *   pnpm scrape:batch -- --sido 11 --limit 10
 *
 * Review verification mode:
 *   pnpm scrape:batch -- --input scripts/data-output/review-body-check-11-41.json
 *   pnpm scrape:batch -- --input scripts/data-output/review-body-check-11-41.json --output scripts/data-output/review-body-scrape-11-41.json
 */

interface LegacyReviewUrl {
  kindergartenId: string;
  url: string;
  source: 'naver_blog' | 'naver_cafe' | 'google' | 'other';
}

interface BodyCheckItem {
  reviewId: string;
  kindergartenId: string;
  kindergartenName: string;
  url: string;
  title: string;
  snippet: string;
  whyFlagged: string[];
  source: string;
  sidoCode: string;
}

interface BodyCheckManifest {
  items: BodyCheckItem[];
}

interface ScrapeHtmlResult {
  url: string;
  html: string;
  scrapedAt: string;
  status: 'success' | 'fail';
  error?: string;
}

interface VerificationScrapeResult {
  reviewId: string;
  kindergartenId: string;
  kindergartenName: string;
  url: string;
  status: 'success' | 'fail';
  bodyText: string;
  textLength: number;
  scrapedAt: string;
  error?: string;
}

function writeLine(message: string): void {
  process.stdout.write(`${message}\n`);
}

function writeError(message: string): void {
  process.stderr.write(`${message}\n`);
}

function parseInteger(
  args: string[],
  flag: string,
  defaultValue: number
): number {
  const index = args.indexOf(flag);
  if (index === -1 || !args[index + 1]) {
    return defaultValue;
  }

  return Number.parseInt(args[index + 1], 10);
}

async function scrapeUrl(page: Page, url: string): Promise<ScrapeHtmlResult> {
  try {
    await page.route('**/*', (route: Route) => {
      const resourceType = route.request().resourceType();
      if (['image', 'media', 'font', 'stylesheet'].includes(resourceType)) {
        void route.abort();
        return;
      }

      void route.continue();
    });

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 10000 });

    let html = '';
    if (url.includes('blog.naver.com') || url.includes('cafe.naver.com')) {
      const frameElement = await page.$('iframe#mainFrame');
      if (frameElement) {
        const frame = await frameElement.contentFrame();
        if (frame) {
          await frame.waitForSelector('body', { timeout: 5000 }).catch(() => {});
          html = await frame.content();
        }
      }
    }

    if (html.length === 0) {
      html = await page.content();
    }

    return {
      url,
      html,
      scrapedAt: new Date().toISOString(),
      status: 'success',
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      url,
      html: '',
      scrapedAt: new Date().toISOString(),
      status: 'fail',
      error: message,
    };
  }
}

async function runVerificationMode(
  inputPath: string,
  outputPath: string,
  concurrency: number,
  limit: number
): Promise<void> {
  const manifest = readJsonFile<BodyCheckManifest>(inputPath);
  const targets = limit > 0 ? manifest.items.slice(0, limit) : manifest.items;

  if (targets.length === 0) {
    writeError(`No body-check items found in ${inputPath}`);
    process.exit(1);
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const results: VerificationScrapeResult[] = [];

  for (let index = 0; index < targets.length; index += concurrency) {
    const batch = targets.slice(index, index + concurrency);
    const batchResults = await Promise.all(
      batch.map(async (target) => {
        const page = await context.newPage();
        const htmlResult = await scrapeUrl(page, target.url);
        await page.close();

        const bodyText =
          htmlResult.status === 'success'
            ? extractReadableTextFromHtml(htmlResult.html)
            : '';

        return {
          reviewId: target.reviewId,
          kindergartenId: target.kindergartenId,
          kindergartenName: target.kindergartenName,
          url: target.url,
          status: htmlResult.status,
          bodyText,
          textLength: bodyText.length,
          scrapedAt: htmlResult.scrapedAt,
          error: htmlResult.error,
        } satisfies VerificationScrapeResult;
      })
    );

    results.push(...batchResults);
    writeLine(
      `[verification] ${Math.min(index + batch.length, targets.length)}/${targets.length}`
    );
  }

  await browser.close();

  writeJsonFile(outputPath, {
    generatedAt: new Date().toISOString(),
    inputPath,
    totalCount: results.length,
    successCount: results.filter((item) => item.status === 'success').length,
    failCount: results.filter((item) => item.status === 'fail').length,
    items: results,
  });

  writeLine(`verification scrape: ${outputPath}`);
}

async function runLegacyMode(
  sido: string,
  concurrency: number,
  limit: number
): Promise<void> {
  const inputPath = path.resolve(
    `scripts/data-output/reviews-urls-raw/reviews-urls-${sido}.json`
  );

  if (!fs.existsSync(inputPath)) {
    writeError(`Input file not found: ${inputPath}`);
    return;
  }

  const urls = readJsonFile<LegacyReviewUrl[]>(inputPath);
  const targets = limit > 0 ? urls.slice(0, limit) : urls;
  const outputDir = path.resolve(`scripts/data-output/reviews-content-raw/${sido}`);
  ensureDirectory(outputDir);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const results: Array<Omit<ScrapeHtmlResult, 'html'>> = [];

  for (let index = 0; index < targets.length; index += concurrency) {
    const batch = targets.slice(index, index + concurrency);
    const batchResults = await Promise.all(
      batch.map(async (target) => {
        const page = await context.newPage();
        const result = await scrapeUrl(page, target.url);
        await page.close();
        return result;
      })
    );

    for (const result of batchResults) {
      if (result.status === 'success') {
        const filename = `${Buffer.from(result.url)
          .toString('base64')
          .slice(0, 50)}.html`;
        fs.writeFileSync(path.join(outputDir, filename), result.html);
      }

      results.push({
        url: result.url,
        scrapedAt: result.scrapedAt,
        status: result.status,
        error: result.error,
      });
    }

    writeLine(`[legacy:${sido}] ${Math.min(index + batch.length, targets.length)}/${targets.length}`);
  }

  await browser.close();

  writeJsonFile(
    path.resolve(`scripts/data-output/reviews-content-raw/scrape-manifest-${sido}.json`),
    results
  );

  writeLine(`[legacy:${sido}] done`);
}

function buildVerificationOutputPath(inputPath: string): string {
  const fileName = path.basename(inputPath).replace('body-check', 'body-scrape');
  return path.resolve('scripts/data-output', fileName);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const inputIndex = args.indexOf('--input');
  const outputIndex = args.indexOf('--output');
  const sidoIndex = args.indexOf('--sido');
  const concurrency = parseInteger(args, '--concurrency', 5);
  const limit = parseInteger(args, '--limit', 0);

  if (inputIndex !== -1 && args[inputIndex + 1]) {
    const inputPath = path.resolve(args[inputIndex + 1]);
    const outputPath =
      outputIndex !== -1 && args[outputIndex + 1]
        ? path.resolve(args[outputIndex + 1])
        : buildVerificationOutputPath(inputPath);

    await runVerificationMode(inputPath, outputPath, concurrency, limit);
    return;
  }

  let sidosToProcess: string[] = [];
  if (sidoIndex !== -1 && args[sidoIndex + 1]) {
    sidosToProcess = [args[sidoIndex + 1]];
  } else {
    const inputDir = path.resolve('scripts/data-output/reviews-urls-raw');
    if (!fs.existsSync(inputDir)) {
      writeError('No input directory found. Run extraction first.');
      process.exit(1);
    }

    sidosToProcess = fs
      .readdirSync(inputDir)
      .filter(
        (fileName) =>
          fileName.startsWith('reviews-urls-') && fileName.endsWith('.json')
      )
      .map((fileName) =>
        fileName.replace('reviews-urls-', '').replace('.json', '')
      );
  }

  for (const sido of sidosToProcess) {
    await runLegacyMode(sido, concurrency, limit);
  }
}

void main();

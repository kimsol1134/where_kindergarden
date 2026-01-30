import { chromium, Browser, Page, Route } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Batch Content Scraper
 * 
 * Scrapes content from review URLs using Headless Playwright.
 * optimized for Naver Blog/Cafe iframe handling.
 * 
 * Usage:
 *   pnpm scrape:batch -- --sido 11
 *   pnpm scrape:batch -- --sido 11 --limit 10
 *   pnpm scrape:batch -- --concurrency 10
 */

interface ReviewUrl {
  kindergartenId: string;
  url: string;
  source: 'naver_blog' | 'naver_cafe';
}

interface ScrapedContent {
  url: string;
  content: string;
  scrapedAt: string;
  status: 'success' | 'fail';
  error?: string;
}

async function scrapeUrl(page: Page, url: string): Promise<ScrapedContent> {
  try {
    // Block resource intensive types
    await page.route('**/*', (route: Route) => {
      const type = route.request().resourceType();
      if (['image', 'media', 'font', 'stylesheet'].includes(type)) {
        route.abort();
      } else {
        route.continue();
      }
    });

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 10000 });

    let content = '';

    // Handle Naver Blog/Cafe Iframes
    if (url.includes('blog.naver.com') || url.includes('cafe.naver.com')) {
      const frameElement = await page.$('iframe#mainFrame');
      if (frameElement) {
        const frame = await frameElement.contentFrame();
        if (frame) {
          // Wait for some content in frame
          await frame.waitForSelector('body', { timeout: 5000 }).catch(() => {});
          content = await frame.content();
        }
      } else {
        // Fallback or mobile view
        content = await page.content();
      }
    } else {
      content = await page.content();
    }

    return {
      url,
      content,
      scrapedAt: new Date().toISOString(),
      status: 'success'
    };

  } catch (err: any) {
    return {
      url,
      content: '',
      scrapedAt: new Date().toISOString(),
      status: 'fail',
      error: err.message
    };
  }
}

async function processSido(sido: string, concurrency: number, limit: number) {
  // Input Path
  const inputPath = path.resolve(`scripts/data-output/reviews-urls-raw/reviews-urls-${sido}.json`);
  if (!fs.existsSync(inputPath)) {
    console.error(`Input file not found: ${inputPath}`);
    return;
  }

  const urls: ReviewUrl[] = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));
  const targets = limit > 0 ? urls.slice(0, limit) : urls;

  console.log(`\n=== Batch Scraper [${sido}] ===`);
  console.log(`Target: ${targets.length} URLs`);
  console.log(`Concurrency: ${concurrency}`);

  // Output setup
  const outputDir = path.resolve(`scripts/data-output/reviews-content-raw/${sido}`);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Launch Browser
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();

  const results: ScrapedContent[] = [];
  let processed = 0;

  // Parallel Processing with manual chunking
  for (let i = 0; i < targets.length; i += concurrency) {
    const batch = targets.slice(i, i + concurrency);
    console.log(`  [${sido}] Batch ${Math.floor(i / concurrency) + 1}/${Math.ceil(targets.length / concurrency)}...`);

    const promises = batch.map(async (item) => {
      const page = await context.newPage();
      const result = await scrapeUrl(page, item.url);
      await page.close();
      return result;
    });

    const batchResults = await Promise.all(promises);
    
    // Save individually or in chunks to avoid memory issues
    for (const res of batchResults) {
      if (res.status === 'success') {
        // Filename safe encoding
        const filename = `${Buffer.from(res.url).toString('base64').slice(0, 50)}.html`;
        fs.writeFileSync(path.join(outputDir, filename), res.content);
      }
      results.push(res);
    }
    
    processed += batch.length;
  }

  await browser.close();

  // Save manifest of results
  fs.writeFileSync(
    path.resolve(`scripts/data-output/reviews-content-raw/scrape-manifest-${sido}.json`),
    JSON.stringify(results.map(r => ({ ...r, content: undefined })), null, 2)
  );

  console.log(`  [${sido}] Done. Scraped ${processed} pages.`);
}

async function main() {
  const args = process.argv.slice(2);
  const sidoIdx = args.indexOf('--sido');
  const userSido = sidoIdx !== -1 ? args[sidoIdx + 1] : null;

  const concurrencyIdx = args.indexOf('--concurrency');
  const CONCURRENCY = concurrencyIdx !== -1 ? parseInt(args[concurrencyIdx + 1]) : 5;

  const limitIdx = args.indexOf('--limit');
  const LIMIT = limitIdx !== -1 ? parseInt(args[limitIdx + 1]) : 0;

  let sidosToProcess: string[] = [];

  if (userSido) {
    sidosToProcess = [userSido];
  } else {
    // Auto-discover all sidos from input directory
    const inputDir = path.resolve('scripts/data-output/reviews-urls-raw');
    if (fs.existsSync(inputDir)) {
      const files = fs.readdirSync(inputDir).filter(f => f.startsWith('reviews-urls-') && f.endsWith('.json'));
      sidosToProcess = files.map(f => f.replace('reviews-urls-', '').replace('.json', ''));
      console.log(`Auto-discovered ${sidosToProcess.length} Sidos to process.`);
    } else {
      console.error('No input directory found. Run extraction first.');
      process.exit(1);
    }
  }

  for (const sido of sidosToProcess) {
    await processSido(sido, CONCURRENCY, LIMIT);
  }
}

main().catch(console.error);

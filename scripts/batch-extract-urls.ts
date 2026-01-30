/**
 * Nationwide Kindergarten Review URL Extractor
 *
 * Scans all kindergartens in Korea (or specific Sido) to find review URLs via Naver Search API.
 * Optimized for high throughput with concurrent processing.
 *
 * Usage:
 *   pnpm extract:all                   # Process all Sido codes sequentially
 *   pnpm extract:all -- --sido 11      # Process Seoul only
 *   pnpm extract:all -- --concurrency 50 # Set batch size (default: 20)
 *
 * Output:
 *   scripts/data-output/reviews-urls-raw/reviews-urls-{sido}.json
 */

import { config } from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { 
  stripHtml, 
  formatNaverDate, 
  extractRegionName, 
  calculateRelevanceScoreV2,
  isSpamTitle,
} from '../src/lib/utils/review-utils';

config({ path: '.env.local' });
config();

// ============================================================================
// Types
// ============================================================================

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
  total: number;
}

interface RawReviewLink {
  kindergartenId: string;
  kindergartenName: string;
  title: string;
  url: string;
  source: 'naver_blog' | 'naver_cafe';
  sourceName: string;
  snippet: string;
  date: string | null;
  collectedAt: string;
  relevanceScore: number;
}

// ============================================================================
// Constants & Utils
// ============================================================================

const SIDO_NAMES: Record<string, string> = {
  '11': '서울', '26': '부산', '27': '대구', '28': '인천', '29': '광주',
  '30': '대전', '31': '울산', '36': '세종', '41': '경기', '42': '강원',
  '43': '충북', '44': '충남', '45': '전북', '46': '전남', '47': '경북',
  '48': '경남', '50': '제주',
};

// Rate limiting and concurrency
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================================================
// API Functions
// ============================================================================

async function searchNaver(
  endpoint: 'blog' | 'cafearticle',
  query: string,
  display: number,
  sort: 'date' | 'sim'
): Promise<NaverSearchItem[]> {
  const clientId = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;

  if (!clientId || !clientSecret) return [];

  const url = new URL(`https://openapi.naver.com/v1/search/${endpoint}.json`);
  url.searchParams.set('query', query);
  url.searchParams.set('display', String(display));
  url.searchParams.set('sort', sort);

  try {
    const response = await fetch(url.toString(), {
      headers: {
        'X-Naver-Client-Id': clientId,
        'X-Naver-Client-Secret': clientSecret,
      },
    });

    if (!response.ok) {
      if (response.status === 429) {
        console.warn('  [RATE LIMIT] API Query quota exceeded.');
      }
      return [];
    }

    const data: NaverSearchResponse = await response.json();
    return data.items ?? [];
  } catch (error) {
    console.warn(`  [ERROR] API request failed: ${error}`);
    return [];
  }
}

// ============================================================================
// Logic
// ============================================================================

async function processKindergarten(
  k: KindergartenEntry, 
  maxPerQuery: number = 3
): Promise<RawReviewLink[]> {
  const regionName = extractRegionName(k.address);
  const collectedAt = new Date().toISOString();
  const results: RawReviewLink[] = [];
  const seenUrls = new Set<string>();

  // Queries derived from collect-reviews.ts experience
  const queries = [
    { t: 'blog', q: `"${k.name}" ${regionName} 후기`, sort: 'sim' }, // Core
    { t: 'blog', q: `"${k.name}" 다녀보니`, sort: 'sim' },         // Experience
    { t: 'blog', q: `"${k.name}" 입학설명회`, sort: 'date' },      // Recent info
    { t: 'cafearticle', q: `"${k.name}" ${regionName} 후기`, sort: 'sim' } // Cafe
  ];

  for (const { t, q, sort } of queries) {
    // Increased delay to avoid 429 errors (Naver API limits)
    await delay(400 + Math.random() * 500);
    
    const items = await searchNaver(
      t as 'blog' | 'cafearticle', 
      q, 
      maxPerQuery, 
      sort as 'date' | 'sim'
    );

    for (const item of items) {
      if (seenUrls.has(item.link)) continue;

      const title = stripHtml(item.title);
      // Skip obvious spam
      if (isSpamTitle(title)) continue;

      const snippet = stripHtml(item.description);
      const relevance = calculateRelevanceScoreV2(title, snippet, k.name, regionName);

      // Filtering threshold (keep minimal relevant 1+)
      if (relevance.score < 1) continue;
      
      seenUrls.add(item.link);
      results.push({
        kindergartenId: k.kindercode,
        kindergartenName: k.name,
        title,
        url: item.link,
        source: t === 'blog' ? 'naver_blog' : 'naver_cafe',
        sourceName: t === 'blog' ? item.bloggername ?? '' : item.cafename ?? '',
        snippet,
        date: formatNaverDate(item.postdate),
        collectedAt,
        relevanceScore: relevance.score,
      });
    }
  }

  // Deduplicate and Sort by score
  return results.sort((a, b) => b.relevanceScore - a.relevanceScore);
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  const sidoArgIndex = args.indexOf('--sido');
  const targetSido = sidoArgIndex !== -1 ? args[sidoArgIndex + 1] : null;

  const concurrencyIndex = args.indexOf('--concurrency');
  const BATCH_SIZE = concurrencyIndex !== -1 ? parseInt(args[concurrencyIndex + 1]) : 20;

  const limitIndex = args.indexOf('--limit');
  const maxLimit = limitIndex !== -1 ? parseInt(args[limitIndex + 1]) : 0;

  // Load Kindergartens
  const dataPath = path.resolve('public/data/kindergartens.json');
  if (!fs.existsSync(dataPath)) {
    console.error('Data file not found:', dataPath);
    process.exit(1);
  }
  const allKindergartens: KindergartenEntry[] = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

  // Determine Sido list to process
  const sidosToProcess = targetSido 
    ? [targetSido] 
    : Object.keys(SIDO_NAMES).sort();

  console.log(`=== Review URL Extraction ===`);
  console.log(`Target Sidos: ${sidosToProcess.map(s => SIDO_NAMES[s]).join(', ')}`);
  console.log(`Concurrency: ${BATCH_SIZE}`);
  if (maxLimit > 0) console.log(`Limit: ${maxLimit} items per Sido`);
  console.log(`Total Kindergartens available: ${allKindergartens.length}`);

  const OUTPUT_DIR = path.resolve('scripts/data-output/reviews-urls-raw');
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  for (const sido of sidosToProcess) {
    let targets = allKindergartens.filter(k => k.sido_code === sido);
    if (targets.length === 0) continue;

    if (maxLimit > 0) {
      targets = targets.slice(0, maxLimit);
    }

    console.log(`\nProcessing [${SIDO_NAMES[sido]}] - ${targets.length} kindergartens...`);
    const sidoResults: RawReviewLink[] = [];
    
    // Process in batches
    for (let i = 0; i < targets.length; i += BATCH_SIZE) {
      const batch = targets.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(targets.length / BATCH_SIZE);
      
      process.stdout.write(`  Batch ${batchNum}/${totalBatches} (${batch.length} items)... `);
      
      const promises = batch.map(k => processKindergarten(k).catch(err => {
        console.error(`Error processing ${k.name}:`, err);
        return [];
      }));

      const results = await Promise.all(promises);
      const flatResults = results.flat();
      sidoResults.push(...flatResults);
      
      console.log(`Found ${flatResults.length} urls.`);
      
      // Delay between batches to be nice to API
      await delay(500);
    }

    // Save Sido results
    const outFile = path.join(OUTPUT_DIR, `reviews-urls-${sido}.json`);
    fs.writeFileSync(outFile, JSON.stringify(sidoResults, null, 2));
    console.log(`> Saved ${sidoResults.length} URLs to ${outFile}`);
  }

  console.log('\nAll done.');
}

main().catch(err => console.error(err));

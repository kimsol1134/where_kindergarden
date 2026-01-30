import * as fs from 'fs';
import * as path from 'path';
import { config } from 'dotenv';
import { stripHtml } from '../src/lib/utils/review-utils';

config({ path: '.env.local' });
config();

/**
 * Batch Enrichment Script
 * 
 * Processes raw scraped content and uses LLM to generate summaries and tags.
 * 
 * Usage:
 *   pnpm enrich:all -- --sido 11
 *   pnpm enrich:all -- --input scripts/data-output/reviews-content-raw/11
 */

interface ScrapedContent {
  url: string;
  content: string;
  scrapedAt: string;
}

interface EnrichedReview {
  url: string;
  summary: string;
  pros: string[];
  cons: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
  tags: string[];
}

const SYSTEM_PROMPT = `
You are an expert at analyzing kindergarten reviews.
Analyze the provided text (which may be HTML) and extract:
1. A concise 1-2 sentence summary.
2. Key pros (up to 3).
3. Key cons (up to 3).
4. Overall sentiment (positive, neutral, negative).
5. Tags (e.g., "Food", "Playground", "Teachers").

Output ONLY valid JSON:
{
  "summary": "...",
  "pros": ["..."],
  "cons": ["..."],
  "sentiment": "...",
  "tags": ["..."]
}
`;

import { JSDOM } from 'jsdom';

// Robust extraction using JSDOM to handle Naver's nested structures
function extractTextContent(html: string): string {
  try {
    const dom = new JSDOM(html);
    const doc = dom.window.document;

    // Remove scripts and styles first
    doc.querySelectorAll('script, style, iframe, noscript').forEach(el => el.remove());

    // Strategy 1: Modern Naver Blog/Cafe Containers
    let mainContent = doc.querySelector('.se-main-container');
    
    // Strategy 2: Legacy Naver Blog (postViewArea)
    if (!mainContent) mainContent = doc.querySelector('#postViewArea');
    
    // Strategy 3: Naver Cafe (ArticleContentBox)
    if (!mainContent) mainContent = doc.querySelector('.ArticleContentBox');
    
    // Strategy 4: Naver Cafe Legacy (tbody) - risky but common in old layouts
    if (!mainContent) mainContent = doc.querySelector('#tbody');

    let text = "";
    if (mainContent) {
      text = mainContent.textContent || "";
    } else {
      // Fallback: finding all paragraph-like elements if no main container found
      const paragraphs = Array.from(doc.querySelectorAll('.se-text-paragraph, p, div[id^="post-view"]'));
      text = paragraphs.map(p => p.textContent).join('\n');
    }

    // Cleaning: collapse whitespace, remove zero-width spaces
    return text
      .replace(/[\u200B-\u200D\uFEFF]/g, '') // Remove zero width chars
      .replace(/\s+/g, ' ')
      .trim();
  } catch (error) {
    console.error("Error parsing HTML with JSDOM:", error);
    return "";
  }
}

// Heuristic function to extract meaningful content from Naver Blog/Cafe HTML
function fallbackSummarize(content: string): Omit<EnrichedReview, 'url'> | null {
  const cleanText = extractTextContent(content);

  // Blacklist filtering
  const BLACKLIST_KEYWORDS = ['탄핵', '윤석열', '정치', '대통령', '시위', '광화문', '집회', '파업', '매매', '투자', '비트코인', '주식', '카지노', '도박'];
  if (BLACKLIST_KEYWORDS.some(keyword => cleanText.includes(keyword))) {
    return null;
  }

  // 4. Heuristic Extraction
  const summary = cleanText.substring(0, 300) + (cleanText.length > 300 ? '...' : '');
  
  // Attempt to extract tags based on keywords
  const tags: string[] = [];
  if (/급식|식단|밥|반찬/.test(cleanText)) tags.push('급식');
  if (/선생님|담임|교사/.test(cleanText)) tags.push('선생님');
  if (/차량|버스|등원/.test(cleanText)) tags.push('등하원');
  if (/활동|체험|견학|놀이/.test(cleanText)) tags.push('활동');
  if (/영어|방과후|특기/.test(cleanText)) tags.push('교육프로그램');

  // Attempt to extract sentiment (very basic)
  let sentiment: 'positive' | 'neutral' | 'negative' = 'neutral';
  const posTerms = /좋아요|만족|추천|친절|감사|행복|즐거|최고/;
  const negTerms = /별로|실망|불친절|힘들|걱정|아쉬|최악/;
  
  if (posTerms.test(cleanText) && !negTerms.test(cleanText)) sentiment = 'positive';
  if (negTerms.test(cleanText) && !posTerms.test(cleanText)) sentiment = 'negative';

  // If text is too short, mark as invalid/empty
  const finalSummary = cleanText.length < 20 ? "내용을 추출할 수 없습니다 (본문 없음)." : summary;

  return {
    summary: finalSummary,
    pros: [],
    cons: [],
    sentiment,
    tags
  };
}

async function callLLM(content: string): Promise<Omit<EnrichedReview, 'url'> | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  
  // Fallback mode if no key provided (User requested "API key not needed")
  if (!apiKey) {
    console.warn('  [WARN] OPENAI_API_KEY not found. Using fallback summarization.');
    return fallbackSummarize(content);
  }

  // Truncate to avoid context limits (approx 10k chars)
  const text = extractTextContent(content).slice(0, 10000);

  // Blacklist filtering
  const BLACKLIST_KEYWORDS = ['탄핵', '윤석열', '정치', '대통령', '시위', '광화문', '집회', '파업', '비트코인', '주식', '카지노', '도박'];
  if (BLACKLIST_KEYWORDS.some(keyword => text.includes(keyword))) {
    console.log('Skipping review due to blacklisted keyword.');
    return null;
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: text }
        ],
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    const data = await response.json();
    const result = JSON.parse(data.choices[0].message.content);
    return result as Omit<EnrichedReview, 'url'>; // Cast to ensure type safety

  } catch (error) {
    console.error('LLM Call failed:', error);
    return null;
  }
}

async function processSido(sido: string) {
  const inputDir = path.resolve(`scripts/data-output/reviews-content-raw/${sido}`);
  
  if (!fs.existsSync(inputDir)) {
    console.error(`Input directory not found for Sido ${sido}: ${inputDir}`);
    return;
  }

  const files = fs.readdirSync(inputDir).filter(f => f.endsWith('.html'));
  console.log(`\n=== Batch Enrichment [${sido}] ===`);
  console.log(`Found ${files.length} files`);

  const outputDir = path.resolve(`scripts/data-output/reviews-enriched/${sido}`);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const results: EnrichedReview[] = [];

  // Sequential processing
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    // Check if already processed
    const outPath = path.join(outputDir, file.replace('.html', '.json'));
    if (fs.existsSync(outPath)) {
      continue;
    }

    if (i % 10 === 0) process.stdout.write('.');

    const content = fs.readFileSync(path.join(inputDir, file), 'utf-8');
    const enriched = await callLLM(content);
    
    if (enriched) {
      const result = {
        url: file, 
        ...enriched
      };
      results.push(result);
      
      // Save individual file to avoid data loss
      fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
    }

    // Rate limit
    await new Promise(resolve => setTimeout(resolve, 100)); // Faster for fallback
  }
  console.log(`\n[${sido}] Processed ${results.length} new items.`);
}

async function main() {
  const args = process.argv.slice(2);
  const inputIdx = args.indexOf('--input');
  const sidoIdx = args.indexOf('--sido');
  const userSido = sidoIdx !== -1 ? args[sidoIdx + 1] : null;

  // Single file/dir mode (legacy support)
  if (inputIdx !== -1) {
    // ... Not implemented for this batch scope, recommending usage of auto-discovery
    console.warn('Direct input path not fully supported in batch mode. Use --sido or auto-discovery.');
  }

  let sidosToProcess: string[] = [];

  if (userSido) {
    sidosToProcess = [userSido];
  } else {
    // Auto-discover
    const baseDir = path.resolve('scripts/data-output/reviews-content-raw');
    if (fs.existsSync(baseDir)) {
      const dirs = fs.readdirSync(baseDir).filter(f => {
        return fs.statSync(path.join(baseDir, f)).isDirectory();
      });
      sidosToProcess = dirs;
      console.log(`Auto-discovered ${sidosToProcess.length} Sidos to enrich.`);
    }
  }

  for (const sido of sidosToProcess) {
    await processSido(sido);
  }
}

main().catch(console.error);

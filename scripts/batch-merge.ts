
import * as fs from 'fs';
import * as path from 'path';
import { config } from 'dotenv';
import { Buffer } from 'buffer';

config();

/**
 * Batch Merge Script
 * 
 * Aggregates enriched reviews and merges them into the final
 * public/data/reviews/{sido}/{gungu}.json structure.
 * 
 * Usage:
 *   pnpm tsx scripts/batch-merge.ts
 */

// ============================================================================
// Types
// ============================================================================

interface KindergartenEntry {
    kindercode: string;
    name: string;
    sido_code: string;
    sigungu_code: string;
    address: string;
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

interface EnrichedReviewData {
    url: string; // The filename/url from enrichment (might be filename)
    summary: string;
    pros: string[];
    cons: string[];
    sentiment: 'positive' | 'neutral' | 'negative';
    tags: string[];
}

interface FinalReview extends RawReviewLink {
    id: string; // generated ID
    summary: string;
    pros: string[];
    cons: string[];
    sentiment: 'positive' | 'neutral' | 'negative';
    tags: string[];
    filterReasons?: string[];
}

interface RegionReviewFile {
    version: string;
    totalCount: number;
    kindergartenCount: number;
    reviews: Record<string, FinalReview[]>;
}

// ============================================================================
// Helpers
// ============================================================================

function generateReviewId(): string {
    return 'rev-' + Math.random().toString(36).substring(2, 6) + '-' + Math.random().toString(36).substring(2, 6);
}

function getEnrichedFilename(url: string): string {
    return `${Buffer.from(url).toString('base64').slice(0, 50)}.json`;
}

// ============================================================================
// Main
// ============================================================================

async function main() {
    console.log('=== Starting Batch Merge ===');

    // 1. Load Kindergarten Data
    const kPath = path.resolve('public/data/kindergartens.json');
    if (!fs.existsSync(kPath)) {
        console.error('Kindergarten data not found at public/data/kindergartens.json');
        process.exit(1);
    }
    const kindergartens: KindergartenEntry[] = JSON.parse(fs.readFileSync(kPath, 'utf-8'));
    const kinderMap = new Map<string, KindergartenEntry>();
    kindergartens.forEach(k => kinderMap.set(k.kindercode, k));
    console.log(`Loaded ${kindergartens.length} kindergartens.`);

    // 2. Setup Paths
    const ENRICHED_DIR = path.resolve('scripts/data-output/reviews-enriched');
    const URLS_DIR = path.resolve('scripts/data-output/reviews-urls-raw');
    const OUTPUT_BASE = path.resolve('public/data/reviews');

    if (!fs.existsSync(ENRICHED_DIR)) {
        console.error(`Enriched directory not found: ${ENRICHED_DIR}`);
        return;
    }

    // 3. Process each Sido identified in reviews-enriched
    const sidos = fs.readdirSync(ENRICHED_DIR).filter(f => fs.statSync(path.join(ENRICHED_DIR, f)).isDirectory());

    for (const sido of sidos) {
        console.log(`\nProcessing Sido [${sido}]...`);
        
        // Load URL Mapping for this Sido
        const urlMapFile = path.join(URLS_DIR, `reviews-urls-${sido}.json`);
        if (!fs.existsSync(urlMapFile)) {
            console.warn(`  [WARN] No URL mapping file found for Sido ${sido}. Skipping.`);
            continue;
        }

        const rawLinks: RawReviewLink[] = JSON.parse(fs.readFileSync(urlMapFile, 'utf-8'));
        console.log(`  Loaded ${rawLinks.length} raw links.`);

        // Group Enriched Reviews by Gungu -> KindergartenId
        const batchUpdates = new Map<string, Map<string, FinalReview[]>>(); // Gungu -> (KinderId -> Reviews[])

        let processedCount = 0;
        let skippedCount = 0;

        for (const link of rawLinks) {
            // Find corresponding Enriched File
            const enrichedFilename = getEnrichedFilename(link.url);
            const enrichedFilePath = path.join(ENRICHED_DIR, sido, enrichedFilename);

            if (fs.existsSync(enrichedFilePath)) {
                // Read Enriched Data
                const enrichedData: EnrichedReviewData = JSON.parse(fs.readFileSync(enrichedFilePath, 'utf-8'));
                
                // Get Kindergarten Info
                const kinder = kinderMap.get(link.kindergartenId);
                if (!kinder) {
                    console.warn(`  [WARN] Unknown kindergarten ID: ${link.kindergartenId}`);
                    continue;
                }

                const gungu = kinder.sigungu_code;

                // Construct Final Review Object
                const finalReview: FinalReview = {
                    ...link,
                    id: generateReviewId(), // Or maintain existing if possible? For now, generate new.
                    summary: enrichedData.summary,
                    pros: enrichedData.pros || [],
                    cons: enrichedData.cons || [],
                    sentiment: enrichedData.sentiment || 'neutral',
                    tags: enrichedData.tags || [],
                };

                // Add to Batch
                if (!batchUpdates.has(gungu)) {
                    batchUpdates.set(gungu, new Map());
                }
                const gunguBatch = batchUpdates.get(gungu)!;
                
                if (!gunguBatch.has(link.kindergartenId)) {
                    gunguBatch.set(link.kindergartenId, []);
                }
                gunguBatch.get(link.kindergartenId)!.push(finalReview);
                
                processedCount++;
            } else {
                skippedCount++;
            }
        }

        console.log(`  Processed ${processedCount} reviews (Skipped ${skippedCount} missing or non-enriched links).`);

        // 4. Write to Region Files
        for (const [gungu, kinderReviews] of batchUpdates) {
            const outputDir = path.join(OUTPUT_BASE, sido);
            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true });
            }

            const outputFile = path.join(outputDir, `${gungu}.json`);
            
            let fileData: RegionReviewFile = {
                version: new Date().toISOString().split('T')[0],
                totalCount: 0,
                kindergartenCount: 0,
                reviews: {}
            };

            // Load existing if available to preserve or merge?
            // User requirement: "Merge the cleaned and enriched review data".
            // Implementation: We'll read existing, and update/overwrite reviews for the *processed* kindergartens.
            // Assumption: The batch enrichment run contains the "latest" state for these kindergartens.
            // But we should be careful not to duplicate if we re-run.
            // Strategy: Replace reviews for the specific kindergarten with the new set.

            if (fs.existsSync(outputFile)) {
                try {
                    fileData = JSON.parse(fs.readFileSync(outputFile, 'utf-8'));
                } catch (e) {
                    console.warn(`  [WARN] Could not parse existing ${gungu}.json. Overwriting.`);
                }
            }

            // Update Data
            for (const [kId, reviews] of kinderReviews) {
                fileData.reviews[kId] = reviews;
            }

            // Recalculate totals
            fileData.kindergartenCount = Object.keys(fileData.reviews).length;
            fileData.totalCount = Object.values(fileData.reviews).flat().length;
            fileData.version = new Date().toISOString().split('T')[0];

            // Write File
            fs.writeFileSync(outputFile, JSON.stringify(fileData, null, 2));
            console.log(`  > Updated ${outputFile} (Total Reviews: ${fileData.totalCount})`);
        }
    }

    console.log('\nBatch Merge Complete.');
}

main().catch(console.error);

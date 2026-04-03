import { chromium, type Page, type Route } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import {
  validateReviewsWithHaiku,
  type HaikuValidationInput,
} from './lib/haiku-review-validator';
import type {
  LlmReviewValidationDecision,
  ReviewBodyCacheEntry,
  ReviewBodyCacheFile,
  ReviewVerificationBodyResult,
  ReviewVerificationCandidate,
  ReviewVerificationQaSampleReport,
  ReviewVerificationRecord,
  ReviewVerificationRunReport,
  ReviewVerificationRunReportItem,
  ReviewVerificationStateEntry,
  ReviewVerificationStateFile,
  ReviewVerificationStatus,
} from '../src/types/review';
import { buildTextExcerpt, extractReadableTextFromHtml } from '../src/lib/utils/review-html';
import {
  assessReviewBody,
  assessReviewFallback,
  assessReviewMetadata,
  resolveUncertainWithLlm,
  summarizeVerificationStatuses,
} from '../src/lib/utils/review-verification';
import {
  buildChangedDecisionItems,
  buildNewlyRemovedItems,
  buildNewlyVerifiedItems,
  buildReviewBodyCacheEntry,
  buildReviewBodyCacheLookup,
  buildReviewVerificationStateEntry,
  buildReviewVerificationStateLookup,
  decideIncrementalReviewAction,
  findReusableBodyCacheEntry,
  mergeReviewBodyCacheEntries,
  mergeReviewVerificationStateEntries,
  pickRandomSamples,
  type IncrementalReviewDecisionReason,
  type ReviewStateMatchType,
} from '../src/lib/utils/review-verification-incremental';
import { applyReviewVerificationDecisions } from './lib/review-verification-apply';
import {
  buildCoreNameFrequencyMap,
  buildSidoTag,
  ensureDirectory,
  loadKindergartens,
  loadTargetReviewEntries,
  parseSidoCodes,
  readJsonFile,
  summarizeRecords,
  writeJsonFile,
  type KindergartenEntry,
  type LoadedReviewEntry,
} from './lib/review-verification-pipeline';

interface LegacyResultsFile {
  generatedAt?: string;
  reviews: Array<
    Pick<ReviewVerificationRecord, 'reviewId' | 'kindergartenId' | 'sidoCode' | 'url' | 'title' | 'snippet'> & {
      kindergartenName?: string;
      finalStatus?: ReviewVerificationStatus;
      finalConfidence?: number;
      reviewedAt?: string;
    }
  >;
}

interface LegacyBodyScrapeItem extends ReviewVerificationBodyResult {
  reviewId: string;
  kindergartenId: string;
  url: string;
}

interface LegacyBodyScrapeFile {
  generatedAt?: string;
  items: LegacyBodyScrapeItem[];
}

interface LlmDecisionFile {
  decisions?: LlmReviewValidationDecision[];
}

interface IncrementalMetadataRecord extends ReviewVerificationRecord {
  normalizedUrl: string;
  reviewFingerprint: string;
  previousStatus: ReviewVerificationStatus | null;
  stateMatchedBy: ReviewStateMatchType;
  candidateReason: IncrementalReviewDecisionReason;
}

interface FinalizedReviewRecord extends IncrementalMetadataRecord {
  reviewedAt: string;
  reusedFromState: boolean;
}

interface BodyCandidateItem extends ReviewVerificationCandidate {
  normalizedUrl: string;
  reviewFingerprint: string;
  source: string;
  sidoCode: string;
  previousStatus: ReviewVerificationStatus | null;
  stateMatchedBy: ReviewStateMatchType;
  candidateReason: IncrementalReviewDecisionReason;
  cacheHit: boolean;
}

interface BodyScrapeResultItem extends ReviewVerificationBodyResult {
  reviewId: string;
  kindergartenId: string;
  kindergartenName: string;
  url: string;
  normalizedUrl: string;
  reviewFingerprint: string;
  fromCache: boolean;
}

interface PreparedReviewItem {
  entry: LoadedReviewEntry;
  metadataRecord: IncrementalMetadataRecord;
  normalizedUrl: string;
  reviewFingerprint: string;
  previousStatus: ReviewVerificationStatus | null;
  matchedBy: ReviewStateMatchType;
  candidateReason: IncrementalReviewDecisionReason;
  reusedFromState: boolean;
  reusableStateEntry: ReviewVerificationStateEntry | null;
}

interface BootstrapStateResult {
  file: ReviewVerificationStateFile;
  source: 'state' | 'legacy-results' | 'empty';
}

interface BootstrapBodyCacheResult {
  file: ReviewBodyCacheFile;
  source: 'body-cache' | 'legacy-body-scrape' | 'empty';
}

interface IncrementalPaths {
  metadataPath: string;
  candidatesPath: string;
  bodyCheckPath: string;
  bodyScrapePath: string;
  resultsPath: string;
  uncertainPath: string;
  llmQueuePath: string;
  applyReportPath: string;
  statePath: string;
  bodyCachePath: string;
  reportPath: string;
  qaPath: string;
}

function writeLine(message: string): void {
  process.stdout.write(`${message}\n`);
}

function hasFlag(args: string[], flag: string): boolean {
  return args.includes(flag);
}

function getArgValue(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag);
  if (index === -1 || !args[index + 1]) {
    return undefined;
  }

  return args[index + 1];
}

function parseInteger(
  args: string[],
  flag: string,
  defaultValue: number
): number {
  const value = getArgValue(args, flag);
  if (!value) {
    return defaultValue;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : defaultValue;
}

function parseFloatValue(
  args: string[],
  flag: string,
  defaultValue: number
): number {
  const value = getArgValue(args, flag);
  if (!value) {
    return defaultValue;
  }

  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : defaultValue;
}

function normalizeLlmDecisions(filePath: string): LlmReviewValidationDecision[] {
  const raw = readJsonFile<LlmDecisionFile | LlmReviewValidationDecision[]>(filePath);
  if (Array.isArray(raw)) {
    return raw;
  }

  return raw.decisions ?? [];
}

function fileExists(filePath: string): boolean {
  return fs.existsSync(filePath);
}

function buildPaths(outputDir: string, tag: string): IncrementalPaths {
  return {
    metadataPath: path.join(outputDir, `review-verification-metadata-${tag}.json`),
    candidatesPath: path.join(outputDir, `review-verification-candidates-${tag}.json`),
    bodyCheckPath: path.join(outputDir, `review-body-check-${tag}.json`),
    bodyScrapePath: path.join(outputDir, `review-body-scrape-${tag}.json`),
    resultsPath: path.join(outputDir, `review-verification-results-${tag}.json`),
    uncertainPath: path.join(outputDir, `review-verification-uncertain-${tag}.json`),
    llmQueuePath: path.join(outputDir, `review-verification-llm-queue-${tag}.json`),
    applyReportPath: path.join(outputDir, `review-verification-apply-${tag}.json`),
    statePath: path.join(outputDir, 'review-verification-state.json'),
    bodyCachePath: path.join(outputDir, 'review-body-cache.json'),
    reportPath: path.join(outputDir, 'review-verification-run-report.json'),
    qaPath: path.join(outputDir, `review-verification-qa-samples-${tag}.json`),
  };
}

function createEmptyStateFile(): ReviewVerificationStateFile {
  return {
    updatedAt: new Date(0).toISOString(),
    totalCount: 0,
    entries: [],
  };
}

function createEmptyBodyCacheFile(): ReviewBodyCacheFile {
  return {
    updatedAt: new Date(0).toISOString(),
    totalCount: 0,
    entries: [],
  };
}

function buildEntryMapByReviewId(
  entries: readonly LoadedReviewEntry[]
): Map<string, LoadedReviewEntry> {
  return new Map(entries.map((entry) => [entry.review.id, entry]));
}

function bootstrapStateFromLegacyResults(
  filePath: string
): ReviewVerificationStateFile {
  const legacyResults = readJsonFile<LegacyResultsFile>(filePath);
  const reviewedAt = legacyResults.generatedAt ?? new Date().toISOString();

  const entries = legacyResults.reviews
    .filter(
      (
        record
      ): record is LegacyResultsFile['reviews'][number] & {
        finalStatus: ReviewVerificationStatus;
      } => Boolean(record.finalStatus)
    )
    .map((record) =>
      buildReviewVerificationStateEntry({
        reviewId: record.reviewId,
        kindergartenId: record.kindergartenId,
        kindergartenName: record.kindergartenName,
        sidoCode: record.sidoCode,
        url: record.url,
        title: record.title,
        snippet: record.snippet,
        finalStatus: record.finalStatus,
        confidence: record.finalConfidence ?? 0.8,
        reviewedAt: record.reviewedAt ?? reviewedAt,
      })
    );

  return {
    updatedAt: reviewedAt,
    totalCount: entries.length,
    entries,
  };
}

function loadVerificationState(
  statePath: string,
  legacyResultsPath: string
): BootstrapStateResult {
  if (fileExists(statePath)) {
    return {
      file: readJsonFile<ReviewVerificationStateFile>(statePath),
      source: 'state',
    };
  }

  if (fileExists(legacyResultsPath)) {
    return {
      file: bootstrapStateFromLegacyResults(legacyResultsPath),
      source: 'legacy-results',
    };
  }

  return {
    file: createEmptyStateFile(),
    source: 'empty',
  };
}

function bootstrapBodyCacheFromLegacyScrape(
  filePath: string,
  entryMapByReviewId: Map<string, LoadedReviewEntry>
): ReviewBodyCacheFile {
  const legacyScrape = readJsonFile<LegacyBodyScrapeFile>(filePath);
  const entries: ReviewBodyCacheEntry[] = legacyScrape.items.flatMap((item) => {
    const reviewEntry = entryMapByReviewId.get(item.reviewId);
    if (!reviewEntry) {
      return [];
    }

    return [
      buildReviewBodyCacheEntry({
        reviewId: item.reviewId,
        kindergartenId: item.kindergartenId,
        url: item.url,
        title: reviewEntry.review.title,
        snippet: reviewEntry.review.snippet,
        bodyText: item.bodyText,
        textLength: item.textLength,
        scrapedAt: item.scrapedAt,
        status: item.status,
        error: item.error,
      }),
    ];
  });

  return {
    updatedAt: legacyScrape.generatedAt ?? new Date().toISOString(),
    totalCount: entries.length,
    entries,
  };
}

function loadBodyCache(
  bodyCachePath: string,
  legacyBodyScrapePath: string,
  entryMapByReviewId: Map<string, LoadedReviewEntry>
): BootstrapBodyCacheResult {
  if (fileExists(bodyCachePath)) {
    return {
      file: readJsonFile<ReviewBodyCacheFile>(bodyCachePath),
      source: 'body-cache',
    };
  }

  if (fileExists(legacyBodyScrapePath)) {
    return {
      file: bootstrapBodyCacheFromLegacyScrape(
        legacyBodyScrapePath,
        entryMapByReviewId
      ),
      source: 'legacy-body-scrape',
    };
  }

  return {
    file: createEmptyBodyCacheFile(),
    source: 'empty',
  };
}

function createVerificationContext(
  kindergarten: KindergartenEntry,
  coreNameFrequencies: Map<string, number>
): {
  kindergartenId: string;
  kindergartenName: string;
  kindergartenAddress: string;
  sidoCode: string;
  sigunguCode: string;
  coreNameFrequency: number;
} {
  const coreName = kindergarten.name
    .replace(/(?:유치원|어린이집)$/, '')
    .replace(/병설$/, '')
    .trim();

  return {
    kindergartenId: kindergarten.kindercode,
    kindergartenName: kindergarten.name,
    kindergartenAddress: kindergarten.address,
    sidoCode: kindergarten.sido_code,
    sigunguCode: kindergarten.sigungu_code,
    coreNameFrequency: coreNameFrequencies.get(coreName) ?? 1,
  };
}

async function scrapeHtml(page: Page, url: string): Promise<ReviewVerificationBodyResult> {
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

    const bodyText = extractReadableTextFromHtml(html);
    return {
      status: 'success',
      bodyText,
      textLength: bodyText.length,
      scrapedAt: new Date().toISOString(),
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      status: 'fail',
      bodyText: '',
      textLength: 0,
      scrapedAt: new Date().toISOString(),
      error: message,
    };
  }
}

async function scrapeBodyCandidates(
  candidates: readonly BodyCandidateItem[],
  concurrency: number,
  skipScrape: boolean
): Promise<BodyScrapeResultItem[]> {
  if (skipScrape) {
    return candidates.map((candidate) => ({
      reviewId: candidate.reviewId,
      kindergartenId: candidate.kindergartenId,
      kindergartenName: candidate.kindergartenName,
      url: candidate.url,
      normalizedUrl: candidate.normalizedUrl,
      reviewFingerprint: candidate.reviewFingerprint,
      fromCache: false,
      status: 'fail',
      bodyText: '',
      textLength: 0,
      scrapedAt: new Date().toISOString(),
      error: '스크래핑 생략 (--skip-scrape)',
    }));
  }

  if (candidates.length === 0) {
    return [];
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const results: BodyScrapeResultItem[] = [];

  for (let index = 0; index < candidates.length; index += concurrency) {
    const batch = candidates.slice(index, index + concurrency);
    const batchResults = await Promise.all(
      batch.map(async (candidate) => {
        const page = await context.newPage();
        const bodyResult = await scrapeHtml(page, candidate.url);
        await page.close();

        return {
          reviewId: candidate.reviewId,
          kindergartenId: candidate.kindergartenId,
          kindergartenName: candidate.kindergartenName,
          url: candidate.url,
          normalizedUrl: candidate.normalizedUrl,
          reviewFingerprint: candidate.reviewFingerprint,
          fromCache: false,
          ...bodyResult,
        } satisfies BodyScrapeResultItem;
      })
    );

    results.push(...batchResults);
    writeLine(
      `[incremental scrape] ${Math.min(
        index + batch.length,
        candidates.length
      )}/${candidates.length}`
    );
  }

  await browser.close();
  return results;
}

function buildBodyScrapeResultFromCache(
  candidate: BodyCandidateItem,
  cacheEntry: ReviewBodyCacheEntry
): BodyScrapeResultItem {
  return {
    reviewId: candidate.reviewId,
    kindergartenId: candidate.kindergartenId,
    kindergartenName: candidate.kindergartenName,
    url: candidate.url,
    normalizedUrl: candidate.normalizedUrl,
    reviewFingerprint: candidate.reviewFingerprint,
    fromCache: true,
    status: cacheEntry.status,
    bodyText: cacheEntry.bodyText,
    textLength: cacheEntry.textLength,
    scrapedAt: cacheEntry.scrapedAt,
    error: cacheEntry.error,
  };
}

function finalizeBodyDecision(
  record: IncrementalMetadataRecord,
  bodyResult: BodyScrapeResultItem | undefined,
  llmDecision: LlmReviewValidationDecision | undefined,
  llmThreshold: number,
  context: ReturnType<typeof createVerificationContext>
): Pick<
  FinalizedReviewRecord,
  'bodyResult' | 'finalStatus' | 'finalConfidence' | 'finalReasons'
> {
  let finalStatus: ReviewVerificationStatus;
  let finalConfidence: number;
  let finalReasons: string[];

  if (bodyResult && bodyResult.status === 'success') {
    const bodyAssessment = assessReviewBody(
      {
        title: record.title,
        snippet: record.snippet,
        bodyText: bodyResult.bodyText,
      },
      context
    );

    finalStatus = bodyAssessment.finalStatus;
    finalConfidence = bodyAssessment.confidence;
    finalReasons = bodyAssessment.reasons;

    if (finalStatus === 'uncertain') {
      const fallbackAssessment = assessReviewFallback(
        {
          title: record.title,
          snippet: record.snippet,
        },
        context
      );

      if (fallbackAssessment.finalStatus !== 'uncertain') {
        finalStatus = fallbackAssessment.finalStatus;
        finalConfidence = fallbackAssessment.confidence;
        finalReasons = fallbackAssessment.reasons;
      }
    }
  } else {
    finalStatus = 'uncertain';
    finalConfidence = 0.3;
    finalReasons = bodyResult?.error
      ? [`본문 스크래핑 실패: ${bodyResult.error}`]
      : ['본문 스크래핑 결과가 없어 자동 판정 보류'];
  }

  if (llmDecision) {
    const resolvedStatus = resolveUncertainWithLlm(
      finalStatus,
      llmDecision.verdict,
      llmDecision.confidence,
      llmThreshold
    );
    if (resolvedStatus !== finalStatus) {
      finalStatus = resolvedStatus;
      finalConfidence = llmDecision.confidence;
      finalReasons = [
        ...(finalReasons.length > 0 ? finalReasons : []),
        `LLM 검토 반영: ${llmDecision.reason}`,
      ];
    }
  }

  return {
    bodyResult,
    finalStatus,
    finalConfidence,
    finalReasons,
  };
}

function buildRunReportItem(record: FinalizedReviewRecord): ReviewVerificationRunReportItem {
  return {
    reviewId: record.reviewId,
    kindergartenId: record.kindergartenId,
    kindergartenName: record.kindergartenName,
    normalizedUrl: record.normalizedUrl,
    url: record.url,
    title: record.title,
    snippet: record.snippet,
    previousStatus: record.previousStatus,
    nextStatus: record.finalStatus ?? 'uncertain',
    confidence: record.finalConfidence ?? 0,
    reviewedAt: record.reviewedAt,
    reused: record.reusedFromState,
  };
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const sidos = parseSidoCodes(getArgValue(args, '--sido'), ['11', '41']);
  const outputDir = path.resolve(
    getArgValue(args, '--output-dir') ?? 'scripts/data-output'
  );
  const limit = parseInteger(args, '--limit', 0);
  const concurrency = parseInteger(args, '--concurrency', 5);
  const qaSampleSize = parseInteger(args, '--qa-sample-size', 5);
  const qaSeed = parseInteger(args, '--qa-seed', Date.now());
  const llmThreshold = parseFloatValue(args, '--llm-threshold', 0.8);
  const dryRun = hasFlag(args, '--dry-run');
  const noApply = hasFlag(args, '--no-apply');
  const skipScrape = hasFlag(args, '--skip-scrape');
  const noRebuild = hasFlag(args, '--no-rebuild');
  const useHaiku = hasFlag(args, '--haiku');
  const maxHaikuCalls = parseInteger(args, '--max-haiku', 0);
  const llmPathValue = getArgValue(args, '--llm');

  ensureDirectory(outputDir);
  const tag = buildSidoTag(sidos);
  const defaultPaths = buildPaths(outputDir, tag);
  const paths: IncrementalPaths = {
    ...defaultPaths,
    statePath: path.resolve(getArgValue(args, '--state-file') ?? defaultPaths.statePath),
    bodyCachePath: path.resolve(
      getArgValue(args, '--body-cache-file') ?? defaultPaths.bodyCachePath
    ),
    reportPath: path.resolve(getArgValue(args, '--report-file') ?? defaultPaths.reportPath),
    qaPath: path.resolve(getArgValue(args, '--qa-output') ?? defaultPaths.qaPath),
  };

  const kindergartens = loadKindergartens();
  const coreNameFrequencies = buildCoreNameFrequencyMap(kindergartens);
  let loadedEntries = loadTargetReviewEntries(sidos, kindergartens);
  if (limit > 0) {
    loadedEntries = loadedEntries.slice(0, limit);
  }
  const entryMapByReviewId = buildEntryMapByReviewId(loadedEntries);

  const stateBootstrap = loadVerificationState(paths.statePath, paths.resultsPath);
  const cacheBootstrap = loadBodyCache(
    paths.bodyCachePath,
    paths.bodyScrapePath,
    entryMapByReviewId
  );
  const stateLookup = buildReviewVerificationStateLookup(stateBootstrap.file.entries);
  const bodyCacheLookup = buildReviewBodyCacheLookup(cacheBootstrap.file.entries);
  const llmMap = new Map<string, LlmReviewValidationDecision>(
    (
      llmPathValue
        ? normalizeLlmDecisions(path.resolve(llmPathValue))
        : []
    ).map((decision) => [decision.reviewId, decision])
  );

  const metadataRecords: IncrementalMetadataRecord[] = [];
  const preparedItems: PreparedReviewItem[] = [];
  const bodyCandidates: BodyCandidateItem[] = [];

  for (const entry of loadedEntries) {
    const context = createVerificationContext(
      entry.kindergarten,
      coreNameFrequencies
    );
    // 네이버 플레이스/별별선생 리뷰는 구조적으로 장소에 연결 → 자동 verified
    const isStructurallyLinked =
      entry.review.source === 'naver_place' || entry.review.source === 'starteacher';
    const metadata = isStructurallyLinked
      ? {
          decision: 'verified' as const,
          preliminaryStatus: 'verified' as const,
          confidence: 0.99,
          reasons: ['구조적으로 장소에 연결된 리뷰 (자동 verified)'],
          whyFlagged: [] as string[],
          signals: {
            directNameMatch: true,
            coreNameMatch: true,
            genericCoreOnly: false,
            genericCoreName: false,
            locationValid: true,
            contentType: 'review' as const,
            reviewIndicators: [],
            firstHandIndicators: [],
            schoolDetailIndicators: [],
            genericInfoIndicators: [],
            advertorialIndicators: [],
            institutionMentions: [],
            otherInstitutionMentions: [],
          },
        }
      : assessReviewMetadata(entry.review, context);
    const action = decideIncrementalReviewAction(stateLookup, {
      reviewId: entry.review.id,
      kindergartenId: entry.kindergarten.kindercode,
      url: entry.review.url,
      title: entry.review.title,
      snippet: entry.review.snippet,
    });

    const metadataRecord: IncrementalMetadataRecord = {
      reviewId: entry.review.id,
      kindergartenId: entry.kindergarten.kindercode,
      kindergartenName: entry.kindergarten.name,
      kindergartenAddress: entry.kindergarten.address,
      sidoCode: entry.sidoCode,
      sigunguCode: entry.kindergarten.sigungu_code,
      url: entry.review.url,
      title: entry.review.title,
      snippet: entry.review.snippet,
      source: entry.review.source,
      date: entry.review.date,
      collectedAt: entry.review.collectedAt,
      metadata,
      normalizedUrl: action.normalizedUrl,
      reviewFingerprint: action.reviewFingerprint,
      previousStatus: action.previousStatus,
      stateMatchedBy: action.matchedBy,
      candidateReason: action.reason,
    };

    metadataRecords.push(metadataRecord);
    preparedItems.push({
      entry,
      metadataRecord,
      normalizedUrl: action.normalizedUrl,
      reviewFingerprint: action.reviewFingerprint,
      previousStatus: action.previousStatus,
      matchedBy: action.matchedBy,
      candidateReason: action.reason,
      reusedFromState: !action.needsEvaluation,
      reusableStateEntry: action.matchedEntry,
    });

    if (action.needsEvaluation && metadata.decision === 'needs_body_check') {
      const cacheEntry = findReusableBodyCacheEntry(
        bodyCacheLookup,
        action.normalizedUrl,
        action.reviewFingerprint
      );
      const cacheReusable = Boolean(
        cacheEntry && cacheEntry.status === 'success' && cacheEntry.textLength > 0
      );

      bodyCandidates.push({
        reviewId: entry.review.id,
        kindergartenId: entry.kindergarten.kindercode,
        kindergartenName: entry.kindergarten.name,
        url: entry.review.url,
        title: entry.review.title,
        snippet: entry.review.snippet,
        whyFlagged: metadata.whyFlagged,
        normalizedUrl: action.normalizedUrl,
        reviewFingerprint: action.reviewFingerprint,
        source: entry.review.source,
        sidoCode: entry.sidoCode,
        previousStatus: action.previousStatus,
        stateMatchedBy: action.matchedBy,
        candidateReason: action.reason,
        cacheHit: cacheReusable,
      });
    }
  }

  const scrapeQueue = bodyCandidates.filter((candidate) => !candidate.cacheHit);
  const cachedBodyCount = bodyCandidates.length - scrapeQueue.length;
  const scrapedBodyResults = await scrapeBodyCandidates(
    scrapeQueue,
    concurrency,
    skipScrape
  );
  const scrapedBodyResultMap = new Map(
    scrapedBodyResults.map((item) => [item.reviewId, item])
  );
  const bodyCandidateMap = new Map(
    bodyCandidates.map((candidate) => [candidate.reviewId, candidate])
  );
  // Haiku LLM 검증: uncertain 상태 리뷰를 Haiku에 전송하여 재판정
  if (useHaiku) {
    const haikuInputs: HaikuValidationInput[] = [];
    for (const candidate of bodyCandidates) {
      const bodyResult =
        candidate.cacheHit
          ? findReusableBodyCacheEntry(
              bodyCacheLookup,
              candidate.normalizedUrl,
              candidate.reviewFingerprint
            )
          : scrapedBodyResultMap.get(candidate.reviewId);
      const bodyText =
        (bodyResult && 'bodyText' in bodyResult ? bodyResult.bodyText : '') ?? '';
      haikuInputs.push({
        reviewId: candidate.reviewId,
        kindergartenName: candidate.kindergartenName,
        kindergartenAddress: '',
        sidoCode: candidate.sidoCode,
        title: candidate.title,
        snippet: candidate.snippet,
        bodyExcerpt: buildTextExcerpt(bodyText, 1200),
        whyFlagged: candidate.whyFlagged,
        autoReasons: [],
      });
    }

    if (haikuInputs.length > 0) {
      const haikuResults = await validateReviewsWithHaiku(haikuInputs, {
        maxCalls: maxHaikuCalls,
      });
      for (const result of haikuResults) {
        llmMap.set(result.reviewId, result);
      }
    }
  }

  const finalizedRecords: FinalizedReviewRecord[] = [];
  const newStateEntries: ReviewVerificationStateEntry[] = [];
  const newBodyCacheEntries: ReviewBodyCacheEntry[] = [];
  const runReportItems: ReviewVerificationRunReportItem[] = [];

  for (const prepared of preparedItems) {
    const context = createVerificationContext(
      prepared.entry.kindergarten,
      coreNameFrequencies
    );
    const reviewedAt = prepared.reusedFromState
      ? prepared.reusableStateEntry?.reviewedAt ?? new Date().toISOString()
      : new Date().toISOString();

    if (prepared.reusedFromState && prepared.reusableStateEntry) {
      const reusableCacheEntry = findReusableBodyCacheEntry(
        bodyCacheLookup,
        prepared.normalizedUrl,
        prepared.reviewFingerprint
      );
      const bodyResult =
        reusableCacheEntry &&
        reusableCacheEntry.status === 'success' &&
        reusableCacheEntry.textLength > 0
          ? {
              status: reusableCacheEntry.status,
              bodyText: reusableCacheEntry.bodyText,
              textLength: reusableCacheEntry.textLength,
              scrapedAt: reusableCacheEntry.scrapedAt,
              error: reusableCacheEntry.error,
            }
          : undefined;

      const finalizedRecord: FinalizedReviewRecord = {
        ...prepared.metadataRecord,
        bodyResult,
        finalStatus: prepared.reusableStateEntry.finalStatus,
        finalConfidence: prepared.reusableStateEntry.confidence,
        finalReasons: [
          `기존 검증 결과 재사용 (${prepared.matchedBy === 'reviewId' ? 'reviewId' : 'normalized URL'})`,
        ],
        reviewedAt,
        reusedFromState: true,
      };

      finalizedRecords.push(finalizedRecord);
      newStateEntries.push(
        buildReviewVerificationStateEntry({
          reviewId: finalizedRecord.reviewId,
          kindergartenId: finalizedRecord.kindergartenId,
          kindergartenName: finalizedRecord.kindergartenName,
          sidoCode: finalizedRecord.sidoCode,
          url: finalizedRecord.url,
          title: finalizedRecord.title,
          snippet: finalizedRecord.snippet,
          finalStatus: finalizedRecord.finalStatus ?? 'uncertain',
          confidence: finalizedRecord.finalConfidence ?? 0,
          reviewedAt,
        })
      );
      runReportItems.push(buildRunReportItem(finalizedRecord));
      continue;
    }

    if (prepared.metadataRecord.metadata.decision === 'verified') {
      const finalizedRecord: FinalizedReviewRecord = {
        ...prepared.metadataRecord,
        finalStatus: 'verified',
        finalConfidence: prepared.metadataRecord.metadata.confidence,
        finalReasons: prepared.metadataRecord.metadata.reasons,
        reviewedAt,
        reusedFromState: false,
      };

      finalizedRecords.push(finalizedRecord);
      newStateEntries.push(
        buildReviewVerificationStateEntry({
          reviewId: finalizedRecord.reviewId,
          kindergartenId: finalizedRecord.kindergartenId,
          kindergartenName: finalizedRecord.kindergartenName,
          sidoCode: finalizedRecord.sidoCode,
          url: finalizedRecord.url,
          title: finalizedRecord.title,
          snippet: finalizedRecord.snippet,
          finalStatus: 'verified',
          confidence: finalizedRecord.finalConfidence ?? 0,
          reviewedAt,
        })
      );
      runReportItems.push(buildRunReportItem(finalizedRecord));
      continue;
    }

    if (prepared.metadataRecord.metadata.decision === 'reject') {
      const finalStatus = prepared.metadataRecord.metadata.preliminaryStatus;
      const finalizedRecord: FinalizedReviewRecord = {
        ...prepared.metadataRecord,
        finalStatus,
        finalConfidence: prepared.metadataRecord.metadata.confidence,
        finalReasons: prepared.metadataRecord.metadata.reasons,
        reviewedAt,
        reusedFromState: false,
      };

      finalizedRecords.push(finalizedRecord);
      newStateEntries.push(
        buildReviewVerificationStateEntry({
          reviewId: finalizedRecord.reviewId,
          kindergartenId: finalizedRecord.kindergartenId,
          kindergartenName: finalizedRecord.kindergartenName,
          sidoCode: finalizedRecord.sidoCode,
          url: finalizedRecord.url,
          title: finalizedRecord.title,
          snippet: finalizedRecord.snippet,
          finalStatus,
          confidence: finalizedRecord.finalConfidence ?? 0,
          reviewedAt,
        })
      );
      runReportItems.push(buildRunReportItem(finalizedRecord));
      continue;
    }

    const bodyCandidate =
      bodyCandidateMap.get(prepared.metadataRecord.reviewId) ?? null;
    const reusableCacheEntry =
      bodyCandidate?.cacheHit === true
        ? findReusableBodyCacheEntry(
            bodyCacheLookup,
            prepared.normalizedUrl,
            prepared.reviewFingerprint
          )
        : null;

    const bodyResult = reusableCacheEntry
      ? buildBodyScrapeResultFromCache(bodyCandidate ?? {
          reviewId: prepared.metadataRecord.reviewId,
          kindergartenId: prepared.metadataRecord.kindergartenId,
          kindergartenName: prepared.metadataRecord.kindergartenName,
          url: prepared.metadataRecord.url,
          title: prepared.metadataRecord.title,
          snippet: prepared.metadataRecord.snippet,
          whyFlagged: prepared.metadataRecord.metadata.whyFlagged,
          normalizedUrl: prepared.normalizedUrl,
          reviewFingerprint: prepared.reviewFingerprint,
          source: prepared.metadataRecord.source,
          sidoCode: prepared.metadataRecord.sidoCode,
          previousStatus: prepared.previousStatus,
          stateMatchedBy: prepared.matchedBy,
          candidateReason: prepared.candidateReason,
          cacheHit: true,
        }, reusableCacheEntry)
      : scrapedBodyResultMap.get(prepared.metadataRecord.reviewId);
    const finalDecision = finalizeBodyDecision(
      prepared.metadataRecord,
      bodyResult,
      llmMap.get(prepared.metadataRecord.reviewId),
      llmThreshold,
      context
    );
    const finalizedRecord: FinalizedReviewRecord = {
      ...prepared.metadataRecord,
      ...finalDecision,
      reviewedAt,
      reusedFromState: false,
    };

    finalizedRecords.push(finalizedRecord);
    newStateEntries.push(
      buildReviewVerificationStateEntry({
        reviewId: finalizedRecord.reviewId,
        kindergartenId: finalizedRecord.kindergartenId,
        kindergartenName: finalizedRecord.kindergartenName,
        sidoCode: finalizedRecord.sidoCode,
        url: finalizedRecord.url,
        title: finalizedRecord.title,
        snippet: finalizedRecord.snippet,
        finalStatus: finalizedRecord.finalStatus ?? 'uncertain',
        confidence: finalizedRecord.finalConfidence ?? 0,
        reviewedAt,
      })
    );
    runReportItems.push(buildRunReportItem(finalizedRecord));

    if (bodyResult && !bodyResult.fromCache) {
      newBodyCacheEntries.push(
        buildReviewBodyCacheEntry({
          reviewId: bodyResult.reviewId,
          kindergartenId: bodyResult.kindergartenId,
          url: bodyResult.url,
          title: finalizedRecord.title,
          snippet: finalizedRecord.snippet,
          bodyText: bodyResult.bodyText,
          textLength: bodyResult.textLength,
          scrapedAt: bodyResult.scrapedAt,
          status: bodyResult.status,
          error: bodyResult.error,
        })
      );
    }
  }

  const mergedStateEntries = mergeReviewVerificationStateEntries(
    stateBootstrap.file.entries,
    newStateEntries
  );
  const mergedBodyCacheEntries = mergeReviewBodyCacheEntries(
    cacheBootstrap.file.entries,
    newBodyCacheEntries
  );
  const uncertainRecords = finalizedRecords.filter(
    (record) => record.finalStatus === 'uncertain'
  );
  const finalStatuses = finalizedRecords.map(
    (record) => record.finalStatus ?? 'uncertain'
  );
  const statusSummary = summarizeVerificationStatuses(finalStatuses);
  const changedDecisions = buildChangedDecisionItems(runReportItems);
  const newlyRemoved = buildNewlyRemovedItems(runReportItems);
  const newlyVerified = buildNewlyVerifiedItems(runReportItems);
  const runReport: ReviewVerificationRunReport = {
    generatedAt: new Date().toISOString(),
    targetSidos: sidos,
    totalReviewsSeen: loadedEntries.length,
    reusedCount: finalizedRecords.filter((record) => record.reusedFromState).length,
    newlyEvaluatedCount: finalizedRecords.filter(
      (record) => !record.reusedFromState
    ).length,
    newlyScrapedCount: scrapedBodyResults.length,
    cachedBodyCount,
    statusSummary,
    changedDecisions,
    newlyRemoved,
    newlyVerified,
  };
  const qaSamples: ReviewVerificationQaSampleReport = {
    generatedAt: new Date().toISOString(),
    targetSidos: sidos,
    sampleSize: qaSampleSize,
    seed: qaSeed,
    newlyVerifiedSamples: pickRandomSamples(newlyVerified, qaSampleSize, qaSeed),
    newlyRemovedSamples: pickRandomSamples(
      newlyRemoved,
      qaSampleSize,
      qaSeed ^ 0x9e3779b9
    ),
  };
  const bodyScrapeItems = bodyCandidates.map((candidate) => {
    const cacheEntry = candidate.cacheHit
      ? findReusableBodyCacheEntry(
          bodyCacheLookup,
          candidate.normalizedUrl,
          candidate.reviewFingerprint
        )
      : null;

    if (cacheEntry) {
      return buildBodyScrapeResultFromCache(candidate, cacheEntry);
    }

    return (
      scrapedBodyResultMap.get(candidate.reviewId) ?? {
        reviewId: candidate.reviewId,
        kindergartenId: candidate.kindergartenId,
        kindergartenName: candidate.kindergartenName,
        url: candidate.url,
        normalizedUrl: candidate.normalizedUrl,
        reviewFingerprint: candidate.reviewFingerprint,
        fromCache: false,
        status: 'fail',
        bodyText: '',
        textLength: 0,
        scrapedAt: new Date().toISOString(),
        error: '본문 스크래핑 결과 없음',
      }
    );
  });

  writeJsonFile(paths.metadataPath, {
    generatedAt: new Date().toISOString(),
    targetSidos: sidos,
    totalCount: metadataRecords.length,
    summary: summarizeRecords(metadataRecords),
    reusedCount: runReport.reusedCount,
    newlyEvaluatedCount: runReport.newlyEvaluatedCount,
    reviews: metadataRecords,
  });
  writeJsonFile(paths.candidatesPath, {
    generatedAt: new Date().toISOString(),
    targetSidos: sidos,
    totalCount: bodyCandidates.length,
    cachedBodyCount,
    items: bodyCandidates,
  });
  writeJsonFile(paths.bodyCheckPath, {
    generatedAt: new Date().toISOString(),
    targetSidos: sidos,
    totalCount: scrapeQueue.length,
    items: scrapeQueue,
  });
  writeJsonFile(paths.bodyScrapePath, {
    generatedAt: new Date().toISOString(),
    targetSidos: sidos,
    totalCount: bodyScrapeItems.length,
    successCount: bodyScrapeItems.filter((item) => item.status === 'success').length,
    failCount: bodyScrapeItems.filter((item) => item.status === 'fail').length,
    cachedBodyCount,
    items: bodyScrapeItems,
  });
  writeJsonFile(paths.resultsPath, {
    generatedAt: new Date().toISOString(),
    targetSidos: sidos,
    totalCount: finalizedRecords.length,
    summary: statusSummary,
    reviews: finalizedRecords,
  });
  writeJsonFile(paths.uncertainPath, {
    generatedAt: new Date().toISOString(),
    totalCount: uncertainRecords.length,
    reviews: uncertainRecords,
  });
  writeJsonFile(paths.llmQueuePath, {
    generatedAt: new Date().toISOString(),
    totalCount: uncertainRecords.length,
    items: uncertainRecords.map((record) => ({
      reviewId: record.reviewId,
      kindergartenId: record.kindergartenId,
      kindergartenName: record.kindergartenName,
      kindergartenAddress: record.kindergartenAddress,
      sidoCode: record.sidoCode,
      url: record.url,
      title: record.title,
      snippet: record.snippet,
      whyFlagged: record.metadata.whyFlagged,
      autoReasons: record.finalReasons,
      bodyExcerpt: buildTextExcerpt(record.bodyResult?.bodyText ?? '', 1200),
    })),
  });
  writeJsonFile(paths.reportPath, runReport);
  writeJsonFile(paths.qaPath, qaSamples);

  if (!dryRun) {
    writeJsonFile(paths.statePath, {
      updatedAt: new Date().toISOString(),
      totalCount: mergedStateEntries.length,
      entries: mergedStateEntries,
    } satisfies ReviewVerificationStateFile);
    writeJsonFile(paths.bodyCachePath, {
      updatedAt: new Date().toISOString(),
      totalCount: mergedBodyCacheEntries.length,
      entries: mergedBodyCacheEntries,
    } satisfies ReviewBodyCacheFile);
  }

  const applyResult = applyReviewVerificationDecisions(
    finalizedRecords
      .filter(
        (
          record
        ): record is FinalizedReviewRecord & {
          finalStatus: ReviewVerificationStatus;
        } => Boolean(record.finalStatus)
      )
      .map((record) => ({
        reviewId: record.reviewId,
        kindergartenId: record.kindergartenId,
        sidoCode: record.sidoCode,
        status: record.finalStatus,
      })),
    {
      dryRun: dryRun || noApply,
      noRebuild,
    }
  );

  writeJsonFile(paths.applyReportPath, {
    generatedAt: new Date().toISOString(),
    inputPath: paths.resultsPath,
    dryRun: dryRun || noApply,
    rebuiltCount: applyResult.rebuiltCount,
    summary: applyResult.summary,
  });

  writeLine(`state source: ${stateBootstrap.source}`);
  writeLine(`body cache source: ${cacheBootstrap.source}`);
  writeLine(`results: ${paths.resultsPath}`);
  writeLine(`state: ${paths.statePath}${dryRun ? ' (dry-run skipped write)' : ''}`);
  writeLine(`body cache: ${paths.bodyCachePath}${dryRun ? ' (dry-run skipped write)' : ''}`);
  writeLine(`report: ${paths.reportPath}`);
  writeLine(`qa samples: ${paths.qaPath}`);
  writeLine(`reused: ${runReport.reusedCount}`);
  writeLine(`newly evaluated: ${runReport.newlyEvaluatedCount}`);
  writeLine(`newly scraped: ${runReport.newlyScrapedCount}`);
  writeLine(`cached body: ${runReport.cachedBodyCount}`);
  writeLine(`newly verified: ${runReport.newlyVerified.length}`);
  writeLine(`newly removed: ${runReport.newlyRemoved.length}`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exit(1);
});

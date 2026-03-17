export type ReviewSource = 'naver_blog' | 'naver_cafe' | 'google' | 'other';

export interface ReviewLink {
  id: string;
  kindergartenId: string;
  title: string;
  url: string;
  source: ReviewSource;
  sourceName: string;
  snippet: string;
  summary?: string;
  tags?: string[];
  content?: string;
  date: string | null;
  collectedAt: string;
}

export interface ReviewsData {
  version: string;
  totalCount: number;
  kindergartenCount: number;
  reviews: Record<string, ReviewLink[]>;
}

export type ReviewVerificationStatus =
  | 'verified'
  | 'mismatch'
  | 'advertorial'
  | 'generic_info'
  | 'uncertain';

export type ReviewMetadataDecision = 'verified' | 'needs_body_check' | 'reject';

export type ReviewRejectedStatus = Exclude<
  ReviewVerificationStatus,
  'verified' | 'uncertain'
>;

export interface ReviewVerificationSignals {
  directNameMatch: boolean;
  coreNameMatch: boolean;
  genericCoreOnly: boolean;
  genericCoreName: boolean;
  locationValid: boolean;
  locationReason?: string;
  contentType: 'review' | 'template' | 'question' | 'info_list' | 'unknown';
  reviewIndicators: string[];
  firstHandIndicators: string[];
  schoolDetailIndicators: string[];
  genericInfoIndicators: string[];
  advertorialIndicators: string[];
  institutionMentions: string[];
  otherInstitutionMentions: string[];
}

export interface ReviewVerificationMetadata {
  decision: ReviewMetadataDecision;
  preliminaryStatus: ReviewVerificationStatus;
  confidence: number;
  reasons: string[];
  whyFlagged: string[];
  signals: ReviewVerificationSignals;
}

export interface ReviewVerificationBodyResult {
  status: 'success' | 'fail';
  bodyText: string;
  textLength: number;
  scrapedAt: string;
  error?: string;
}

export interface ReviewVerificationRecord {
  reviewId: string;
  kindergartenId: string;
  kindergartenName: string;
  kindergartenAddress: string;
  sidoCode: string;
  sigunguCode: string;
  url: string;
  title: string;
  snippet: string;
  source: ReviewSource;
  date: string | null;
  collectedAt: string;
  metadata: ReviewVerificationMetadata;
  bodyResult?: ReviewVerificationBodyResult;
  finalStatus?: ReviewVerificationStatus;
  finalConfidence?: number;
  finalReasons?: string[];
}

export interface ReviewVerificationCandidate {
  reviewId: string;
  kindergartenId: string;
  kindergartenName: string;
  url: string;
  title: string;
  snippet: string;
  whyFlagged: string[];
}

export interface LlmReviewValidationDecision {
  reviewId: string;
  verdict: ReviewVerificationStatus;
  confidence: number;
  reason: string;
}

export interface ReviewVerificationStateEntry {
  reviewId: string;
  kindergartenId: string;
  kindergartenName?: string;
  sidoCode?: string;
  normalizedUrl: string;
  finalStatus: ReviewVerificationStatus;
  confidence: number;
  reviewedAt: string;
  reviewFingerprint: string;
  title: string;
  snippet: string;
}

export interface ReviewVerificationStateFile {
  updatedAt: string;
  totalCount: number;
  entries: ReviewVerificationStateEntry[];
}

export interface ReviewBodyCacheEntry {
  reviewId: string;
  kindergartenId: string;
  normalizedUrl: string;
  reviewFingerprint: string;
  title: string;
  snippet: string;
  bodyText: string;
  textLength: number;
  scrapedAt: string;
  status: 'success' | 'fail';
  error?: string;
}

export interface ReviewBodyCacheFile {
  updatedAt: string;
  totalCount: number;
  entries: ReviewBodyCacheEntry[];
}

export interface ReviewVerificationRunReportItem {
  reviewId: string;
  kindergartenId: string;
  kindergartenName: string;
  normalizedUrl: string;
  url: string;
  title: string;
  snippet: string;
  previousStatus: ReviewVerificationStatus | null;
  nextStatus: ReviewVerificationStatus;
  confidence: number;
  reviewedAt: string;
  reused: boolean;
}

export interface ReviewVerificationRunReport {
  generatedAt: string;
  targetSidos: string[];
  totalReviewsSeen: number;
  reusedCount: number;
  newlyEvaluatedCount: number;
  newlyScrapedCount: number;
  cachedBodyCount: number;
  statusSummary: Record<ReviewVerificationStatus, number>;
  changedDecisions: ReviewVerificationRunReportItem[];
  newlyRemoved: ReviewVerificationRunReportItem[];
  newlyVerified: ReviewVerificationRunReportItem[];
}

export interface ReviewVerificationQaSampleReport {
  generatedAt: string;
  targetSidos: string[];
  sampleSize: number;
  seed: number;
  newlyVerifiedSamples: ReviewVerificationRunReportItem[];
  newlyRemovedSamples: ReviewVerificationRunReportItem[];
}

export interface ReviewVerificationApplySummaryReport {
  removed: number;
  keptVerified: number;
  keptUncertain: number;
  untouched: number;
  byStatus: Record<ReviewVerificationStatus, number>;
}

export interface ReviewVerificationApplyReport {
  generatedAt: string;
  inputPath: string;
  dryRun: boolean;
  rebuiltCount: number | null;
  summary: ReviewVerificationApplySummaryReport;
}

// Review Suggestion Types
export type ReviewSuggestionType = 'add' | 'delete';

export interface ReviewSuggestionBase {
  kindergartenId: string;
  reason?: string;
  submitterEmail?: string;
}

export interface ReviewAddSuggestion extends ReviewSuggestionBase {
  type: 'add';
  url: string;
  title: string;
  source: ReviewSource;
}

export interface ReviewDeleteSuggestion extends ReviewSuggestionBase {
  type: 'delete';
  reviewId: string;
}

export type ReviewSuggestion = ReviewAddSuggestion | ReviewDeleteSuggestion;

import type {
  ReviewLink,
  ReviewsData,
  ReviewQualityEvaluationReport,
  ReviewVerificationStatus,
} from '../../../src/types/review';
import {
  classifyReviewWithoutBody,
  extractInstitutionMentions,
} from '../../../src/lib/utils/review-verification';
import { normalizeEvidenceText } from '../../../src/lib/utils/review-acquisition';
import {
  buildCoreNameFrequencyMap,
  type KindergartenEntry,
} from '../../lib/review-verification-pipeline';

export const COLLECTION_POLICY_SURFACES = [
  'scripts/review-autoresearch/program-collect.md',
  'scripts/review-autoresearch/lib/collection-policy.ts',
] as const;

export const DEFAULT_COLLECTION_CYCLE_SIZE = 20;

export const DEFAULT_COLLECTION_QUERY_TEMPLATES = [
  '"{name}" "{sigungu}" 후기',
  '"{name}" 입학설명회',
  '"{name}" 보내보니',
  '"{name}" 선생님 급식 시설',
  '"{name}" 보내시는 분',
  '"{name}" 어떤가요',
] as const;

export interface CollectionQueueItem {
  kindergarten: KindergartenEntry;
  currentReviewCount: number;
  priorityBucket: 0 | 1 | 2;
  alreadySearched: boolean;
}

export interface CollectionSearchCandidate {
  url: string;
  title: string;
  snippet: string;
  source: 'naver_blog' | 'naver_cafe';
  sourceName?: string;
}

export interface CollectionQuestionEvidence {
  questionSummary: string;
  answerSummary: string;
  answerEvidenceCount: number;
}

export interface CollectionCandidateEvaluationInput {
  kindergarten: KindergartenEntry;
  review: ReviewLink;
  bodyText: string;
  questionEvidence?: CollectionQuestionEvidence | null;
}

export interface CollectionCandidateEvaluationResult {
  accept: boolean;
  reason: string;
  isQuestionPost: boolean;
  finalStatus: ReviewVerificationStatus;
}

export interface ReviewCollectionDiagnostics {
  kindergartensSearched: number;
  candidatesFound: number;
  candidatesOpened: number;
  acceptedLinks: number;
  duplicateRejections: number;
  officialSourceRejections: number;
  wrongLinkRejections: number;
  blogReadSuccessRate: number;
  cafeReadSuccessRate: number;
  questionPostAcceptRate: number;
}

export interface ReviewCollectionMetrics {
  targetSidoCode: string;
  targetKindergartenCount: number;
  incheonVisibleReviewCount: number;
  incheonCoverageAt1Count: number;
  incheonCoverageAt1Ratio: number;
  incheonCoverageAt3Count: number;
  incheonCoverageAt3Ratio: number;
  incheonVerifiedLinkCount: number;
  incheonQnaCompleteCount: number;
  addedLinkCount: number;
  addedLinkVerifiedCount: number;
  addedLinkVerifiedRate: number;
  crossKindergartenErrorCount: number;
  qnaSummaryCompleteness: number;
  researchScore: number;
  diagnostics: ReviewCollectionDiagnostics;
}

export interface ReviewCollectionGateResult {
  passed: boolean;
  failures: string[];
}

function ratio(numerator: number, denominator: number): number {
  if (denominator === 0) {
    return 0;
  }

  return Number((numerator / denominator).toFixed(6));
}

function normalizeSigunguLabel(address: string): string {
  const parts = address.split(/\s+/);
  return parts[1]?.trim() ?? '';
}

function buildVerificationContext(
  kindergarten: KindergartenEntry,
  coreNameFrequencies: Map<string, number>
) {
  const normalizedCoreName = kindergarten.name
    .replace(/(?:유치원|어린이집)$/u, '')
    .replace(/병설$/u, '')
    .trim();

  return {
    kindergartenId: kindergarten.kindercode,
    kindergartenName: kindergarten.name,
    kindergartenAddress: kindergarten.address,
    sidoCode: kindergarten.sido_code,
    sigunguCode: kindergarten.sigungu_code,
    coreNameFrequency:
      coreNameFrequencies.get(normalizedCoreName) ??
      coreNameFrequencies.get(
        kindergarten.name
          .replace(/(?:유치원|어린이집)$/u, '')
          .replace(/병설$/u, '')
          .trim()
      ) ??
      1,
  };
}

export function buildCollectionQueries(
  kindergarten: KindergartenEntry,
  templates: readonly string[] = DEFAULT_COLLECTION_QUERY_TEMPLATES
): string[] {
  const sigungu = normalizeSigunguLabel(kindergarten.address);
  return templates.map((template) =>
    template.replaceAll('{name}', kindergarten.name).replaceAll('{sigungu}', sigungu)
  );
}

export function buildCollectionQueue(
  kindergartens: readonly KindergartenEntry[],
  reviews: Record<string, ReviewLink[]>,
  searchedKindergartenIds: readonly string[] = [],
  cycleSize = DEFAULT_COLLECTION_CYCLE_SIZE,
  sidoCode = '28'
): CollectionQueueItem[] {
  const searched = new Set(searchedKindergartenIds);
  const queue = kindergartens
    .filter((kindergarten) => kindergarten.sido_code === sidoCode)
    .map((kindergarten) => {
      const currentReviewCount = reviews[kindergarten.kindercode]?.length ?? 0;
      const priorityBucket: 0 | 1 | 2 =
        currentReviewCount === 0 ? 0 : currentReviewCount <= 2 ? 1 : 2;

      return {
        kindergarten,
        currentReviewCount,
        priorityBucket,
        alreadySearched: searched.has(kindergarten.kindercode),
      };
    })
    .toSorted((left, right) => {
      if (left.alreadySearched !== right.alreadySearched) {
        return left.alreadySearched ? 1 : -1;
      }
      if (left.priorityBucket !== right.priorityBucket) {
        return left.priorityBucket - right.priorityBucket;
      }
      if (left.currentReviewCount !== right.currentReviewCount) {
        return left.currentReviewCount - right.currentReviewCount;
      }
      return left.kindergarten.name.localeCompare(right.kindergarten.name, 'ko');
    });

  return queue.slice(0, cycleSize);
}

export function looksLikeOfficialInstitutionSource(
  sourceName: string,
  kindergartenName: string
): boolean {
  if (!sourceName) {
    return false;
  }

  const normalizedSource = normalizeEvidenceText(sourceName);
  const normalizedKindergarten = normalizeEvidenceText(kindergartenName);
  return (
    normalizedSource === normalizedKindergarten ||
    normalizedSource.includes(normalizedKindergarten)
  );
}

export function hasExactKindergartenMatch(
  text: string,
  kindergartenName: string
): boolean {
  return normalizeEvidenceText(text).includes(normalizeEvidenceText(kindergartenName));
}

export function hasMultipleInstitutionMentions(
  text: string
): boolean {
  if (extractInstitutionMentions(text).length >= 2) {
    return true;
  }

  const explicitInstitutionCount =
    text.match(/(?:유치원|어린이집)/g)?.length ?? 0;
  return explicitInstitutionCount >= 2 && /[\/|,]/.test(text);
}

export function isQuestionLikeCafePost(
  title: string,
  snippet: string
): boolean {
  return /보내시는\s*분|어떤가요|알려\s*주세요|부탁드려요|궁금|만족도|보내보신\s*분|정보\s*부탁/i.test(
    `${title} ${snippet}`
  );
}

export function buildQuestionSummary(
  evidence: CollectionQuestionEvidence
): string {
  return `질문: ${evidence.questionSummary} / 답변: ${evidence.answerSummary}`;
}

export function evaluateCollectedCandidate(
  input: CollectionCandidateEvaluationInput
): CollectionCandidateEvaluationResult {
  const { kindergarten, review, bodyText, questionEvidence } = input;
  const joinedText = [review.title, review.snippet, review.summary ?? '', bodyText]
    .filter((value) => value.trim().length > 0)
    .join(' ');
  const isQuestionPost =
    review.source === 'naver_cafe' &&
    (review.tags?.includes('질문글') === true ||
      isQuestionLikeCafePost(review.title, review.snippet));

  if (!hasExactKindergartenMatch(joinedText, kindergarten.name)) {
    return {
      accept: false,
      reason: 'exact kindergarten match missing',
      isQuestionPost,
      finalStatus: 'mismatch',
    };
  }

  if (looksLikeOfficialInstitutionSource(review.sourceName, kindergarten.name)) {
    return {
      accept: false,
      reason: 'official institution source',
      isQuestionPost,
      finalStatus: 'advertorial',
    };
  }

  if (hasMultipleInstitutionMentions(review.title)) {
    return {
      accept: false,
      reason: 'multiple institution mentions in title',
      isQuestionPost,
      finalStatus: 'generic_info',
    };
  }

  if (
    isQuestionPost &&
    (!questionEvidence ||
      questionEvidence.questionSummary.trim().length === 0 ||
      questionEvidence.answerSummary.trim().length === 0 ||
      questionEvidence.answerEvidenceCount < 1)
  ) {
    return {
      accept: false,
      reason: 'missing readable question/answer evidence',
      isQuestionPost,
      finalStatus: 'generic_info',
    };
  }

  const verification = classifyReviewWithoutBody(
    {
      ...review,
      summary: review.summary,
      content: bodyText,
    },
    buildVerificationContext(
      kindergarten,
      buildCoreNameFrequencyMap([kindergarten])
    )
  );

  if (verification.finalStatus !== 'verified') {
    return {
      accept: false,
      reason: `verification rejected: ${verification.finalStatus}`,
      isQuestionPost,
      finalStatus: verification.finalStatus,
    };
  }

  return {
    accept: true,
    reason: 'verified',
    isQuestionPost,
    finalStatus: verification.finalStatus,
  };
}

function countVerifiedLinks(
  regionData: ReviewsData,
  kindergartens: readonly KindergartenEntry[]
): number {
  const kindergartenMap = new Map(
    kindergartens.map((kindergarten) => [kindergarten.kindercode, kindergarten])
  );
  const coreNameFrequencies = buildCoreNameFrequencyMap([...kindergartens]);
  let verifiedCount = 0;

  for (const [kindergartenId, reviews] of Object.entries(regionData.reviews)) {
    const kindergarten = kindergartenMap.get(kindergartenId);
    if (!kindergarten) {
      continue;
    }

    const context = buildVerificationContext(kindergarten, coreNameFrequencies);
    for (const review of reviews) {
      const classification = classifyReviewWithoutBody(review, context);
      if (classification.finalStatus === 'verified') {
        verifiedCount += 1;
      }
    }
  }

  return verifiedCount;
}

function countQnaCompleteReviews(regionData: ReviewsData): number {
  let count = 0;

  for (const reviews of Object.values(regionData.reviews)) {
    for (const review of reviews) {
      const questionSummary = review.structuredFields?.questionSummary;
      const answerSummary = review.structuredFields?.answerSummary;
      const isQuestionTagged = review.tags?.includes('질문글') === true;

      if (
        isQuestionTagged &&
        typeof questionSummary === 'string' &&
        questionSummary.trim().length > 0 &&
        typeof answerSummary === 'string' &&
        answerSummary.trim().length > 0
      ) {
        count += 1;
      }
    }
  }

  return count;
}

export function computeReviewCollectionMetrics(params: {
  kindergartens: readonly KindergartenEntry[];
  regionData: ReviewsData;
  addedReviews: readonly ReviewLink[];
  addedVerificationStatuses: readonly ReviewVerificationStatus[];
  diagnostics: ReviewCollectionDiagnostics;
  targetSidoCode?: string;
}): ReviewCollectionMetrics {
  const {
    kindergartens,
    regionData,
    addedReviews,
    addedVerificationStatuses,
    diagnostics,
    targetSidoCode = '28',
  } = params;
  const targetKindergartens = kindergartens.filter(
    (kindergarten) => kindergarten.sido_code === targetSidoCode
  );
  let coverageAt1Count = 0;
  let coverageAt3Count = 0;

  for (const kindergarten of targetKindergartens) {
    const reviewCount = regionData.reviews[kindergarten.kindercode]?.length ?? 0;
    if (reviewCount >= 1) {
      coverageAt1Count += 1;
    }
    if (reviewCount >= 3) {
      coverageAt3Count += 1;
    }
  }

  const addedLinkCount = addedReviews.length;
  const addedLinkVerifiedCount = addedVerificationStatuses.filter(
    (status) => status === 'verified'
  ).length;
  const crossKindergartenErrorCount = addedVerificationStatuses.filter(
    (status) => status === 'mismatch'
  ).length;
  const addedQuestionReviews = addedReviews.filter(
    (review) => review.tags?.includes('질문글') === true
  );
  const completeQuestionReviews = addedQuestionReviews.filter((review) => {
    const questionSummary = review.structuredFields?.questionSummary;
    const answerSummary = review.structuredFields?.answerSummary;
    return (
      typeof questionSummary === 'string' &&
      questionSummary.trim().length > 0 &&
      typeof answerSummary === 'string' &&
      answerSummary.trim().length > 0
    );
  });
  const qnaSummaryCompleteness =
    addedQuestionReviews.length === 0
      ? 1
      : ratio(completeQuestionReviews.length, addedQuestionReviews.length);
  const incheonVerifiedLinkCount = countVerifiedLinks(regionData, targetKindergartens);
  const incheonQnaCompleteCount = countQnaCompleteReviews(regionData);
  const coverageAt1Ratio = ratio(coverageAt1Count, targetKindergartens.length);
  const coverageAt3Ratio = ratio(coverageAt3Count, targetKindergartens.length);
  const researchScore =
    1000 * coverageAt1Ratio +
    100 * coverageAt3Ratio +
    10 * incheonVerifiedLinkCount +
    5 * incheonQnaCompleteCount;

  return {
    targetSidoCode,
    targetKindergartenCount: targetKindergartens.length,
    incheonVisibleReviewCount: regionData.totalCount,
    incheonCoverageAt1Count: coverageAt1Count,
    incheonCoverageAt1Ratio: coverageAt1Ratio,
    incheonCoverageAt3Count: coverageAt3Count,
    incheonCoverageAt3Ratio: coverageAt3Ratio,
    incheonVerifiedLinkCount,
    incheonQnaCompleteCount,
    addedLinkCount,
    addedLinkVerifiedCount,
    addedLinkVerifiedRate: ratio(addedLinkVerifiedCount, addedLinkCount),
    crossKindergartenErrorCount,
    qnaSummaryCompleteness,
    researchScore: Number(researchScore.toFixed(6)),
    diagnostics,
  };
}

export function evaluateReviewCollectionGates(
  metrics: ReviewCollectionMetrics,
  secondaryReport: Pick<
    ReviewQualityEvaluationReport,
    'binaryKeepRemove'
  >
): ReviewCollectionGateResult {
  const failures: string[] = [];

  if (secondaryReport.binaryKeepRemove.precision < 0.99) {
    failures.push(
      `global binary precision ${secondaryReport.binaryKeepRemove.precision.toFixed(6)} below 0.99`
    );
  }
  if (secondaryReport.binaryKeepRemove.f1 < 0.995) {
    failures.push(
      `global binary f1 ${secondaryReport.binaryKeepRemove.f1.toFixed(6)} below 0.995`
    );
  }
  if (
    metrics.addedLinkCount > 0 &&
    metrics.addedLinkVerifiedRate < 0.95
  ) {
    failures.push(
      `added link verified rate ${metrics.addedLinkVerifiedRate.toFixed(6)} below 0.95`
    );
  }
  if (metrics.crossKindergartenErrorCount !== 0) {
    failures.push(
      `cross kindergarten error count ${metrics.crossKindergartenErrorCount} is not zero`
    );
  }
  if (metrics.qnaSummaryCompleteness !== 1) {
    failures.push(
      `qna summary completeness ${metrics.qnaSummaryCompleteness.toFixed(6)} is not 1.0`
    );
  }

  return {
    passed: failures.length === 0,
    failures,
  };
}

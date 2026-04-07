import type {
  ReviewAuditApplySummary,
  ReviewAuditBatchItem,
  ReviewAuditEntry,
  ReviewAuditStats,
  ReviewLink,
  ReviewsData,
  ReviewVerificationStateEntry,
  ReviewVerificationStatus,
} from '../../../src/types/review';
import {
  analyzeReviewEvidence,
  buildKindergartenCoreName,
  classifyReviewWithoutBody,
  normalizeReviewUrl,
} from '../../../src/lib/utils/review-verification';
import {
  buildCoreNameFrequencyMap,
  buildReviewCollisionResolutionMap,
  type KindergartenEntry,
  type LoadedReviewEntry,
} from '../../lib/review-verification-pipeline';

// ============================================================================
// Naver Place review body classification
// ----------------------------------------------------------------------------
// 네이버 플레이스 리뷰 snippet 구조:
//   "{닉네임?} 리뷰 {N(,M)?} (사진 K)? (팔로워 J)? (digit?) {본문?} {N번째 방문}? {결제내역}?"
// snippet 안에 본문이 비어 있거나 매우 짧으면 (별점/태그-only 리뷰) 정보 가치가
// 거의 없으므로 generic_info로 정리합니다. 본문에 다른 업종 키워드가 끼어 있으면
// 매핑이 잘못된 케이스이므로 동일하게 generic_info로 정리합니다.
// ============================================================================

const NAVER_PLACE_HEADER_PATTERN =
  /^.{0,30}?리뷰\s+[\d,]+\s*(?:사진\s*[\d,]+\s*)?(?:팔로워\s*[\d,]+\s*)?(?:\d+\s+)?/;
const NAVER_PLACE_SUFFIX_PATTERN =
  /\s*(?:\d+\s*번째\s*방문)?\s*(?:결제내역)?\s*$/;
const NAVER_PLACE_TRUNCATION_PATTERN = /\s*더보기\s*\d*\.?\d*\.?[가-힣]?\s*$/;

// v2 (cycle 2): 본문 길이 임계값을 10 → 15자로 올렸습니다. 한 단어 짧은 인사
// (예: "감사합니다 ~^^") 같은 정보 가치 없는 본문을 추가로 정리하기 위함입니다.
const NAVER_PLACE_MIN_BODY_LENGTH = 15;

// TIER 1 — 유치원 고유 신호. 다른 업종에서 등장할 가능성이 거의 없습니다.
// 본문에 이 신호가 하나라도 있으면 verified 후보입니다.
const NAVER_PLACE_KG_TIER1_PATTERN =
  /(유치원|어린이집|원장|원감|원아|원생|등원|하원|등하원|입학설명회|입학상담|졸업식|졸업\s?기념|재롱잔치|학예회|숲체험|학부모|학부형|어머님|연계초등학교|체험학습|만\s?[345]\s?세\s?반|방과후\s?과정|특별\s?활동|급식|간식|연령별\s?반)/;

// TIER 2 — 학원/수영장/애견유치원 등에서도 흔히 쓰이는 약한 신호.
// TIER 1이 없을 때는 본문 길이가 25자 이상인 경우에만 verified를 허용합니다.
const NAVER_PLACE_KG_TIER2_PATTERN =
  /(선생님|쌤들|담임|아이가|아이들|우리아이|첫째|둘째|셋째|보내고|다니고|다녀|보냈|다녔|적응)/;

// HARD off-topic — 본문에 이 패턴이 있으면 TIER 1/2 신호와 무관하게 무조건
// generic_info로 정리합니다 (예: "애견유치원" 매핑 오류). 정밀한 다어절
// 패턴만 사용해 false positive를 최소화합니다.
const NAVER_PLACE_OFFTOPIC_PATTERNS: ReadonlyArray<RegExp> = [
  // 애견호텔/펫 케어
  /(애견(?:유치원|학교|호텔|미용|카페|샵|훈련|복지|교육|돌봄)|강아지(?:호텔|미용|유치원|놀이|훈련)|반려동물|동물병원|펫(?:호텔|샵|시터|미용))/,
  // 수영장 (학촌유치원이 수영장으로 잘못 매핑된 사례)
  /(수영장|수영\s?잘\s?배|수영\s?수업|수영\s?다닌|수영\s?실력|수온\s?수질)/,
  // 음식점 (확실한 식당 시그널)
  /(맛집|맛있어요|맛있음|맛있고|맛있는|존맛|꿀맛|먹방|음식점|식당|레스토랑|디저트)/,
  /(족발|곱창|치킨집|치킨이|피자집|국밥|국수|돈까스|우동|냉면|짜장면|짬뽕|돼지국밥|수제버거)/,
  // 카페/음료
  /(아메리카노|라떼|에스프레소|디카페인|카페모카|프라푸치노|카페\s?내부|음료\s?(?:저렴|맛|좋|친절))/,
  /(빵(?:이|도|집).*맛|빵.*맛있)/,
  // 패션/잡화
  /(폴햄|유니클로|티셔츠|운동화|스니커즈|구두\s?쇼핑|블라우스|원피스\s?추천)/,
  // 잡화 매장
  /(다이소|올리브영|편의점|문구점|서점)/,
  // 자동차/주유/세탁
  /(주유소|세차|카센터|타이어|엔진오일|블랙박스|코인세탁|빨래방)/,
  // 미용/뷰티
  /(네일아트|네일샵|미용실|속눈썹|피부관리실|왁싱|마사지샵)/,
  // 부동산/분양
  /(분양|모델하우스|오피스텔|매매|전세|월세|입주청소|이사청소)/,
  // 운동/체육 시설 (성인 대상)
  /(헬스장|필라테스|요가원|복싱장|골프장|크로스핏|클라이밍)/,
  // 학원 (유치원 아님)
  /(태권도장|태권도학원|미술학원|영어학원|수학교습소|논술학원|보습학원|음악학원)/,
  // 의료
  /(치과\s?진료|한의원|안과\s?진료|피부과|성형외과|내과\s?진료|소아과\s?진료)/,
  // 관공서/민원
  /(여권\s?(?:발급|만들|민원|신청)|민원과|구청\s?민원|시청\s?민원)/,
  // 결제내역만 있는 영수증성 리뷰
  /(학교\s?방과후\s?결재|방과후\s?결재)/,
];

// SOFT off-topic — 단일 키워드만으로는 false positive 위험이 있어
// 개별 분류엔 사용하지 않지만, 한 유치원에 여러 건이 누적되면 매핑 오류로
// 판단합니다 (`detectMismappedNaverPlaceKindergartens`).
const NAVER_PLACE_SOFT_OFFTOPIC_PATTERN =
  /(피아노|바이올린|첼로|미술수업|미술학원|미술교실|발레|줄넘기|복싱|크로스핏|수영|애견|강아지|반려|호텔장|호텔케어|곱창|치킨이|빵이|카페내부|커피|아메리카노|편의점|빨래방|세차|여권)/;

export function extractNaverPlaceReviewBody(
  snippet: string | null | undefined
): string {
  if (!snippet) {
    return '';
  }
  let trimmed = snippet.trim();
  trimmed = trimmed.replace(NAVER_PLACE_TRUNCATION_PATTERN, '').trim();
  trimmed = trimmed.replace(NAVER_PLACE_SUFFIX_PATTERN, '').trim();
  trimmed = trimmed.replace(NAVER_PLACE_HEADER_PATTERN, '').trim();
  return trimmed;
}

export interface NaverPlaceClassificationResult {
  status: 'verified' | 'generic_info' | 'mismatch' | 'advertorial';
  confidence: number;
  reason: string;
  body: string;
  bodyLength: number;
}

const NAVER_PLACE_TIER2_MIN_LENGTH = 25;

export function classifyNaverPlaceReview(
  input: {
    snippet?: string | null;
    title?: string | null;
    summary?: string | null;
  },
  context: { mismappedKindergarten?: boolean } = {}
): NaverPlaceClassificationResult {
  const candidates = [input.summary, input.snippet, input.title].filter(
    (value): value is string => typeof value === 'string' && value.length > 0
  );
  const longest =
    candidates.toSorted((left, right) => right.length - left.length)[0] ?? '';
  const body = extractNaverPlaceReviewBody(longest);
  const bodyLength = body.length;

  // 가장 우선: 이 유치원이 다른 업종으로 잘못 매핑된 것이 확인된 경우
  if (context.mismappedKindergarten) {
    return {
      status: 'generic_info',
      confidence: 0.9,
      reason:
        'naver_place: kindergarten place_id appears mismapped (aggregate off-topic signals across reviews)',
      body,
      bodyLength,
    };
  }

  if (bodyLength === 0) {
    return {
      status: 'generic_info',
      confidence: 0.92,
      reason: 'naver_place: header-only review (no body content)',
      body,
      bodyLength,
    };
  }

  if (bodyLength < NAVER_PLACE_MIN_BODY_LENGTH) {
    return {
      status: 'generic_info',
      confidence: 0.88,
      reason: `naver_place: body too short (${bodyLength} chars)`,
      body,
      bodyLength,
    };
  }

  // HARD off-topic은 유치원 신호와 무관하게 무조건 demote
  for (const pattern of NAVER_PLACE_OFFTOPIC_PATTERNS) {
    const match = pattern.exec(body);
    if (match) {
      return {
        status: 'generic_info',
        confidence: 0.85,
        reason: `naver_place: off-topic signal "${match[0]}" (likely mapping/scrape error)`,
        body,
        bodyLength,
      };
    }
  }

  const hasTier1 = NAVER_PLACE_KG_TIER1_PATTERN.test(body);
  const hasTier2 = NAVER_PLACE_KG_TIER2_PATTERN.test(body);

  if (!hasTier1 && !hasTier2) {
    return {
      status: 'generic_info',
      confidence: 0.78,
      reason: 'naver_place: no kindergarten signal in body',
      body,
      bodyLength,
    };
  }

  if (hasTier1) {
    return {
      status: 'verified',
      confidence: 0.88,
      reason: 'naver_place: substantive body with kindergarten-specific signal',
      body,
      bodyLength,
    };
  }

  // Tier2만 있음 — 본문 길이가 충분히 길어야 verified로 통과시킴
  if (bodyLength >= NAVER_PLACE_TIER2_MIN_LENGTH) {
    return {
      status: 'verified',
      confidence: 0.82,
      reason: 'naver_place: substantive body with weak kindergarten signal',
      body,
      bodyLength,
    };
  }

  return {
    status: 'generic_info',
    confidence: 0.78,
    reason: `naver_place: only weak signal in short body (${bodyLength} chars)`,
    body,
    bodyLength,
  };
}

// ----------------------------------------------------------------------------
// 매핑 오류 탐지 (per-kindergarten aggregate)
// ----------------------------------------------------------------------------
// 한 유치원의 네이버 플레이스 리뷰가 대부분 다른 업종 키워드를 담고 있으면
// place_id가 통째로 잘못 연결된 것이므로 해당 유치원의 모든 리뷰를 정리합니다.
// (예: 학촌유치원이 수영장으로, 운정초롱유치원이 피아노학원으로 매핑된 사례)
// ----------------------------------------------------------------------------

const NAVER_PLACE_MISMAP_MIN_TOTAL = 3;
const NAVER_PLACE_MISMAP_MIN_HITS = 2;
const NAVER_PLACE_MISMAP_MIN_RATIO = 0.5;

interface NaverPlaceMismapInput {
  kindergartenId: string;
  source: string;
  snippet?: string | null;
  title?: string | null;
  summary?: string | null;
}

export function detectMismappedNaverPlaceKindergartens(
  entries: readonly NaverPlaceMismapInput[]
): Set<string> {
  const totals = new Map<string, number>();
  const hits = new Map<string, number>();

  for (const entry of entries) {
    if (entry.source !== 'naver_place') {
      continue;
    }
    const kg = entry.kindergartenId;
    totals.set(kg, (totals.get(kg) ?? 0) + 1);
    const candidates = [entry.summary, entry.snippet, entry.title].filter(
      (value): value is string => typeof value === 'string' && value.length > 0
    );
    const longest =
      candidates.toSorted((left, right) => right.length - left.length)[0] ?? '';
    const body = extractNaverPlaceReviewBody(longest);
    if (NAVER_PLACE_SOFT_OFFTOPIC_PATTERN.test(body)) {
      hits.set(kg, (hits.get(kg) ?? 0) + 1);
    }
  }

  const mismapped = new Set<string>();
  for (const [kg, total] of totals) {
    if (total < NAVER_PLACE_MISMAP_MIN_TOTAL) {
      continue;
    }
    const hitCount = hits.get(kg) ?? 0;
    if (hitCount < NAVER_PLACE_MISMAP_MIN_HITS) {
      continue;
    }
    if (hitCount / total >= NAVER_PLACE_MISMAP_MIN_RATIO) {
      mismapped.add(kg);
    }
  }
  return mismapped;
}

function ratio(numerator: number, denominator: number): number {
  if (denominator === 0) {
    return 0;
  }

  return Number((numerator / denominator).toFixed(6));
}

export function buildReviewAuditKey(
  kindergartenId: string,
  reviewId: string
): string {
  return `${kindergartenId}::${reviewId}`;
}

function buildLoadedEntries(
  reviewsData: ReviewsData,
  kindergartens: KindergartenEntry[]
): LoadedReviewEntry[] {
  const kindergartenMap = new Map(
    kindergartens.map((kindergarten) => [
      kindergarten.kindercode,
      kindergarten,
    ])
  );
  const entries: LoadedReviewEntry[] = [];

  for (const [kindergartenId, reviews] of Object.entries(reviewsData.reviews)) {
    const kindergarten = kindergartenMap.get(kindergartenId);
    if (!kindergarten) {
      continue;
    }

    for (const review of reviews) {
      entries.push({
        review,
        kindergarten,
        sidoCode: kindergarten.sido_code,
      });
    }
  }

  return entries;
}

export function parseReviewAuditJsonl(content: string): ReviewAuditEntry[] {
  return content
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line) as ReviewAuditEntry);
}

export function serializeReviewAuditJsonl(
  entries: readonly ReviewAuditEntry[]
): string {
  return `${entries.map((entry) => JSON.stringify(entry)).join('\n')}\n`;
}

export function buildReviewAuditEntryMap(
  entries: readonly ReviewAuditEntry[]
): Map<string, ReviewAuditEntry> {
  return new Map(
    entries.map((entry) => [
      buildReviewAuditKey(entry.kindergartenId, entry.reviewId),
      entry,
    ])
  );
}

function buildAuditEntryFromCurrentReview(
  review: ReviewLink,
  kindergarten: KindergartenEntry,
  coreNameFrequencies: Map<string, number>,
  collisionMap: ReturnType<typeof buildReviewCollisionResolutionMap>,
  previousEntry?: ReviewAuditEntry
): ReviewAuditEntry {
  const coreName = buildKindergartenCoreName(kindergarten.name);
  const context = {
    kindergartenId: kindergarten.kindercode,
    kindergartenName: kindergarten.name,
    kindergartenAddress: kindergarten.address,
    sidoCode: kindergarten.sido_code,
    sigunguCode: kindergarten.sigungu_code,
    coreNameFrequency: coreNameFrequencies.get(coreName) ?? 1,
  };
  const autoClassification = classifyReviewWithoutBody(review, context);
  const collision = collisionMap.get(review.id) ?? null;
  const autoStatus =
    collision?.shouldRemove === true
      ? 'mismatch'
      : autoClassification.finalStatus;
  const autoConfidence =
    collision?.shouldRemove === true
      ? Math.max(autoClassification.confidence, 0.94)
      : autoClassification.confidence;
  const autoReasons = collision?.shouldRemove === true
    ? [...autoClassification.reasons, collision.reason]
    : autoClassification.reasons;

  return {
    reviewId: review.id,
    kindergartenId: kindergarten.kindercode,
    kindergartenName: kindergarten.name,
    kindergartenAddress: kindergarten.address,
    sidoCode: kindergarten.sido_code,
    sigunguCode: kindergarten.sigungu_code,
    normalizedUrl: normalizeReviewUrl(review.url),
    url: review.url,
    source: review.source,
    sourceName: review.sourceName,
    title: review.title,
    snippet: review.snippet,
    summary: review.summary,
    date: review.date,
    collectedAt: review.collectedAt,
    currentShipped: true,
    autoStatus,
    autoConfidence,
    autoReasons,
    finalAuditStatus: previousEntry?.finalAuditStatus ?? null,
    auditReason: previousEntry?.auditReason ?? null,
    reviewedAt: previousEntry?.reviewedAt ?? null,
    reviewedBy: previousEntry?.reviewedBy ?? null,
  };
}

export interface BuildReviewAuditEntriesOptions {
  currentReviewsData: ReviewsData;
  kindergartens: KindergartenEntry[];
  previousEntries?: ReviewAuditEntry[];
}

export function buildReviewAuditEntries(
  options: BuildReviewAuditEntriesOptions
): ReviewAuditEntry[] {
  const {
    currentReviewsData,
    kindergartens,
    previousEntries = [],
  } = options;
  const previousEntryMap = buildReviewAuditEntryMap(previousEntries);
  const kindergartenMap = new Map(
    kindergartens.map((kindergarten) => [
      kindergarten.kindercode,
      kindergarten,
    ])
  );
  const coreNameFrequencies = buildCoreNameFrequencyMap(kindergartens);
  const loadedEntries = buildLoadedEntries(currentReviewsData, kindergartens);
  const collisionMap = buildReviewCollisionResolutionMap(
    loadedEntries,
    coreNameFrequencies
  );
  const nextEntries = new Map<string, ReviewAuditEntry>();

  for (const entry of loadedEntries) {
    const key = buildReviewAuditKey(
      entry.kindergarten.kindercode,
      entry.review.id
    );
    nextEntries.set(
      key,
      buildAuditEntryFromCurrentReview(
        entry.review,
        entry.kindergarten,
        coreNameFrequencies,
        collisionMap,
        previousEntryMap.get(key)
      )
    );
  }

  for (const previousEntry of previousEntries) {
    const key = buildReviewAuditKey(
      previousEntry.kindergartenId,
      previousEntry.reviewId
    );
    if (nextEntries.has(key)) {
      continue;
    }

    const kindergarten =
      kindergartenMap.get(previousEntry.kindergartenId) ?? null;
    if (!kindergarten) {
      nextEntries.set(key, {
        ...previousEntry,
        currentShipped: false,
      });
      continue;
    }

    const coreName = buildKindergartenCoreName(kindergarten.name);
    const context = {
      kindergartenId: kindergarten.kindercode,
      kindergartenName: kindergarten.name,
      kindergartenAddress: kindergarten.address,
      sidoCode: kindergarten.sido_code,
      sigunguCode: kindergarten.sigungu_code,
      coreNameFrequency: coreNameFrequencies.get(coreName) ?? 1,
    };
    const autoClassification = classifyReviewWithoutBody(
      {
        title: previousEntry.title,
        source: previousEntry.source,
        sourceName: previousEntry.sourceName,
        snippet: previousEntry.snippet,
        summary: previousEntry.summary,
      },
      context
    );

    nextEntries.set(key, {
      ...previousEntry,
      currentShipped: false,
      autoStatus: autoClassification.finalStatus,
      autoConfidence: autoClassification.confidence,
      autoReasons: autoClassification.reasons,
    });
  }

  return Array.from(nextEntries.values()).toSorted(
    (left, right) =>
      Number(right.currentShipped) - Number(left.currentShipped) ||
      left.kindergartenId.localeCompare(right.kindergartenId) ||
      left.reviewId.localeCompare(right.reviewId)
  );
}

export function buildReviewAuditStats(
  entries: readonly ReviewAuditEntry[],
  auditPath: string
): ReviewAuditStats {
  const statuses: Array<ReviewVerificationStatus | 'unaudited'> = [
    'verified',
    'mismatch',
    'advertorial',
    'generic_info',
    'uncertain',
    'unaudited',
  ];
  const byFinalStatus = Object.fromEntries(
    statuses.map((status) => [status, 0])
  ) as Record<ReviewVerificationStatus | 'unaudited', number>;
  const visibleByFinalStatus = Object.fromEntries(
    statuses.map((status) => [status, 0])
  ) as Record<ReviewVerificationStatus | 'unaudited', number>;

  let auditedCount = 0;
  let visibleCount = 0;
  let visibleVerifiedCount = 0;

  for (const entry of entries) {
    const status = entry.finalAuditStatus ?? 'unaudited';
    byFinalStatus[status] += 1;
    if (entry.finalAuditStatus !== null) {
      auditedCount += 1;
    }
    if (!entry.currentShipped) {
      continue;
    }

    visibleCount += 1;
    visibleByFinalStatus[status] += 1;
    if (entry.finalAuditStatus === 'verified') {
      visibleVerifiedCount += 1;
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    auditPath,
    totalCount: entries.length,
    auditedCount,
    remainingCount: entries.length - auditedCount,
    visibleCount,
    visibleVerifiedCount,
    invalidVisibleCount: visibleCount - visibleVerifiedCount,
    visiblePrecision: ratio(visibleVerifiedCount, visibleCount),
    byFinalStatus,
    visibleByFinalStatus,
  };
}

function buildStateLookup(
  stateEntries: readonly ReviewVerificationStateEntry[]
): Map<string, ReviewVerificationStateEntry> {
  return new Map(
    stateEntries.map((entry) => [
      buildReviewAuditKey(entry.kindergartenId, entry.reviewId),
      entry,
    ])
  );
}

export interface BuildReviewAuditBatchOptions {
  entries: readonly ReviewAuditEntry[];
  kindergartens: KindergartenEntry[];
  stateEntries?: ReviewVerificationStateEntry[];
  batchSize?: number;
  includeReviewed?: boolean;
}

export function buildReviewAuditBatch(
  options: BuildReviewAuditBatchOptions
): ReviewAuditBatchItem[] {
  const {
    entries,
    kindergartens,
    stateEntries = [],
    batchSize = 50,
    includeReviewed = false,
  } = options;
  const kindergartenMap = new Map(
    kindergartens.map((kindergarten) => [
      kindergarten.kindercode,
      kindergarten,
    ])
  );
  const coreNameFrequencies = buildCoreNameFrequencyMap(kindergartens);
  const currentVisibleEntries = entries.filter((entry) => entry.currentShipped);
  const collisionMap = buildReviewCollisionResolutionMap(
    currentVisibleEntries.flatMap((entry) => {
      const kindergarten = kindergartenMap.get(entry.kindergartenId);
      if (!kindergarten) {
        return [];
      }

      return [
        {
          review: {
            id: entry.reviewId,
            kindergartenId: entry.kindergartenId,
            title: entry.title,
            url: entry.url,
            source: entry.source,
            sourceName: entry.sourceName,
            snippet: entry.snippet,
            summary: entry.summary,
            date: entry.date,
            collectedAt: entry.collectedAt,
          },
          kindergarten,
          sidoCode: entry.sidoCode,
        } satisfies LoadedReviewEntry,
      ];
    }),
    coreNameFrequencies
  );
  const stateLookup = buildStateLookup(stateEntries);

  const prioritized = entries
    .filter((entry) => includeReviewed || entry.finalAuditStatus === null)
    .map((entry) => {
      const kindergarten = kindergartenMap.get(entry.kindergartenId);
      const priorityReasons: string[] = [];
      let priorityScore = entry.currentShipped ? 100 : 0;

      if (!kindergarten) {
        priorityReasons.push('kindergarten metadata missing');
        priorityScore += 5;

        return {
          ...entry,
          priorityScore,
          priorityReasons,
          directNameEvidence: false,
          locationValid: false,
          institutionMentionCount: 0,
          otherInstitutionMentionCount: 0,
          collisionGroupSize: 0,
          stateVerifiedWithoutDirectName: false,
        } satisfies ReviewAuditBatchItem;
      }

      const coreName = buildKindergartenCoreName(kindergarten.name);
      const context = {
        kindergartenId: kindergarten.kindercode,
        kindergartenName: kindergarten.name,
        kindergartenAddress: kindergarten.address,
        sidoCode: kindergarten.sido_code,
        sigunguCode: kindergarten.sigungu_code,
        coreNameFrequency: coreNameFrequencies.get(coreName) ?? 1,
      };
      const analysis = analyzeReviewEvidence(
        {
          title: entry.title,
          snippet: entry.snippet,
          summary: entry.summary,
          source: entry.source,
          sourceName: entry.sourceName,
        },
        context
      );
      const stateEntry =
        stateLookup.get(buildReviewAuditKey(entry.kindergartenId, entry.reviewId)) ??
        null;
      const collision = collisionMap.get(entry.reviewId) ?? null;
      const stateVerifiedWithoutDirectName =
        stateEntry?.finalStatus === 'verified' &&
        !analysis.hasDirectInstitutionEvidence;

      if (entry.currentShipped && entry.autoConfidence < 0.9) {
        priorityScore += 60;
        priorityReasons.push('visible + low confidence');
      }
      if (collision) {
        priorityScore += 50 + collision.groupSize;
        priorityReasons.push('global collision');
      }
      if (analysis.signals.institutionMentions.length >= 3) {
        priorityScore += 40;
        priorityReasons.push('multi-school mention');
      }
      if (!analysis.signals.locationValid) {
        priorityScore += 30;
        priorityReasons.push('location mismatch');
      }
      if (stateVerifiedWithoutDirectName) {
        priorityScore += 20;
        priorityReasons.push('state reused without direct-name evidence');
      }
      if (
        analysis.signals.contentType === 'question' ||
        analysis.signals.contentType === 'info_list' ||
        analysis.signals.contentType === 'template'
      ) {
        priorityScore += 10;
        priorityReasons.push(`contentType:${analysis.signals.contentType}`);
      }

      return {
        ...entry,
        priorityScore,
        priorityReasons,
        directNameEvidence: analysis.hasDirectInstitutionEvidence,
        locationValid: analysis.signals.locationValid,
        institutionMentionCount: analysis.signals.institutionMentions.length,
        otherInstitutionMentionCount:
          analysis.signals.otherInstitutionMentions.length,
        collisionGroupSize: collision?.groupSize ?? 0,
        stateVerifiedWithoutDirectName,
      } satisfies ReviewAuditBatchItem;
    })
    .toSorted(
      (left, right) =>
        Number(right.currentShipped) - Number(left.currentShipped) ||
        right.priorityScore - left.priorityScore ||
        left.autoConfidence - right.autoConfidence ||
        left.kindergartenId.localeCompare(right.kindergartenId) ||
        left.reviewId.localeCompare(right.reviewId)
    );

  return prioritized.slice(0, Math.max(batchSize, 0));
}

export interface ApplyReviewAuditToRegionResult {
  nextData: ReviewsData;
  summary: ReviewAuditApplySummary;
}

function buildEmptyApplySummary(): ReviewAuditApplySummary {
  return {
    removedInvalid: 0,
    removedUnaudited: 0,
    removedMissingAudit: 0,
    keptVerified: 0,
    recoveredFromAudit: 0,
  };
}

function auditEntryToReviewLink(entry: ReviewAuditEntry): ReviewLink {
  return {
    id: entry.reviewId,
    kindergartenId: entry.kindergartenId,
    title: entry.title,
    url: entry.url,
    source: entry.source,
    sourceName: entry.sourceName,
    snippet: entry.snippet,
    summary: entry.summary,
    date: entry.date,
    collectedAt: entry.collectedAt,
  };
}

export function applyReviewAuditToRegionData(
  regionData: ReviewsData,
  auditEntries: readonly ReviewAuditEntry[],
  regionSidoCode?: string
): ApplyReviewAuditToRegionResult {
  const auditEntryMap = buildReviewAuditEntryMap(auditEntries);
  const summary = buildEmptyApplySummary();
  const nextReviews: ReviewsData['reviews'] = {};
  const existingKeys = new Set<string>();

  for (const [kindergartenId, reviews] of Object.entries(regionData.reviews)) {
    const kept = reviews.filter((review) => {
      const key = buildReviewAuditKey(kindergartenId, review.id);
      existingKeys.add(key);
      const auditEntry = auditEntryMap.get(key) ?? null;

      if (!auditEntry) {
        summary.removedMissingAudit += 1;
        return false;
      }

      if (auditEntry.finalAuditStatus === 'verified') {
        summary.keptVerified += 1;
        return true;
      }

      if (auditEntry.finalAuditStatus === null) {
        summary.removedUnaudited += 1;
        return false;
      }

      summary.removedInvalid += 1;
      return false;
    });

    if (kept.length > 0) {
      nextReviews[kindergartenId] = kept;
    }
  }

  for (const entry of auditEntries) {
    if (entry.finalAuditStatus !== 'verified') {
      continue;
    }

    if (regionSidoCode && entry.sidoCode !== regionSidoCode) {
      continue;
    }

    const key = buildReviewAuditKey(entry.kindergartenId, entry.reviewId);
    if (existingKeys.has(key)) {
      continue;
    }

    if (!nextReviews[entry.kindergartenId]) {
      nextReviews[entry.kindergartenId] = [];
    }
    nextReviews[entry.kindergartenId].push(auditEntryToReviewLink(entry));
    summary.recoveredFromAudit += 1;
  }

  return {
    nextData: {
      version: new Date().toISOString().split('T')[0],
      totalCount: Object.values(nextReviews).reduce(
        (accumulator, items) => accumulator + items.length,
        0
      ),
      kindergartenCount: Object.keys(nextReviews).length,
      reviews: nextReviews,
    },
    summary,
  };
}

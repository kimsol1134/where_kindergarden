import type {
  ReviewLink,
  ReviewRejectedStatus,
  ReviewVerificationMetadata,
  ReviewVerificationSignals,
  ReviewVerificationStatus,
} from '@/types/review';
import type { ContentType } from './review-utils';
import {
  SPAM_SNIPPET_PATTERNS,
  UNIFIED_SPAM_TITLE_PATTERNS,
  classifyContentType,
  validateLocationMatch,
} from './review-utils';

interface PatternDefinition {
  label: string;
  pattern: RegExp;
}

export interface KindergartenVerificationContext {
  kindergartenId: string;
  kindergartenName: string;
  kindergartenAddress: string;
  sidoCode: string;
  sigunguCode: string;
  coreNameFrequency: number;
}

export interface ReviewBodyVerificationResult {
  finalStatus: ReviewVerificationStatus;
  confidence: number;
  reasons: string[];
  signals: ReviewVerificationSignals;
}

export interface ReviewFallbackVerificationResult {
  finalStatus: ReviewVerificationStatus;
  confidence: number;
  reasons: string[];
  signals: ReviewVerificationSignals;
}

const GENERIC_CORE_NAMES = new Set([
  '가나',
  '고운',
  '꿈나무',
  '꿈동산',
  '리틀',
  '무지개',
  '미래',
  '사랑',
  '새싹',
  '서울',
  '세종',
  '예닮',
  '예람',
  '예림',
  '예원',
  '예일',
  '열린',
  '은혜',
  '자연',
  '중앙',
  '참사랑',
  '하나',
  '하늘',
  '행복',
  '행복한',
]);

const REVIEW_INDICATOR_PATTERNS: PatternDefinition[] = [
  { label: '후기', pattern: /후기|리뷰|솔직/i },
  { label: '설명회', pattern: /설명회|오리엔테이션|ot\b/i },
  { label: '입학', pattern: /입학|입소|등록|면접/i },
  { label: '재원', pattern: /재원생|다녀보니|보내보니|다녔어요|보냈어요|다닙니다/i },
  { label: '졸업', pattern: /졸업|수료/i },
  { label: '행사', pattern: /운동회|학예회|발표회|소풍|행사/i },
];

const FIRSTHAND_PATTERNS: PatternDefinition[] = [
  { label: '학부모시점', pattern: /학부모|엄마|부모님/i },
  { label: '우리아이', pattern: /우리\s*아이|저희\s*아이|아이를/i },
  { label: '보내봄', pattern: /보내보니|보냈어요|다녀보니|다녔어요|다니는/i },
  { label: '재원경험', pattern: /재원생|졸업생|적응/i },
];

const SCHOOL_DETAIL_PATTERNS: PatternDefinition[] = [
  { label: '원비', pattern: /원비|비용|학비/i },
  { label: '급식', pattern: /급식|식단|간식/i },
  { label: '버스', pattern: /통학버스|통학 차량|버스/i },
  { label: '교사', pattern: /선생님|교사|원장님/i },
  { label: '시설', pattern: /시설|교실|놀이터|환경|안전/i },
  { label: '프로그램', pattern: /프로그램|커리큘럼|방과후|특성화|놀이/i },
  { label: '생활', pattern: /등원|하원|반편성|준비물/i },
];

const GENERIC_INFO_PATTERNS: PatternDefinition[] = [
  { label: '질문글', pattern: /추천.*해\s*주세요|알려\s*주세요|어떤가요|어떨까요|궁금/i },
  { label: '정보나열', pattern: /총정리|모음|리스트|현황|한눈에\s*보기/i },
  { label: '정책안내', pattern: /정책|지원금|교육청|공고|신청방법|접수기간|모집요강/i },
  { label: '일반안내', pattern: /정보\s*공유|추가모집|안내문|가이드/i },
];

const ADVERTORIAL_PATTERNS: PatternDefinition[] = [
  { label: '광고성문구', pattern: /업체|홍보|광고|협찬|체험단|제휴|마케팅/i },
  { label: '문의유도', pattern: /상담\s*문의|예약\s*문의|견적|문의주세요|연락처/i },
  { label: '행사대행', pattern: /출장|섭외|시공|납품|대행|포트폴리오/i },
  { label: '상업주제', pattern: /부동산|모델하우스|분양|시장\s*후기|맛집|카페|상품|할인/i },
  {
    label: '학원광고',
    pattern:
      /태권도|영어학원|수학학원|피아노학원|미술학원|교습소|러닝센터|학원\s*(추천|광고|홍보|문의)/i,
  },
];

const INACCESSIBLE_BODY_PATTERNS: PatternDefinition[] = [
  { label: '로그인필요', pattern: /로그인해주세요|다시 한번 비밀번호 확인/i },
  { label: '카페가입필요', pattern: /카페에 가입 하시려면|회원만 가입할 수 있습니다/i },
  { label: '멤버전용', pattern: /멤버목록 비공개|멤버에게만 공개/i },
  { label: '네이버크롬', pattern: /카페홈 가입한 카페의 활동 알림|네이버앱 알림으로 카페앱 설치/i },
];

const FALLBACK_VERIFIED_PATTERNS: PatternDefinition[] = [
  { label: '상세후기', pattern: /후기\s*-\s*|입학설명회|설명회 후기|보내보니|다녀왔어요/i },
  { label: '구조화평가', pattern: /기본 정보|종합평가|환경 및 시설|시설만족|재원년도/i },
  { label: '상세정보', pattern: /선생님|교육환경|외부활동|방과후|급식|시설/i },
];

const FALLBACK_GENERIC_INFO_PATTERNS: PatternDefinition[] = [
  { label: '명단공개', pattern: /명단 공개|안심 유치원/i },
  { label: '정리글', pattern: /완전정리|일정 정리|학군|총정리/i },
  { label: '제도안내', pattern: /유보통합포털|처음학교로|원서접수 결과|입학관리시스템/i },
  { label: '일반정보', pattern: /어린이집\/유치원\/초중고 정보|유치원 정보/i },
];

const FALLBACK_ADVERTORIAL_PATTERNS: PatternDefinition[] = [
  { label: '부동산', pattern: /실거주|분양|부동산|모델하우스/i },
  { label: '상업시설', pattern: /헬스|줄넘기 클럽|미술학원|주방용품/i },
];

const FALLBACK_MISMATCH_PATTERNS: PatternDefinition[] = [
  { label: '일상글', pattern: /일기|폐렴|문방구|탐방기/i },
];

function collectPatternLabels(
  text: string,
  definitions: PatternDefinition[]
): string[] {
  return definitions
    .filter(({ pattern }) => pattern.test(text))
    .map(({ label }) => label);
}

export function normalizeReviewText(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[^\p{L}\p{N}]/gu, '');
}

export function normalizeReviewUrl(url: string): string {
  return url
    .replace(/^https?:\/\//i, '')
    .replace(/\/$/, '')
    .toLowerCase();
}

export function buildKindergartenCoreName(name: string): string {
  return name
    .replace(/(?:유치원|어린이집)$/, '')
    .replace(/병설$/, '')
    .trim();
}

export function isGenericCoreName(
  coreName: string,
  frequency: number
): boolean {
  const normalizedCore = normalizeReviewText(coreName);
  return (
    normalizedCore.length <= 2 ||
    frequency > 1 ||
    GENERIC_CORE_NAMES.has(coreName)
  );
}

export function extractInstitutionMentions(text: string): string[] {
  const mentions = new Map<string, string>();
  const pattern =
    /(?:^|[\s"'([{>])([가-힣A-Za-z0-9][가-힣A-Za-z0-9\s]{0,18}?(?:병설)?(?:유치원|어린이집))/g;

  for (const match of text.matchAll(pattern)) {
    const rawMention = match[1]?.trim();
    const mention = rawMention
      ? rawMention.match(/([가-힣A-Za-z0-9]+(?:초등학교병설)?(?:유치원|어린이집))/g)?.at(-1) ??
        rawMention
      : undefined;
    if (!mention) {
      continue;
    }

    const normalized = normalizeReviewText(mention);
    if (normalized.length < 3 || buildKindergartenCoreName(mention).length < 2) {
      continue;
    }

    if (!mentions.has(normalized)) {
      mentions.set(normalized, mention);
    }
  }

  return Array.from(mentions.values());
}

function buildSignals(
  title: string,
  snippet: string,
  context: KindergartenVerificationContext,
  textOverride?: string
): ReviewVerificationSignals {
  const text = textOverride ?? `${title} ${snippet}`;
  const normalizedText = normalizeReviewText(text);
  const fullNameNormalized = normalizeReviewText(context.kindergartenName);
  const coreName = buildKindergartenCoreName(context.kindergartenName);
  const coreNameNormalized = normalizeReviewText(coreName);
  const genericCoreName = isGenericCoreName(
    coreName,
    context.coreNameFrequency
  );
  const directNameMatch =
    fullNameNormalized.length >= 3 &&
    normalizedText.includes(fullNameNormalized);
  const coreNameMatch =
    coreNameNormalized.length >= 2 &&
    normalizedText.includes(coreNameNormalized);
  const genericCoreOnly = !directNameMatch && coreNameMatch && genericCoreName;

  const contentType: ContentType = classifyContentType(title, snippet);
  const locationValidation = validateLocationMatch(
    text,
    context.sidoCode,
    context.kindergartenAddress
  );
  const institutionMentions = extractInstitutionMentions(text);
  const otherInstitutionMentions = institutionMentions.filter((mention) => {
    const normalizedMention = normalizeReviewText(mention);
    if (normalizedMention.includes(fullNameNormalized)) {
      return false;
    }
    if (
      coreNameNormalized.length >= 2 &&
      normalizedMention.includes(coreNameNormalized)
    ) {
      return false;
    }
    return true;
  });

  const reviewIndicators = collectPatternLabels(text, REVIEW_INDICATOR_PATTERNS);
  const firstHandIndicators = collectPatternLabels(text, FIRSTHAND_PATTERNS);
  const schoolDetailIndicators = collectPatternLabels(
    text,
    SCHOOL_DETAIL_PATTERNS
  );
  const genericInfoIndicators = collectPatternLabels(text, GENERIC_INFO_PATTERNS);
  const advertorialIndicators = collectPatternLabels(text, ADVERTORIAL_PATTERNS);

  if (
    UNIFIED_SPAM_TITLE_PATTERNS.some((pattern) => pattern.test(title)) ||
    SPAM_SNIPPET_PATTERNS.some((pattern) => pattern.test(snippet))
  ) {
    if (
      contentType === 'template' ||
      contentType === 'question' ||
      contentType === 'info_list'
    ) {
      genericInfoIndicators.push('기존질문/정보패턴');
    } else {
      advertorialIndicators.push('기존스팸패턴');
    }
  }

  if (contentType === 'template') {
    genericInfoIndicators.push('template');
  }
  if (contentType === 'question') {
    genericInfoIndicators.push('question');
  }
  if (contentType === 'info_list') {
    genericInfoIndicators.push('info_list');
  }

  return {
    directNameMatch,
    coreNameMatch,
    genericCoreOnly,
    genericCoreName,
    locationValid: locationValidation.isValid,
    locationReason: locationValidation.isValid
      ? undefined
      : locationValidation.reason,
    contentType,
    reviewIndicators: Array.from(new Set(reviewIndicators)),
    firstHandIndicators: Array.from(new Set(firstHandIndicators)),
    schoolDetailIndicators: Array.from(new Set(schoolDetailIndicators)),
    genericInfoIndicators: Array.from(new Set(genericInfoIndicators)),
    advertorialIndicators: Array.from(new Set(advertorialIndicators)),
    institutionMentions,
    otherInstitutionMentions,
  };
}

function buildRejectedMetadata(
  signals: ReviewVerificationSignals,
  preliminaryStatus: ReviewRejectedStatus,
  reasons: string[],
  whyFlagged: string[],
  confidence: number
): ReviewVerificationMetadata {
  return {
    decision: 'reject',
    preliminaryStatus,
    confidence,
    reasons,
    whyFlagged,
    signals,
  };
}

function buildFlagReasons(signals: ReviewVerificationSignals): string[] {
  const reasons: string[] = [];

  if (!signals.directNameMatch) {
    reasons.push('정식명이 title/snippet에 직접 없음');
  }
  if (signals.genericCoreOnly) {
    reasons.push('generic core name만 매칭됨');
  }
  if (signals.otherInstitutionMentions.length > 0) {
    reasons.push('다른 유치원/어린이집명이 함께 등장');
  }
  if (signals.genericInfoIndicators.length > 0) {
    reasons.push('질문/정보글 성격');
  }
  if (
    signals.reviewIndicators.length === 0 &&
    signals.firstHandIndicators.length === 0 &&
    signals.schoolDetailIndicators.length === 0
  ) {
    reasons.push('후기성 표현이 약함');
  }
  if (!signals.locationValid && signals.locationReason) {
    reasons.push(`지역 불일치 의심: ${signals.locationReason}`);
  }

  return reasons;
}

export function assessReviewMetadata(
  review: Pick<ReviewLink, 'title' | 'snippet'>,
  context: KindergartenVerificationContext
): ReviewVerificationMetadata {
  const signals = buildSignals(review.title, review.snippet, context);
  const whyFlagged = buildFlagReasons(signals);
  const hasConcreteReviewSignals =
    signals.reviewIndicators.length > 0 ||
    signals.firstHandIndicators.length > 0 ||
    signals.schoolDetailIndicators.length > 0;

  if (
    !signals.locationValid &&
    signals.otherInstitutionMentions.length > 0 &&
    !signals.directNameMatch
  ) {
    return buildRejectedMetadata(
      signals,
      'mismatch',
      [
        `지역 불일치: ${signals.locationReason ?? '다른 지역 언급'}`,
        '타겟 외 기관명이 함께 확인됨',
      ],
      whyFlagged,
      0.9
    );
  }

  if (signals.advertorialIndicators.length > 0) {
    return buildRejectedMetadata(
      signals,
      'advertorial',
      [`광고/홍보 패턴: ${signals.advertorialIndicators.join(', ')}`],
      whyFlagged,
      0.92
    );
  }

  if (
    signals.genericInfoIndicators.length > 0 &&
    !signals.directNameMatch &&
    signals.firstHandIndicators.length === 0 &&
    signals.schoolDetailIndicators.length === 0
  ) {
    return buildRejectedMetadata(
      signals,
      'generic_info',
      [`일반 정보/질문 글 패턴: ${signals.genericInfoIndicators.join(', ')}`],
      whyFlagged,
      0.88
    );
  }

  if (
    signals.locationValid &&
    hasConcreteReviewSignals &&
    signals.otherInstitutionMentions.length === 0 &&
    (signals.directNameMatch ||
      (signals.coreNameMatch && !signals.genericCoreOnly))
  ) {
    return {
      decision: 'verified',
      preliminaryStatus: 'verified',
      confidence: signals.directNameMatch ? 0.88 : 0.8,
      reasons: ['title/snippet만으로도 해당 유치원 후기 가능성이 높음'],
      whyFlagged,
      signals,
    };
  }

  return {
    decision: 'needs_body_check',
    preliminaryStatus: 'uncertain',
    confidence: 0.45,
    reasons: ['title/snippet만으로 확정하기 어려워 본문 확인 필요'],
    whyFlagged,
    signals,
  };
}

export function assessReviewBody(
  review: Pick<ReviewLink, 'title' | 'snippet'> & { bodyText: string },
  context: KindergartenVerificationContext
): ReviewBodyVerificationResult {
  const combinedText = `${review.title} ${review.snippet} ${review.bodyText}`;
  const signals = buildSignals(
    review.title,
    review.snippet,
    context,
    combinedText
  );
  const bodyLength = review.bodyText.trim().length;
  const hasConcreteReviewSignals =
    signals.reviewIndicators.length > 0 ||
    signals.firstHandIndicators.length > 0 ||
    signals.schoolDetailIndicators.length >= 2;
  const inaccessibleIndicators = collectPatternLabels(
    review.bodyText,
    INACCESSIBLE_BODY_PATTERNS
  );

  if (inaccessibleIndicators.length > 0) {
    return {
      finalStatus: 'uncertain',
      confidence: 0.25,
      reasons: [`본문 접근 제한/카페 로그인 화면: ${inaccessibleIndicators.join(', ')}`],
      signals,
    };
  }

  if (signals.advertorialIndicators.length > 0) {
    return {
      finalStatus: 'advertorial',
      confidence: 0.93,
      reasons: [`광고/업체 홍보 신호: ${signals.advertorialIndicators.join(', ')}`],
      signals,
    };
  }

  if (
    !signals.locationValid &&
    (!signals.directNameMatch || signals.otherInstitutionMentions.length > 0)
  ) {
    return {
      finalStatus: 'mismatch',
      confidence: 0.9,
      reasons: [`지역 불일치: ${signals.locationReason ?? '다른 지역 언급'}`],
      signals,
    };
  }

  if (
    !signals.directNameMatch &&
    !signals.coreNameMatch &&
    signals.otherInstitutionMentions.length > 0
  ) {
    return {
      finalStatus: 'mismatch',
      confidence: 0.86,
      reasons: [
        `타겟 기관명은 없고 다른 기관명만 확인됨: ${signals.otherInstitutionMentions.join(
          ', '
        )}`,
      ],
      signals,
    };
  }

  if (
    signals.genericInfoIndicators.length > 0 &&
    signals.firstHandIndicators.length === 0 &&
    signals.schoolDetailIndicators.length === 0
  ) {
    return {
      finalStatus: 'generic_info',
      confidence: 0.85,
      reasons: [`정책/안내/질문 성격이 강함: ${signals.genericInfoIndicators.join(', ')}`],
      signals,
    };
  }

  if (
    hasConcreteReviewSignals &&
    signals.locationValid &&
    (signals.directNameMatch ||
      (signals.coreNameMatch && !signals.genericCoreOnly))
  ) {
    return {
      finalStatus: 'verified',
      confidence: signals.directNameMatch ? 0.93 : 0.82,
      reasons: ['본문에서 타겟 유치원과 실제 후기성 정보가 함께 확인됨'],
      signals,
    };
  }

  if (bodyLength < 80) {
    return {
      finalStatus: 'uncertain',
      confidence: 0.3,
      reasons: ['본문 텍스트가 짧고 결정적 근거가 부족함'],
      signals,
    };
  }

  if (
    signals.otherInstitutionMentions.length > 0 &&
    signals.otherInstitutionMentions.length >= signals.institutionMentions.length - 1 &&
    signals.firstHandIndicators.length === 0
  ) {
    return {
      finalStatus: 'mismatch',
      confidence: 0.74,
      reasons: ['본문의 주제가 다른 유치원일 가능성이 높음'],
      signals,
    };
  }

  return {
    finalStatus: 'uncertain',
    confidence: 0.48,
    reasons: ['본문을 봐도 자동 확정 근거가 부족함'],
    signals,
  };
}

export function assessReviewFallback(
  review: Pick<ReviewLink, 'title' | 'snippet'>,
  context: KindergartenVerificationContext
): ReviewFallbackVerificationResult {
  const signals = buildSignals(review.title, review.snippet, context);
  const text = `${review.title} ${review.snippet}`;
  const verifiedIndicators = collectPatternLabels(text, FALLBACK_VERIFIED_PATTERNS);
  const genericIndicators = collectPatternLabels(text, FALLBACK_GENERIC_INFO_PATTERNS);
  const advertorialIndicators = collectPatternLabels(
    text,
    FALLBACK_ADVERTORIAL_PATTERNS
  );
  const mismatchIndicators = collectPatternLabels(text, FALLBACK_MISMATCH_PATTERNS);

  if (advertorialIndicators.length > 0) {
    return {
      finalStatus: 'advertorial',
      confidence: 0.9,
      reasons: [`fallback 광고/상업 주제: ${advertorialIndicators.join(', ')}`],
      signals,
    };
  }

  if (
    genericIndicators.length > 0 ||
    (signals.otherInstitutionMentions.length >= 2 && !signals.directNameMatch)
  ) {
    return {
      finalStatus: 'generic_info',
      confidence: 0.85,
      reasons: [
        genericIndicators.length > 0
          ? `fallback 일반 정보/리스트 글: ${genericIndicators.join(', ')}`
          : 'fallback 여러 기관을 나열하는 정보글',
      ],
      signals,
    };
  }

  if (
    signals.locationValid &&
    signals.directNameMatch &&
    verifiedIndicators.length > 0 &&
    (signals.reviewIndicators.length > 0 ||
      signals.schoolDetailIndicators.length > 0 ||
      signals.firstHandIndicators.length > 0)
  ) {
    return {
      finalStatus: 'verified',
      confidence: 0.83,
      reasons: [`fallback 제목/snippet 기준 명확한 후기: ${verifiedIndicators.join(', ')}`],
      signals,
    };
  }

  if (
    mismatchIndicators.length > 0 ||
    (!signals.directNameMatch &&
      !signals.coreNameMatch &&
      signals.otherInstitutionMentions.length > 0)
  ) {
    return {
      finalStatus: 'mismatch',
      confidence: 0.78,
      reasons: [
        mismatchIndicators.length > 0
          ? `fallback 타겟 외 주제: ${mismatchIndicators.join(', ')}`
          : 'fallback 타겟 기관이 직접 확인되지 않음',
      ],
      signals,
    };
  }

  return {
    finalStatus: 'uncertain',
    confidence: 0.45,
    reasons: ['fallback에서도 확정하기 어려움'],
    signals,
  };
}

export function shouldKeepReviewAfterVerification(
  status: ReviewVerificationStatus
): boolean {
  return status === 'verified';
}

export function shouldRemoveReviewAfterVerification(
  status: ReviewVerificationStatus
): boolean {
  return (
    status === 'mismatch' ||
    status === 'advertorial' ||
    status === 'generic_info'
  );
}

export function resolveUncertainWithLlm(
  currentStatus: ReviewVerificationStatus,
  verdict: ReviewVerificationStatus,
  confidence: number,
  minimumConfidence = 0.8
): ReviewVerificationStatus {
  if (currentStatus !== 'uncertain') {
    return currentStatus;
  }

  if (confidence < minimumConfidence) {
    return 'uncertain';
  }

  if (verdict === 'uncertain') {
    return 'uncertain';
  }

  return verdict;
}

export function summarizeVerificationStatuses(
  statuses: ReviewVerificationStatus[]
): Record<ReviewVerificationStatus, number> {
  return statuses.reduce<Record<ReviewVerificationStatus, number>>(
    (accumulator, status) => {
      accumulator[status] += 1;
      return accumulator;
    },
    {
      verified: 0,
      mismatch: 0,
      advertorial: 0,
      generic_info: 0,
      uncertain: 0,
    }
  );
}

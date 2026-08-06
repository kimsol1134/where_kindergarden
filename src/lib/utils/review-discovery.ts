/** Stable FNV-1a shard assignment so a changing catalog order does not move
 * every kindergarten between scheduled discovery cohorts. */
export function getReviewDiscoveryShard(identifier: string, shardCount: number): number {
  if (!Number.isInteger(shardCount) || shardCount < 1) {
    throw new Error('shardCount must be a positive integer');
  }

  let hash = 0x811c9dc5;
  for (const character of identifier) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash % shardCount;
}

export function isInReviewDiscoveryShard(
  identifier: string,
  shardIndex: number,
  shardCount: number
): boolean {
  if (!Number.isInteger(shardIndex) || shardIndex < 0 || shardIndex >= shardCount) {
    throw new Error('shardIndex must be between 0 and shardCount - 1');
  }
  return getReviewDiscoveryShard(identifier, shardCount) === shardIndex;
}

const PARENT_EXPERIENCE_OR_DECISION_PATTERNS = [
  /후기|리뷰|재원(?:생)?|졸업(?:생)?|입학\s*설명회/u,
  /다녀\s*본|다녔|보내\s*(?:본|봤|고|는|니)|등원|하원/u,
  /선생님|담임|원장님|급식|간식|통학\s*버스|셔틀|원비|원복/u,
  /커리큘럼|교육\s*과정|방과후|유치원\s*시설|교실|놀이터|상담\s*후기/u,
  /유치원\s*(?:선택|비교|고민)|어떤가요|추천\s*부탁/u,
];

const VENDOR_OR_NEARBY_AD_PATTERNS = [
  /픽업\s*가능|유치원\s*(?:앞|근처)|도보\s*\d+\s*분/u,
  /수업\s*소개|수강\s*문의|상담\s*문의|예약\s*문의|원데이\s*클래스/u,
  /미술|태권도|피아노|영어\s*학원|스튜디오|아카데미|센터/u,
  /업체|시공|설치|납품|출강|섭외|체험단|공동구매/u,
];

export interface StrictReviewDiscoveryInput {
  title: string;
  snippet: string;
  sourceName?: string;
}

export interface StrictReviewDiscoveryDecision {
  eligible: boolean;
  reason: 'parent_experience_or_decision' | 'vendor_or_nearby_ad' | 'no_review_intent';
}

/**
 * The search score alone is intentionally insufficient: a page can mention a
 * kindergarten name only because a business is nearby. Strict discovery keeps
 * only parent experience or kindergarten-decision intent and quarantines ads.
 */
export function assessStrictReviewDiscoveryIntent(
  input: StrictReviewDiscoveryInput
): StrictReviewDiscoveryDecision {
  const text = `${input.title} ${input.snippet} ${input.sourceName ?? ''}`;
  if (VENDOR_OR_NEARBY_AD_PATTERNS.some((pattern) => pattern.test(text))) {
    return { eligible: false, reason: 'vendor_or_nearby_ad' };
  }
  if (PARENT_EXPERIENCE_OR_DECISION_PATTERNS.some((pattern) => pattern.test(text))) {
    return { eligible: true, reason: 'parent_experience_or_decision' };
  }
  return { eligible: false, reason: 'no_review_intent' };
}

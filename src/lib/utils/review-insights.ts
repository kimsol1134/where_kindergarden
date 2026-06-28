import type { ReviewLink } from '@/types';

export type ReviewInsightTone = 'positive' | 'caution' | 'check' | 'recent' | 'trust';

export interface ReviewInsight {
  label: string;
  tone: ReviewInsightTone;
}

const POSITIVE_PATTERNS = [
  /만족|추천|좋았|좋아|친절|따뜻|꼼꼼|안전|즐겁|행복|마음에|장점|생생/i,
];

const CAUTION_PATTERNS = [
  /아쉬|단점|걱정|불편|힘들|경쟁률|대기|비싸|부담|탈락|실패/i,
];

const CHECK_PATTERNS = [
  /모집|추가모집|우선모집|일반모집|접수|상담|설명회|전화|문의|확인|비용|특별활동|차량|노선|결원/i,
];

const FIRST_HAND_PATTERNS = [
  /다녀|보냈|보내|방문|상담|설명회|입학|재원|졸업|후기|참관|투어/i,
];

const ADLIKE_PATTERNS = [
  /협찬|체험단|이벤트|공구|할인|분양|시공|맛집|마사지|네일|예약문의/i,
];

function reviewText(review: ReviewLink): string {
  return [review.title, review.summary, review.snippet, review.content, ...(review.tags ?? [])]
    .filter(Boolean)
    .join(' ');
}

function hasAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text));
}

function isRecentReview(date: string | null, now = new Date()): boolean {
  if (!date) return false;
  const timestamp = Date.parse(date);
  if (Number.isNaN(timestamp)) return false;

  const days = (now.getTime() - timestamp) / (1000 * 60 * 60 * 24);
  return days >= 0 && days <= 548;
}

export function getReviewInsights(review: ReviewLink, now = new Date()): ReviewInsight[] {
  const text = reviewText(review);
  const insights: ReviewInsight[] = [];

  if (isRecentReview(review.date, now)) {
    insights.push({ label: '최근 후기', tone: 'recent' });
  }

  if (hasAny(text, POSITIVE_PATTERNS)) {
    insights.push({ label: '긍정 언급', tone: 'positive' });
  }

  if (hasAny(text, CAUTION_PATTERNS)) {
    insights.push({ label: '아쉬움 언급', tone: 'caution' });
  }

  if (hasAny(text, CHECK_PATTERNS)) {
    insights.push({ label: '확인 필요', tone: 'check' });
  }

  const hasFirstHandSignal = hasAny(text, FIRST_HAND_PATTERNS);
  const hasAdlikeSignal = hasAny(text, ADLIKE_PATTERNS);
  if (hasFirstHandSignal && !hasAdlikeSignal) {
    insights.push({ label: '광고성 낮음', tone: 'trust' });
  }

  return insights.slice(0, 4);
}

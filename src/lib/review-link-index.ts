import fs from 'node:fs';
import path from 'node:path';
import type { ReviewLink, ReviewsData } from '@/types/review';

export interface KindergartenLookupItem {
  kindercode: string;
  name: string;
  address: string;
  sido_code: string;
  sigungu_code: string;
}

export type ReviewPlatformKey =
  | 'instagram'
  | 'threads'
  | 'x'
  | 'facebook'
  | 'naver_blog'
  | 'naver_cafe'
  | 'naver_place'
  | 'google'
  | 'learns'
  | 'studyholic'
  | 'starteacher'
  | 'other';

export interface FlatReviewLinkItem {
  review: ReviewLink;
  kindergarten: KindergartenLookupItem | null;
  platform: ReviewPlatformKey;
}

export const REVIEW_LINK_PAGE_SIZE = 100;

export const REVIEW_PLATFORM_LABELS: Record<ReviewPlatformKey, string> = {
  instagram: 'Instagram',
  threads: 'Threads',
  x: 'X',
  facebook: 'Facebook',
  naver_blog: '네이버 블로그',
  naver_cafe: '네이버 카페',
  naver_place: '네이버 플레이스',
  google: 'Google',
  learns: '런즈',
  studyholic: '스터디홀릭',
  starteacher: '별별선생',
  other: '기타 웹',
};

export const SIDO_LABELS: Record<string, string> = {
  '11': '서울',
  '12': '전남광주',
  '26': '부산',
  '27': '대구',
  '28': '인천',
  '29': '광주',
  '30': '대전',
  '31': '울산',
  '36': '세종',
  '41': '경기',
  '43': '충북',
  '44': '충남',
  '46': '전남',
  '47': '경북',
  '48': '경남',
  '50': '제주',
  '51': '강원',
  '52': '전북',
};

const REVIEWS_DATA_PATH = path.join(process.cwd(), 'public', 'data', 'reviews.json');
const KINDERGARTENS_DATA_PATH = path.join(process.cwd(), 'public', 'data', 'kindergartens.json');

export function detectReviewPlatform(review: ReviewLink): ReviewPlatformKey {
  if (review.source !== 'other') {
    return review.source;
  }

  try {
    const host = new URL(review.url).hostname.toLowerCase();
    if (host.includes('instagram.com')) return 'instagram';
    if (host.includes('threads.net') || host.includes('threads.com')) return 'threads';
    if (host === 'x.com' || host.endsWith('.x.com') || host.includes('twitter.com')) return 'x';
    if (host.includes('facebook.com')) return 'facebook';
    if (host.includes('blog.naver.com')) return 'naver_blog';
    if (host.includes('cafe.naver.com')) return 'naver_cafe';
    if (host.includes('map.naver.com') || host.includes('place.naver.com')) return 'naver_place';
    if (host.includes('google.')) return 'google';
  } catch {
    return 'other';
  }

  return 'other';
}

export function isWebReviewUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:';
  } catch {
    return false;
  }
}

export function getReviewDisplayUrl(url: string): string {
  try {
    const parsedUrl = new URL(url);
    return `${parsedUrl.hostname.replace(/^www\./, '')}${parsedUrl.pathname}`;
  } catch {
    return url;
  }
}

export function getReviewAccessLabel(review: ReviewLink): string {
  if (review.accessMode === 'login') return '로그인 필요';
  if (review.accessMode === 'partner') return '제휴/권한';
  return '공개 웹';
}

function getTimeValue(review: ReviewLink): number {
  const value = review.date ?? review.collectedAt;
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

export function loadReviewLinkItems(): {
  items: FlatReviewLinkItem[];
  reviewsData: ReviewsData;
} {
  const reviewsData = JSON.parse(fs.readFileSync(REVIEWS_DATA_PATH, 'utf8')) as ReviewsData;
  const kindergartens = JSON.parse(
    fs.readFileSync(KINDERGARTENS_DATA_PATH, 'utf8')
  ) as KindergartenLookupItem[];
  const kindergartenMap = new Map(kindergartens.map((item) => [item.kindercode, item]));

  const items = Object.values(reviewsData.reviews)
    .flat()
    .map((review) => ({
      review,
      kindergarten: kindergartenMap.get(review.kindergartenId) ?? null,
      platform: detectReviewPlatform(review),
    }))
    .toSorted((left, right) => getTimeValue(right.review) - getTimeValue(left.review));

  return { items, reviewsData };
}

export function getReviewLinkPageCount(): number {
  const { items } = loadReviewLinkItems();
  return Math.max(1, Math.ceil(items.length / REVIEW_LINK_PAGE_SIZE));
}

import type { Metadata } from 'next';
import Link from 'next/link';
import kindergartensData from '../../../../public/data/kindergartens.json';
import reviewsDataJson from '../../../../public/data/reviews.json';
import type { ReviewLink, ReviewsData } from '@/types/review';

export const metadata: Metadata = {
  title: '전체 후기 원문 링크 | 우리동네 유치원',
  description: '수집된 모든 유치원 후기의 원문 링크를 한 페이지에서 확인합니다.',
};

interface KindergartenLookupItem {
  kindercode: string;
  name: string;
  address: string;
  sido_code: string;
}

interface ReviewRow {
  review: ReviewLink;
  kindergarten: KindergartenLookupItem | null;
  platform: string;
}

const reviewsData = reviewsDataJson as unknown as ReviewsData;
const kindergartens = kindergartensData as KindergartenLookupItem[];

const PLATFORM_LABELS: Record<string, string> = {
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

function detectPlatform(review: ReviewLink): string {
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

function getTimeValue(review: ReviewLink): number {
  const value = review.date ?? review.collectedAt;
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function getReviewRows(): ReviewRow[] {
  const kindergartenMap = new Map(kindergartens.map((item) => [item.kindercode, item]));

  return Object.values(reviewsData.reviews)
    .flat()
    .map((review) => ({
      review,
      kindergarten: kindergartenMap.get(review.kindergartenId) ?? null,
      platform: detectPlatform(review),
    }))
    .toSorted((left, right) => {
      const leftName = left.kindergarten?.name ?? left.review.kindergartenId;
      const rightName = right.kindergarten?.name ?? right.review.kindergartenId;
      return leftName.localeCompare(rightName, 'ko') || getTimeValue(right.review) - getTimeValue(left.review);
    });
}

export default function AllReviewLinksPage() {
  const rows = getReviewRows();

  return (
    <main className="min-h-screen bg-[var(--brand-page)] px-4 py-6 text-[var(--brand-ink)] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="border-b border-[rgba(203,188,174,0.45)] pb-5">
          <Link
            href="/reviews"
            className="mb-4 inline-flex text-sm font-semibold text-[var(--brand-leaf)] hover:text-[var(--brand-leaf-deep)]"
          >
            후기 검색으로 돌아가기
          </Link>
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-normal text-[var(--brand-ink)] sm:text-3xl">
                전체 후기 원문 링크
              </h1>
              <p className="mt-2 text-sm text-[var(--brand-ink-soft)]">
                {rows.length.toLocaleString()}건의 후기 원문을 유치원명순으로 확인합니다.
              </p>
            </div>
            <a
              href="/data/reviews.json"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 items-center justify-center rounded-lg border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              JSON 열기
            </a>
          </div>
        </header>

        <ol className="mt-5 grid gap-2">
          {rows.map(({ review, kindergarten, platform }, index) => (
            <li
              key={review.id}
              id={review.id}
              className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm"
            >
              <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                    <span className="font-semibold text-gray-700">{index + 1}</span>
                    <span>{PLATFORM_LABELS[platform] ?? PLATFORM_LABELS.other}</span>
                    <span>{review.date ?? review.collectedAt.slice(0, 10)}</span>
                    <span>{review.id}</span>
                  </div>
                  <a
                    href={review.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="break-words text-sm font-bold leading-6 text-gray-950 hover:text-[var(--brand-leaf-deep)]"
                  >
                    {review.title}
                  </a>
                  <div className="mt-1 break-all text-xs text-gray-400">{review.url}</div>
                </div>
                <div className="md:w-72 md:text-right">
                  <div className="text-sm font-semibold text-gray-900">
                    {kindergarten?.name ?? '유치원 정보 없음'}
                  </div>
                  <div className="mt-1 text-xs leading-5 text-gray-500">
                    {kindergarten?.address ?? review.kindergartenId}
                  </div>
                  <div className="mt-1 truncate text-xs text-gray-400" title={review.sourceName}>
                    {review.sourceName}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </main>
  );
}

'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import ChevronLeft from 'lucide-react/dist/esm/icons/chevron-left';
import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right';
import ExternalLink from 'lucide-react/dist/esm/icons/external-link';
import Loader2 from 'lucide-react/dist/esm/icons/loader-2';
import RotateCcw from 'lucide-react/dist/esm/icons/rotate-ccw';
import Search from 'lucide-react/dist/esm/icons/search';
import type { ReviewLink, ReviewsData } from '@/types/review';

interface KindergartenLookupItem {
  kindercode: string;
  name: string;
  address: string;
  sido_code: string;
  sigungu_code: string;
}

type PlatformKey =
  | 'all'
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

type SortKey = 'newest' | 'oldest' | 'kindergarten';

interface FlatReview {
  review: ReviewLink;
  kindergarten: KindergartenLookupItem | null;
  platform: Exclude<PlatformKey, 'all'>;
}

const PAGE_SIZE = 100;

const SIDO_LABELS: Record<string, string> = {
  '11': '서울',
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

const PLATFORM_LABELS: Record<Exclude<PlatformKey, 'all'>, string> = {
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

const PLATFORM_CLASSES: Record<Exclude<PlatformKey, 'all'>, string> = {
  instagram: 'bg-pink-50 text-pink-700 border-pink-100',
  threads: 'bg-neutral-100 text-neutral-800 border-neutral-200',
  x: 'bg-slate-100 text-slate-800 border-slate-200',
  facebook: 'bg-blue-50 text-blue-700 border-blue-100',
  naver_blog: 'bg-green-50 text-green-700 border-green-100',
  naver_cafe: 'bg-sky-50 text-sky-700 border-sky-100',
  naver_place: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  google: 'bg-amber-50 text-amber-700 border-amber-100',
  learns: 'bg-violet-50 text-violet-700 border-violet-100',
  studyholic: 'bg-cyan-50 text-cyan-700 border-cyan-100',
  starteacher: 'bg-purple-50 text-purple-700 border-purple-100',
  other: 'bg-gray-100 text-gray-700 border-gray-200',
};

function detectPlatform(review: ReviewLink): Exclude<PlatformKey, 'all'> {
  if (review.source !== 'other') {
    return review.source;
  }

  try {
    const host = new URL(review.url).hostname.toLowerCase();
    if (host.includes('instagram.com')) return 'instagram';
    if (host.includes('threads.net')) return 'threads';
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

function includesText(value: string | null | undefined, needle: string) {
  return value?.toLowerCase().includes(needle) ?? false;
}

export function ReviewsBrowser() {
  const [reviewsData, setReviewsData] = useState<ReviewsData | null>(null);
  const [kindergartens, setKindergartens] = useState<KindergartenLookupItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [platform, setPlatform] = useState<PlatformKey>('all');
  const [region, setRegion] = useState('all');
  const [sort, setSort] = useState<SortKey>('newest');
  const [page, setPage] = useState(1);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        const [reviewsResponse, kindergartensResponse] = await Promise.all([
          fetch('/data/reviews.json', { cache: 'no-store' }),
          fetch('/data/kindergartens.json', { cache: 'force-cache' }),
        ]);

        if (!reviewsResponse.ok) {
          throw new Error(`후기 데이터 로드 실패: ${reviewsResponse.status}`);
        }
        if (!kindergartensResponse.ok) {
          throw new Error(`유치원 데이터 로드 실패: ${kindergartensResponse.status}`);
        }

        const [nextReviewsData, nextKindergartens] = await Promise.all([
          reviewsResponse.json() as Promise<ReviewsData>,
          kindergartensResponse.json() as Promise<KindergartenLookupItem[]>,
        ]);

        if (!cancelled) {
          setReviewsData(nextReviewsData);
          setKindergartens(nextKindergartens);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : '데이터를 불러오지 못했습니다.');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadData();

    return () => {
      cancelled = true;
    };
  }, []);

  const kindergartenMap = useMemo(() => {
    return new Map(kindergartens.map((item) => [item.kindercode, item]));
  }, [kindergartens]);

  const flatReviews = useMemo<FlatReview[]>(() => {
    if (!reviewsData) return [];

    return Object.values(reviewsData.reviews)
      .flat()
      .map((review) => ({
        review,
        kindergarten: kindergartenMap.get(review.kindergartenId) ?? null,
        platform: detectPlatform(review),
      }));
  }, [reviewsData, kindergartenMap]);

  const platformCounts = useMemo(() => {
    const counts = new Map<Exclude<PlatformKey, 'all'>, number>();
    flatReviews.forEach((item) => {
      counts.set(item.platform, (counts.get(item.platform) ?? 0) + 1);
    });
    return counts;
  }, [flatReviews]);

  const regionOptions = useMemo(() => {
    const codes = new Set<string>();
    flatReviews.forEach((item) => {
      if (item.kindergarten?.sido_code) {
        codes.add(item.kindergarten.sido_code);
      }
    });
    return Array.from(codes).sort((a, b) => {
      return (SIDO_LABELS[a] ?? a).localeCompare(SIDO_LABELS[b] ?? b, 'ko');
    });
  }, [flatReviews]);

  const filteredReviews = useMemo(() => {
    const trimmedQuery = query.trim().toLowerCase();

    const nextItems = flatReviews.filter((item) => {
      const { review, kindergarten } = item;

      if (platform !== 'all' && item.platform !== platform) {
        return false;
      }
      if (region !== 'all' && kindergarten?.sido_code !== region) {
        return false;
      }
      if (!trimmedQuery) {
        return true;
      }

      return (
        includesText(review.title, trimmedQuery) ||
        includesText(review.snippet, trimmedQuery) ||
        includesText(review.sourceName, trimmedQuery) ||
        includesText(review.url, trimmedQuery) ||
        includesText(review.kindergartenId, trimmedQuery) ||
        includesText(kindergarten?.name, trimmedQuery) ||
        includesText(kindergarten?.address, trimmedQuery)
      );
    });

    return nextItems.toSorted((left, right) => {
      if (sort === 'kindergarten') {
        const leftName = left.kindergarten?.name ?? left.review.kindergartenId;
        const rightName = right.kindergarten?.name ?? right.review.kindergartenId;
        return leftName.localeCompare(rightName, 'ko') || getTimeValue(right.review) - getTimeValue(left.review);
      }

      const direction = sort === 'newest' ? -1 : 1;
      return direction * (getTimeValue(left.review) - getTimeValue(right.review));
    });
  }, [flatReviews, platform, query, region, sort]);

  const totalPages = Math.max(1, Math.ceil(filteredReviews.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filteredReviews.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [query, platform, region, sort]);

  const resetFilters = () => {
    setQuery('');
    setPlatform('all');
    setRegion('all');
    setSort('newest');
  };

  return (
    <main className="min-h-screen bg-[var(--brand-page)] px-4 py-6 text-[var(--brand-ink)] sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-5">
        <header className="flex flex-col gap-4 border-b border-[rgba(203,188,174,0.45)] pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <Link
              href="/"
              className="mb-4 inline-flex text-sm font-semibold text-[var(--brand-leaf)] hover:text-[var(--brand-leaf-deep)]"
            >
              우리동네 유치원
            </Link>
            <h1 className="text-2xl font-bold tracking-normal text-[var(--brand-ink)] sm:text-3xl">
              후기 전체 확인
            </h1>
            <p className="mt-2 text-sm text-[var(--brand-ink-soft)]">
              수집된 후기의 원문 링크를 한 화면에서 검색하고 열어볼 수 있습니다.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center sm:min-w-80">
            <div className="rounded-lg border border-[rgba(203,188,174,0.45)] bg-white/80 px-3 py-2">
              <div className="text-lg font-bold">{reviewsData?.totalCount.toLocaleString() ?? '-'}</div>
              <div className="text-xs text-[var(--brand-ink-soft)]">전체 후기</div>
            </div>
            <div className="rounded-lg border border-[rgba(203,188,174,0.45)] bg-white/80 px-3 py-2">
              <div className="text-lg font-bold">{reviewsData?.kindergartenCount.toLocaleString() ?? '-'}</div>
              <div className="text-xs text-[var(--brand-ink-soft)]">유치원</div>
            </div>
            <div className="rounded-lg border border-[rgba(203,188,174,0.45)] bg-white/80 px-3 py-2">
              <div className="text-lg font-bold">{filteredReviews.length.toLocaleString()}</div>
              <div className="text-xs text-[var(--brand-ink-soft)]">현재 결과</div>
            </div>
          </div>
        </header>

        <section className="grid gap-3 rounded-lg border border-[rgba(203,188,174,0.45)] bg-white/85 p-3 shadow-sm md:grid-cols-[minmax(0,1fr)_180px_150px_150px_auto]">
          <label className="relative block">
            <span className="sr-only">후기 검색</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="유치원명, 지역, 제목, URL 검색"
              className="h-11 w-full rounded-lg border border-gray-200 bg-white pl-10 pr-3 text-sm outline-none transition focus:border-[var(--brand-leaf)] focus:ring-2 focus:ring-[rgba(78,169,109,0.16)]"
            />
          </label>

          <label>
            <span className="sr-only">출처 필터</span>
            <select
              value={platform}
              onChange={(event) => setPlatform(event.target.value as PlatformKey)}
              className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none focus:border-[var(--brand-leaf)]"
            >
              <option value="all">모든 출처</option>
              {Object.entries(PLATFORM_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label} ({platformCounts.get(value as Exclude<PlatformKey, 'all'>) ?? 0})
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className="sr-only">지역 필터</span>
            <select
              value={region}
              onChange={(event) => setRegion(event.target.value)}
              className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none focus:border-[var(--brand-leaf)]"
            >
              <option value="all">모든 지역</option>
              {regionOptions.map((code) => (
                <option key={code} value={code}>
                  {SIDO_LABELS[code] ?? code}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className="sr-only">정렬</span>
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as SortKey)}
              className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none focus:border-[var(--brand-leaf)]"
            >
              <option value="newest">최신순</option>
              <option value="oldest">오래된순</option>
              <option value="kindergarten">유치원명순</option>
            </select>
          </label>

          <button
            type="button"
            onClick={resetFilters}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
          >
            <RotateCcw className="h-4 w-4" />
            초기화
          </button>
        </section>

        {isLoading ? (
          <div className="flex min-h-80 flex-col items-center justify-center rounded-lg border border-dashed border-gray-200 bg-white/75">
            <Loader2 className="h-6 w-6 animate-spin text-[var(--brand-leaf)]" />
            <p className="mt-3 text-sm text-[var(--brand-ink-soft)]">후기 데이터를 불러오는 중입니다.</p>
          </div>
        ) : error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
            {error}
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-2 text-sm text-[var(--brand-ink-soft)] sm:flex-row sm:items-center sm:justify-between">
              <span>
                {filteredReviews.length.toLocaleString()}건 중 {pageItems.length.toLocaleString()}건 표시
              </span>
              <span>
                {currentPage} / {totalPages} 페이지
              </span>
            </div>

            <section className="grid gap-3">
              {pageItems.map((item) => (
                <ReviewResultRow key={item.review.id} item={item} />
              ))}
            </section>

            {filteredReviews.length === 0 && (
              <div className="rounded-lg border border-dashed border-gray-200 bg-white/75 p-10 text-center text-sm text-[var(--brand-ink-soft)]">
                조건에 맞는 후기가 없습니다.
              </div>
            )}

            <nav className="flex items-center justify-center gap-3 pb-6">
              <button
                type="button"
                onClick={() => setPage((value) => Math.max(1, value - 1))}
                disabled={currentPage === 1}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
                이전
              </button>
              <button
                type="button"
                onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                disabled={currentPage === totalPages}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                다음
                <ChevronRight className="h-4 w-4" />
              </button>
            </nav>
          </>
        )}
      </div>
    </main>
  );
}

function ReviewResultRow({ item }: { item: FlatReview }) {
  const { review, kindergarten, platform } = item;
  const regionLabel = kindergarten?.sido_code ? SIDO_LABELS[kindergarten.sido_code] ?? kindergarten.sido_code : '지역 미상';

  return (
    <article className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition hover:border-[rgba(78,169,109,0.4)]">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className={`rounded-full border px-2 py-0.5 text-xs font-bold ${PLATFORM_CLASSES[platform]}`}>
              {PLATFORM_LABELS[platform]}
            </span>
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600">
              {regionLabel}
            </span>
            {review.date && (
              <span className="text-xs text-gray-500">{review.date}</span>
            )}
          </div>

          <a
            href={review.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group/title inline-flex max-w-full items-start gap-2 text-base font-bold text-gray-950 hover:text-[var(--brand-leaf-deep)]"
          >
            <span className="line-clamp-2">{review.title}</span>
            <ExternalLink className="mt-1 h-4 w-4 flex-shrink-0 text-gray-400 group-hover/title:text-[var(--brand-leaf)]" />
          </a>

          {review.snippet && (
            <p className="mt-2 line-clamp-2 text-sm leading-6 text-gray-600">{review.snippet}</p>
          )}
        </div>

        <div className="md:w-72 md:text-right">
          <div className="font-semibold text-gray-900">{kindergarten?.name ?? '유치원 정보 없음'}</div>
          <div className="mt-1 text-xs leading-5 text-gray-500">
            {kindergarten?.address ?? review.kindergartenId}
          </div>
          <div className="mt-2 truncate text-xs text-gray-400" title={review.sourceName}>
            {review.sourceName || review.url}
          </div>
        </div>
      </div>
    </article>
  );
}

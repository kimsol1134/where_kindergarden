import Link from 'next/link';
import { notFound } from 'next/navigation';
import ExternalLink from 'lucide-react/dist/esm/icons/external-link';
import LinkIcon from 'lucide-react/dist/esm/icons/link';
import {
  getReviewAccessLabel,
  getReviewDisplayUrl,
  isWebReviewUrl,
  loadReviewLinkItems,
  REVIEW_LINK_PAGE_SIZE,
  REVIEW_PLATFORM_LABELS,
  SIDO_LABELS,
  type FlatReviewLinkItem,
  type ReviewPlatformKey,
} from '@/lib/review-link-index';

const PLATFORM_CLASSES: Record<ReviewPlatformKey, string> = {
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

function getPageHref(pageNumber: number): string {
  return pageNumber === 1 ? '/reviews/all' : `/reviews/all/page/${pageNumber}`;
}

function getStringField(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

function normalizeUrlForCompare(url: string | null): string | null {
  if (!url) return null;
  try {
    const parsedUrl = new URL(url);
    return `${parsedUrl.hostname.replace(/^www\./, '')}${parsedUrl.pathname}`.replace(/\/$/, '').toLowerCase();
  } catch {
    return url.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '').toLowerCase();
  }
}

function getEvidenceUrl(item: FlatReviewLinkItem): string | null {
  const { review } = item;
  const sourcePageUrl = getStringField(review.evidence?.sourcePageUrl);
  const structuredSearchUrl = getStringField(review.structuredFields?.searchUrl);
  const evidenceSearchUrl = getStringField(review.evidence?.structuredFields?.searchUrl);
  const evidenceUrl = sourcePageUrl ?? structuredSearchUrl ?? evidenceSearchUrl;

  if (!evidenceUrl || normalizeUrlForCompare(evidenceUrl) === normalizeUrlForCompare(review.url)) {
    return null;
  }

  return evidenceUrl;
}

function PaginationLinks({ currentPage, totalPages }: { currentPage: number; totalPages: number }) {
  return (
    <nav className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-3">
      <div className="flex items-center justify-between gap-3 text-sm">
        <Link
          href={getPageHref(Math.max(1, currentPage - 1))}
          aria-disabled={currentPage === 1}
          className="inline-flex h-10 items-center justify-center rounded-lg border border-gray-200 px-3 font-semibold text-gray-700 aria-disabled:pointer-events-none aria-disabled:opacity-40"
        >
          이전
        </Link>
        <span className="font-semibold text-gray-600">
          {currentPage} / {totalPages} 페이지
        </span>
        <Link
          href={getPageHref(Math.min(totalPages, currentPage + 1))}
          aria-disabled={currentPage === totalPages}
          className="inline-flex h-10 items-center justify-center rounded-lg border border-gray-200 px-3 font-semibold text-gray-700 aria-disabled:pointer-events-none aria-disabled:opacity-40"
        >
          다음
        </Link>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
          <Link
            key={pageNumber}
            href={getPageHref(pageNumber)}
            className={`inline-flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-xs font-bold ${
              pageNumber === currentPage
                ? 'bg-[var(--brand-leaf)] text-white'
                : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
            }`}
          >
            {pageNumber}
          </Link>
        ))}
      </div>
    </nav>
  );
}

export function AllReviewLinksPage({ pageNumber = 1 }: { pageNumber?: number }) {
  const { items, reviewsData } = loadReviewLinkItems();
  const totalPages = Math.max(1, Math.ceil(items.length / REVIEW_LINK_PAGE_SIZE));

  if (pageNumber < 1 || pageNumber > totalPages) {
    notFound();
  }

  const startIndex = (pageNumber - 1) * REVIEW_LINK_PAGE_SIZE;
  const pageItems = items.slice(startIndex, startIndex + REVIEW_LINK_PAGE_SIZE);
  const webReviewCount = items.filter((item) => isWebReviewUrl(item.review.url)).length;

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
              전체 후기 원문 링크
            </h1>
            <p className="mt-2 text-sm text-[var(--brand-ink-soft)]">
              수집된 모든 후기 원문을 정적 웹 페이지에서 페이지 단위로 확인할 수 있습니다.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                href="/reviews"
                className="inline-flex h-10 items-center justify-center rounded-lg border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                후기 검색
              </Link>
              <a
                href="/data/reviews.json"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-10 items-center justify-center rounded-lg border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                JSON 열기
              </a>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-center sm:min-w-96 sm:grid-cols-4">
            <div className="rounded-lg border border-[rgba(203,188,174,0.45)] bg-white/80 px-3 py-2">
              <div className="text-lg font-bold">{items.length.toLocaleString()}</div>
              <div className="text-xs text-[var(--brand-ink-soft)]">전체 후기</div>
            </div>
            <div className="rounded-lg border border-[rgba(203,188,174,0.45)] bg-white/80 px-3 py-2">
              <div className="text-lg font-bold">{webReviewCount.toLocaleString()}</div>
              <div className="text-xs text-[var(--brand-ink-soft)]">웹 확인</div>
            </div>
            <div className="rounded-lg border border-[rgba(203,188,174,0.45)] bg-white/80 px-3 py-2">
              <div className="text-lg font-bold">{reviewsData.kindergartenCount.toLocaleString()}</div>
              <div className="text-xs text-[var(--brand-ink-soft)]">유치원</div>
            </div>
            <div className="rounded-lg border border-[rgba(203,188,174,0.45)] bg-white/80 px-3 py-2">
              <div className="text-lg font-bold">{totalPages.toLocaleString()}</div>
              <div className="text-xs text-[var(--brand-ink-soft)]">목록 페이지</div>
            </div>
          </div>
        </header>

        <PaginationLinks currentPage={pageNumber} totalPages={totalPages} />

        <div className="flex flex-col gap-2 text-sm text-[var(--brand-ink-soft)] sm:flex-row sm:items-center sm:justify-between">
          <span>
            {items.length.toLocaleString()}건 중 {(startIndex + 1).toLocaleString()}-
            {(startIndex + pageItems.length).toLocaleString()}번 표시
          </span>
          <span>{pageNumber}페이지</span>
        </div>

        <section className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="hidden grid-cols-[72px_minmax(180px,1fr)_minmax(260px,1.5fr)_170px_190px] border-b border-gray-200 bg-gray-50 px-4 py-3 text-xs font-bold text-gray-500 md:grid">
            <div>번호</div>
            <div>유치원</div>
            <div>후기</div>
            <div>출처</div>
            <div className="text-right">웹 확인</div>
          </div>
          <div className="divide-y divide-gray-100">
            {pageItems.map((item, index) => (
              <ReviewLinkRow
                key={`${item.review.kindergartenId}-${item.review.id}-${item.review.url}`}
                item={item}
                rowNumber={startIndex + index + 1}
              />
            ))}
          </div>
        </section>

        <PaginationLinks currentPage={pageNumber} totalPages={totalPages} />
      </div>
    </main>
  );
}

function ReviewLinkRow({ item, rowNumber }: { item: FlatReviewLinkItem; rowNumber: number }) {
  const { review, kindergarten, platform } = item;
  const evidenceUrl = getEvidenceUrl(item);
  const hasWebUrl = isWebReviewUrl(review.url);
  const regionLabel = kindergarten?.sido_code ? SIDO_LABELS[kindergarten.sido_code] ?? kindergarten.sido_code : '지역 미상';

  return (
    <article className="grid gap-3 px-4 py-4 md:grid-cols-[72px_minmax(180px,1fr)_minmax(260px,1.5fr)_170px_190px] md:items-center">
      <div className="flex items-center gap-2 text-xs font-semibold text-gray-400 md:block">
        <span className="md:hidden">번호</span>
        <span>{rowNumber.toLocaleString()}</span>
      </div>

      <div className="min-w-0">
        <div className="truncate text-sm font-bold text-gray-950" title={kindergarten?.name ?? review.kindergartenId}>
          {kindergarten?.name ?? '유치원 정보 없음'}
        </div>
        <div className="mt-1 line-clamp-2 text-xs leading-5 text-gray-500">
          {kindergarten?.address ?? review.kindergartenId}
        </div>
      </div>

      <div className="min-w-0">
        {hasWebUrl ? (
          <a
            href={review.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex max-w-full items-start gap-2 text-sm font-semibold text-gray-900 hover:text-[var(--brand-leaf-deep)]"
          >
            <span className="line-clamp-2">{review.title}</span>
            <ExternalLink className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-300 group-hover:text-[var(--brand-leaf)]" />
          </a>
        ) : (
          <div className="line-clamp-2 text-sm font-semibold text-gray-900">{review.title}</div>
        )}
        <div className="mt-1 truncate text-xs text-gray-400" title={review.url}>
          {getReviewDisplayUrl(review.url)}
        </div>
      </div>

      <div className="flex min-w-0 flex-wrap items-center gap-2 md:block">
        <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-bold ${PLATFORM_CLASSES[platform]}`}>
          {REVIEW_PLATFORM_LABELS[platform]}
        </span>
        <div className="mt-0 truncate text-xs text-gray-500 md:mt-2" title={review.sourceName}>
          {review.sourceName || regionLabel}
        </div>
        <div className="text-xs text-gray-400">{getReviewAccessLabel(review)}</div>
      </div>

      <div className="flex flex-wrap justify-start gap-2 md:justify-end">
        {hasWebUrl ? (
          <a
            href={review.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-700 transition hover:border-[var(--brand-leaf)] hover:bg-[rgba(78,169,109,0.06)] hover:text-[var(--brand-leaf-deep)]"
            title={review.url}
          >
            원문
            <ExternalLink className="h-4 w-4" />
          </a>
        ) : (
          <span className="inline-flex h-9 items-center justify-center rounded-lg border border-amber-200 bg-amber-50 px-3 text-sm font-semibold text-amber-700">
            URL 확인 필요
          </span>
        )}
        {evidenceUrl && (
          <a
            href={evidenceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm font-semibold text-gray-700 transition hover:border-[var(--brand-leaf)] hover:bg-[rgba(78,169,109,0.06)] hover:text-[var(--brand-leaf-deep)]"
            title={evidenceUrl}
          >
            근거
            <LinkIcon className="h-4 w-4" />
          </a>
        )}
      </div>
    </article>
  );
}

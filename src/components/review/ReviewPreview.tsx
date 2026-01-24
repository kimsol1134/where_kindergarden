'use client';

import { Newspaper } from 'lucide-react';
import { useReviewStore } from '@/stores';
import type { ReviewLink } from '@/types';

interface ReviewPreviewProps {
  kindergartenId: string;
  onViewAll: () => void;
}

function PreviewCard({ review }: { review: ReviewLink }) {
  return (
    <a
      href={review.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block p-3.5 bg-white hover:bg-amber-50 rounded-xl border border-amber-100 hover:border-amber-200 transition-all group shadow-sm"
    >
      <h5 className="text-sm font-semibold text-gray-900 group-hover:text-amber-800 line-clamp-1 mb-1">
        {review.title}
      </h5>
      {review.snippet && (
        <p className="text-xs text-gray-500 line-clamp-1">{review.snippet}</p>
      )}
    </a>
  );
}

export function ReviewPreview({ kindergartenId, onViewAll }: ReviewPreviewProps) {
  const reviews = useReviewStore((state) => state.data?.reviews[kindergartenId] ?? null) ?? [];

  if (reviews.length === 0) {
    return null;
  }

  const sortedReviews = reviews.toSorted((a, b) => {
    if (!a.date && !b.date) return 0;
    if (!a.date) return 1;
    if (!b.date) return -1;
    return b.date.localeCompare(a.date);
  });

  const previewReviews = sortedReviews.slice(0, 2);

  return (
    <div className="p-5 border-b border-gray-100">
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
        <h4 className="text-sm font-bold text-amber-900 mb-3 flex items-center gap-2">
          <div className="w-7 h-7 bg-amber-100 rounded-full flex items-center justify-center">
            <Newspaper className="w-4 h-4 text-amber-600" />
          </div>
          학부모 후기
          <span className="ml-auto text-xs font-bold text-white bg-amber-500 px-2.5 py-1 rounded-full shadow-sm">
            {reviews.length}건
          </span>
        </h4>

        <div className="space-y-2">
          {previewReviews.map((review) => (
            <PreviewCard key={review.id} review={review} />
          ))}
        </div>

        <button
          onClick={onViewAll}
          className="mt-3 w-full text-center text-sm font-bold text-white bg-amber-500 hover:bg-amber-600 py-2.5 rounded-xl transition-colors shadow-sm"
        >
          후기 전체보기 →
        </button>
      </div>
    </div>
  );
}

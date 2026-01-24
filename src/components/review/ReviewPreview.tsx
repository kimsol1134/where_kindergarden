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
      className="block p-3 bg-gray-50 hover:bg-amber-50 rounded-lg transition-colors group"
    >
      <h5 className="text-sm font-medium text-gray-800 group-hover:text-amber-700 line-clamp-1 mb-1">
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
      <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
        <Newspaper className="w-4 h-4 text-amber-500" />
        학부모 후기
      </h4>

      <div className="space-y-2">
        {previewReviews.map((review) => (
          <PreviewCard key={review.id} review={review} />
        ))}
      </div>

      <button
        onClick={onViewAll}
        className="mt-3 w-full text-center text-sm font-medium text-amber-600 hover:text-amber-700 py-2 rounded-lg hover:bg-amber-50 transition-colors"
      >
        후기 {reviews.length}건 전체보기 →
      </button>
    </div>
  );
}

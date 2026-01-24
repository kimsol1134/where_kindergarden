'use client';

import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { useReviewStore } from '@/stores';
import { ReviewLinkCard } from './ReviewLinkCard';
import { ReviewEmpty } from './ReviewEmpty';

interface ReviewLinkListProps {
  kindergartenId: string;
}

export function ReviewLinkList({ kindergartenId }: ReviewLinkListProps) {
  const { isLoaded, isLoading, error, loadData, getByKindergartenId } = useReviewStore();

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (isLoading && !isLoaded) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
        <span className="text-xs text-gray-400 mt-2">후기 로딩 중...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <p className="text-sm text-red-500">{error}</p>
      </div>
    );
  }

  const reviews = getByKindergartenId(kindergartenId);

  if (reviews.length === 0) {
    return <ReviewEmpty />;
  }

  const sortedReviews = reviews.toSorted((a, b) => {
    if (!a.date && !b.date) return 0;
    if (!a.date) return 1;
    if (!b.date) return -1;
    return b.date.localeCompare(a.date);
  });

  return (
    <div className="space-y-3 p-4">
      {sortedReviews.map((review) => (
        <ReviewLinkCard key={review.id} review={review} />
      ))}
    </div>
  );
}

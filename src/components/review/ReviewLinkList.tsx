'use client';

import { useEffect, useState } from 'react';
import Loader2 from 'lucide-react/dist/esm/icons/loader-2';
import Plus from 'lucide-react/dist/esm/icons/plus';
import { useReviewStore } from '@/stores';
import { ReviewLinkCard } from './ReviewLinkCard';
import { ReviewEmpty } from './ReviewEmpty';
import { ReviewSuggestionModal } from './ReviewSuggestionModal';

interface ReviewLinkListProps {
  kindergartenId: string;
}

export function ReviewLinkList({ kindergartenId }: ReviewLinkListProps) {
  const { isLoaded, isLoading, error, loadData, getByKindergartenId } = useReviewStore();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    reviewId: string;
    reviewTitle: string;
  }>({ isOpen: false, reviewId: '', reviewTitle: '' });

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDeleteSuggestion = (reviewId: string, reviewTitle: string) => {
    setDeleteModal({ isOpen: true, reviewId, reviewTitle });
  };

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
    return (
      <>
        <ReviewEmpty kindergartenId={kindergartenId} />
        <ReviewSuggestionModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          kindergartenId={kindergartenId}
          type="add"
        />
      </>
    );
  }

  const sortedReviews = reviews.toSorted((a, b) => {
    if (!a.date && !b.date) return 0;
    if (!a.date) return 1;
    if (!b.date) return -1;
    return b.date.localeCompare(a.date);
  });

  return (
    <>
      <div className="space-y-3 p-4">
        {sortedReviews.map((review) => (
          <ReviewLinkCard 
            key={review.id} 
            review={review} 
            onDeleteSuggestion={handleDeleteSuggestion}
          />
        ))}
        
        {/* Add Suggestion Button */}
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="w-full py-3 px-4 border-2 border-dashed border-emerald-200 hover:border-emerald-400 rounded-xl text-emerald-600 hover:text-emerald-700 font-medium text-sm flex items-center justify-center gap-2 transition-colors bg-emerald-50/50 hover:bg-emerald-50"
        >
          <Plus className="w-4 h-4" />
          후기 추가 제안하기
        </button>
      </div>

      {/* Add Modal */}
      <ReviewSuggestionModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        kindergartenId={kindergartenId}
        type="add"
      />

      {/* Delete Modal */}
      <ReviewSuggestionModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, reviewId: '', reviewTitle: '' })}
        kindergartenId={kindergartenId}
        type="delete"
        reviewId={deleteModal.reviewId}
        reviewTitle={deleteModal.reviewTitle}
      />
    </>
  );
}

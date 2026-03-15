'use client';

import { useState } from 'react';
import { Newspaper, Plus } from 'lucide-react';
import { ReviewSuggestionModal } from './ReviewSuggestionModal';

interface ReviewEmptyProps {
  kindergartenId?: string;
}

export function ReviewEmpty({ kindergartenId }: ReviewEmptyProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-50">
          <Newspaper className="h-6 w-6 text-amber-500" />
        </div>
        <p className="mb-2 text-base font-semibold text-gray-900">아직 연결된 후기가 없습니다</p>
        <p className="mb-5 text-sm leading-6 text-gray-500">
          공개된 블로그나 카페 후기 링크를 제안해주시면 검토 후 반영합니다.
        </p>
        
        {kindergartenId && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-emerald-600"
          >
            <Plus className="h-4 w-4" />
            후기 추가 제안하기
          </button>
        )}
      </div>

      {kindergartenId && (
        <ReviewSuggestionModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          kindergartenId={kindergartenId}
          type="add"
        />
      )}
    </>
  );
}

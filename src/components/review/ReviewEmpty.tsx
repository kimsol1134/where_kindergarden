'use client';

import { useState } from 'react';
import Newspaper from 'lucide-react/dist/esm/icons/newspaper';
import Plus from 'lucide-react/dist/esm/icons/plus';
import { ReviewSuggestionModal } from './ReviewSuggestionModal';

interface ReviewEmptyProps {
  kindergartenId?: string;
}

export function ReviewEmpty({ kindergartenId }: ReviewEmptyProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
          <Newspaper className="w-6 h-6 text-gray-400" />
        </div>
        <p className="text-sm font-medium text-gray-600 mb-1">아직 수집된 후기가 없어요</p>
        <p className="text-xs text-gray-400 mb-1">
          이 유치원의 후기 정보가 아직 수집되지 않았습니다.
        </p>
        <p className="text-xs text-gray-400 mb-4">
          네이버에서 &apos;유치원명 후기&apos;로 검색해보세요
        </p>
        
        {kindergartenId && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-lg flex items-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
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

'use client';

import { ExternalLink, Flag } from 'lucide-react';
import type { ReviewLink, ReviewSource } from '@/types';

const SOURCE_STYLES: Record<ReviewSource, { label: string; className: string }> = {
  naver_blog: { label: '블로그', className: 'text-green-700 bg-green-100' },
  naver_cafe: { label: '카페', className: 'text-blue-700 bg-blue-100' },
  google: { label: '웹', className: 'text-yellow-700 bg-yellow-100' },
  other: { label: '기타', className: 'text-gray-700 bg-gray-100' },
};

interface ReviewLinkCardProps {
  review: ReviewLink;
  onDeleteSuggestion?: (reviewId: string, reviewTitle: string) => void;
}

export function ReviewLinkCard({ review, onDeleteSuggestion }: ReviewLinkCardProps) {
  const sourceStyle = SOURCE_STYLES[review.source];

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDeleteSuggestion?.(review.id, review.title);
  };

  return (
    <div className="relative group/card">
      <a
        href={review.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block bg-white border border-gray-200 hover:border-emerald-200 hover:shadow-sm rounded-xl p-4 transition-all group"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${sourceStyle.className}`}>
                {sourceStyle.label}
              </span>
              {review.sourceName && (
                <span className="text-xs text-gray-400 truncate">{review.sourceName}</span>
              )}
            </div>
            <h5 className="text-sm font-medium text-gray-900 group-hover:text-emerald-700 transition-colors line-clamp-2 mb-1">
              {review.title}
            </h5>
            {review.snippet && (
              <p className="text-xs text-gray-500 line-clamp-2">{review.snippet}</p>
            )}
            {review.date && (
              <span className="text-xs text-gray-400 mt-2 block">{review.date}</span>
            )}
          </div>
          <ExternalLink className="w-4 h-4 text-gray-300 group-hover:text-emerald-500 flex-shrink-0 mt-1 transition-colors" />
        </div>
      </a>
      
      {/* Delete Suggestion Button */}
      {onDeleteSuggestion && (
        <button
          onClick={handleDeleteClick}
          className="absolute top-2 right-2 p-1.5 rounded-lg bg-white/80 backdrop-blur-sm border border-gray-200 opacity-0 group-hover/card:opacity-100 hover:bg-amber-50 hover:border-amber-200 transition-all"
          title="삭제 제안"
        >
          <Flag className="w-3.5 h-3.5 text-amber-500" />
        </button>
      )}
    </div>
  );
}

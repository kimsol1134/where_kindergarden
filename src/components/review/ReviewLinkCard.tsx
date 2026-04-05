'use client';

import ExternalLink from 'lucide-react/dist/esm/icons/external-link';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import type { ReviewLink, ReviewSource } from '@/types';

const SOURCE_STYLES: Record<ReviewSource, { label: string; className: string }> = {
  naver_blog: { label: '블로그', className: 'text-green-700 bg-green-100' },
  naver_cafe: { label: '카페', className: 'text-blue-700 bg-blue-100' },
  studyholic: { label: '스터디홀릭', className: 'text-sky-700 bg-sky-100' },
  learns: { label: '런즈', className: 'text-violet-700 bg-violet-100' },
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
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${sourceStyle.className}`}>
                {sourceStyle.label}
              </span>
              {review.tags && review.tags.length > 0 && (
                <div className="flex gap-1">
                  {review.tags.map((tag, i) => (
                    <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 font-medium">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
            
            <h5 className="text-sm font-medium text-gray-900 group-hover:text-emerald-700 transition-colors line-clamp-2 mb-1">
              {review.title}
            </h5>
            
            {review.summary ? (
              <p className="text-sm text-gray-600 font-medium mt-1 line-clamp-2 bg-emerald-50/50 p-2 rounded-md border border-emerald-100/50">
                ✨ {review.summary}
              </p>
            ) : (
              review.snippet && (
                <p className="text-xs text-gray-500 line-clamp-2">{review.snippet}</p>
              )
            )}
            
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-2">
                {review.sourceName && (
                  <span className="text-xs text-gray-400 truncate max-w-[100px]">{review.sourceName}</span>
                )}
                {review.date && (
                  <>
                    <span className="text-gray-300 text-[10px]">|</span>
                    <span className="text-xs text-gray-400">{review.date}</span>
                  </>
                )}
              </div>
              
            </div>
          </div>
          <ExternalLink className="w-4 h-4 text-gray-300 group-hover:text-emerald-500 flex-shrink-0 mt-1 transition-colors" />
        </div>
      </a>
      
      {onDeleteSuggestion && (
        <button
          onClick={handleDeleteClick}
          className="absolute bottom-2 right-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg bg-white/80 backdrop-blur-sm border border-gray-200 opacity-100 md:opacity-0 md:group-hover/card:opacity-100 hover:bg-red-50 hover:border-red-200 transition-all"
          title="삭제 제안"
        >
          <Trash2 className="w-3.5 h-3.5 text-red-400 hover:text-red-500" />
        </button>
      )}
    </div>
  );
}

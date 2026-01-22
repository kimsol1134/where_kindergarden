'use client';

import { Heart, X, Trash2 } from 'lucide-react';
import { useFavoriteStore, type FavoriteItem } from '@/stores';

/** 기관 유형별 스타일 */
const TYPE_STYLES = {
  public: { label: '국공립', className: 'text-emerald-600 bg-emerald-50' },
  private: { label: '사립', className: 'text-indigo-600 bg-indigo-50' },
  home: { label: '가정', className: 'text-gray-600 bg-gray-100' },
} as const;

interface FavoritesPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FavoritesPanel({ isOpen, onClose }: FavoritesPanelProps) {
  const { items, removeItem, clearAll } = useFavoriteStore();

  // js-tosorted-immutable: 정렬 시 toSorted 사용 (최신순)
  const sortedItems = items.toSorted((a, b) => b.addedAt - a.addedAt);

  const handleRemove = (kindercode: string) => {
    removeItem(kindercode);
  };

  const handleClearAll = () => {
    if (window.confirm('모든 찜한 목록을 삭제하시겠습니까?')) {
      clearAll();
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl z-50 flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 bg-white/80 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-red-500 fill-red-500" />
            <h2 className="text-lg font-bold text-gray-900">
              찜한 목록
              {/* rendering-conditional-render: 삼항 연산자 사용 */}
              {items.length > 0 ? (
                <span className="ml-2 text-sm font-normal text-gray-500">
                  {items.length}개
                </span>
              ) : null}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto bg-gray-50">
          {/* 빈 상태 UI */}
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Heart className="w-8 h-8 text-gray-300" />
              </div>
              <p className="text-gray-500 font-medium mb-2">찜한 유치원이 없습니다</p>
              <p className="text-sm text-gray-400">
                마음에 드는 유치원의 하트를 눌러 저장하세요
              </p>
            </div>
          ) : (
            <div className="p-4 space-y-3">
              {sortedItems.map((item) => (
                <FavoriteItemCard
                  key={item.kindercode}
                  item={item}
                  onRemove={handleRemove}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer - 모두 삭제 버튼 */}
        {items.length > 0 ? (
          <div className="p-4 border-t border-gray-200 bg-white">
            <button
              onClick={handleClearAll}
              className="w-full py-3 rounded-xl font-medium text-sm text-red-500 bg-red-50 hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              모두 삭제
            </button>
          </div>
        ) : null}
      </div>
    </>
  );
}

interface FavoriteItemCardProps {
  item: FavoriteItem;
  onRemove: (kindercode: string) => void;
}

function FavoriteItemCard({ item, onRemove }: FavoriteItemCardProps) {
  const typeStyle = TYPE_STYLES[item.type];

  return (
    <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${typeStyle.className}`}>
              {typeStyle.label}
            </span>
          </div>
          <h3 className="font-bold text-gray-900 text-base truncate">
            {item.name}
          </h3>
          <p className="text-xs text-gray-400 mt-1 truncate">
            {item.address}
          </p>
        </div>
        <button
          onClick={() => onRemove(item.kindercode)}
          className="flex-shrink-0 p-2 rounded-full hover:bg-red-50 text-red-500 transition-colors"
          title="찜 해제"
        >
          <Heart className="w-5 h-5 fill-red-500" />
        </button>
      </div>
    </div>
  );
}

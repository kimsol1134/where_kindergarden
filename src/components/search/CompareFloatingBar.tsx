'use client';

import { startTransition } from 'react';
import { X, ArrowRight, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useCompareStore, useUIStore } from '@/stores';

const MAX_COMPARE_ITEMS = 3;

export function CompareFloatingBar() {
  const { items, removeItem, clearAll } = useCompareStore();
  const adBannerHeight = useUIStore((state) => state.adBannerHeight);

  const handleRemoveItem = (kindercode: string) => {
    startTransition(() => {
      removeItem(kindercode);
    });
  };

  if (items.length === 0) {
    return null;
  }

  return (
    <div
      className="fixed left-0 w-full z-40"
      style={{ bottom: adBannerHeight }}
      id="compareBar"
    >
      <div className="bg-white border-t border-gray-200 shadow-[0_-5px_20px_rgba(0,0,0,0.1)] p-3 md:p-4">
        <div className="max-w-[1920px] mx-auto flex items-center justify-between gap-2 md:gap-4">
          {/* 선택된 아이템들 */}
          <div className="flex items-center gap-2 md:gap-4 overflow-x-auto hide-scrollbar flex-1 min-w-0">
            {items.map((item, index) => (
              <div key={item.kindercode} className="flex items-center gap-1 md:gap-1.5 flex-shrink-0 bg-gray-50 rounded-full pl-1 pr-1 md:pr-1.5 py-1">
                <div className="bg-emerald-500 text-white w-5 h-5 md:w-6 md:h-6 rounded-full flex items-center justify-center font-bold text-[10px] md:text-xs">
                  {index + 1}
                </div>
                <span className="font-medium text-gray-700 truncate max-w-[60px] md:max-w-[100px] text-xs md:text-sm">{item.name}</span>
                <button
                  onClick={() => handleRemoveItem(item.kindercode)}
                  className="relative w-11 h-11 flex items-center justify-center -mr-2"
                  aria-label={`${item.name} 제거`}
                >
                  <span className="w-6 h-6 rounded-full flex items-center justify-center bg-gray-200 text-gray-500 hover:bg-red-100 hover:text-red-500 transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </span>
                </button>
              </div>
            ))}

            {/* 구분선 및 남은 슬롯 표시 (데스크톱에서만) */}
            {items.length < MAX_COMPARE_ITEMS && (
              <>
                <div className="w-px h-4 bg-gray-300 flex-shrink-0 hidden md:block" />
                <span className="text-sm text-gray-500 flex-shrink-0 hidden md:block">
                  {MAX_COMPARE_ITEMS - items.length}개 더 선택 가능
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-1.5 md:gap-2 flex-shrink-0">
            {/* 전체 삭제 버튼 - 모바일에서는 아이콘만 */}
            <button
              onClick={clearAll}
              className="text-gray-500 hover:text-gray-700 p-2 md:px-3 md:py-2 text-sm font-medium transition-colors"
              aria-label="전체 삭제"
            >
              <Trash2 className="w-4 h-4 md:hidden" />
              <span className="hidden md:inline">전체 삭제</span>
            </button>

            {/* 비교하기 버튼 */}
            <Link
              href="/compare"
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 md:px-6 py-2 md:py-2.5 rounded-lg font-bold text-xs md:text-sm shadow-md transition-colors flex items-center gap-1.5 md:gap-2"
            >
              비교하기 ({items.length})
              <ArrowRight className="w-3.5 h-3.5 md:w-4 md:h-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import { X, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useCompareStore } from '@/stores';

const MAX_COMPARE_ITEMS = 3;

export function CompareFloatingBar() {
  const { items, removeItem, clearAll } = useCompareStore();

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 w-full z-40" id="compareBar">
      <div className="bg-white border-t border-gray-200 shadow-[0_-5px_20px_rgba(0,0,0,0.1)] p-4">
        <div className="max-w-[1920px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4 overflow-x-auto hide-scrollbar">
            {/* 선택된 아이템들 */}
            {items.map((item, index) => (
              <div key={item.kindercode} className="flex items-center gap-2 flex-shrink-0">
                <div className="bg-emerald-100 text-emerald-600 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm">
                  {index + 1}
                </div>
                <span className="font-bold text-gray-800 truncate max-w-[120px]">{item.name}</span>
                <button
                  onClick={() => removeItem(item.kindercode)}
                  className="text-gray-400 hover:text-gray-600 p-1"
                  aria-label={`${item.name} 제거`}
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}

            {/* 구분선 및 남은 슬롯 표시 */}
            {items.length < MAX_COMPARE_ITEMS && (
              <>
                <div className="w-px h-4 bg-gray-300 flex-shrink-0" />
                <span className="text-sm text-gray-500 flex-shrink-0">
                  {MAX_COMPARE_ITEMS - items.length}개 더 선택 가능
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0 ml-4">
            {/* 전체 삭제 버튼 */}
            <button
              onClick={clearAll}
              className="text-gray-500 hover:text-gray-700 px-3 py-2 text-sm font-medium"
            >
              전체 삭제
            </button>

            {/* 비교하기 버튼 */}
            <Link
              href="/compare"
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-lg font-bold text-sm shadow-md transition-colors flex items-center gap-2"
            >
              비교하기 ({items.length})
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

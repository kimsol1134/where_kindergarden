'use client';

import { useState, startTransition } from 'react';
import { ChevronUp, X, ArrowRight, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useCompareStore, useSearchStore } from '@/stores';
import { generateCompareSharePath } from '@/lib/share/kakaoShare';

const MAX_COMPARE_ITEMS = 3;

export function CompareFloatingBar() {
  const [isExpanded, setIsExpanded] = useState(false);
  const { items, removeItem, clearAll } = useCompareStore();
  const { location, address } = useSearchStore();

  const comparePath = generateCompareSharePath(
    items.map((item) => item.kindercode),
    location,
    address
  );

  const handleRemoveItem = (kindercode: string) => {
    startTransition(() => {
      removeItem(kindercode);
    });
  };

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="fixed-bottom-with-ad fixed left-0 z-40 w-full">
      <div className="border-t border-gray-200 bg-white shadow-[0_-5px_20px_rgba(0,0,0,0.1)]">
        <div className="mx-auto hidden max-w-[1920px] items-center justify-between gap-4 p-4 md:flex">
          <div className="hide-scrollbar flex min-w-0 flex-1 items-center gap-4 overflow-x-auto">
            {items.map((item, index) => (
              <div
                key={item.kindercode}
                className="flex flex-shrink-0 items-center gap-1.5 rounded-full bg-gray-50 py-1 pl-1 pr-1.5"
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-white">
                  {index + 1}
                </div>
                <span className="max-w-[100px] truncate text-sm font-medium text-gray-700">
                  {item.name}
                </span>
                <button
                  type="button"
                  onClick={() => handleRemoveItem(item.kindercode)}
                  className="flex h-10 w-10 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-red-100 hover:text-red-500"
                  aria-label={`${item.name} 제거`}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}

            {items.length < MAX_COMPARE_ITEMS ? (
              <>
                <div className="h-4 w-px flex-shrink-0 bg-gray-300" />
                <span className="flex-shrink-0 text-sm text-gray-500">
                  {MAX_COMPARE_ITEMS - items.length}개 더 선택 가능
                </span>
              </>
            ) : null}
          </div>

          <div className="flex flex-shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={clearAll}
              className="px-3 py-2 text-sm font-medium text-gray-500 transition-colors hover:text-gray-700"
            >
              전체 삭제
            </button>
            <Link
              href={comparePath}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white shadow-md transition-colors hover:bg-emerald-700"
            >
              비교하기 ({items.length})
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <div className="p-3 md:hidden">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsExpanded((value) => !value)}
              className="flex min-w-0 flex-1 items-center justify-between rounded-2xl bg-gray-50 px-4 py-3 text-left"
              aria-expanded={isExpanded}
              aria-controls="mobile-compare-summary"
            >
              <div>
                <div className="text-sm font-bold text-gray-900">
                  {items.length}개 기관을 비교할 준비가 됐어요
                </div>
                <div className="mt-1 text-xs text-gray-500">
                  {items.map((item) => item.name).join(' · ')}
                </div>
              </div>
              <ChevronUp
                className={`h-4 w-4 flex-shrink-0 text-gray-400 transition-transform ${
                  isExpanded ? 'rotate-0' : 'rotate-180'
                }`}
              />
            </button>

            <Link
              href={comparePath}
              className="flex flex-shrink-0 items-center gap-1.5 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white shadow-md"
            >
              비교하기
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {isExpanded ? (
            <div id="mobile-compare-summary" className="mt-3 rounded-2xl bg-gray-50 p-3">
              <div className="hide-scrollbar flex gap-2 overflow-x-auto pb-1">
                {items.map((item, index) => (
                  <div
                    key={item.kindercode}
                    className="flex min-w-[164px] flex-shrink-0 items-center justify-between rounded-2xl border border-gray-200 bg-white px-3 py-3"
                  >
                    <div className="min-w-0">
                      <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-600">
                        선택 {index + 1}
                      </div>
                      <div className="mt-1 truncate text-sm font-semibold text-gray-900">
                        {item.name}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item.kindercode)}
                      className="ml-3 flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition-colors hover:bg-red-100 hover:text-red-500"
                      aria-label={`${item.name} 제거`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={clearAll}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium text-gray-500 transition-colors hover:bg-white hover:text-gray-700"
              >
                <Trash2 className="h-4 w-4" />
                비교함 비우기
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

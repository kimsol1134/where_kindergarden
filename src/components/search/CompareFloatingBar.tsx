'use client';

import { useRef, useEffect } from 'react';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useCompareStore, useUIStore, MAX_COMPARE_ITEMS } from '@/stores';

export function CompareFloatingBar() {
  const items = useCompareStore((state) => state.items);
  const containerRef = useRef<HTMLDivElement>(null);
  const setCompareBarHeight = useUIStore((state) => state.setCompareBarHeight);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) {
      document.documentElement.style.setProperty('--compare-bar-height', '0px');
      setCompareBarHeight(0);
      return;
    }

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const height = entry.borderBoxSize?.[0]?.blockSize ?? entry.contentRect.height;
        document.documentElement.style.setProperty('--compare-bar-height', `${height}px`);
        setCompareBarHeight(height);
      }
    });

    observer.observe(el);

    return () => {
      observer.disconnect();
      document.documentElement.style.setProperty('--compare-bar-height', '0px');
      setCompareBarHeight(0);
    };
  }, [setCompareBarHeight, items.length]);

  if (items.length === 0) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className="fixed left-0 w-full z-[45] fixed-bottom-with-ad"
      id="compareBar"
    >
      <div className="bg-white border-t border-gray-200 shadow-[0_-4px_12px_rgba(0,0,0,0.08)] px-4 py-2.5">
        <div className="max-w-[1920px] mx-auto flex items-center justify-between">
          {/* 좌: 도트 인디케이터 + 선택 개수 */}
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1">
              {Array.from({ length: MAX_COMPARE_ITEMS }).map((_, i) => (
                <div
                  key={i}
                  className={`w-2.5 h-2.5 rounded-full transition-colors ${
                    i < items.length ? 'bg-emerald-500' : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>
            <span className="text-sm font-medium text-gray-700">
              {items.length}곳 선택
            </span>
          </div>

          {/* 우: 비교하기 CTA */}
          <Link
            href="/compare"
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-lg font-bold text-sm shadow-sm transition-colors flex items-center gap-1.5"
          >
            비교하기
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

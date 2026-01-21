'use client';

import Link from 'next/link';
import { Search } from 'lucide-react';
import { CompareHeader } from '@/components/compare/CompareHeader';
import { CompareGrid } from '@/components/compare/CompareGrid';
import { useCompareStore } from '@/stores';

export default function ComparePage() {
  const { items } = useCompareStore();

  // 비교할 아이템이 없으면 빈 상태 표시
  if (items.length === 0) {
    return (
      <div className="bg-gray-50 text-gray-900 min-h-screen">
        <CompareHeader />
        <main className="max-w-5xl mx-auto px-4 py-16 flex flex-col items-center justify-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <Search className="w-8 h-8 text-gray-400" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">비교할 기관이 없습니다</h2>
          <p className="text-sm text-gray-500 text-center mb-6">
            검색 결과에서 비교할 기관을 선택해주세요
          </p>
          <Link
            href="/search"
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg font-bold text-sm shadow-md transition-colors"
          >
            기관 검색하기
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 text-gray-900 min-h-screen">
      <CompareHeader />
      <main className="max-w-5xl mx-auto pb-24">
        <CompareGrid items={items} />
      </main>
    </div>
  );
}

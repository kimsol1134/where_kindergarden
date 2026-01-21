'use client';

import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function CompareHeader() {
  const router = useRouter();

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-bold">기관 비교하기</h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 mr-2">총 <span className="text-emerald-600 font-bold">2</span>개 비교 중</span>
          <button className="text-xs font-medium text-gray-400 hover:text-gray-600 underline">전체 삭제</button>
        </div>
      </div>
    </header>
  );
}

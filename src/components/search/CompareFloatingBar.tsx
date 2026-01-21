'use client';

import { X, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export function CompareFloatingBar() {
  return (
    <div className="fixed bottom-0 left-0 w-full z-40" id="compareBar">
      <div className="bg-white border-t border-gray-200 shadow-[0_-5px_20px_rgba(0,0,0,0.1)] p-4">
        <div className="max-w-[1920px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="bg-emerald-100 text-emerald-600 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm">1</div>
              <span className="font-bold text-gray-800">역삼유치원</span>
              <button className="text-gray-400 hover:text-gray-600"><X className="w-3 h-3" /></button>
            </div>
            <div className="w-px h-4 bg-gray-300"></div>
            <span className="text-sm text-gray-500">최대 3개까지 선택 가능</span>
          </div>
          <Link href="/compare" className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-lg font-bold text-sm shadow-md transition-colors flex items-center gap-2">
            비교하기
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

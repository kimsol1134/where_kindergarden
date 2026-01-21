'use client';

import Link from 'next/link';
import { School, Search, X, Heart, User, SlidersHorizontal, ChevronDown, Bus, Clock } from 'lucide-react';

export function SearchHeader() {
  return (
    <header className="bg-white border-b border-gray-200 z-30 flex-none">
      <div className="max-w-[1920px] mx-auto px-4 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 flex-shrink-0">
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center text-white">
            <School className="w-5 h-5" />
          </div>
          <span className="text-lg font-bold tracking-tight text-gray-900 hidden md:block">우리동네 유치원</span>
        </Link>

        {/* Search Input */}
        <div className="flex-1 max-w-xl relative group">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-emerald-500 transition-colors">
            <Search className="w-5 h-5" />
          </div>
          <input 
            type="text" 
            defaultValue="서울 강남구 역삼동" 
            className="w-full bg-gray-100 hover:bg-gray-50 focus:bg-white border border-transparent focus:border-emerald-500 rounded-full py-2.5 pl-10 pr-12 text-sm transition-all outline-none shadow-sm"
            placeholder="지역, 기관명으로 검색해보세요"
          />
          <button className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full hover:bg-gray-200 text-gray-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <button className="hidden md:flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 px-3 py-2 rounded-lg hover:bg-gray-100">
            <Heart className="w-4 h-4" />
            찜한 목록
          </button>
          <div className="h-6 w-px bg-gray-200 hidden md:block"></div>
          <button className="flex items-center gap-2 text-sm font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-4 py-2 rounded-lg transition-colors">
            <User className="w-4 h-4" />
            로그인
          </button>
        </div>
      </div>

      {/* Filters (Scrollable) */}
      <div className="border-t border-gray-100 py-3 px-4 flex gap-2 overflow-x-auto hide-scrollbar">
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gray-300 bg-white text-xs font-medium hover:border-gray-800 hover:bg-gray-50 transition-colors whitespace-nowrap">
          <SlidersHorizontal className="w-3.5 h-3.5" /> 필터
        </button>
        <div className="w-px h-6 bg-gray-200 mx-1"></div>
        
        {/* Active Filter */}
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-emerald-500 bg-emerald-50 text-emerald-700 text-xs font-bold whitespace-nowrap">
          유형: 전체 <ChevronDown className="w-3 h-3" />
        </button>
        
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gray-200 bg-white text-gray-600 text-xs font-medium hover:border-gray-400 whitespace-nowrap">
          연령 <ChevronDown className="w-3 h-3" />
        </button>
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gray-200 bg-white text-gray-600 text-xs font-medium hover:border-gray-400 whitespace-nowrap">
          설립유형 <ChevronDown className="w-3 h-3" />
        </button>
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gray-200 bg-white text-gray-600 text-xs font-medium hover:border-gray-400 whitespace-nowrap">
          <Bus className="w-3.5 h-3.5" /> 셔틀버스
        </button>
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gray-200 bg-white text-gray-600 text-xs font-medium hover:border-gray-400 whitespace-nowrap">
          <Clock className="w-3.5 h-3.5" /> 야간연장
        </button>
      </div>
    </header>
  );
}

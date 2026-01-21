'use client';

import { Heart, Star, ArrowDownUp } from 'lucide-react';

export function KindergartenList() {
  return (
    <aside className="w-full md:w-[450px] lg:w-[500px] bg-white flex flex-col border-r border-gray-200 z-20 absolute md:relative h-full transition-transform duration-300 transform md:translate-x-0" id="listPanel">
      {/* List Header */}
      <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-end bg-white">
        <div>
          <h1 className="text-lg font-bold text-gray-900">검색 결과 <span className="text-emerald-600">12</span>건</h1>
          <p className="text-xs text-gray-500 mt-1">서울 강남구 역삼동 기준 2km 이내</p>
        </div>
        <div className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer hover:text-gray-900">
          거리순 <ArrowDownUp className="w-3 h-3" />
        </div>
      </div>

      {/* List Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        
        {/* Card 1 (Active/Hovered) */}
        <div className="bg-white rounded-xl p-4 border border-emerald-500 shadow-md relative group cursor-pointer transition-all hover:shadow-lg">
          <div className="absolute top-4 right-4">
            <button className="text-gray-300 hover:text-red-500 transition-colors"><Heart className="w-5 h-5" /></button>
          </div>
          <div className="flex gap-4">
            <div className="w-20 h-20 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden">
              <img src="https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?auto=format&fit=crop&w=200&q=80" className="w-full h-full object-cover" alt="thumb" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">국공립</span>
                <h3 className="font-bold text-gray-900 text-lg truncate">역삼유치원</h3>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                <span className="flex items-center gap-0.5"><Star className="w-3 h-3 text-yellow-400 fill-yellow-400" /> 4.8 (120)</span>
                <span className="text-gray-300">|</span>
                <span>0.3km</span>
                <span className="text-gray-300">|</span>
                <span>정원 120명</span>
              </div>
              <div className="flex gap-1 flex-wrap">
                <span className="px-1.5 py-0.5 rounded border border-gray-200 text-gray-500 text-[10px]">방과후과정</span>
                <span className="px-1.5 py-0.5 rounded border border-gray-200 text-gray-500 text-[10px]">특수학급</span>
                <span className="px-1.5 py-0.5 rounded border border-gray-200 text-emerald-600 border-emerald-200 bg-emerald-50/50 text-[10px]">셔틀운행</span>
              </div>
            </div>
          </div>
          {/* Compare Button */}
          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
            <div className="text-xs text-gray-400">서울 강남구 테헤란로 123</div>
            <label className="chk-group cursor-pointer flex items-center gap-2">
              <input type="checkbox" className="peer hidden" defaultChecked />
              <div className="text-xs font-bold px-3 py-1.5 rounded-md bg-gray-100 text-gray-600 transition-all hover:bg-gray-200 peer-checked:bg-emerald-50 peer-checked:text-emerald-700 border border-transparent">
                + 비교함 담기
              </div>
            </label>
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm relative group cursor-pointer transition-all hover:border-emerald-400 hover:shadow-md">
          <div className="absolute top-4 right-4">
            <button className="text-gray-300 hover:text-red-500 transition-colors"><Heart className="w-5 h-5" /></button>
          </div>
          <div className="flex gap-4">
            <div className="w-20 h-20 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden">
              <img src="https://images.unsplash.com/photo-1596464716127-f9a8625579c3?auto=format&fit=crop&w=200&q=80" className="w-full h-full object-cover" alt="thumb" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">민간</span>
                <h3 className="font-bold text-gray-900 text-lg truncate">해맑은어린이집</h3>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                <span className="flex items-center gap-0.5"><Star className="w-3 h-3 text-yellow-400 fill-yellow-400" /> 4.5 (82)</span>
                <span className="text-gray-300">|</span>
                <span>0.5km</span>
                <span className="text-gray-300">|</span>
                <span>정원 45명</span>
              </div>
              <div className="flex gap-1 flex-wrap">
                <span className="px-1.5 py-0.5 rounded border border-gray-200 text-gray-500 text-[10px]">야간연장</span>
                <span className="px-1.5 py-0.5 rounded border border-gray-200 text-gray-500 text-[10px]">시간제보육</span>
              </div>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
            <div className="text-xs text-gray-400">서울 강남구 논현로 456</div>
            <label className="chk-group cursor-pointer flex items-center gap-2">
              <input type="checkbox" className="peer hidden" />
              <div className="text-xs font-bold px-3 py-1.5 rounded-md bg-gray-100 text-gray-600 transition-all hover:bg-gray-200 peer-checked:bg-emerald-50 peer-checked:text-emerald-700 border border-transparent">
                + 비교함 담기
              </div>
            </label>
          </div>
        </div>

        {/* Card 3 */}
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm relative group cursor-pointer transition-all hover:border-emerald-400 hover:shadow-md">
          <div className="absolute top-4 right-4">
            <button className="text-gray-300 hover:text-red-500 transition-colors"><Heart className="w-5 h-5" /></button>
          </div>
          <div className="flex gap-4">
            <div className="w-20 h-20 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden">
              <img src="https://images.unsplash.com/photo-1516627145497-ae6968895b74?auto=format&fit=crop&w=200&q=80" className="w-full h-full object-cover" alt="thumb" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">사립</span>
                <h3 className="font-bold text-gray-900 text-lg truncate">꿈나무유치원</h3>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                <span className="flex items-center gap-0.5"><Star className="w-3 h-3 text-yellow-400 fill-yellow-400" /> 4.9 (210)</span>
                <span className="text-gray-300">|</span>
                <span>1.2km</span>
                <span className="text-gray-300">|</span>
                <span>정원 200명</span>
              </div>
              <div className="flex gap-1 flex-wrap">
                <span className="px-1.5 py-0.5 rounded border border-gray-200 text-gray-500 text-[10px]">영어교육</span>
                <span className="px-1.5 py-0.5 rounded border border-gray-200 text-emerald-600 border-emerald-200 bg-emerald-50/50 text-[10px]">셔틀운행</span>
              </div>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
            <div className="text-xs text-gray-400">서울 강남구 도곡로 789</div>
            <label className="chk-group cursor-pointer flex items-center gap-2">
              <input type="checkbox" className="peer hidden" />
              <div className="text-xs font-bold px-3 py-1.5 rounded-md bg-gray-100 text-gray-600 transition-all hover:bg-gray-200 peer-checked:bg-emerald-50 peer-checked:text-emerald-700 border border-transparent">
                + 비교함 담기
              </div>
            </label>
          </div>
        </div>

        {/* More Button */}
        <button className="w-full py-3 text-sm text-gray-500 font-medium hover:bg-gray-100 rounded-lg transition-colors border border-dashed border-gray-300">
          결과 더보기
        </button>
      </div>
    </aside>
  );
}

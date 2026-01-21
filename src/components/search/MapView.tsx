'use client';

import { Crosshair, Plus, Minus, RotateCw, List } from 'lucide-react';

export function MapView() {
  return (
    <div className="flex-1 bg-gray-100 relative h-full w-full">
      {/* Mock Map Background */}
      <div className="absolute inset-0 bg-gray-200 overflow-hidden">
        {/* Map Tiles (Simulated) */}
        <div 
          className="w-full h-full opacity-60 bg-cover bg-center" 
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=2400&q=80')" }}
        ></div>
        
        {/* Grid Lines to simulate map interface */}
        <div 
          className="absolute inset-0" 
          style={{ 
            backgroundImage: "linear-gradient(#00000005 1px, transparent 1px), linear-gradient(90deg, #00000005 1px, transparent 1px)", 
            backgroundSize: "100px 100px" 
          }}
        ></div>
      </div>

      {/* Map Controls */}
      <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
        <button className="bg-white p-2 rounded shadow-md text-gray-600 hover:text-emerald-600 hover:bg-gray-50">
          <Crosshair className="w-5 h-5" />
        </button>
        <button className="bg-white p-2 rounded shadow-md text-gray-600 hover:text-emerald-600 hover:bg-gray-50">
          <Plus className="w-5 h-5" />
        </button>
        <button className="bg-white p-2 rounded shadow-md text-gray-600 hover:text-emerald-600 hover:bg-gray-50">
          <Minus className="w-5 h-5" />
        </button>
      </div>

      {/* Re-search Button */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
        <button className="bg-white px-4 py-2 rounded-full shadow-md text-emerald-600 text-sm font-bold flex items-center gap-2 hover:bg-gray-50 transition-transform hover:scale-105">
          <RotateCw className="w-4 h-4" />
          이 지역 재검색
        </button>
      </div>

      {/* Markers */}
      {/* Active Marker */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20 cursor-pointer group">
        <div className="relative">
          <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center text-white shadow-xl marker-pulse border-4 border-white">
            <span className="font-bold text-sm">1</span>
          </div>
          {/* Tooltip */}
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-48 bg-white rounded-lg shadow-xl border border-gray-100 p-3 hidden group-hover:block animate-fade-up">
            <div className="text-xs font-bold text-emerald-600 mb-0.5">국공립</div>
            <div className="font-bold text-gray-900 mb-1">역삼유치원</div>
            <div className="text-xs text-gray-500">⭐️ 4.8 | 정원 120명</div>
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-3 h-3 bg-white border-r border-b border-gray-100 transform rotate-45"></div>
          </div>
        </div>
      </div>

      {/* Inactive Marker 2 */}
      <div className="absolute top-1/3 left-1/3 transform z-10 cursor-pointer hover:z-20 transition-transform hover:scale-110">
        <div className="w-8 h-8 bg-white border-2 border-emerald-500 rounded-full flex items-center justify-center text-emerald-700 shadow-md font-bold text-xs">
          2
        </div>
      </div>

      {/* Inactive Marker 3 */}
      <div className="absolute bottom-1/3 right-1/3 transform z-10 cursor-pointer hover:z-20 transition-transform hover:scale-110">
        <div className="w-8 h-8 bg-white border-2 border-emerald-500 rounded-full flex items-center justify-center text-emerald-700 shadow-md font-bold text-xs">
          3
        </div>
      </div>

       {/* Inactive Marker 4 */}
       <div className="absolute top-1/4 right-1/4 transform z-10 cursor-pointer hover:z-20 transition-transform hover:scale-110">
        <div className="w-8 h-8 bg-white border-2 border-gray-400 rounded-full flex items-center justify-center text-gray-600 shadow-md font-bold text-xs opacity-80">
          4
        </div>
      </div>

      {/* Mobile List Toggle Button (Visible only on mobile inside map) */}
      <div className="md:hidden absolute bottom-6 left-1/2 -translate-x-1/2 z-50">
        <button className="bg-white text-gray-900 px-5 py-3 rounded-full shadow-lg border border-gray-200 flex items-center gap-2 font-bold text-sm">
          <List className="w-4 h-4" /> 목록 보기
        </button>
      </div>
    </div>
  );
}

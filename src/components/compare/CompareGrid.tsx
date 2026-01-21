'use client';

import { Layers, XCircle, Info, BookOpen, Check, ShieldCheck, Smile, Star, Phone, Calendar } from 'lucide-react';

export function CompareGrid() {
  return (
    <>
      <div className="sticky-header bg-white border-b border-gray-100 shadow-sm">
        <div className="grid grid-cols-[100px_repeat(2,1fr)] sm:grid-cols-[140px_repeat(2,1fr)]">
          <div className="bg-gray-50 flex flex-col items-center justify-center p-4 border-r border-gray-100">
            <Layers className="w-6 h-6 text-gray-300 mb-2" />
            <span className="text-[10px] text-gray-400 font-medium">항목 비교</span>
          </div>
          
          {/* Institution 1 */}
          <div className="p-4 border-r border-gray-100 relative group text-center">
            <button className="absolute top-2 right-2 text-gray-300 hover:text-gray-500">
              <XCircle className="w-5 h-5" />
            </button>
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-xl overflow-hidden mb-3 shadow-sm bg-gray-100">
                <img src="https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?auto=format&fit=crop&w=200&q=80" className="w-full h-full object-cover" alt="thumb" />
              </div>
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded mb-1">국공립</span>
              <h3 className="text-sm font-bold truncate w-full">역삼유치원</h3>
            </div>
          </div>

          {/* Institution 2 */}
          <div className="p-4 relative group text-center">
            <button className="absolute top-2 right-2 text-gray-300 hover:text-gray-500">
              <XCircle className="w-5 h-5" />
            </button>
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-xl overflow-hidden mb-3 shadow-sm bg-gray-100">
                <img src="https://images.unsplash.com/photo-1516627145497-ae6968895b74?auto=format&fit=crop&w=200&q=80" className="w-full h-full object-cover" alt="thumb" />
              </div>
              <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded mb-1">사립</span>
              <h3 className="text-sm font-bold truncate w-full">꿈나무유치원</h3>
            </div>
          </div>
        </div>
      </div>

      {/* Comparison Content */}
      <div className="bg-white">
        
        {/* Section: 기본 정보 */}
        <div className="border-b border-gray-100">
          <div className="px-4 py-3 bg-gray-50/50 text-xs font-bold text-gray-500 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5" /> 기본 정보
          </div>
          
          <div className="grid grid-cols-[100px_repeat(2,1fr)] sm:grid-cols-[140px_repeat(2,1fr)] border-b border-gray-50">
            <div className="p-4 bg-gray-50/30 text-xs text-gray-500 font-medium">설립일</div>
            <div className="p-4 text-sm text-center">2010년 03월</div>
            <div className="p-4 text-sm text-center">2015년 05월</div>
          </div>
          
          <div className="grid grid-cols-[100px_repeat(2,1fr)] sm:grid-cols-[140px_repeat(2,1fr)] border-b border-gray-50">
            <div className="p-4 bg-gray-50/30 text-xs text-gray-500 font-medium">정원 / 현원</div>
            <div className="p-4 text-sm text-center">
              <div className="font-bold text-emerald-600">120명 / 118명</div>
              <div className="text-[10px] text-gray-400 mt-1">충원율 98%</div>
            </div>
            <div className="p-4 text-sm text-center">
              <div className="font-bold text-emerald-600">200명 / 195명</div>
              <div className="text-[10px] text-gray-400 mt-1">충원율 97.5%</div>
            </div>
          </div>

          <div className="grid grid-cols-[100px_repeat(2,1fr)] sm:grid-cols-[140px_repeat(2,1fr)] border-b border-gray-50">
            <div className="p-4 bg-gray-50/30 text-xs text-gray-500 font-medium">교사당 아동수</div>
            <div className="p-4 text-sm text-center">8.5명</div>
            <div className="p-4 text-sm text-center">10.2명</div>
          </div>
        </div>

        {/* Section: 교육 프로그램 */}
        <div className="border-b border-gray-100">
          <div className="px-4 py-3 bg-gray-50/50 text-xs font-bold text-gray-500 flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5" /> 교육 및 활동
          </div>
          
          <div className="grid grid-cols-[100px_repeat(2,1fr)] sm:grid-cols-[140px_repeat(2,1fr)] border-b border-gray-50">
            <div className="p-4 bg-gray-50/30 text-xs text-gray-500 font-medium">특화 프로그램</div>
            <div className="p-4 text-sm">
              <ul className="space-y-1">
                <li className="flex items-center gap-1 text-[11px]"><Check className="w-3 h-3 text-emerald-500" /> 숲 체험</li>
                <li className="flex items-center gap-1 text-[11px]"><Check className="w-3 h-3 text-emerald-500" /> 창의 코딩</li>
              </ul>
            </div>
            <div className="p-4 text-sm">
              <ul className="space-y-1">
                <li className="flex items-center gap-1 text-[11px]"><Check className="w-3 h-3 text-emerald-500" /> 원어민 영어</li>
                <li className="flex items-center gap-1 text-[11px]"><Check className="w-3 h-3 text-emerald-500" /> 발레/음악</li>
                <li className="flex items-center gap-1 text-[11px]"><Check className="w-3 h-3 text-emerald-500" /> 수영 교실</li>
              </ul>
            </div>
          </div>

          <div className="grid grid-cols-[100px_repeat(2,1fr)] sm:grid-cols-[140px_repeat(2,1fr)] border-b border-gray-50">
            <div className="p-4 bg-gray-50/30 text-xs text-gray-500 font-medium">방과후 과정</div>
            <div className="p-4 text-sm text-center">운영 (19:00까지)</div>
            <div className="p-4 text-sm text-center">운영 (18:30까지)</div>
          </div>
        </div>

        {/* Section: 시설 및 안전 */}
        <div className="border-b border-gray-100">
          <div className="px-4 py-3 bg-gray-50/50 text-xs font-bold text-gray-500 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" /> 시설 및 안전
          </div>
          
          <div className="grid grid-cols-[100px_repeat(2,1fr)] sm:grid-cols-[140px_repeat(2,1fr)] border-b border-gray-50">
            <div className="p-4 bg-gray-50/30 text-xs text-gray-500 font-medium">CCTV 설치수</div>
            <div className="p-4 text-sm text-center">12대</div>
            <div className="p-4 text-sm text-center">24대</div>
          </div>

          <div className="grid grid-cols-[100px_repeat(2,1fr)] sm:grid-cols-[140px_repeat(2,1fr)] border-b border-gray-50">
            <div className="p-4 bg-gray-50/30 text-xs text-gray-500 font-medium">통학차량</div>
            <div className="p-4 text-sm text-center text-emerald-600 font-bold">운영</div>
            <div className="p-4 text-sm text-center text-emerald-600 font-bold">운영</div>
          </div>

          <div className="grid grid-cols-[100px_repeat(2,1fr)] sm:grid-cols-[140px_repeat(2,1fr)] border-b border-gray-50">
            <div className="p-4 bg-gray-50/30 text-xs text-gray-500 font-medium">급식 정보</div>
            <div className="p-4 text-sm text-center">직영급식</div>
            <div className="p-4 text-sm text-center">직영급식</div>
          </div>
        </div>

        {/* Section: 평가 및 리뷰 */}
        <div className="border-b border-gray-100">
          <div className="px-4 py-3 bg-gray-50/50 text-xs font-bold text-gray-500 flex items-center gap-1.5">
            <Smile className="w-3.5 h-3.5" /> 학부모 평점
          </div>
          
          <div className="grid grid-cols-[100px_repeat(2,1fr)] sm:grid-cols-[140px_repeat(2,1fr)] border-b border-gray-50">
            <div className="p-4 bg-gray-50/30 text-xs text-gray-500 font-medium">종합 평점</div>
            <div className="p-4 text-center">
              <div className="text-xl font-black text-gray-900">4.8</div>
              <div className="flex justify-center gap-0.5 mt-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                ))}
              </div>
            </div>
            <div className="p-4 text-center">
              <div className="text-xl font-black text-gray-900">4.9</div>
              <div className="flex justify-center gap-0.5 mt-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 px-4 text-center">
        <p className="text-xs text-gray-400">
          * 위 정보는 정보공시 데이터를 바탕으로 제공되며, 실제 현황과 다를 수 있습니다.
        </p>
      </div>

      {/* Floating Action Buttons */}
      <div className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 p-4 z-40">
        <div className="max-w-5xl mx-auto flex gap-3">
          <div className="flex-1 grid grid-cols-2 gap-3">
            <button className="flex flex-col items-center justify-center py-2 px-4 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors">
              <Phone className="w-5 h-5 text-gray-600 mb-1" />
              <span className="text-[11px] font-bold text-gray-700">전화 상담</span>
            </button>
            <button className="flex flex-col items-center justify-center py-2 px-4 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-100">
              <Calendar className="w-5 h-5 mb-1" />
              <span className="text-[11px] font-bold">방문 예약</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

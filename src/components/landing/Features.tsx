import { Check, Users, Bus, CircleSlash, ArrowRight, BarChart2, Award, Share2, BarChart3, Search } from 'lucide-react';

export function Features() {
  return (
    <section id="features" className="py-24 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Feature 1: Search & List */}
        <div className="flex flex-col lg:flex-row items-center gap-16 mb-32">
          <div className="lg:w-1/2 order-2 lg:order-1 relative">
            {/* Mobile Mockup: Search Result */}
            <div className="mobile-frame max-w-sm mx-auto h-[600px] bg-gray-50 flex flex-col">
              {/* App Header */}
              <div className="pt-10 pb-4 px-4 bg-white shadow-sm z-10">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-lg font-bold">📍 서울 강남구 역삼동</span>
                  <button className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-600">변경</button>
                </div>
                <div className="flex gap-2">
                  <div className="px-3 py-1.5 rounded-full border border-emerald-500 bg-emerald-50 text-emerald-700 text-xs font-medium">반경 1km</div>
                  <div className="px-3 py-1.5 rounded-full border border-gray-200 bg-white text-gray-600 text-xs font-medium">전체 유형</div>
                </div>
              </div>
              
              {/* List Content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Card 1 */}
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm relative">
                  <div className="absolute top-4 left-4">
                    <div className="w-5 h-5 rounded border-2 border-emerald-500 bg-emerald-500 flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  </div>
                  <div className="pl-8">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-bold text-gray-900">역삼유치원</h3>
                        <span className="text-xs text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded font-medium">공립</span>
                        <span className="text-xs text-gray-500 ml-1">0.3km</span>
                      </div>
                    </div>
                    <div className="flex gap-3 text-xs text-gray-500 mb-3">
                      <span className="flex items-center gap-1"><Users className="w-3 h-3" /> 정원 40명</span>
                      <span className="flex items-center gap-1"><Bus className="w-3 h-3" /> 셔틀 있음</span>
                    </div>
                    <div className="border-t border-gray-50 pt-3 mt-2 text-xs text-gray-500 space-y-1">
                      <p>📍 서울 강남구 역삼로 123</p>
                      <p>📞 02-1234-5678</p>
                    </div>
                  </div>
                </div>

                {/* Card 2 */}
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm relative opacity-70">
                  <div className="absolute top-4 left-4">
                    <div className="w-5 h-5 rounded border-2 border-gray-300"></div>
                  </div>
                  <div className="pl-8">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-bold text-gray-900">해맑은어린이집</h3>
                        <span className="text-xs text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded font-medium">민간</span>
                        <span className="text-xs text-gray-500 ml-1">0.5km</span>
                      </div>
                    </div>
                    <div className="flex gap-3 text-xs text-gray-500">
                      <span className="flex items-center gap-1"><Users className="w-3 h-3" /> 정원 60명</span>
                      <span className="flex items-center gap-1 text-gray-400"><CircleSlash className="w-3 h-3" /> 셔틀 없음</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sticky Bottom CTA */}
              <div className="p-4 bg-white border-t border-gray-100">
                <button className="w-full bg-emerald-500 text-white py-3 rounded-lg font-bold shadow-lg shadow-emerald-100 text-sm flex items-center justify-center gap-2">
                  <span>선택한 1개 비교하기</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            {/* Decor elements */}
            <div className="absolute -z-10 top-20 -right-12 w-64 h-64 bg-emerald-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse"></div>
            <div className="absolute -z-10 bottom-10 -left-12 w-64 h-64 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30"></div>
          </div>
          
          <div className="lg:w-1/2 order-1 lg:order-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-sm font-semibold mb-4">
              <Search className="w-4 h-4" />
              스마트 검색
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
              복잡한 정보 검색은 그만,<br/>
              <span className="text-emerald-500">필요한 정보만 쏙쏙</span>
            </h2>
            <p className="text-lg text-gray-600 mb-8 leading-relaxed">
              지도 앱 켜고, 맘카페 검색하고, 홈페이지 들어가보고...<br/>
              이제 &apos;우리동네 유치원&apos;에서 한 번에 해결하세요.
            </p>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Check className="w-4 h-4 text-emerald-600" />
                </div>
                <span className="text-gray-700"><strong>위치 기반 검색:</strong> 집 근처 유치원/어린이집을 거리순으로 확인</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Check className="w-4 h-4 text-emerald-600" />
                </div>
                <span className="text-gray-700"><strong>유형별 필터:</strong> 국공립, 사립, 민간 등 원하는 유형만 골라보기</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Check className="w-4 h-4 text-emerald-600" />
                </div>
                <span className="text-gray-700"><strong>핵심 정보 요약:</strong> 정원, 현원, 셔틀버스 등 필수 정보 즉시 확인</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Feature 2: Comparison */}
        <div className="flex flex-col lg:flex-row items-center gap-16">
          <div className="lg:w-1/2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-50 text-purple-600 text-sm font-semibold mb-4">
              <BarChart2 className="w-4 h-4" />
              한눈에 비교
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
              고민되는 후보들,<br/>
              <span className="text-emerald-500">표 하나로 깔끔하게 정리</span>
            </h2>
            <p className="text-lg text-gray-600 mb-8 leading-relaxed">
              최대 3개 기관을 선택하여 나란히 비교해보세요.<br/>
              가장 유리한 조건은 자동으로 하이라이트 됩니다.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
                <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center mb-3">
                  <Award className="w-5 h-5 text-emerald-600" />
                </div>
                <h4 className="font-bold text-gray-900 mb-1">베스트 조건 강조</h4>
                <p className="text-sm text-gray-500">거리, 면적 등 주요 지표의 최고 값을 자동으로 표시합니다.</p>
              </div>
              <div className="p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
                <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center mb-3">
                  <Share2 className="w-5 h-5 text-emerald-600" />
                </div>
                <h4 className="font-bold text-gray-900 mb-1">간편한 공유</h4>
                <p className="text-sm text-gray-500">비교 결과를 배우자나 가족에게 카톡으로 바로 공유하세요.</p>
              </div>
            </div>
          </div>

          <div className="lg:w-1/2 relative w-full">
            {/* Comparison Table Mockup */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
              <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-emerald-500" /> 비교 결과
                </h3>
                <span className="text-xs text-gray-500">3개 기관 선택됨</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="p-4 bg-gray-50 min-w-[80px] text-gray-500 font-medium">구분</th>
                      <th className="p-4 min-w-[100px] font-bold text-gray-900">역삼유치원</th>
                      <th className="p-4 min-w-[100px] font-bold text-gray-900">해맑은</th>
                      <th className="p-4 min-w-[100px] font-bold text-gray-900">꿈나무</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    <tr>
                      <td className="p-4 bg-gray-50/50 text-gray-500">유형</td>
                      <td className="p-4 bg-emerald-50 text-emerald-700 font-bold">공립</td>
                      <td className="p-4 text-gray-700">민간</td>
                      <td className="p-4 text-gray-700">사립</td>
                    </tr>
                    <tr>
                      <td className="p-4 bg-gray-50/50 text-gray-500">거리</td>
                      <td className="p-4 bg-emerald-50 text-emerald-700 font-bold">0.3km</td>
                      <td className="p-4 text-gray-700">0.5km</td>
                      <td className="p-4 text-gray-700">0.8km</td>
                    </tr>
                    <tr>
                      <td className="p-4 bg-gray-50/50 text-gray-500">셔틀</td>
                      <td className="p-4 text-gray-700">운행함</td>
                      <td className="p-4 text-gray-400">미운행</td>
                      <td className="p-4 bg-emerald-50 text-emerald-700 font-bold">운행(2대)</td>
                    </tr>
                    <tr>
                      <td className="p-4 bg-gray-50/50 text-gray-500">급식</td>
                      <td className="p-4 bg-emerald-50 text-emerald-700 font-bold">직영조리</td>
                      <td className="p-4 text-gray-700">위탁급식</td>
                      <td className="p-4 text-gray-700">직영조리</td>
                    </tr>
                    <tr>
                      <td className="p-4 bg-gray-50/50 text-gray-500">1인 면적</td>
                      <td className="p-4 text-gray-700">3.2㎡</td>
                      <td className="p-4 bg-emerald-50 text-emerald-700 font-bold">4.5㎡</td>
                      <td className="p-4 text-gray-700">2.8㎡</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

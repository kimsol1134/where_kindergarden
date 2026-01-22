'use client';

import dynamic from 'next/dynamic';
import {
  X,
  Phone,
  MapPin,
  Bus,
  Clock,
  Utensils,
  Building,
  Leaf,
  Calendar,
  Globe,
  Shield,
  Home,
  SquareStack,
  ExternalLink,
  Coins,
  Loader2,
} from 'lucide-react';
import type { Kindergarten } from '@/types';
import { getKindergartenInfoUrl } from '@/lib/utils/kindergarten-url';
import { ChartErrorBoundary } from './ChartErrorBoundary';
import { useCompareStore } from '@/stores';

/** Chart skeleton for loading state */
function ChartSkeleton() {
  return (
    <div className="flex flex-col items-center justify-center h-[200px]">
      <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
      <span className="text-xs text-gray-400 mt-2">차트 로딩 중...</span>
    </div>
  );
}

/** Dynamic imports for charts (~40KB Recharts bundle) */
const DonutChart = dynamic(
  () => import('./charts/DonutChart').then((mod) => ({ default: mod.DonutChart })),
  { ssr: false, loading: () => <ChartSkeleton /> }
);

const RatioBarChart = dynamic(
  () => import('./charts/RatioBarChart').then((mod) => ({ default: mod.RatioBarChart })),
  { ssr: false, loading: () => <ChartSkeleton /> }
);

/** 기관 유형별 스타일 */
const TYPE_STYLES = {
  public: { label: '국공립', className: 'text-emerald-600 bg-emerald-50' },
  private: { label: '사립', className: 'text-indigo-600 bg-indigo-50' },
  home: { label: '가정', className: 'text-gray-600 bg-gray-100' },
} as const;

/** 급식 유형 라벨 */
const MEAL_LABELS = {
  direct: '직영',
  outsourced: '위탁',
  none: '미운영',
} as const;

interface KindergartenDetailPanelProps {
  kindergarten: Kindergarten;
  onClose: () => void;
  onCompareToggle: () => void;
  isInCompare: boolean;
  canAddToCompare: boolean;
}

/** 설립일 포맷 함수 */
function formatEstablishDate(dateStr: string): string {
  if (!dateStr || dateStr.length !== 8) return dateStr;
  const year = dateStr.substring(0, 4);
  const month = dateStr.substring(4, 6);
  const day = dateStr.substring(6, 8);
  return `${year}년 ${parseInt(month)}월 ${parseInt(day)}일`;
}

/** 정보 행 컴포넌트 */
function InfoRow({
  label,
  value,
  icon,
  valueClassName,
}: {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-gray-100 last:border-b-0">
      <span className="text-sm text-gray-600 flex items-center gap-2">
        {icon}
        {label}
      </span>
      <span className={`text-sm font-medium ${valueClassName ?? 'text-gray-900'}`}>
        {value}
      </span>
    </div>
  );
}

export function KindergartenDetailPanel({
  kindergarten,
  onClose,
  onCompareToggle,
  isInCompare,
  canAddToCompare,
}: KindergartenDetailPanelProps) {
  const typeStyle = TYPE_STYLES[kindergarten.type];

  // CompareFloatingBar가 표시되는지 확인 (비교함에 아이템이 있을 때)
  const compareItems = useCompareStore((state) => state.items);
  const hasCompareBar = compareItems.length > 0;
  
  // 학급 수 데이터
  const totalClassCount =
    kindergarten.classCountAge3 + kindergarten.classCountAge4 + kindergarten.classCountAge5 + kindergarten.classCountMix;

  const classData = [
    { name: '만 3세반', value: kindergarten.classCountAge3, color: '#86efac' }, // green-300
    { name: '만 4세반', value: kindergarten.classCountAge4, color: '#fcd34d' }, // amber-300
    { name: '만 5세반', value: kindergarten.classCountAge5, color: '#93c5fd' }, // blue-300
  ];
  if (kindergarten.classCountMix > 0) {
    classData.push({ name: '혼합반', value: kindergarten.classCountMix, color: '#c4b5fd' }); // violet-300
  }

  // 원아 수 데이터 (특수학급 포함)
  const totalChildren = kindergarten.currentCount;
  const childData = [
    { name: '만 3세반', value: kindergarten.currentAge3, color: '#86efac' },
    { name: '만 4세반', value: kindergarten.currentAge4, color: '#fcd34d' },
    { name: '만 5세반', value: kindergarten.currentAge5, color: '#93c5fd' },
  ];
  if (kindergarten.currentMix > 0) {
    childData.push({ name: '혼합반', value: kindergarten.currentMix, color: '#c4b5fd' });
  }
  if (kindergarten.currentSpecial > 0) {
    childData.push({ name: '특수학급', value: kindergarten.currentSpecial, color: '#f9a8d4' }); // pink-300
  }

  // 비율 데이터
  const teacherChildRatio = kindergarten.teacherCount > 0 
    ? parseFloat((kindergarten.currentCount / kindergarten.teacherCount).toFixed(1)) 
    : 0;
  
  const classChildRatio = totalClassCount > 0 
    ? parseFloat((kindergarten.currentCount / totalClassCount).toFixed(1)) 
    : 0;

  const ratioData = [
    { 
      name: '교사당 원아수', 
      value: teacherChildRatio, 
      unit: '명', 
      color: '#10b981', // emerald-500
      description: '교사 1인당 원아 수'
    },
    { 
      name: '학급당 원아수', 
      value: classChildRatio, 
      unit: '명', 
      color: '#6366f1', // indigo-500
      description: '학급 1개당 평균 원아 수'
    },
  ];

  // 교사 자격 데이터
  const teacherData = [
    { 
      name: '1/2급 정교사', 
      value: Math.max(0, kindergarten.teacherCount - kindergarten.seniorTeacherCount), 
      color: '#fbbf24' // amber-400
    },
  ];
  if (kindergarten.seniorTeacherCount > 0) {
    teacherData.unshift({ 
      name: '수석/부장교사', 
      value: kindergarten.seniorTeacherCount, 
      color: '#9ca3af' // gray-400
    });
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40 md:hidden"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 w-full max-w-2xl bg-white shadow-2xl z-50 flex flex-col animate-slide-in-right md:min-w-[500px]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 bg-white/80 backdrop-blur-md sticky top-0 z-10">
          <h2 className="text-lg font-bold text-gray-900">상세 정보</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto bg-gray-50">
          {/* 기관 기본 정보 */}
          <div className="p-6 bg-white border-b border-gray-100 mb-2">
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-xs font-bold px-2 py-1 rounded ${typeStyle.className}`}>
                {typeStyle.label}
              </span>
              <span className="text-xs text-gray-500">{kindergarten.distance.toFixed(1)}km</span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">{kindergarten.name}</h3>

            <div className="space-y-2.5">
              <div className="flex items-start gap-3 text-sm text-gray-600">
                <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0 text-gray-400" />
                <span>{kindergarten.address}</span>
              </div>

              {kindergarten.phone && (
                <div className="flex items-center gap-3 text-sm">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <a
                    href={`tel:${kindergarten.phone}`}
                    className="text-gray-900 hover:text-emerald-600 font-medium transition-colors"
                  >
                    {kindergarten.phone}
                  </a>
                </div>
              )}

              {kindergarten.homepage && (
                <div className="flex items-center gap-3 text-sm">
                  <Globe className="w-4 h-4 text-gray-400" />
                  <a
                    href={kindergarten.homepage.startsWith('http') ? kindergarten.homepage : `http://${kindergarten.homepage}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-600 hover:underline font-medium truncate max-w-[300px]"
                  >
                    홈페이지 방문하기
                  </a>
                </div>
              )}
              
              <div className="flex gap-4 pt-1">
                <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded">
                  <Calendar className="w-3.5 h-3.5" />
                  설립일: {formatEstablishDate(kindergarten.establishDate)}
                </div>
                {kindergarten.operationHours && (
                  <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded">
                    <Clock className="w-3.5 h-3.5" />
                    {kindergarten.operationHours}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 학급/아동 시각화 */}
          <div className="p-6 bg-white border-b border-gray-100 mb-2">
            <h4 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
              <span className="w-1 h-6 bg-emerald-500 rounded-full"></span>
              학급/아동
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* 학급수 차트 */}
              <div className="bg-white rounded-xl">
                <ChartErrorBoundary>
                  <DonutChart
                    data={classData}
                    title="학급수"
                    totalLabel="총 학급"
                    totalValue={totalClassCount}
                  />
                </ChartErrorBoundary>
              </div>

              {/* 원아수 차트 */}
              <div className="bg-white rounded-xl">
                <ChartErrorBoundary>
                  <DonutChart
                    data={childData}
                    title="원아수"
                    totalLabel="총 원아"
                    totalValue={totalChildren}
                    totalUnit="명"
                    valueUnit="명"
                  />
                </ChartErrorBoundary>
              </div>

              {/* 비율 차트 */}
              <div className="bg-white rounded-xl md:col-span-2 lg:col-span-1">
                <ChartErrorBoundary>
                  <RatioBarChart
                    data={ratioData}
                    title="교사당/학급당 원아수"
                  />
                </ChartErrorBoundary>
              </div>
            </div>
            
            {/* 정원 현황 요약 */}
            <div className="mt-6 p-4 bg-gray-50 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4">
               <div className="flex items-center gap-8">
                 <div className="text-center">
                   <div className="text-sm text-gray-500 mb-1">전체 정원</div>
                   <div className="text-xl font-bold text-gray-900">{kindergarten.capacity}명</div>
                 </div>
                 <div className="w-px h-8 bg-gray-300"></div>
                 <div className="text-center">
                   <div className="text-sm text-gray-500 mb-1">현재 현원</div>
                   <div className="text-xl font-bold text-emerald-600">{kindergarten.currentCount}명</div>
                 </div>
               </div>
               
               <div className="flex-1 w-full md:w-auto max-w-xs">
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-gray-600">정원 충족률</span>
                    <span className="font-bold text-emerald-700">
                      {Math.round((kindergarten.currentCount / Math.max(1, kindergarten.capacity)) * 100)}%
                    </span>
                  </div>
                  <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, (kindergarten.currentCount / Math.max(1, kindergarten.capacity)) * 100)}%`,
                      }}
                    />
                  </div>
                  <div className="text-right text-xs text-gray-400 mt-1">
                    여유 정원 {Math.max(0, kindergarten.capacity - kindergarten.currentCount)}명
                  </div>
               </div>
            </div>

            {/* 특수/혼합 학급 세부 정보 */}
            {(kindergarten.classCountMix > 0 || kindergarten.currentSpecial > 0) && (
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                {kindergarten.classCountMix > 0 && (
                  <div className="bg-violet-50 rounded-xl p-5 border border-violet-100 flex flex-col justify-between h-28 relative overflow-hidden">
                    <div className="relative z-10">
                      <div className="text-sm font-bold text-violet-900 mb-1 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-violet-500"></span>
                        혼합반
                      </div>
                      <div className="flex items-end gap-1.5">
                        <span className="text-2xl font-bold text-violet-700">{kindergarten.currentMix}명</span>
                        <span className="text-xs text-violet-500 mb-1.5">/ 정원 {kindergarten.capacityMix}명</span>
                      </div>
                    </div>
                    <div className="relative z-10 text-xs text-violet-600 font-medium bg-white/60 w-fit px-2 py-1 rounded">
                      총 {kindergarten.classCountMix}학급
                    </div>
                  </div>
                )}
                
                {kindergarten.currentSpecial > 0 && (
                  <div className="bg-pink-50 rounded-xl p-5 border border-pink-100 flex flex-col justify-between h-28 relative overflow-hidden">
                    <div className="relative z-10">
                      <div className="text-sm font-bold text-pink-900 mb-1 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-pink-500"></span>
                        특수학급
                      </div>
                      <div className="flex items-end gap-1.5">
                        <span className="text-2xl font-bold text-pink-700">{kindergarten.currentSpecial}명</span>
                        <span className="text-xs text-pink-500 mb-1.5">/ 정원 {kindergarten.capacitySpecial}명</span>
                      </div>
                    </div>
                    <div className="relative z-10 text-xs text-pink-600 font-medium bg-white/60 w-fit px-2 py-1 rounded">
                      특수교육 대상자
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 교사 현황 시각화 */}
          <div className="p-6 bg-white border-b border-gray-100 mb-2">
            <h4 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
              <span className="w-1 h-6 bg-emerald-500 rounded-full"></span>
              교사현황
            </h4>
            
            <div className="max-w-xs mx-auto">
              {/* 교사 자격 차트 */}
              <div className="bg-white rounded-xl">
                <ChartErrorBoundary>
                  <DonutChart
                    data={teacherData}
                    title="교사 자격"
                    totalLabel="총 교사"
                    totalValue={kindergarten.teacherCount}
                    totalUnit="명"
                    valueUnit="명"
                  />
                </ChartErrorBoundary>
              </div>
            </div>
          </div>

          {/* 시설 정보 */}
          <div className="p-5 border-b border-gray-100">
            <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Building className="w-4 h-4 text-emerald-600" />
              시설 정보
            </h4>

            <div className="space-y-0">
              <InfoRow
                label="총 학급 수"
                value={`${totalClassCount}학급`}
                icon={<SquareStack className="w-4 h-4 text-gray-400" />}
              />
              <InfoRow
                label="1인당 면적"
                value={`${kindergarten.areaPerChild.toFixed(1)} ㎡`}
                icon={<Home className="w-4 h-4 text-gray-400" />}
              />
              <InfoRow
                label="교실 면적"
                value={`${kindergarten.classroomArea.toFixed(1)} ㎡`}
              />
              <InfoRow
                label="실내놀이터"
                value={kindergarten.indoorPlaygroundArea > 0 ? `${kindergarten.indoorPlaygroundArea.toFixed(1)} ㎡` : '없음'}
                valueClassName={kindergarten.indoorPlaygroundArea > 0 ? 'text-emerald-600' : 'text-gray-400'}
              />
              <InfoRow
                label="실외놀이터"
                value={
                  kindergarten.hasPlayground && kindergarten.outdoorPlaygroundArea > 0
                    ? `${kindergarten.outdoorPlaygroundArea.toFixed(1)} ㎡`
                    : '없음'
                }
                icon={<Leaf className="w-4 h-4 text-green-500" />}
                valueClassName={
                  kindergarten.hasPlayground && kindergarten.outdoorPlaygroundArea > 0
                    ? 'text-emerald-600'
                    : 'text-gray-400'
                }
              />
              {kindergarten.buildingYear && (
                <InfoRow
                  label="건축년도"
                  value={`${kindergarten.buildingYear}년`}
                />
              )}
              {kindergarten.floorInfo && (
                <InfoRow
                  label="층 정보"
                  value={kindergarten.floorInfo}
                />
              )}
            </div>
          </div>

          {/* 운영 정보 */}
          <div className="p-5 border-b border-gray-100">
            <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-600" />
              운영 정보
            </h4>
            <div className="space-y-0">
              <InfoRow
                label="셔틀버스"
                value={kindergarten.hasBus ? `운행 (${kindergarten.busCount}대)` : '미운행'}
                icon={<Bus className="w-4 h-4 text-blue-500" />}
                valueClassName={kindergarten.hasBus ? 'text-emerald-600' : 'text-gray-400'}
              />
              <InfoRow
                label="방과후 과정"
                value={kindergarten.hasAfterSchool ? '운영' : '미운영'}
                valueClassName={kindergarten.hasAfterSchool ? 'text-emerald-600' : 'text-gray-400'}
              />
              <InfoRow
                label="급식 운영"
                value={MEAL_LABELS[kindergarten.mealType]}
                icon={<Utensils className="w-4 h-4 text-orange-500" />}
                valueClassName={kindergarten.mealType !== 'none' ? 'text-emerald-600' : 'text-gray-400'}
              />
            </div>
          </div>

          {/* 안전 정보 */}
          <div className="p-5 border-b border-gray-100">
            <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-600" />
              안전 정보
            </h4>
            <div className="bg-blue-50 rounded-lg p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <Shield className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900">CCTV 설치</div>
                  <div className="text-xs text-gray-500">원내 안전 관리</div>
                </div>
              </div>
              <div className="text-2xl font-bold text-blue-600">{kindergarten.cctvCount}대</div>
            </div>
          </div>

          {/* 교육비용 정보 (외부 링크) - 디자인 개선 */}
          <div className="p-5 border-b border-gray-100">
            <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Coins className="w-4 h-4 text-emerald-600" />
              교육비용 정보
            </h4>
            <a
              href={getKindergartenInfoUrl({
                name: kindergarten.name,
                sidoCode: kindergarten.sidoCode,
                sigunguCode: kindergarten.sigunguCode,
              })}
              target="_blank"
              rel="noopener noreferrer"
              className="block bg-white border border-gray-200 hover:border-emerald-200 hover:shadow-md rounded-xl p-4 transition-all group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-gray-50 group-hover:bg-emerald-50 rounded-full flex items-center justify-center transition-colors">
                    <Coins className="w-5 h-5 text-gray-600 group-hover:text-emerald-600" />
                  </div>
                  <div>
                    <div className="text-base font-semibold text-gray-900 flex items-center gap-1 group-hover:text-emerald-700 transition-colors">
                      교육비용 확인하기
                      <ExternalLink className="w-3.5 h-3.5 text-gray-400 group-hover:text-emerald-500" />
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      유치원 알리미에서 상세 확인 가능
                    </div>
                  </div>
                </div>
              </div>
            </a>
          </div>
        </div>

        {/* Footer - CompareFloatingBar가 있을 때 하단 여백 추가 */}
        <div className={`p-5 border-t border-gray-200 bg-white ${hasCompareBar ? 'pb-20' : ''}`}>
          <button
            onClick={onCompareToggle}
            disabled={!isInCompare && !canAddToCompare}
            className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${
              isInCompare
                ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                : canAddToCompare
                ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            {isInCompare ? '✓ 비교함에서 제거' : '+ 비교함에 담기'}
          </button>
        </div>
      </div>
    </>
  );
}

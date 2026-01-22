'use client';

import { XCircle } from 'lucide-react';
import { useCompareStore } from '@/stores';
import type { Kindergarten, InstitutionType, MealType } from '@/types';

/** 기관 유형별 스타일 */
const TYPE_STYLES: Record<InstitutionType, { label: string; className: string }> = {
  public: { label: '국공립', className: 'text-emerald-600 bg-emerald-50' },
  private: { label: '사립', className: 'text-indigo-600 bg-indigo-50' },
  home: { label: '가정', className: 'text-gray-600 bg-gray-100' },
};

/** 급식 방식 라벨 */
const MEAL_TYPE_LABELS: Record<MealType, string> = {
  direct: '직영급식',
  outsourced: '위탁급식',
  none: '급식 미제공',
};

interface CompareGridProps {
  items: Kindergarten[];
}

export function CompareGrid({ items }: CompareGridProps) {
  const { removeItem } = useCompareStore();

  // 동적 그리드 컬럼 클래스 (2개 vs 3개) - minmax로 최소 너비 보장
  const gridCols =
    items.length === 3
      ? 'grid-cols-[80px_repeat(3,minmax(90px,1fr))] sm:grid-cols-[120px_repeat(3,minmax(130px,1fr))]'
      : 'grid-cols-[80px_repeat(2,minmax(110px,1fr))] sm:grid-cols-[120px_repeat(2,minmax(150px,1fr))]';

  // 베스트 조건 계산
  const maxArea = Math.max(...items.map((i) => i.areaPerChild));
  const maxBusCount = Math.max(...items.map((i) => (i.hasBus ? i.busCount : 0)));

  const highlightClass = 'bg-emerald-50 text-emerald-700 font-bold';

  return (
    <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
      <div className="min-w-[360px]">
        {/* 헤더: 기관 카드들 */}
        <div className="sticky-header bg-white border-b border-gray-100 shadow-sm">
          <div className={`grid ${gridCols}`}>
          {/* 항목 비교 라벨 */}
          <div className="bg-white flex flex-col items-center justify-center p-4 border-r border-gray-100">
            <span className="text-sm text-gray-400 font-medium">항목 비교</span>
          </div>

          {/* 기관 카드들 */}
          {items.map((item) => {
            const typeStyle = TYPE_STYLES[item.type];
            return (
              <div
                key={item.kindercode}
                className="p-4 border-r border-gray-100 last:border-r-0 relative group text-center flex flex-col items-center justify-between min-h-[140px]"
              >
                <div className="flex flex-col items-center w-full pt-4">
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded mb-2 ${typeStyle.className}`}>
                    {typeStyle.label}
                  </span>
                  <h3
                    className="text-sm sm:text-base font-bold leading-snug break-keep w-full px-0.5 line-clamp-2"
                    title={item.name}
                  >
                    {item.name}
                  </h3>
                  <div className="mt-2 text-[11px] text-gray-500">
                    {item.distance.toFixed(1)}km
                  </div>
                </div>

                <button
                  onClick={() => removeItem(item.kindercode)}
                  className="absolute top-2 right-2 p-1 text-gray-300 hover:text-gray-500 hover:bg-gray-50 rounded-full transition-colors"
                  aria-label={`${item.name} 제거`}
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* 비교 내용 */}
      <div className="bg-white">
        {/* Section: 기본 정보 */}
        <CompareSection title="기본 정보">
          <CompareRow label="주소" gridCols={gridCols}>
            {items.map((item) => (
              <div
                key={item.kindercode}
                className="p-3 sm:p-4 text-xs sm:text-sm text-center text-gray-600 line-clamp-2 break-keep"
                title={item.address}
              >
                {item.address}
              </div>
            ))}
          </CompareRow>

          <CompareRow label="정원 / 현원" gridCols={gridCols}>
            {items.map((item) => {
              const fillRate = item.capacity > 0 ? Math.round((item.currentCount / item.capacity) * 100) : 0;
              return (
                <div key={item.kindercode} className="p-3 sm:p-4 text-sm text-center">
                  <div className="font-bold text-emerald-600 text-xs sm:text-sm whitespace-nowrap">
                    {item.capacity} / {item.currentCount}명
                  </div>
                  <div className="text-[10px] text-gray-400 mt-1">충원율 {fillRate}%</div>
                </div>
              );
            })}
          </CompareRow>

          <CompareRow label="1인당 면적" gridCols={gridCols}>
            {items.map((item) => (
              <div
                key={item.kindercode}
                className={`p-4 text-sm text-center flex items-center justify-center ${
                  item.areaPerChild === maxArea && item.areaPerChild > 0 ? highlightClass : ''
                }`}
              >
                {item.areaPerChild > 0 ? `${item.areaPerChild.toFixed(1)}㎡` : '-'}
              </div>
            ))}
          </CompareRow>
        </CompareSection>

        {/* Section: 교육 및 활동 */}
        <CompareSection title="교육 및 활동">
          <CompareRow label="방과후 과정" gridCols={gridCols}>
            {items.map((item) => (
              <div
                key={item.kindercode}
                className={`p-4 text-sm text-center flex items-center justify-center ${
                  item.hasAfterSchool ? highlightClass : ''
                }`}
              >
                {item.hasAfterSchool ? (
                  <span>운영</span>
                ) : (
                  <span className="text-gray-400 font-normal">미운영</span>
                )}
              </div>
            ))}
          </CompareRow>
        </CompareSection>

        {/* Section: 시설 및 안전 */}
        <CompareSection title="시설 및 안전">
          <CompareRow label="통학차량" gridCols={gridCols}>
            {items.map((item) => {
              const isBestBus = item.hasBus && (maxBusCount > 0 ? item.busCount === maxBusCount : true);
              return (
                <div
                  key={item.kindercode}
                  className={`p-4 text-sm text-center flex items-center justify-center ${
                    isBestBus ? highlightClass : ''
                  }`}
                >
                  {item.hasBus ? (
                    <span>{item.busCount}대 운영</span>
                  ) : (
                    <span className="text-gray-400 font-normal">미운영</span>
                  )}
                </div>
              );
            })}
          </CompareRow>

          <CompareRow label="실외놀이터" gridCols={gridCols}>
            {items.map((item) => (
              <div
                key={item.kindercode}
                className={`p-4 text-sm text-center flex items-center justify-center ${
                  item.hasPlayground ? highlightClass : ''
                }`}
              >
                {item.hasPlayground ? (
                  <span>있음</span>
                ) : (
                  <span className="text-gray-400 font-normal">없음</span>
                )}
              </div>
            ))}
          </CompareRow>

          <CompareRow label="급식 정보" gridCols={gridCols}>
            {items.map((item) => (
              <div
                key={item.kindercode}
                className={`p-4 text-sm text-center flex items-center justify-center ${
                  item.mealType === 'direct' ? highlightClass : ''
                }`}
              >
                {MEAL_TYPE_LABELS[item.mealType]}
              </div>
            ))}
          </CompareRow>
        </CompareSection>
      </div>

        <div className="mt-8 px-4 text-center">
          <p className="text-xs text-gray-400">
            * 위 정보는 정보공시 데이터를 바탕으로 제공되며, 실제 현황과 다를 수 있습니다.
          </p>
        </div>
      </div>
    </div>
  );
}

/** 비교 섹션 컴포넌트 */
function CompareSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-gray-100">
      <div className="px-4 py-6 bg-white text-lg font-bold text-gray-900 border-b border-gray-100/50">
        {title}
      </div>
      {children}
    </div>
  );
}

/** 비교 행 컴포넌트 */
function CompareRow({
  label,
  gridCols,
  children,
}: {
  label: string;
  gridCols: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`grid ${gridCols} border-b border-gray-50`}>
      <div className="p-4 bg-gray-50/30 text-xs text-gray-500 font-medium">{label}</div>
      {children}
    </div>
  );
}

'use client';

import XCircle from 'lucide-react/dist/esm/icons/x-circle';
import { useCompareStore } from '@/stores';
import type { Kindergarten, InstitutionType, MealType } from '@/types';

const TYPE_STYLES: Record<InstitutionType, { label: string; className: string }> = {
  public: { label: '국공립', className: 'text-[var(--brand-leaf)] bg-[rgba(78,169,109,0.06)]' },
  private: { label: '사립', className: 'text-indigo-600 bg-indigo-50' },
  home: { label: '가정', className: 'text-[var(--brand-ink-soft)] bg-[var(--brand-mist-strong)]' },
};

const MEAL_TYPE_LABELS: Record<MealType, string> = {
  direct: '직영급식',
  outsourced: '위탁급식',
  none: '급식 없음',
};

interface CompareGridProps {
  items: Kindergarten[];
}

export function CompareGrid({ items }: CompareGridProps) {
  const { removeItem } = useCompareStore();

  // 동적 그리드 컬럼 클래스 (2개 vs 3개) - minmax로 최소 너비 보장
  const gridCols =
    items.length === 3
      ? 'grid-cols-[100px_repeat(3,minmax(100px,1fr))] sm:grid-cols-[140px_repeat(3,minmax(130px,1fr))]'
      : 'grid-cols-[100px_repeat(2,minmax(110px,1fr))] sm:grid-cols-[140px_repeat(2,minmax(150px,1fr))]';

  // 베스트 조건 계산
  const maxArea = Math.max(...items.map((i) => i.areaPerChild));
  const maxBusCount = Math.max(...items.map((i) => (i.hasBus ? i.busCount : 0)));

  const highlightClass = 'bg-[rgba(78,169,109,0.12)] text-[var(--brand-leaf-deep)] font-bold';

  return (
    <div className="relative">
      <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
      <div className="min-w-[360px]">
        {/* 헤더: 기관 카드들 */}
        <div className="sticky-header bg-white border-b border-[rgba(203,188,174,0.12)] shadow-[0_8px_20px_rgba(129,136,97,0.06)]">
          <div className={`grid ${gridCols}`}>
          {/* 항목 비교 라벨 */}
          <div className="bg-white flex flex-col items-center justify-center px-3 py-4 border-r border-[rgba(203,188,174,0.12)]">
            <span className="text-sm text-[var(--brand-ink-soft)]/60 font-medium">항목 비교</span>
          </div>

          {/* 기관 카드들 */}
          {items.map((item) => {
            const typeStyle = TYPE_STYLES[item.type];
            return (
              <div
                key={item.kindercode}
                className="p-4 border-r border-[rgba(203,188,174,0.12)] last:border-r-0 relative group text-center flex flex-col items-center justify-between min-h-[140px]"
              >
                <div className="flex flex-col items-center w-full pt-4">
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full mb-2 ${typeStyle.className}`}>
                    {typeStyle.label}
                  </span>
                  <h3
                    className="text-xs sm:text-sm font-bold leading-snug break-keep w-full px-0.5 line-clamp-3"
                    title={item.name}
                  >
                    {item.name}
                  </h3>
                  <div className="mt-2 text-[11px] text-[var(--brand-ink-soft)]">
                    {item.distance.toFixed(1)}km
                  </div>
                </div>

                <button
                  onClick={() => removeItem(item.kindercode)}
                  className="absolute top-2 right-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-[var(--brand-ink-soft)]/60 hover:text-[var(--brand-ink-soft)] hover:bg-[var(--brand-mist)] rounded-full transition-colors"
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
                className="p-3 sm:p-4 text-xs sm:text-sm text-center text-[var(--brand-ink-soft)] line-clamp-2 break-keep"
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
                  <div className="font-bold text-[var(--brand-leaf)] text-xs sm:text-sm whitespace-nowrap">
                    {item.capacity} / {item.currentCount}명
                  </div>
                  <div className="text-[10px] text-[var(--brand-ink-soft)]/60 mt-1">정원 대비 {fillRate}%</div>
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
                  <span className="text-[var(--brand-ink-soft)]/60 font-normal">미운영</span>
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
                    <span className="text-[var(--brand-ink-soft)]/60 font-normal">미운영</span>
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
                  <span className="text-[var(--brand-ink-soft)]/60 font-normal">없음</span>
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

        <div className="mt-4 px-4 text-center">
          <p className="mt-4 text-center text-xs text-[var(--brand-ink-soft)]">초록 강조 = 비교 항목 중 가장 좋은 조건</p>
        </div>
        <div className="mt-4 px-4 text-center">
          <p className="text-xs text-[var(--brand-ink-soft)]/60">
            * 위 정보는 유치원 알리미 공개 데이터 기준이며, 실제 현황과 다를 수 있습니다.
          </p>
        </div>
      </div>
    </div>
      <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white/80 to-transparent sm:hidden" />
    </div>
  );
}

function CompareSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-[rgba(203,188,174,0.12)]">
      <div className="px-4 py-6 bg-white text-lg font-bold text-[var(--brand-ink)] border-b border-[rgba(203,188,174,0.08)]">
        {title}
      </div>
      {children}
    </div>
  );
}

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
    <div className={`grid ${gridCols} border-b border-[rgba(203,188,174,0.06)]`}>
      <div className="px-3 py-4 bg-[var(--brand-mist)]/30 text-xs text-[var(--brand-ink-soft)] font-medium whitespace-nowrap">{label}</div>
      {children}
    </div>
  );
}

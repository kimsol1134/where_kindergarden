'use client';

import { XCircle } from 'lucide-react';
import { useCompareStore } from '@/stores';
import type { Kindergarten, InstitutionType, MealType } from '@/types';
import { formatDistanceLabel } from '@/lib/utils';

const TYPE_STYLES: Record<InstitutionType, { label: string; className: string }> = {
  public: { label: '국공립', className: 'text-emerald-600 bg-emerald-50' },
  private: { label: '사립', className: 'text-indigo-600 bg-indigo-50' },
  home: { label: '가정', className: 'text-gray-600 bg-gray-100' },
};

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
  const showDistance = items.some((item) => item.distance !== null);
  const validDistances = items
    .map((item) => item.distance)
    .filter((distance): distance is number => distance !== null);
  const shortestDistance =
    validDistances.length > 0 ? Math.min(...validDistances) : null;
  const maxArea = Math.max(...items.map((item) => item.areaPerChild));
  const maxBusCount = Math.max(...items.map((item) => (item.hasBus ? item.busCount : 0)));

  const highlightReason = (item: Kindergarten, metric: 'distance' | 'area' | 'bus') => {
    if (metric === 'distance' && shortestDistance !== null && item.distance === shortestDistance) {
      return '최단거리';
    }

    if (metric === 'area' && item.areaPerChild === maxArea && item.areaPerChild > 0) {
      return '최대 면적';
    }

    if (
      metric === 'bus' &&
      item.hasBus &&
      maxBusCount > 0 &&
      item.busCount === maxBusCount
    ) {
      return '셔틀 운영';
    }

    return null;
  };

  return (
    <>
      <MobileCompareGrid
        items={items}
        showDistance={showDistance}
        onRemove={removeItem}
        getHighlightReason={highlightReason}
      />
      <DesktopCompareGrid
        items={items}
        showDistance={showDistance}
        onRemove={removeItem}
        getHighlightReason={highlightReason}
      />
    </>
  );
}

function MobileCompareGrid({
  items,
  showDistance,
  onRemove,
  getHighlightReason,
}: {
  items: Kindergarten[];
  showDistance: boolean;
  onRemove: (kindercode: string) => void;
  getHighlightReason: (
    item: Kindergarten,
    metric: 'distance' | 'area' | 'bus'
  ) => string | null;
}) {
  return (
    <div className="px-4 py-4 md:hidden">
      <div className="hide-scrollbar -mx-4 overflow-x-auto px-4 pb-2">
        <div className="flex gap-3 snap-x snap-mandatory">
          {items.map((item) => {
            const typeStyle = TYPE_STYLES[item.type];
            const distanceLabel = formatDistanceLabel(item.distance);
            const highlightTags = [
              getHighlightReason(item, 'distance'),
              getHighlightReason(item, 'area'),
              getHighlightReason(item, 'bus'),
            ].filter((value): value is string => Boolean(value));

            return (
              <div
                key={item.kindercode}
                className="min-w-[280px] snap-center rounded-[28px] border border-gray-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className={`rounded-full px-2 py-1 text-[11px] font-bold ${typeStyle.className}`}>
                      {typeStyle.label}
                    </span>
                    <h2 className="mt-3 text-xl font-bold leading-tight text-gray-900">
                      {item.name}
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-gray-500">{item.address}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemove(item.kindercode)}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-50 text-gray-400"
                    aria-label={`${item.name} 제거`}
                  >
                    <XCircle className="h-5 w-5" />
                  </button>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <SummaryCard label="정원 / 현원" value={`${item.capacity} / ${item.currentCount}명`} />
                  <SummaryCard
                    label="1인당 면적"
                    value={`${item.areaPerChild.toFixed(1)}㎡`}
                    accent={getHighlightReason(item, 'area')}
                  />
                  {showDistance ? (
                    <SummaryCard
                      label="거리"
                      value={distanceLabel ?? '거리 정보 없음'}
                      accent={getHighlightReason(item, 'distance')}
                    />
                  ) : null}
                  <SummaryCard
                    label="통학차량"
                    value={item.hasBus ? `${item.busCount}대 운영` : '미운영'}
                    accent={getHighlightReason(item, 'bus')}
                  />
                </div>

                {highlightTags.length > 0 ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {highlightTags.map((tag) => (
                      <HighlightBadge key={tag} label={tag} />
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-6 space-y-8">
        <MobileMetricSection title="기본 정보">
          <MobileMetricRow
            label="주소"
            items={items.map((item) => ({
              kindercode: item.kindercode,
              name: item.name,
              value: item.address,
            }))}
          />
          {showDistance ? (
            <MobileMetricRow
              label="거리"
              items={items.map((item) => ({
                kindercode: item.kindercode,
                name: item.name,
                value: formatDistanceLabel(item.distance) ?? '거리 정보 없음',
                badge: getHighlightReason(item, 'distance'),
              }))}
            />
          ) : null}
          <MobileMetricRow
            label="정원 / 현원"
            items={items.map((item) => ({
              kindercode: item.kindercode,
              name: item.name,
              value: `${item.capacity} / ${item.currentCount}명`,
            }))}
          />
          <MobileMetricRow
            label="1인당 면적"
            items={items.map((item) => ({
              kindercode: item.kindercode,
              name: item.name,
              value: `${item.areaPerChild.toFixed(1)}㎡`,
              badge: getHighlightReason(item, 'area'),
            }))}
          />
        </MobileMetricSection>

        <MobileMetricSection title="교육 및 활동">
          <MobileMetricRow
            label="방과후 과정"
            items={items.map((item) => ({
              kindercode: item.kindercode,
              name: item.name,
              value: item.hasAfterSchool ? '운영' : '미운영',
            }))}
          />
        </MobileMetricSection>

        <MobileMetricSection title="시설 및 안전">
          <MobileMetricRow
            label="통학차량"
            items={items.map((item) => ({
              kindercode: item.kindercode,
              name: item.name,
              value: item.hasBus ? `${item.busCount}대 운영` : '미운영',
              badge: getHighlightReason(item, 'bus'),
            }))}
          />
          <MobileMetricRow
            label="실외놀이터"
            items={items.map((item) => ({
              kindercode: item.kindercode,
              name: item.name,
              value: item.hasPlayground ? '있음' : '없음',
            }))}
          />
          <MobileMetricRow
            label="급식 정보"
            items={items.map((item) => ({
              kindercode: item.kindercode,
              name: item.name,
              value: MEAL_TYPE_LABELS[item.mealType],
            }))}
          />
        </MobileMetricSection>

        <p className="text-center text-xs text-gray-400">
          * 위 정보는 정보공시 데이터를 바탕으로 제공되며, 실제 현황과 다를 수 있습니다.
        </p>
      </div>
    </div>
  );
}

function DesktopCompareGrid({
  items,
  showDistance,
  onRemove,
  getHighlightReason,
}: {
  items: Kindergarten[];
  showDistance: boolean;
  onRemove: (kindercode: string) => void;
  getHighlightReason: (
    item: Kindergarten,
    metric: 'distance' | 'area' | 'bus'
  ) => string | null;
}) {
  const gridCols =
    items.length === 3
      ? 'grid-cols-[120px_repeat(3,minmax(140px,1fr))]'
      : 'grid-cols-[120px_repeat(2,minmax(180px,1fr))]';

  return (
    <div className="hidden overflow-x-auto px-4 py-6 md:block">
      <div className="min-w-[720px]">
        <div className="sticky-header border-b border-gray-100 bg-white shadow-sm">
          <div className={`grid ${gridCols}`}>
            <div className="flex flex-col items-center justify-center border-r border-gray-100 bg-white p-4">
              <span className="text-sm font-medium text-gray-400">항목 비교</span>
            </div>

            {items.map((item) => {
              const typeStyle = TYPE_STYLES[item.type];
              const tags = [
                getHighlightReason(item, 'distance'),
                getHighlightReason(item, 'area'),
                getHighlightReason(item, 'bus'),
              ].filter((value): value is string => Boolean(value));

              return (
                <div
                  key={item.kindercode}
                  className="relative min-h-[164px] border-r border-gray-100 p-4 text-center last:border-r-0"
                >
                  <button
                    type="button"
                    onClick={() => onRemove(item.kindercode)}
                    className="absolute right-2 top-2 rounded-full p-1 text-gray-300 transition-colors hover:bg-gray-50 hover:text-gray-500"
                    aria-label={`${item.name} 제거`}
                  >
                    <XCircle className="h-5 w-5" />
                  </button>

                  <div className="flex h-full flex-col items-center justify-between pt-4">
                    <div>
                      <span className={`rounded-full px-2 py-1 text-[11px] font-bold ${typeStyle.className}`}>
                        {typeStyle.label}
                      </span>
                      <h3 className="mt-3 line-clamp-2 text-base font-bold leading-snug text-gray-900">
                        {item.name}
                      </h3>
                      {showDistance ? (
                        <div className="mt-2 text-xs text-gray-500">
                          {formatDistanceLabel(item.distance)}
                        </div>
                      ) : null}
                    </div>

                    {tags.length > 0 ? (
                      <div className="mt-4 flex flex-wrap justify-center gap-2">
                        {tags.map((tag) => (
                          <HighlightBadge key={tag} label={tag} />
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white">
          <CompareSection title="기본 정보">
            <CompareRow label="주소" gridCols={gridCols}>
              {items.map((item) => (
                <div
                  key={item.kindercode}
                  className="p-4 text-center text-sm text-gray-600 line-clamp-2 break-keep"
                  title={item.address}
                >
                  {item.address}
                </div>
              ))}
            </CompareRow>

            {showDistance ? (
              <CompareRow label="거리" gridCols={gridCols}>
                {items.map((item) => (
                  <CompareValueCell
                    key={item.kindercode}
                    value={formatDistanceLabel(item.distance) ?? '거리 정보 없음'}
                    reason={getHighlightReason(item, 'distance')}
                  />
                ))}
              </CompareRow>
            ) : null}

            <CompareRow label="정원 / 현원" gridCols={gridCols}>
              {items.map((item) => {
                const fillRate =
                  item.capacity > 0 ? Math.round((item.currentCount / item.capacity) * 100) : 0;

                return (
                  <div key={item.kindercode} className="p-4 text-center text-sm">
                    <div className="font-bold text-emerald-600">
                      {item.capacity} / {item.currentCount}명
                    </div>
                    <div className="mt-1 text-[10px] text-gray-400">충원율 {fillRate}%</div>
                  </div>
                );
              })}
            </CompareRow>

            <CompareRow label="1인당 면적" gridCols={gridCols}>
              {items.map((item) => (
                <CompareValueCell
                  key={item.kindercode}
                  value={`${item.areaPerChild.toFixed(1)}㎡`}
                  reason={getHighlightReason(item, 'area')}
                />
              ))}
            </CompareRow>
          </CompareSection>

          <CompareSection title="교육 및 활동">
            <CompareRow label="방과후 과정" gridCols={gridCols}>
              {items.map((item) => (
                <CompareValueCell
                  key={item.kindercode}
                  value={item.hasAfterSchool ? '운영' : '미운영'}
                />
              ))}
            </CompareRow>
          </CompareSection>

          <CompareSection title="시설 및 안전">
            <CompareRow label="통학차량" gridCols={gridCols}>
              {items.map((item) => (
                <CompareValueCell
                  key={item.kindercode}
                  value={item.hasBus ? `${item.busCount}대 운영` : '미운영'}
                  reason={getHighlightReason(item, 'bus')}
                />
              ))}
            </CompareRow>

            <CompareRow label="실외놀이터" gridCols={gridCols}>
              {items.map((item) => (
                <CompareValueCell
                  key={item.kindercode}
                  value={item.hasPlayground ? '있음' : '없음'}
                />
              ))}
            </CompareRow>

            <CompareRow label="급식 정보" gridCols={gridCols}>
              {items.map((item) => (
                <CompareValueCell
                  key={item.kindercode}
                  value={MEAL_TYPE_LABELS[item.mealType]}
                />
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

function SummaryCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string | null;
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
      <div className="text-xs font-medium text-gray-500">{label}</div>
      <div className="mt-1 text-sm font-bold text-gray-900">{value}</div>
      {accent ? <div className="mt-2"><HighlightBadge label={accent} /></div> : null}
    </div>
  );
}

function MobileMetricSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[28px] border border-gray-100 bg-white p-5 shadow-sm">
      <h3 className="text-lg font-bold text-gray-900">{title}</h3>
      <div className="mt-5 space-y-5">{children}</div>
    </section>
  );
}

function MobileMetricRow({
  label,
  items,
}: {
  label: string;
  items: Array<{
    kindercode: string;
    name: string;
    value: string;
    badge?: string | null;
  }>;
}) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">
        {label}
      </div>
      <div className="hide-scrollbar mt-3 flex gap-2 overflow-x-auto pb-1">
        {items.map((item) => (
          <div
            key={item.kindercode}
            className="min-w-[160px] rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3"
          >
            <div className="text-xs font-semibold text-gray-500">{item.name}</div>
            <div className="mt-2 text-sm font-bold leading-6 text-gray-900">{item.value}</div>
            {item.badge ? (
              <div className="mt-2">
                <HighlightBadge label={item.badge} />
              </div>
            ) : null}
          </div>
        ))}
      </div>
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
    <div className="border-b border-gray-100">
      <div className="border-b border-gray-100/50 bg-white px-4 py-6 text-lg font-bold text-gray-900">
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
    <div className={`grid ${gridCols} border-b border-gray-50`}>
      <div className="bg-gray-50/30 p-4 text-xs font-medium text-gray-500">{label}</div>
      {children}
    </div>
  );
}

function CompareValueCell({
  value,
  reason,
}: {
  value: string;
  reason?: string | null;
}) {
  return (
    <div className="flex items-center justify-center p-4 text-center">
      <div>
        <div className="text-sm font-semibold text-gray-900">{value}</div>
        {reason ? (
          <div className="mt-2 flex justify-center">
            <HighlightBadge label={reason} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function HighlightBadge({ label }: { label: string }) {
  return (
    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
      {label}
    </span>
  );
}

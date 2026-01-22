'use client';

import { useCallback, useMemo, useRef, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Heart, ChevronDown, Loader2, SearchX, MapPin } from 'lucide-react';
import { useSearchStore, useCompareStore } from '@/stores';
import { KindergartenDetailPanel } from './KindergartenDetailPanel';
import type { Kindergarten } from '@/types';
import type { SortOption } from '@/stores/searchStore';

/** 기관 유형별 스타일 */
const TYPE_STYLES = {
  public: { label: '국공립', className: 'text-emerald-600 bg-emerald-50' },
  private: { label: '사립', className: 'text-indigo-600 bg-indigo-50' },
  home: { label: '가정', className: 'text-gray-600 bg-gray-100' },
} as const;

/** 정렬 옵션 라벨 */
const SORT_LABELS: Record<SortOption, string> = {
  distance: '거리순',
  capacity: '정원순',
  areaPerChild: '면적순',
};

/** 모바일 뷰 모드 타입 */
type MobileViewMode = 'list' | 'map';

interface KindergartenListProps {
  mobileView: MobileViewMode;
  onToggleMobileView: () => void;
}

export function KindergartenList({ mobileView, onToggleMobileView }: KindergartenListProps) {
  const {
    address,
    filters,
    isLoading,
    error,
    selectedId,
    sortBy,
    results: rawResults,
    getFilteredAndSortedResults,
    setDetailId,
    getDetailKindergarten,
    setSortBy,
    setRadius,
    search,
  } = useSearchStore();

  const {
    addItem,
    removeItem,
    isInCompare,
    canAdd,
  } = useCompareStore();

  // Memoize filtered and sorted results to avoid recalculation on every render
  const results = useMemo(() => getFilteredAndSortedResults(), [
    filters.type, filters.hasBus, filters.hasVacancy,
    filters.hasIndoorPlayground, filters.hasLargeSpace,
    filters.hasModernBuilding, sortBy, rawResults.length,
    getFilteredAndSortedResults
  ]);
  const detailKindergarten = getDetailKindergarten();

  // Scroll container ref for virtualization
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  // Scroll position preservation for list/map toggle
  const scrollPositionRef = useRef<number>(0);

  // Save scroll position when switching to map view
  useEffect(() => {
    if (mobileView === 'map' && scrollContainerRef.current) {
      scrollPositionRef.current = scrollContainerRef.current.scrollTop;
    }
  }, [mobileView]);

  // Restore scroll position when returning to list view
  useEffect(() => {
    if (mobileView === 'list' && scrollContainerRef.current && scrollPositionRef.current > 0) {
      // Use requestAnimationFrame to ensure DOM is ready
      requestAnimationFrame(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = scrollPositionRef.current;
        }
      });
    }
  }, [mobileView]);

  // Virtual list configuration
  const rowVirtualizer = useVirtualizer({
    count: results.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => 180, // Estimated card height
    overscan: 5, // Render 5 extra items above/below viewport
  });

  // 정렬 변경 핸들러
  const handleSortChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setSortBy(e.target.value as SortOption);
    },
    [setSortBy]
  );

  // 반경 확대 핸들러
  const handleExpandRadius = useCallback(
    (newRadius: 2 | 5) => {
      setRadius(newRadius);
      search();
    },
    [setRadius, search]
  );

  // 비교함 토글 핸들러
  const handleCompareToggle = useCallback(
    (kindergarten: Kindergarten) => {
      if (isInCompare(kindergarten.kindercode)) {
        removeItem(kindergarten.kindercode);
      } else {
        addItem(kindergarten);
      }
    },
    [isInCompare, removeItem, addItem]
  );

  // 카드 클릭 핸들러 (상세 보기)
  const handleCardClick = useCallback(
    (id: string) => {
      setDetailId(id);
    },
    [setDetailId]
  );

  // 상세 패널 닫기 핸들러
  const handleCloseDetail = useCallback(() => {
    setDetailId(null);
  }, [setDetailId]);

  // 모바일에서 지도 뷰일 때는 리스트 숨김
  const isHiddenOnMobile = mobileView === 'map';

  return (
    <aside
      className={`w-full md:w-[450px] lg:w-[500px] bg-white flex flex-col border-r border-gray-200 z-20 absolute md:relative h-full transition-transform duration-300 transform md:translate-x-0 ${
        isHiddenOnMobile ? '-translate-x-full md:translate-x-0' : 'translate-x-0'
      }`}
      id="listPanel"
    >
      {/* List Header */}
      <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-end bg-white">
        <div>
          <h1 className="text-lg font-bold text-gray-900">
            검색 결과 <span className="text-emerald-600">{results.length}</span>건
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            {address || '위치를 선택해주세요'} 기준 {filters.radius}km 이내
          </p>
        </div>
        <div className="relative">
          <select
            value={sortBy}
            onChange={handleSortChange}
            className="appearance-none bg-gray-50 border border-gray-200 rounded-md pl-3 pr-7 py-1.5 text-xs text-gray-700 cursor-pointer hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          >
            {(Object.entries(SORT_LABELS) as [SortOption, string][]).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* List Content */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto p-4 bg-gray-50"
      >
        {/* 로딩 상태 */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <Loader2 className="w-8 h-8 animate-spin mb-3" />
            <p className="text-sm">검색 중...</p>
          </div>
        )}

        {/* 에러 상태 */}
        {!isLoading && error && (
          <div className="flex flex-col items-center justify-center py-12">
            <p className="text-red-500 text-sm">{error}</p>
          </div>
        )}

        {/* 빈 상태 */}
        {!isLoading && !error && results.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <SearchX className="h-12 w-12 text-gray-300 mb-4" />
            <p className="text-gray-500 mb-4">
              주변 {filters.radius}km 내에 기관이 없습니다.
            </p>

            {filters.radius < 5 && (
              <div className="flex flex-col gap-2">
                {filters.radius < 2 && (
                  <button
                    onClick={() => handleExpandRadius(2)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    반경 2km로 검색하기
                  </button>
                )}
                <button
                  onClick={() => handleExpandRadius(5)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  반경 5km로 검색하기
                </button>
              </div>
            )}

            <p className="text-sm text-gray-400 mt-4">
              또는 다른 위치로 검색해보세요.
            </p>
          </div>
        )}

        {/* 결과 목록 - Virtualized */}
        {!isLoading && results.length > 0 && (
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualItem) => {
              const kindergarten = results[virtualItem.index];
              return (
                <div
                  key={kindergarten.kindercode}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${virtualItem.size}px`,
                    transform: `translateY(${virtualItem.start}px)`,
                  }}
                  className="pb-4"
                >
                  <KindergartenCard
                    kindergarten={kindergarten}
                    isSelected={selectedId === kindergarten.kindercode}
                    isInCompare={isInCompare(kindergarten.kindercode)}
                    canAddToCompare={canAdd()}
                    onClick={() => handleCardClick(kindergarten.kindercode)}
                    onCompareToggle={() => handleCompareToggle(kindergarten)}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 상세 정보 패널 */}
      {detailKindergarten && (
        <KindergartenDetailPanel
          kindergarten={detailKindergarten}
          onClose={handleCloseDetail}
          onCompareToggle={() => handleCompareToggle(detailKindergarten)}
          isInCompare={isInCompare(detailKindergarten.kindercode)}
          canAddToCompare={canAdd()}
        />
      )}

      {/* 모바일 지도 탭 - 우측 중앙 플로팅 탭 (min 44px touch target) */}
      {mobileView === 'list' && (
        <button
          onClick={onToggleMobileView}
          className="md:hidden fixed right-0 top-1/2 -translate-y-1/2 bg-white/95 backdrop-blur-sm text-gray-700 pl-3 pr-3 min-h-[44px] rounded-l-full shadow-[0_2px_12px_rgba(0,0,0,0.15)] border border-r-0 border-gray-200 flex items-center gap-1 font-medium text-xs z-50 active:scale-95 transition-transform"
        >
          <MapPin className="w-4 h-4 text-emerald-600" />
          <span className="text-[11px] text-gray-600">지도</span>
        </button>
      )}
    </aside>
  );
}

/** 유치원 카드 Props */
interface KindergartenCardProps {
  kindergarten: Kindergarten;
  isSelected: boolean;
  isInCompare: boolean;
  canAddToCompare: boolean;
  onClick: () => void;
  onCompareToggle: () => void;
}

/** 유치원 카드 컴포넌트 */
function KindergartenCard({
  kindergarten,
  isSelected,
  isInCompare,
  canAddToCompare,
  onClick,
  onCompareToggle,
}: KindergartenCardProps) {
  const typeStyle = TYPE_STYLES[kindergarten.type];

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-2xl p-5 border shadow-[0_2px_8px_rgba(0,0,0,0.04)] relative group cursor-pointer transition-all hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] hover:-translate-y-0.5 ${
        isSelected ? 'border-emerald-500 ring-1 ring-emerald-500' : 'border-gray-100 hover:border-emerald-200'
      }`}
    >
      <div className="absolute top-5 right-5 z-10">
        <button
          onClick={(e) => {
            e.stopPropagation();
            // 찜하기 기능 (미구현)
          }}
          className="text-gray-300 hover:text-red-500 transition-colors p-1"
        >
          <Heart className="w-5 h-5" />
        </button>
      </div>

      <div className="flex flex-col gap-3">
        {/* 헤더: 유형 + 이름 */}
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full tracking-wide ${typeStyle.className}`}>
              {typeStyle.label}
            </span>
          </div>
          <h3 className="font-bold text-gray-900 text-xl tracking-tight leading-snug pr-8">
            {kindergarten.name}
          </h3>
        </div>

        {/* 주요 정보 */}
        <div className="flex items-center gap-3 text-sm text-gray-500 font-medium">
          <div className="flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-gray-400" />
            <span>{kindergarten.distance.toFixed(1)}km</span>
          </div>
          <div className="w-0.5 h-3 bg-gray-200" />
          <span>정원 {kindergarten.capacity}명</span>
          <div className="w-0.5 h-3 bg-gray-200" />
          <span>현원 {kindergarten.currentCount}명</span>
        </div>

        {/* 태그들 */}
        <div className="flex gap-1.5 flex-wrap mt-1">
          {kindergarten.hasAfterSchool && (
            <span className="px-2 py-1 rounded-md bg-gray-50 border border-gray-100 text-gray-600 text-[11px] font-medium">
              방과후과정
            </span>
          )}
          {kindergarten.hasBus && (
            <span className="px-2 py-1 rounded-md bg-emerald-50 border border-emerald-100 text-emerald-600 text-[11px] font-medium">
              셔틀운행 ({kindergarten.busCount}대)
            </span>
          )}
          {kindergarten.hasPlayground && (
            <span className="px-2 py-1 rounded-md bg-sky-50 border border-sky-100 text-sky-600 text-[11px] font-medium">
              실외놀이터
            </span>
          )}
        </div>

        {/* 하단: 주소 + 비교함 버튼 */}
        <div className="mt-2 pt-4 border-t border-gray-50 flex items-center justify-between gap-4">
          <div className="text-xs text-gray-400 truncate flex-1 min-w-0 font-medium">
            {kindergarten.address}
          </div>
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCompareToggle();
            }}
            disabled={!isInCompare && !canAddToCompare}
            className={`flex-shrink-0 text-xs font-bold px-3 py-1.5 rounded-lg transition-all border ${
              isInCompare
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                : canAddToCompare
                ? 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100 hover:text-gray-900'
                : 'bg-white text-gray-300 border-gray-100 cursor-not-allowed'
            }`}
          >
            {isInCompare ? '✓ 담김' : '+ 비교'}
          </button>
        </div>
      </div>
    </div>
  );
}

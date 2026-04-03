'use client';

/* eslint-disable react-hooks/incompatible-library -- TanStack Virtual은 React Compiler와 호환되지 않음 */
import { useCallback, useMemo, useRef, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import Heart from 'lucide-react/dist/esm/icons/heart';
import ChevronDown from 'lucide-react/dist/esm/icons/chevron-down';
import Loader2 from 'lucide-react/dist/esm/icons/loader-2';
import SearchX from 'lucide-react/dist/esm/icons/search-x';
import MapPin from 'lucide-react/dist/esm/icons/map-pin';
import {
  useSearchStore,
  useCompareStore,
  useFavoriteStore,
  useReviewStore,
  useVacancyStore,
  useUIStore,
} from '@/stores';
import { KindergartenDetailPanel } from './KindergartenDetailPanel';
import { TYPE_STYLES } from '@/lib/constants';
import type { Kindergarten } from '@/types';
import type { SortOption } from '@/stores/searchStore';

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
  /** 데스크탑에서 패널 너비 (px) */
  panelWidth?: number;
}

export function KindergartenList({ mobileView, onToggleMobileView, panelWidth }: KindergartenListProps) {
  const {
    address,
    filters,
    isLoading,
    error,
    selectedId,
    sortBy,
    totalCount,
    results: storeResults,
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

  const {
    isFavorite,
    toggleItem: toggleFavorite,
  } = useFavoriteStore();

  const { loadData: loadReviews, getCountByKindergartenId } = useReviewStore();
  const {
    loadData: loadVacancyData,
    getCountByKindergartenId: getVacancyCountByKindergartenId,
  } = useVacancyStore();

  const showToast = useUIStore((state) => state.showToast);
  const compareBarHeight = useUIStore((state) => state.compareBarHeight);
  const compareItemCount = useCompareStore((state) => state.items.length);

  // Memoize filtered and sorted results to avoid recalculation on every render
  // storeResults를 의존성에 추가하여 검색 결과 변경 시 재계산
  const results = useMemo(() => getFilteredAndSortedResults(), [getFilteredAndSortedResults, storeResults, filters, sortBy]);
  const detailKindergarten = getDetailKindergarten();

  // Scroll container ref for virtualization
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  // Scroll position preservation for list/map toggle
  const scrollPositionRef = useRef<number>(0);
  const hasScrolledRef = useRef(false);

  // Load review data when results are available
  useEffect(() => {
    if (results.length > 0) {
      loadReviews();
      loadVacancyData();
    }
  }, [results.length, loadReviews, loadVacancyData]);

  // Save scroll position when switching to map view
  useEffect(() => {
    if (mobileView === 'map' && scrollContainerRef.current) {
      scrollPositionRef.current = scrollContainerRef.current.scrollTop;
      hasScrolledRef.current = true;
    }
  }, [mobileView]);

  // Restore scroll position when returning to list view
  useEffect(() => {
    if (mobileView === 'list' && scrollContainerRef.current && hasScrolledRef.current) {
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
    paddingEnd: compareBarHeight,
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
        showToast('비교 목록에서 뺐어요', 'success');
      } else {
        addItem(kindergarten);
        showToast(`비교 목록에 추가했어요 (${compareItemCount + 1}/3)`, 'success');
      }
    },
    [isInCompare, removeItem, addItem, showToast, compareItemCount]
  );

  // 상세 패널 닫기 핸들러
  const handleCloseDetail = useCallback(() => {
    setDetailId(null);
  }, [setDetailId]);

  // 모바일에서 지도 뷰일 때는 리스트 숨김
  const isHiddenOnMobile = mobileView === 'map';

  return (
    <aside
      className={`max-md:!w-full bg-white flex flex-col border-r border-[rgba(203,188,174,0.18)] z-20 absolute md:relative h-full transition-transform duration-300 transform md:translate-x-0 flex-shrink-0 ${
        isHiddenOnMobile ? '-translate-x-full md:translate-x-0' : 'translate-x-0'
      }`}
      style={{ width: panelWidth ?? 450 }}
      id="listPanel"
    >
      {/* List Header */}
      <div className="px-5 py-4 border-b border-[rgba(203,188,174,0.12)] flex justify-between items-end bg-white">
        <div>
          <h1 className="text-lg font-bold text-[var(--brand-ink)]">
            주변 유치원 <span className="text-[var(--brand-leaf)]">{results.length}</span>곳
          </h1>
          <p className="text-xs text-[var(--brand-ink-soft)] mt-1">
            {address || '위치를 선택해주세요'} 기준 {filters.radius}km 이내
            {/* 필터로 인해 결과가 줄어든 경우 안내 표시 */}
            {totalCount > results.length && (
              <span className="ml-2 text-amber-600">
                (전체 {totalCount}곳 중 조건 적용)
              </span>
            )}
          </p>
        </div>
        <div className="relative">
          <select
            value={sortBy}
            onChange={handleSortChange}
            aria-label="정렬 기준"
            className="appearance-none bg-[var(--brand-mist)] border border-[rgba(203,188,174,0.18)] rounded-xl pl-3 pr-7 py-1.5 text-xs text-[var(--brand-ink)] cursor-pointer hover:border-[rgba(203,188,174,0.24)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-leaf)] focus:border-[var(--brand-leaf)]"
          >
            {(Object.entries(SORT_LABELS) as [SortOption, string][]).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[var(--brand-ink-soft)]/60 pointer-events-none" />
        </div>
      </div>

      {/* List Content */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto p-4 bg-[var(--brand-mist)]"
      >
        {/* 로딩 상태 */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-12 text-[var(--brand-ink-soft)]">
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
            <SearchX className="h-12 w-12 text-[var(--brand-ink-soft)]/60 mb-4" />
            <p className="text-[var(--brand-ink-soft)] mb-4">
              주변 {filters.radius}km 안에 유치원이 없어요.
            </p>

            {filters.radius < 5 && (
              <div className="flex flex-col gap-2">
                {filters.radius < 2 && (
                  <button
                    onClick={() => handleExpandRadius(2)}
                    className="px-4 py-2 text-sm font-medium text-[var(--brand-ink)] bg-white border border-[rgba(203,188,174,0.24)] rounded-xl hover:bg-[var(--brand-mist)] transition-colors"
                  >
                    반경 2km로 검색하기
                  </button>
                )}
                <button
                  onClick={() => handleExpandRadius(5)}
                  className="px-4 py-2 text-sm font-medium text-[var(--brand-ink)] bg-white border border-[rgba(203,188,174,0.24)] rounded-xl hover:bg-[var(--brand-mist)] transition-colors"
                >
                  반경 5km로 검색하기
                </button>
              </div>
            )}

            <p className="text-sm text-[var(--brand-ink-soft)]/60 mt-4">
              다른 주소나 동네로 다시 검색해보세요
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
                    isFavorite={isFavorite(kindergarten.kindercode)}
                    reviewCount={getCountByKindergartenId(kindergarten.kindercode)}
                    vacancyCount={getVacancyCountByKindergartenId(kindergarten.kindercode)}
                    onClick={() => setDetailId(kindergarten.kindercode)}
                    onCompareToggle={() => handleCompareToggle(kindergarten)}
                    onFavoriteToggle={() => toggleFavorite(kindergarten)}
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
          className="md:hidden fixed right-0 top-1/2 -translate-y-1/2 bg-white/95 backdrop-blur-sm text-[var(--brand-ink)] pl-3 pr-3 min-h-[44px] rounded-l-full shadow-[0_2px_12px_rgba(129,136,97,0.08)] border border-r-0 border-[rgba(203,188,174,0.18)] flex items-center gap-1 font-medium text-xs z-50 active:scale-95 transition-transform"
        >
          <MapPin className="w-4 h-4 text-[var(--brand-leaf)]" />
          <span className="text-[11px] text-[var(--brand-ink-soft)]">지도</span>
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
  isFavorite: boolean;
  reviewCount: number;
  vacancyCount: number;
  onClick: () => void;
  onCompareToggle: () => void;
  onFavoriteToggle: () => void;
}

/** 유치원 카드 컴포넌트 */
function KindergartenCard({
  kindergarten,
  isSelected,
  isInCompare,
  canAddToCompare,
  isFavorite,
  reviewCount,
  vacancyCount,
  onClick,
  onCompareToggle,
  onFavoriteToggle,
}: KindergartenCardProps) {
  const typeStyle = TYPE_STYLES[kindergarten.type];

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}
      className={`bg-white rounded-2xl p-5 shadow-[0_2px_8px_rgba(129,136,97,0.04)] relative group cursor-pointer transition-all hover:shadow-[0_8px_24px_rgba(129,136,97,0.08)] hover:-translate-y-0.5 ${
        isSelected
          ? 'border-2 border-[var(--brand-leaf)] z-10'
          : 'border border-[rgba(203,188,174,0.12)] hover:border-[rgba(78,169,109,0.24)]'
      }`}
    >
      <div className="absolute top-5 right-5 z-10">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onFavoriteToggle();
          }}
          className={`min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full transition-colors ${
            isFavorite
              ? 'text-red-500 hover:text-red-600'
              : 'text-[var(--brand-ink-soft)]/60 bg-[var(--brand-mist)] hover:text-red-500 hover:bg-red-50'
          }`}
          title={isFavorite ? '찜 해제' : '찜하기'}
        >
          <Heart className={`w-5 h-5 ${isFavorite ? 'fill-red-500' : ''}`} />
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
          <h3 className="font-bold text-[var(--brand-ink)] text-xl tracking-tight leading-snug pr-8">
            {kindergarten.name}
          </h3>
        </div>

        {/* 주요 정보 */}
        <div className="flex items-center gap-3 text-sm text-[var(--brand-ink-soft)] font-medium">
          <div className="flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-[var(--brand-ink-soft)]/60" />
            <span>{kindergarten.distance.toFixed(1)}km</span>
          </div>
          <div className="w-0.5 h-3 bg-[rgba(203,188,174,0.18)]" />
          <span>정원 {kindergarten.capacity}명</span>
          <div className="w-0.5 h-3 bg-[rgba(203,188,174,0.18)]" />
          <span>현원 {kindergarten.currentCount}명</span>
        </div>

        {/* 태그들 */}
        <div className="flex gap-1.5 flex-wrap mt-1">
          {vacancyCount > 0 && (
            <span className="px-2 py-1 rounded-md bg-rose-50 border border-rose-100 text-rose-600 text-xs font-medium">
              공식 결원 {vacancyCount}명
            </span>
          )}
          {kindergarten.hasAfterSchool && (
            <span className="px-2 py-1 rounded-md bg-[var(--brand-mist)] border border-[rgba(203,188,174,0.12)] text-[var(--brand-ink-soft)] text-xs font-medium">
              방과후과정
            </span>
          )}
          {kindergarten.hasBus && (
            <span className="px-2 py-1 rounded-md bg-[rgba(78,169,109,0.06)] border border-[rgba(78,169,109,0.12)] text-[var(--brand-leaf)] text-xs font-medium">
              셔틀운행 ({kindergarten.busCount}대)
            </span>
          )}
          {kindergarten.hasPlayground && (
            <span className="px-2 py-1 rounded-md bg-sky-50 border border-sky-100 text-sky-600 text-xs font-medium">
              실외놀이터
            </span>
          )}
          {reviewCount > 0 && (
            <span className="px-2 py-1 rounded-md bg-amber-50 border border-amber-100 text-amber-600 text-xs font-medium">
              후기 {reviewCount}건
            </span>
          )}
        </div>

        {/* 하단: 주소 + 비교함 버튼 */}
        <div className="mt-2 pt-4 border-t border-[rgba(203,188,174,0.08)] flex items-center justify-between gap-4">
          <div className="text-xs text-[var(--brand-ink-soft)]/60 line-clamp-2 break-keep flex-1 min-w-0 font-medium">
            {kindergarten.address}
          </div>
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCompareToggle();
            }}
            disabled={!isInCompare && !canAddToCompare}
            aria-label={isInCompare ? '비교 목록에서 빼기' : canAddToCompare ? '비교 목록에 추가' : '비교 목록이 가득 찼어요'}
            className={`flex-shrink-0 text-xs font-bold px-3 py-2 min-h-[36px] rounded-lg transition-all active:scale-95 border ${
              isInCompare
                ? 'bg-[rgba(78,169,109,0.06)] text-[var(--brand-leaf-deep)] border-[rgba(78,169,109,0.18)] hover:bg-[rgba(78,169,109,0.12)]'
                : canAddToCompare
                ? 'bg-[var(--brand-mist)] text-[var(--brand-ink-soft)] border-[rgba(203,188,174,0.18)] hover:bg-[var(--brand-mist-strong)] hover:text-[var(--brand-ink)]'
                : 'bg-white text-[var(--brand-ink-soft)]/60 border-[rgba(203,188,174,0.12)] cursor-not-allowed'
            }`}
          >
            {isInCompare ? '비교중' : '+ 비교'}
          </button>
        </div>
      </div>
    </div>
  );
}

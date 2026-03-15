'use client';

/* eslint-disable react-hooks/incompatible-library -- TanStack Virtual은 React Compiler와 호환되지 않음 */
import { useCallback, useRef, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  Heart,
  ChevronDown,
  Loader2,
  SearchX,
  MapPin,
  Compass,
  Search,
  SlidersHorizontal,
} from 'lucide-react';
import { useSearchStore, useCompareStore, useFavoriteStore, useReviewStore } from '@/stores';
import { KindergartenDetailPanel } from './KindergartenDetailPanel';
import type { Kindergarten } from '@/types';
import type { SortOption } from '@/stores/searchStore';
import { formatDistanceLabel } from '@/lib/utils';
import { trackUXEvent } from '@/lib/analytics';

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
  onRequestCurrentLocation: () => void | Promise<void>;
  /** 데스크탑에서 패널 너비 (px) */
  panelWidth?: number;
}

export function KindergartenList({
  mobileView,
  onToggleMobileView,
  onRequestCurrentLocation,
  panelWidth,
}: KindergartenListProps) {
  const {
    address,
    location,
    status,
    filters,
    isLoading,
    error,
    selectedId,
    sortBy,
    totalCount,
    hasSearched,
    getFilteredAndSortedResults,
    setDetailId,
    getDetailKindergarten,
    setSortBy,
    setRadius,
    resetFilters,
    clearSearchSession,
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

  // Memoize filtered and sorted results to avoid recalculation on every render
  // storeResults를 의존성에 추가하여 검색 결과 변경 시 재계산
  const results = getFilteredAndSortedResults();
  const detailKindergarten = getDetailKindergarten();

  // Scroll container ref for virtualization
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  // Scroll position preservation for list/map toggle
  const scrollPositionRef = useRef<number>(0);

  // Load review data when results are available
  useEffect(() => {
    if (results.length > 0) {
      loadReviews();
    }
  }, [results.length, loadReviews]);

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

  // 찜하기 토글 핸들러
  const handleFavoriteToggle = useCallback(
    (kindergarten: Kindergarten) => {
      toggleFavorite(kindergarten);
    },
    [toggleFavorite]
  );

  // 카드 클릭 핸들러 (상세 보기)
  const handleCardClick = useCallback(
    (id: string) => {
      trackUXEvent('search_card_opened', { kindercode: id });
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
  const showSegmentedViewToggle = hasSearched || location !== null;
  const hasVisibleResults = !isLoading && results.length > 0;

  return (
    <aside
      className={`max-md:!w-full bg-white flex flex-col border-r border-gray-200 z-20 absolute md:relative h-full transition-transform duration-300 transform md:translate-x-0 flex-shrink-0 ${
        isHiddenOnMobile ? '-translate-x-full md:translate-x-0' : 'translate-x-0'
      }`}
      style={{ width: panelWidth ?? 450 }}
      id="listPanel"
    >
      {/* List Header */}
      <div className="border-b border-gray-100 bg-white px-5 py-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">
              Search Flow
            </p>
            <h1 className="mt-1 text-lg font-bold text-gray-900">
              {status === 'idle' ? '유치원 검색을 시작해보세요' : (
                <>
                  검색 결과 <span className="text-emerald-600">{results.length}</span>건
                </>
              )}
            </h1>
            <p className="mt-1 text-xs text-gray-500">
              {status === 'idle'
                ? '현재 위치 또는 주소를 선택하면 주변 기관을 바로 비교할 수 있어요.'
                : `${address || '선택한 위치'} 기준 ${filters.radius}km 이내`}
              {totalCount > results.length && status === 'filtered_empty' ? (
                <span className="ml-2 text-amber-600">(전체 {totalCount}개에서 필터 적용 중)</span>
              ) : null}
            </p>
          </div>
          {status === 'results' || status === 'filtered_empty' ? (
            <div className="relative">
              <select
                value={sortBy}
                onChange={handleSortChange}
                className="appearance-none rounded-xl border border-gray-200 bg-gray-50 py-2 pl-3 pr-8 text-xs text-gray-700 hover:border-gray-300 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {(Object.entries(SORT_LABELS) as [SortOption, string][]).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3 w-3 -translate-y-1/2 text-gray-400" />
            </div>
          ) : null}
        </div>

        {showSegmentedViewToggle ? (
          <div className="mt-4 md:hidden">
            <div className="grid grid-cols-2 rounded-2xl bg-gray-100 p-1">
              <button
                type="button"
                onClick={() => mobileView === 'map' && onToggleMobileView()}
                className={`rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
                  mobileView === 'list'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500'
                }`}
              >
                목록
              </button>
              <button
                type="button"
                onClick={() => mobileView === 'list' && onToggleMobileView()}
                className={`rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
                  mobileView === 'map'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500'
                }`}
              >
                지도
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {/* List Content */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto p-4 bg-gray-50"
      >
        {status === 'idle' && (
          <SearchStartState
            onRequestCurrentLocation={onRequestCurrentLocation}
            onActivateManualSearch={() =>
              document.getElementById('kindergarten-search-input')?.focus()
            }
          />
        )}

        {status === 'locating' && (
          <div className="rounded-[28px] border border-emerald-100 bg-white p-6 text-center shadow-[0_12px_30px_rgba(16,185,129,0.08)]">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
              <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
            </div>
            <h2 className="mt-4 text-lg font-bold text-gray-900">현재 위치를 확인하고 있어요</h2>
            <p className="mt-2 text-sm leading-6 text-gray-500">
              위치 권한을 허용하면 주변 유치원을 거리순으로 바로 보여드립니다.
            </p>
          </div>
        )}

        {/* 로딩 상태 */}
        {isLoading && status !== 'locating' && (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <Loader2 className="w-8 h-8 animate-spin mb-3" />
            <p className="text-sm">검색 중...</p>
          </div>
        )}

        {/* 에러 상태 */}
        {!isLoading && status === 'error' && (
          <SearchErrorState
            message={error ?? '검색 중 오류가 발생했습니다.'}
            canRetryLocation={!location}
            onRetryLocation={onRequestCurrentLocation}
            onActivateManualSearch={() =>
              document.getElementById('kindergarten-search-input')?.focus()
            }
            onResetSession={clearSearchSession}
          />
        )}

        {/* 빈 상태 */}
        {!isLoading && status === 'empty' && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <SearchX className="h-12 w-12 text-gray-300 mb-4" />
            <p className="mb-2 text-base font-semibold text-gray-900">
              주변 {filters.radius}km 내에 기관이 없습니다
            </p>
            <p className="mb-4 text-sm text-gray-500">
              반경을 넓히거나 다른 위치로 검색해보세요.
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

        {!isLoading && status === 'filtered_empty' && (
          <div className="rounded-[28px] border border-amber-100 bg-white p-6 text-center shadow-[0_12px_30px_rgba(245,158,11,0.08)]">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-50">
              <SlidersHorizontal className="h-6 w-6 text-amber-500" />
            </div>
            <h2 className="mt-4 text-lg font-bold text-gray-900">필터를 조금만 풀면 더 보여드릴 수 있어요</h2>
            <p className="mt-2 text-sm leading-6 text-gray-500">
              현재 조건으로는 보이지 않지만, 반경 {filters.radius}km 안에는
              <span className="font-semibold text-amber-700"> {totalCount}개 기관</span>이 있어요.
            </p>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
              <button
                type="button"
                onClick={resetFilters}
                className="rounded-2xl bg-amber-500 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-amber-600"
              >
                필터 초기화
              </button>
              <button
                type="button"
                onClick={() => document.getElementById('kindergarten-search-input')?.focus()}
                className="rounded-2xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
              >
                검색어 바꾸기
              </button>
            </div>
          </div>
        )}

        {/* 결과 목록 - Virtualized */}
        {hasVisibleResults && (
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
                    onClick={() => handleCardClick(kindergarten.kindercode)}
                    onCompareToggle={() => handleCompareToggle(kindergarten)}
                    onFavoriteToggle={() => handleFavoriteToggle(kindergarten)}
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
    </aside>
  );
}

function SearchStartState({
  onRequestCurrentLocation,
  onActivateManualSearch,
}: {
  onRequestCurrentLocation: () => void | Promise<void>;
  onActivateManualSearch: () => void;
}) {
  return (
    <div className="rounded-[32px] border border-emerald-100 bg-white p-6 shadow-[0_18px_40px_rgba(16,185,129,0.08)]">
      <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
        <Compass className="h-3.5 w-3.5" />
        시작하기
      </div>
      <h2 className="mt-4 text-2xl font-bold leading-tight text-gray-900">
        현재 위치나 주소로
        <br />
        가까운 유치원을 찾아보세요
      </h2>
      <p className="mt-3 text-sm leading-6 text-gray-500">
        첫 검색만 시작하면 거리, 정원, 후기, 통학 여부까지 한 화면에서 비교할 수 있습니다.
      </p>
      <div className="mt-6 space-y-3">
        <button
          type="button"
          onClick={() => void onRequestCurrentLocation()}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-5 py-4 text-sm font-bold text-white shadow-lg shadow-emerald-200 transition-transform hover:-translate-y-0.5 hover:bg-emerald-600"
        >
          <MapPin className="h-4 w-4" />
          현재 위치로 검색
        </button>
        <button
          type="button"
          onClick={onActivateManualSearch}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-5 py-4 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
        >
          <Search className="h-4 w-4" />
          주소 또는 기관명으로 검색
        </button>
      </div>
    </div>
  );
}

function SearchErrorState({
  message,
  canRetryLocation,
  onRetryLocation,
  onActivateManualSearch,
  onResetSession,
}: {
  message: string;
  canRetryLocation: boolean;
  onRetryLocation: () => void | Promise<void>;
  onActivateManualSearch: () => void;
  onResetSession: () => void;
}) {
  return (
    <div className="rounded-[28px] border border-red-100 bg-white p-6 text-center shadow-[0_12px_30px_rgba(239,68,68,0.08)]">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
        <SearchX className="h-6 w-6 text-red-500" />
      </div>
      <h2 className="mt-4 text-lg font-bold text-gray-900">검색을 바로 시작하지 못했어요</h2>
      <p className="mt-2 text-sm leading-6 text-gray-500">{message}</p>
      <div className="mt-5 flex flex-col gap-2">
        {canRetryLocation ? (
          <button
            type="button"
            onClick={() => void onRetryLocation()}
            className="rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-emerald-600"
          >
            현재 위치 다시 시도
          </button>
        ) : null}
        <button
          type="button"
          onClick={onActivateManualSearch}
          className="rounded-2xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
        >
          주소로 검색하기
        </button>
        <button
          type="button"
          onClick={onResetSession}
          className="rounded-2xl px-5 py-3 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-100"
        >
          검색 상태 초기화
        </button>
      </div>
    </div>
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
  onClick,
  onCompareToggle,
  onFavoriteToggle,
}: KindergartenCardProps) {
  const typeStyle = TYPE_STYLES[kindergarten.type];
  const distanceLabel = formatDistanceLabel(kindergarten.distance);

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-2xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] relative group cursor-pointer transition-all hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] hover:-translate-y-0.5 ${
        isSelected
          ? 'border-2 border-emerald-500 z-10'
          : 'border border-gray-100 hover:border-emerald-200'
      }`}
    >
      <div className="absolute top-5 right-5 z-10">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onFavoriteToggle();
          }}
          className={`transition-colors p-1 ${
            isFavorite
              ? 'text-red-500 hover:text-red-600'
              : 'text-gray-300 hover:text-red-500'
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
          <h3 className="font-bold text-gray-900 text-xl tracking-tight leading-snug pr-8">
            {kindergarten.name}
          </h3>
        </div>

        {/* 주요 정보 */}
        <div className="flex items-center gap-3 text-sm text-gray-500 font-medium">
          {distanceLabel ? (
            <>
              <div className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-gray-400" />
                <span>{distanceLabel}</span>
              </div>
              <div className="w-0.5 h-3 bg-gray-200" />
            </>
          ) : null}
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
          {reviewCount > 0 && (
            <span className="px-2 py-1 rounded-md bg-amber-50 border border-amber-100 text-amber-600 text-[11px] font-medium">
              후기 {reviewCount}건
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

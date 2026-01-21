'use client';

import { useCallback } from 'react';
import { Heart, ChevronDown, Loader2, SearchX } from 'lucide-react';
import { useSearchStore, useCompareStore } from '@/stores';
import type { Kindergarten } from '@/types';
import type { SortOption } from '@/stores/searchStore';

/** 기관 유형별 스타일 */
const TYPE_STYLES = {
  public: { label: '국공립', className: 'text-emerald-600 bg-emerald-50' },
  private: { label: '사립', className: 'text-orange-600 bg-orange-50' },
  home: { label: '가정', className: 'text-gray-600 bg-gray-100' },
} as const;

/** 정렬 옵션 라벨 */
const SORT_LABELS: Record<SortOption, string> = {
  distance: '거리순',
  capacity: '정원순',
  areaPerChild: '면적순',
};

export function KindergartenList() {
  const {
    address,
    filters,
    isLoading,
    error,
    selectedId,
    sortBy,
    getFilteredAndSortedResults,
    setSelectedId,
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

  const results = getFilteredAndSortedResults();

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

  // 카드 클릭 핸들러 (선택)
  const handleCardClick = useCallback(
    (id: string) => {
      setSelectedId(selectedId === id ? null : id);
    },
    [selectedId, setSelectedId]
  );

  return (
    <aside
      className="w-full md:w-[450px] lg:w-[500px] bg-white flex flex-col border-r border-gray-200 z-20 absolute md:relative h-full transition-transform duration-300 transform md:translate-x-0"
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
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
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

        {/* 결과 목록 */}
        {!isLoading &&
          results.map((kindergarten) => (
            <KindergartenCard
              key={kindergarten.kindercode}
              kindergarten={kindergarten}
              isSelected={selectedId === kindergarten.kindercode}
              isInCompare={isInCompare(kindergarten.kindercode)}
              canAddToCompare={canAdd()}
              onClick={() => handleCardClick(kindergarten.kindercode)}
              onCompareToggle={() => handleCompareToggle(kindergarten)}
            />
          ))}
      </div>
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
      className={`bg-white rounded-xl p-4 border shadow-sm relative group cursor-pointer transition-all hover:shadow-lg ${
        isSelected ? 'border-emerald-500 shadow-md' : 'border-gray-200 hover:border-emerald-400'
      }`}
    >
      <div className="absolute top-4 right-4">
        <button
          onClick={(e) => {
            e.stopPropagation();
            // 찜하기 기능 (미구현)
          }}
          className="text-gray-300 hover:text-red-500 transition-colors"
        >
          <Heart className="w-5 h-5" />
        </button>
      </div>

      <div className="flex gap-4">
        {/* 썸네일 */}
        <div className="w-20 h-20 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden flex items-center justify-center">
          <span className="text-3xl">🏫</span>
        </div>

        <div className="flex-1 min-w-0">
          {/* 기관 유형 + 이름 */}
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${typeStyle.className}`}>
              {typeStyle.label}
            </span>
            <h3 className="font-bold text-gray-900 text-lg truncate">{kindergarten.name}</h3>
          </div>

          {/* 정보 */}
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
            <span>{kindergarten.distance.toFixed(1)}km</span>
            <span className="text-gray-300">|</span>
            <span>정원 {kindergarten.capacity}명</span>
            <span className="text-gray-300">|</span>
            <span>현원 {kindergarten.currentCount}명</span>
          </div>

          {/* 태그들 */}
          <div className="flex gap-1 flex-wrap">
            {kindergarten.hasAfterSchool && (
              <span className="px-1.5 py-0.5 rounded border border-gray-200 text-gray-500 text-[10px]">
                방과후과정
              </span>
            )}
            {kindergarten.hasBus && (
              <span className="px-1.5 py-0.5 rounded border border-emerald-200 bg-emerald-50/50 text-emerald-600 text-[10px]">
                셔틀운행 ({kindergarten.busCount}대)
              </span>
            )}
            {kindergarten.hasPlayground && (
              <span className="px-1.5 py-0.5 rounded border border-gray-200 text-gray-500 text-[10px]">
                실외놀이터
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 하단: 주소 + 비교함 버튼 */}
      <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
        <div className="text-xs text-gray-400 truncate max-w-[60%]">{kindergarten.address}</div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onCompareToggle();
          }}
          disabled={!isInCompare && !canAddToCompare}
          className={`text-xs font-bold px-3 py-1.5 rounded-md transition-all border ${
            isInCompare
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
              : canAddToCompare
              ? 'bg-gray-100 text-gray-600 border-transparent hover:bg-gray-200'
              : 'bg-gray-50 text-gray-400 border-transparent cursor-not-allowed'
          }`}
        >
          {isInCompare ? '✓ 비교함 담김' : '+ 비교함 담기'}
        </button>
      </div>
    </div>
  );
}

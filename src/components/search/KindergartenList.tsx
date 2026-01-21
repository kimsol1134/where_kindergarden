'use client';

import { useCallback } from 'react';
import { Heart, ArrowDownUp, Loader2 } from 'lucide-react';
import { useSearchStore, useCompareStore } from '@/stores';
import type { Kindergarten } from '@/types';
import type { SortOption } from '@/stores/searchStore';

/** 기관 유형별 스타일 */
const TYPE_STYLES = {
  public: { label: '국공립', className: 'text-emerald-600 bg-emerald-50' },
  private: { label: '사립', className: 'text-orange-600 bg-orange-50' },
  home: { label: '가정', className: 'text-gray-600 bg-gray-100' },
} as const;

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
  } = useSearchStore();

  const {
    addItem,
    removeItem,
    isInCompare,
    canAdd,
  } = useCompareStore();

  const results = getFilteredAndSortedResults();

  // 정렬 순환 핸들러
  const handleSortToggle = useCallback(() => {
    const sortOptions: SortOption[] = ['distance', 'capacity', 'areaPerChild'];
    const currentIndex = sortOptions.indexOf(sortBy);
    const nextIndex = (currentIndex + 1) % sortOptions.length;
    setSortBy(sortOptions[nextIndex]);
  }, [sortBy, setSortBy]);

  // 정렬 라벨
  const getSortLabel = (sort: SortOption) => {
    switch (sort) {
      case 'distance':
        return '거리순';
      case 'capacity':
        return '정원순';
      case 'areaPerChild':
        return '면적순';
    }
  };

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
        <button
          onClick={handleSortToggle}
          className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer hover:text-gray-900"
        >
          {getSortLabel(sortBy)} <ArrowDownUp className="w-3 h-3" />
        </button>
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
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <p className="text-sm">검색 결과가 없습니다</p>
            <p className="text-xs mt-1">검색 조건을 변경해보세요</p>
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

'use client';

import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Heart,
  X,
  Trash2,
  ChevronDown,
  CheckSquare,
  Square,
  Plus,
  Check,
} from 'lucide-react';
import type { Kindergarten } from '@/types';
import {
  useFavoriteStore,
  useCompareStore,
  useKindergartenStore,
  useSearchStore,
  type FavoriteItem,
} from '@/stores';
import { useFavoriteKindergartens, useFavoriteKindergarten } from '@/hooks';
import { transformToKindergarten } from '@/lib/transforms';
import { generateCompareSharePath } from '@/lib/share/kakaoShare';
import { formatDistanceLabel } from '@/lib/utils';
import { KindergartenDetailPanel } from './KindergartenDetailPanel';

/** 기관 유형별 스타일 */
const TYPE_STYLES = {
  public: { label: '국공립', className: 'text-emerald-600 bg-emerald-50' },
  private: { label: '사립', className: 'text-indigo-600 bg-indigo-50' },
  home: { label: '가정', className: 'text-gray-600 bg-gray-100' },
} as const;

/** 정렬 옵션 타입 */
type FavoriteSortOption = 'recent' | 'distance' | 'capacity';

/** 정렬 옵션 라벨 */
const SORT_LABELS: Record<FavoriteSortOption, string> = {
  recent: '최신순',
  distance: '거리순',
  capacity: '정원순',
};

interface FavoritesPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FavoritesPanel({ isOpen, onClose }: FavoritesPanelProps) {
  const router = useRouter();
  const { items, removeItem, clearAll } = useFavoriteStore();
  const { addItem: addToCompare, removeItem: removeFromCompare, setItems, isInCompare, canAdd: canAddToCompare } = useCompareStore();

  // 상세보기 상태
  const [detailKindercode, setDetailKindercode] = useState<string | null>(null);

  // 정렬 상태
  const [sortOption, setSortOption] = useState<FavoriteSortOption>('recent');
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);

  // 선택 모드 상태
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  // 전체 유치원 데이터 조회 (정렬용)
  const kindergartensMap = useFavoriteKindergartens(items);

  // 상세보기용 유치원 데이터
  const { kindergarten: detailKindergarten } = useFavoriteKindergarten(detailKindercode);

  // 정렬된 아이템
  const sortedItems = useMemo(() => {
    switch (sortOption) {
      case 'recent':
        return items.toSorted((a, b) => b.addedAt - a.addedAt);
      case 'distance': {
        return items.toSorted((a, b) => {
          const kA = kindergartensMap.get(a.kindercode);
          const kB = kindergartensMap.get(b.kindercode);
          return (kA?.distance ?? 999) - (kB?.distance ?? 999);
        });
      }
      case 'capacity': {
        return items.toSorted((a, b) => {
          const kA = kindergartensMap.get(a.kindercode);
          const kB = kindergartensMap.get(b.kindercode);
          return (kB?.capacity ?? 0) - (kA?.capacity ?? 0);
        });
      }
      default:
        return items;
    }
  }, [items, sortOption, kindergartensMap]);

  // 핸들러
  const handleRemove = (kindercode: string) => {
    removeItem(kindercode);
    selectedItems.delete(kindercode);
    setSelectedItems(new Set(selectedItems));
  };

  const handleClearAll = () => {
    if (window.confirm('모든 찜한 목록을 삭제하시겠습니까?')) {
      clearAll();
      setSelectedItems(new Set());
      setIsSelectMode(false);
    }
  };

  const handleCardClick = (kindercode: string) => {
    if (isSelectMode) {
      handleToggleSelect(kindercode);
    } else {
      setDetailKindercode(kindercode);
    }
  };

  const handleDetailClose = () => {
    setDetailKindercode(null);
  };

  const handleAddToCompare = (kindercode: string) => {
    const kindergarten = kindergartensMap.get(kindercode);
    if (kindergarten) {
      addToCompare(kindergarten);
    }
  };

  const handleRemoveFromCompare = (kindercode: string) => {
    removeFromCompare(kindercode);
  };

  // 상세 패널에서 비교함 토글
  const handleDetailCompareToggle = () => {
    if (!detailKindercode || !detailKindergarten) return;

    if (isInCompare(detailKindercode)) {
      removeFromCompare(detailKindercode);
    } else {
      addToCompare(detailKindergarten);
    }
  };

  // 선택 모드 토글
  const handleToggleSelectMode = () => {
    if (isSelectMode) {
      setSelectedItems(new Set());
    }
    setIsSelectMode(!isSelectMode);
  };

  // 아이템 선택 토글
  const handleToggleSelect = (kindercode: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(kindercode)) {
      newSelected.delete(kindercode);
    } else if (newSelected.size < 3) {
      newSelected.add(kindercode);
    }
    setSelectedItems(newSelected);
  };

  // 선택된 아이템으로 비교함을 교체 후 비교 페이지로 이동
  const handleBulkCompare = useCallback(() => {
    const kindergartenStore = useKindergartenStore.getState();
    const location = useSearchStore.getState().location;
    const address = useSearchStore.getState().address;

    // 선택한 항목들을 Kindergarten 객체로 변환
    const kindergartens: Kindergarten[] = [];
    selectedItems.forEach((kindercode) => {
      const raw = kindergartenStore.getByKindercode(kindercode);
      if (raw) {
        kindergartens.push(transformToKindergarten(raw, location ?? undefined));
      }
    });

    // 비교함을 선택한 항목으로 교체 (기존 항목 대체)
    setItems(kindergartens);

    setSelectedItems(new Set());
    setIsSelectMode(false);
    onClose();
    router.push(
      generateCompareSharePath(
        kindergartens.map((kindergarten) => kindergarten.kindercode),
        location,
        address
      )
    );
  }, [selectedItems, setItems, onClose, router]);

  // 선택 취소
  const handleCancelSelect = () => {
    setSelectedItems(new Set());
    setIsSelectMode(false);
  };

  if (!isOpen) return null;

  // 상세보기 모드
  if (detailKindercode && detailKindergarten) {
    return (
      <>
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/30 z-40"
          onClick={handleDetailClose}
        />
        <KindergartenDetailPanel
          kindergarten={detailKindergarten}
          onClose={handleDetailClose}
          onCompareToggle={handleDetailCompareToggle}
          isInCompare={isInCompare(detailKindercode)}
          canAddToCompare={canAddToCompare()}
        />
      </>
    );
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed safe-inset-y right-0 w-full max-w-md bg-white shadow-2xl z-50 flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 bg-white/80 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-red-500 fill-red-500" />
            <h2 className="text-lg font-bold text-gray-900">
              찜한 목록
              {items.length > 0 ? (
                <span className="ml-2 text-sm font-normal text-gray-500">
                  {items.length}개
                </span>
              ) : null}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar - 정렬 + 선택 모드 */}
        {items.length > 0 ? (
          <div className="px-5 py-3 border-b border-gray-100 bg-white flex items-center justify-between">
            {isSelectMode ? (
              // 선택 모드 헤더
              <>
                <span className="text-sm font-medium text-gray-700">
                  {selectedItems.size}개 선택됨
                </span>
                <button
                  onClick={handleCancelSelect}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  선택 취소
                </button>
              </>
            ) : (
              // 기본 모드 헤더
              <>
                {/* 정렬 드롭다운 */}
                <div className="relative">
                  <button
                    onClick={() => setIsSortDropdownOpen(!isSortDropdownOpen)}
                    className="flex items-center gap-1.5 text-sm text-gray-700 hover:text-gray-900 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    {SORT_LABELS[sortOption]}
                    <ChevronDown className={`w-4 h-4 transition-transform ${isSortDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isSortDropdownOpen ? (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setIsSortDropdownOpen(false)}
                      />
                      <div className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 min-w-[100px]">
                        {(Object.entries(SORT_LABELS) as [FavoriteSortOption, string][]).map(
                          ([key, label]) => (
                            <button
                              key={key}
                              onClick={() => {
                                setSortOption(key);
                                setIsSortDropdownOpen(false);
                              }}
                              className={`w-full px-3 py-2 text-sm text-left hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg ${
                                sortOption === key
                                  ? 'text-emerald-600 font-medium'
                                  : 'text-gray-700'
                              }`}
                            >
                              {label}
                            </button>
                          )
                        )}
                      </div>
                    </>
                  ) : null}
                </div>

                {/* 선택 모드 버튼 */}
                <button
                  onClick={handleToggleSelectMode}
                  className="flex items-center gap-1.5 text-sm text-emerald-600 hover:text-emerald-700 px-3 py-1.5 rounded-lg hover:bg-emerald-50 transition-colors"
                >
                  <CheckSquare className="w-4 h-4" />
                  선택하여 비교
                </button>
              </>
            )}
          </div>
        ) : null}

        {/* Content */}
        <div className="flex-1 overflow-y-auto bg-gray-50">
          {/* 빈 상태 UI */}
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
                <Heart className="h-8 w-8 text-red-300" />
              </div>
              <p className="mb-2 text-base font-semibold text-gray-900">찜한 기관이 아직 없습니다</p>
              <p className="text-sm leading-6 text-gray-500">
                검색 결과에서 하트를 누르면 나중에 다시 비교할 후보를 모아둘 수 있어요.
              </p>
              <button
                onClick={() => {
                  onClose();
                  router.push('/search');
                }}
                className="mt-5 rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-bold text-white"
              >
                기관 검색하러 가기
              </button>
            </div>
          ) : (
            <div className="p-4 space-y-3">
              {sortedItems.map((item) => {
                const kindergarten = kindergartensMap.get(item.kindercode);
                const inCompare = isInCompare(item.kindercode);
                const canAdd = canAddToCompare();
                const isSelected = selectedItems.has(item.kindercode);
                const canSelect = selectedItems.size < 3 || isSelected;

                return (
                  <FavoriteItemCard
                    key={item.kindercode}
                    item={item}
                    kindergarten={kindergarten}
                    onRemove={handleRemove}
                    onClick={handleCardClick}
                    onAddToCompare={handleAddToCompare}
                    onRemoveFromCompare={handleRemoveFromCompare}
                    isInCompare={inCompare}
                    canAddToCompare={canAdd}
                    isSelectMode={isSelectMode}
                    isSelected={isSelected}
                    onToggleSelect={handleToggleSelect}
                    canSelect={canSelect}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 ? (
          <div className="p-4 border-t border-gray-200 bg-white">
            {isSelectMode ? (
              // 선택 모드: 비교하기 버튼
              <button
                onClick={handleBulkCompare}
                disabled={selectedItems.size === 0}
                className={`w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                  selectedItems.size > 0
                    ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                <Plus className="w-4 h-4" />
                선택한 {selectedItems.size}개 비교하기
              </button>
            ) : (
              // 기본 모드: 모두 삭제 버튼
              <button
                onClick={handleClearAll}
                className="w-full py-3 rounded-xl font-medium text-sm text-red-500 bg-red-50 hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                모두 삭제
              </button>
            )}
          </div>
        ) : null}
      </div>
    </>
  );
}

interface FavoriteItemCardProps {
  item: FavoriteItem;
  kindergarten: Kindergarten | undefined;
  onRemove: (kindercode: string) => void;
  onClick: (kindercode: string) => void;
  onAddToCompare: (kindercode: string) => void;
  onRemoveFromCompare: (kindercode: string) => void;
  isInCompare: boolean;
  canAddToCompare: boolean;
  isSelectMode: boolean;
  isSelected: boolean;
  onToggleSelect: (kindercode: string) => void;
  canSelect: boolean;
}

function FavoriteItemCard({
  item,
  kindergarten,
  onRemove,
  onClick,
  onAddToCompare,
  onRemoveFromCompare,
  isInCompare,
  canAddToCompare,
  isSelectMode,
  isSelected,
  onToggleSelect,
  canSelect,
}: FavoriteItemCardProps) {
  const typeStyle = TYPE_STYLES[item.type];

  const handleCompareClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isInCompare) {
      onRemoveFromCompare(item.kindercode);
    } else {
      onAddToCompare(item.kindercode);
    }
  };

  const handleRemoveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRemove(item.kindercode);
  };

  const handleSelectClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (canSelect) {
      onToggleSelect(item.kindercode);
    }
  };

  return (
    <div
      onClick={() => onClick(item.kindercode)}
      className={`bg-white rounded-xl p-4 border shadow-sm cursor-pointer transition-all hover:shadow-md ${
        isSelected
          ? 'border-emerald-300 ring-2 ring-emerald-100'
          : 'border-gray-100 hover:border-gray-200'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* 선택 모드: 체크박스 */}
        {isSelectMode ? (
          <button
            onClick={handleSelectClick}
            className={`flex-shrink-0 mt-0.5 transition-colors ${
              isSelected
                ? 'text-emerald-500'
                : canSelect
                ? 'text-gray-300 hover:text-emerald-400'
                : 'text-gray-200 cursor-not-allowed'
            }`}
          >
            {isSelected ? (
              <CheckSquare className="w-5 h-5" />
            ) : (
              <Square className="w-5 h-5" />
            )}
          </button>
        ) : null}

        {/* 카드 내용 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${typeStyle.className}`}>
              {typeStyle.label}
            </span>
            {/* 거리 표시 */}
            {kindergarten && formatDistanceLabel(kindergarten.distance) ? (
              <span className="text-[11px] text-gray-400">
                {formatDistanceLabel(kindergarten.distance)}
              </span>
            ) : null}
          </div>
          <h3 className="font-bold text-gray-900 text-base truncate">
            {item.name}
          </h3>
          <p className="text-xs text-gray-400 mt-1 truncate">
            {item.address}
          </p>

          {/* 비교하기 버튼 (선택 모드가 아닐 때만) */}
          {!isSelectMode ? (
            <button
              onClick={handleCompareClick}
              disabled={!isInCompare && !canAddToCompare}
              className={`mt-3 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 ${
                isInCompare
                  ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                  : canAddToCompare
                  ? 'bg-gray-100 text-gray-600 hover:bg-emerald-50 hover:text-emerald-600'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
              title={
                !canAddToCompare && !isInCompare
                  ? '비교함이 가득 찼습니다 (최대 3개)'
                  : undefined
              }
            >
              {isInCompare ? (
                <>
                  <Check className="w-3 h-3" />
                  비교함에서 제거
                </>
              ) : (
                <>
                  <Plus className="w-3 h-3" />
                  비교하기
                </>
              )}
            </button>
          ) : null}
        </div>

        {/* 찜 해제 버튼 */}
        <button
          onClick={handleRemoveClick}
          className="flex-shrink-0 p-2 rounded-full hover:bg-red-50 text-red-500 transition-colors"
          title="찜 해제"
        >
          <Heart className="w-5 h-5 fill-red-500" />
        </button>
      </div>
    </div>
  );
}

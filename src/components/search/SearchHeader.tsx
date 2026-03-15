'use client';

import { useRef, useCallback, useState, useEffect, useSyncExternalStore } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Search,
  X,
  Heart,
  ChevronDown,
  Bus,
  MapPin,
  UserCheck,
  Home,
  Maximize,
  Building2,
  Crosshair,
  RotateCcw,
  SlidersHorizontal,
  Loader2,
} from 'lucide-react';
import { KindergartenIcon } from '@/components/icons/KindergartenIcon';
import {
  useSearchStore,
  useFavoriteStore,
  useUIStore,
  type InstitutionFilter,
} from '@/stores';
import { useAddressSearch, type KindergartenSearchResult } from '@/hooks';
import { RADIUS_MIN, RADIUS_MAX } from '@/types';
import { trackUXEvent } from '@/lib/analytics';
import { FavoritesPanel } from './FavoritesPanel';

interface SearchHeaderProps {
  isLocating: boolean;
  onRequestCurrentLocation: () => void | Promise<void>;
}

function getActiveFilterCount(filters: ReturnType<typeof useSearchStore.getState>['filters']): number {
  let count = 0;

  if (filters.type !== 'all') count += 1;
  if (filters.hasBus === true) count += 1;
  if (filters.hasVacancy === true) count += 1;
  if (filters.hasIndoorPlayground === true) count += 1;
  if (filters.hasLargeSpace === true) count += 1;
  if (filters.hasModernBuilding === true) count += 1;

  return count;
}

function getTypeLabel(type: InstitutionFilter): string {
  switch (type) {
    case 'public':
      return '국공립';
    case 'private':
      return '사립';
    default:
      return '전체';
  }
}

export function SearchHeader({
  isLocating,
  onRequestCurrentLocation,
}: SearchHeaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const radiusButtonRef = useRef<HTMLButtonElement>(null);
  const typeButtonRef = useRef<HTMLButtonElement>(null);
  const [isRadiusOpen, setIsRadiusOpen] = useState(false);
  const [isTypeOpen, setIsTypeOpen] = useState(false);
  const [isFavoritesPanelOpen, setIsFavoritesPanelOpen] = useState(false);
  const [radiusDropdownPos, setRadiusDropdownPos] = useState({ top: 0, left: 0 });
  const [typeDropdownPos, setTypeDropdownPos] = useState({ top: 0, left: 0 });
  const hasMounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false
  );

  const favoriteCount = useFavoriteStore((state) => state.getItemCount());
  const setBottomSheetOpen = useUIStore((state) => state.setBottomSheetOpen);

  useEffect(() => {
    if (isRadiusOpen && radiusButtonRef.current) {
      const rect = radiusButtonRef.current.getBoundingClientRect();
      setRadiusDropdownPos({ top: rect.bottom + 8, left: rect.left });
    }
  }, [isRadiusOpen]);

  useEffect(() => {
    if (isTypeOpen && typeButtonRef.current) {
      const rect = typeButtonRef.current.getBoundingClientRect();
      setTypeDropdownPos({ top: rect.bottom + 8, left: rect.left });
    }
  }, [isTypeOpen]);

  const {
    address,
    location,
    hasSearched,
    filters,
    setLocation,
    setRadius,
    setType,
    setViewMode,
    applyFilters,
    resetFilters,
    clearSearchSession,
    search,
    setDetailId,
  } = useSearchStore();

  const {
    query,
    suggestions,
    kindergartenSuggestions,
    isLoading: isSearching,
    isOpen,
    setQuery,
    selectAddress,
    selectKindergarten,
    clearSelection,
    clearQuery,
    setOpen,
  } = useAddressSearch();

  const hasSearchSession = location !== null || hasSearched;
  const activeFilterCount = getActiveFilterCount(filters);
  const showFilters = hasSearchSession;

  const handleSelectAddress = useCallback(
    (suggestion: typeof suggestions[0]) => {
      selectAddress(suggestion);
      setLocation({ lat: suggestion.lat, lng: suggestion.lng }, suggestion.address);
      setViewMode('list');
      trackUXEvent('search_started', { source: 'address' });
      void search();
      inputRef.current?.blur();
    },
    [search, selectAddress, setLocation, setViewMode]
  );

  const handleSelectKindergarten = useCallback(
    (kindergarten: KindergartenSearchResult) => {
      selectKindergarten(kindergarten);
      setLocation({ lat: kindergarten.lat, lng: kindergarten.lng }, kindergarten.address);
      setViewMode('list');
      setDetailId(kindergarten.kindercode);
      trackUXEvent('search_started', { source: 'kindergarten' });
      void search();
      inputRef.current?.blur();
    },
    [search, selectKindergarten, setDetailId, setLocation, setViewMode]
  );

  const handleCurrentLocation = useCallback(() => {
    void onRequestCurrentLocation();
  }, [onRequestCurrentLocation]);

  const handleRadiusChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setRadius(Number(event.target.value));
    },
    [setRadius]
  );

  const handleRadiusChangeEnd = useCallback(() => {
    if (!location) return;
    trackUXEvent('search_started', { source: 'radius', radius: filters.radius });
    void search();
  }, [filters.radius, location, search]);

  const handleTypeChange = useCallback(
    (type: InstitutionFilter) => {
      setType(type);
      setIsTypeOpen(false);
      setBottomSheetOpen(false);
    },
    [setType, setBottomSheetOpen]
  );

  const handleClearQuery = useCallback(() => {
    clearQuery();
    inputRef.current?.focus();
  }, [clearQuery]);

  const handleResetSession = useCallback(() => {
    clearSelection();
    clearSearchSession();
    setIsRadiusOpen(false);
    setIsTypeOpen(false);
    setBottomSheetOpen(false);
    setOpen(false);
    inputRef.current?.focus();
  }, [clearSelection, clearSearchSession, setBottomSheetOpen, setOpen]);

  const handleResetFilters = useCallback(() => {
    resetFilters();
    setIsRadiusOpen(false);
    setIsTypeOpen(false);
    setBottomSheetOpen(false);

    if (location) {
      void search();
    }
  }, [location, resetFilters, search, setBottomSheetOpen]);

  const handleQuickFilter = useCallback(
    (updates: Parameters<typeof applyFilters>[0]) => {
      applyFilters(updates);
    },
    [applyFilters]
  );

  return (
    <header className="relative z-50 flex-none border-b border-gray-200 bg-white safe-area-top">
      <div className="mx-auto flex h-16 max-w-[1920px] items-center justify-between gap-3 px-4">
        <Link href="/" className="flex items-center gap-2 flex-shrink-0">
          <Image
            src="/logo.png"
            alt="우리동네 유치원"
            width={40}
            height={40}
            className="rounded-lg"
          />
          <span className="hidden text-lg font-bold tracking-tight text-gray-900 md:block">
            우리동네 유치원
          </span>
        </Link>

        <div className="relative max-w-xl flex-1 md:max-w-2xl">
          <div className="group relative">
            <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 transition-colors group-focus-within:text-emerald-500">
              <Search className="h-5 w-5" />
            </div>
            <input
              id="kindergarten-search-input"
              ref={inputRef}
              type="text"
              value={query || address}
              onChange={(event) => setQuery(event.target.value)}
              onFocus={() => {
                if (suggestions.length > 0 || kindergartenSuggestions.length > 0) {
                  setOpen(true);
                }
              }}
              className="w-full rounded-full border border-transparent bg-gray-100 py-2.5 pl-10 pr-24 text-sm text-gray-900 shadow-sm transition-all outline-none placeholder:text-gray-500 hover:bg-gray-50 focus:border-emerald-500 focus:bg-white"
              placeholder="주소, 유치원, 아파트 이름 검색"
              aria-label="주소 또는 유치원 검색"
            />
            <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
              {query ? (
                <button
                  type="button"
                  onClick={handleClearQuery}
                  className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-600"
                  aria-label="입력 지우기"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
              <button
                type="button"
                onClick={handleCurrentLocation}
                disabled={isLocating}
                className={`flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full transition-colors ${
                  isLocating
                    ? 'text-gray-400'
                    : 'text-emerald-600 hover:bg-gray-200 hover:text-emerald-700'
                }`}
                aria-label="현재 위치로 검색"
              >
                {isLocating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Crosshair className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {isOpen ? (
            <div className="fixed bottom-0 left-0 right-0 top-[116px] z-50 overflow-y-auto border-t border-gray-200 bg-white md:absolute md:bottom-auto md:top-full md:mt-2 md:h-auto md:rounded-2xl md:border md:shadow-xl">
              <div className="sticky top-0 flex items-center justify-between border-b border-gray-100 bg-white px-4 py-3 md:hidden">
                <span className="text-sm font-medium text-gray-700">검색 결과</span>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100"
                  aria-label="검색 결과 닫기"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <button
                type="button"
                onClick={handleCurrentLocation}
                disabled={isLocating}
                className="flex w-full items-center gap-3 border-b border-gray-100 px-4 py-3 text-left transition-colors hover:bg-gray-50"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100">
                  {isLocating ? (
                    <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
                  ) : (
                    <MapPin className="h-4 w-4 text-emerald-600" />
                  )}
                </div>
                <div>
                  <div className="font-medium text-gray-900">
                    {isLocating ? '위치를 확인하고 있어요' : '현재 위치로 바로 검색'}
                  </div>
                  <div className="text-xs text-gray-500">GPS 권한을 허용하면 주변 기관을 찾습니다.</div>
                </div>
              </button>

              {isSearching ? (
                <div className="px-4 py-6 text-center text-sm text-gray-500">검색 중...</div>
              ) : (
                <>
                  {kindergartenSuggestions.length > 0 ? (
                    <div>
                      <div className="border-b border-gray-100 bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-500">
                        유치원
                      </div>
                      <ul>
                        {kindergartenSuggestions.map((kindergarten) => (
                          <li key={kindergarten.kindercode}>
                            <button
                              type="button"
                              onClick={() => handleSelectKindergarten(kindergarten)}
                              className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50"
                            >
                              <div
                                className={`flex h-8 w-8 items-center justify-center rounded-full ${
                                  kindergarten.type === 'public'
                                    ? 'bg-emerald-100'
                                    : 'bg-indigo-100'
                                }`}
                              >
                                <KindergartenIcon
                                  className={`h-4 w-4 ${
                                    kindergarten.type === 'public'
                                      ? 'text-emerald-600'
                                      : 'text-indigo-600'
                                  }`}
                                />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="truncate font-medium text-gray-900">
                                  {kindergarten.name}
                                </div>
                                <div className="truncate text-xs text-gray-500">
                                  {kindergarten.address}
                                </div>
                              </div>
                              <span
                                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                                  kindergarten.type === 'public'
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : 'bg-indigo-100 text-indigo-700'
                                }`}
                              >
                                {kindergarten.type === 'public' ? '국공립' : '사립'}
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {suggestions.length > 0 ? (
                    <div>
                      <div className="border-b border-gray-100 bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-500">
                        장소
                      </div>
                      <ul>
                        {suggestions.map((suggestion, index) => (
                          <li key={`${suggestion.lat}-${suggestion.lng}-${index}`}>
                            <button
                              type="button"
                              onClick={() => handleSelectAddress(suggestion)}
                              className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50"
                            >
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100">
                                <MapPin className="h-4 w-4 text-gray-400" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="truncate font-medium text-gray-900">
                                  {suggestion.placeName || suggestion.address}
                                </div>
                                {suggestion.placeName ? (
                                  <div className="truncate text-xs text-gray-500">
                                    {suggestion.address}
                                  </div>
                                ) : null}
                              </div>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {query.length >= 2 &&
                  suggestions.length === 0 &&
                  kindergartenSuggestions.length === 0 ? (
                    <div className="px-4 py-8 text-center">
                      <p className="text-sm font-medium text-gray-700">검색 결과가 없습니다</p>
                      <p className="mt-1 text-xs text-gray-500">
                        주소 또는 유치원 이름을 다시 확인해보세요.
                      </p>
                    </div>
                  ) : null}
                </>
              )}
            </div>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => setIsFavoritesPanelOpen(true)}
          className="relative flex-shrink-0 rounded-lg p-2 text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
          aria-label="찜한 목록 열기"
        >
          <Heart className="h-5 w-5" />
          {hasMounted && favoriteCount > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
              {favoriteCount > 99 ? '99+' : favoriteCount}
            </span>
          ) : null}
        </button>
      </div>

      {showFilters ? (
        <div className="relative border-t border-gray-100 bg-white px-4 py-3">
          <div className="hide-scrollbar flex gap-2 overflow-x-auto overflow-y-visible">
            <button
              ref={radiusButtonRef}
              type="button"
              onClick={() => {
                const next = !isRadiusOpen;
                setIsRadiusOpen(next);
                setIsTypeOpen(false);
                setBottomSheetOpen(next);
              }}
              className="flex items-center gap-1.5 whitespace-nowrap rounded-full border border-emerald-500 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700"
            >
              반경 {filters.radius}km
              <ChevronDown className={`h-3 w-3 transition-transform ${isRadiusOpen ? 'rotate-180' : ''}`} />
            </button>

            <button
              ref={typeButtonRef}
              type="button"
              onClick={() => {
                const next = !isTypeOpen;
                setIsTypeOpen(next);
                setIsRadiusOpen(false);
                setBottomSheetOpen(next);
              }}
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium ${
                filters.type !== 'all'
                  ? 'border-emerald-500 bg-emerald-50 font-bold text-emerald-700'
                  : 'border-gray-200 bg-white text-gray-600'
              }`}
            >
              유형 {getTypeLabel(filters.type)}
              <ChevronDown className={`h-3 w-3 transition-transform ${isTypeOpen ? 'rotate-180' : ''}`} />
            </button>

            <button
              type="button"
              onClick={() => handleQuickFilter({ hasBus: filters.hasBus === true ? null : true })}
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium ${
                filters.hasBus === true
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                  : 'border-gray-200 bg-white text-gray-600'
              }`}
            >
              <Bus className="h-3.5 w-3.5" />
              셔틀버스
            </button>

            <button
              type="button"
              onClick={() =>
                handleQuickFilter({
                  hasVacancy: filters.hasVacancy === true ? null : true,
                })
              }
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium ${
                filters.hasVacancy === true
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                  : 'border-gray-200 bg-white text-gray-600'
              }`}
            >
              <UserCheck className="h-3.5 w-3.5" />
              여유정원
            </button>

            <button
              type="button"
              onClick={() =>
                handleQuickFilter({
                  hasIndoorPlayground:
                    filters.hasIndoorPlayground === true ? null : true,
                })
              }
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium ${
                filters.hasIndoorPlayground === true
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                  : 'border-gray-200 bg-white text-gray-600'
              }`}
            >
              <Home className="h-3.5 w-3.5" />
              실내놀이터
            </button>

            <button
              type="button"
              onClick={() =>
                handleQuickFilter({
                  hasLargeSpace: filters.hasLargeSpace === true ? null : true,
                })
              }
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium ${
                filters.hasLargeSpace === true
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                  : 'border-gray-200 bg-white text-gray-600'
              }`}
            >
              <Maximize className="h-3.5 w-3.5" />
              넓은 공간
            </button>

            <button
              type="button"
              onClick={() =>
                handleQuickFilter({
                  hasModernBuilding:
                    filters.hasModernBuilding === true ? null : true,
                })
              }
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium ${
                filters.hasModernBuilding === true
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                  : 'border-gray-200 bg-white text-gray-600'
              }`}
            >
              <Building2 className="h-3.5 w-3.5" />
              최신 건물
            </button>

            {activeFilterCount > 0 ? (
              <>
                <span className="flex items-center gap-1 whitespace-nowrap rounded-full bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-600">
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  활성 {activeFilterCount}
                </span>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="flex items-center gap-1.5 whitespace-nowrap rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  필터 초기화
                </button>
              </>
            ) : null}

            <button
              type="button"
              onClick={handleResetSession}
              className="flex items-center gap-1.5 whitespace-nowrap rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              검색 초기화
            </button>
          </div>
        </div>
      ) : null}

      {isOpen ? (
        <div
          className="fixed inset-x-0 bottom-0 top-[120px] z-40 hidden md:block"
          onClick={() => setOpen(false)}
        />
      ) : null}

      {isRadiusOpen || isTypeOpen ? (
        <div
          className="fixed inset-x-0 bottom-0 top-[120px] z-40"
          onClick={() => {
            setIsRadiusOpen(false);
            setIsTypeOpen(false);
            setBottomSheetOpen(false);
          }}
        />
      ) : null}

      {isRadiusOpen ? (
        <>
          <div className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl border-t border-gray-200 bg-white p-5 shadow-xl md:hidden">
            <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-gray-300" />
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">검색 반경</span>
              <span className="text-lg font-bold text-emerald-600">{filters.radius}km</span>
            </div>
            <input
              type="range"
              min={RADIUS_MIN}
              max={RADIUS_MAX}
              step={1}
              value={filters.radius}
              onChange={handleRadiusChange}
              onMouseUp={handleRadiusChangeEnd}
              onTouchEnd={handleRadiusChangeEnd}
              className="w-full cursor-pointer appearance-none rounded-lg bg-gray-200 accent-emerald-500"
            />
            <div className="mt-2 flex justify-between text-xs text-gray-400">
              <span>{RADIUS_MIN}km</span>
              <span>{RADIUS_MAX}km</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsRadiusOpen(false);
                setBottomSheetOpen(false);
                handleRadiusChangeEnd();
              }}
              className="mt-5 w-full rounded-2xl bg-emerald-600 py-3 text-sm font-bold text-white"
            >
              반경 적용하기
            </button>
          </div>

          <div
            className="fixed z-50 hidden min-w-[220px] rounded-2xl border border-gray-200 bg-white p-4 shadow-xl md:block"
            style={{ top: radiusDropdownPos.top, left: radiusDropdownPos.left }}
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs text-gray-500">검색 반경</span>
              <span className="text-sm font-bold text-emerald-600">{filters.radius}km</span>
            </div>
            <input
              type="range"
              min={RADIUS_MIN}
              max={RADIUS_MAX}
              step={1}
              value={filters.radius}
              onChange={handleRadiusChange}
              onMouseUp={handleRadiusChangeEnd}
              onTouchEnd={handleRadiusChangeEnd}
              className="w-full cursor-pointer appearance-none rounded-lg bg-gray-200 accent-emerald-500"
            />
            <div className="mt-2 flex justify-between text-xs text-gray-400">
              <span>{RADIUS_MIN}km</span>
              <span>{RADIUS_MAX}km</span>
            </div>
          </div>
        </>
      ) : null}

      {isTypeOpen ? (
        <>
          <div className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl border-t border-gray-200 bg-white p-5 pb-10 shadow-xl md:hidden">
            <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-gray-300" />
            <div className="mb-3 text-sm font-medium text-gray-700">기관 유형</div>
            <div className="space-y-2">
              {[
                { value: 'all', label: '전체' },
                { value: 'public', label: '국공립' },
                { value: 'private', label: '사립' },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleTypeChange(option.value as InstitutionFilter)}
                  className={`w-full rounded-2xl border px-4 py-3 text-left text-sm font-medium transition-colors ${
                    filters.type === option.value
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                      : 'border-transparent bg-gray-50 text-gray-700'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div
            className="fixed z-50 hidden min-w-[120px] rounded-2xl border border-gray-200 bg-white py-2 shadow-xl md:block"
            style={{ top: typeDropdownPos.top, left: typeDropdownPos.left }}
          >
            {[
              { value: 'all', label: '전체' },
              { value: 'public', label: '국공립' },
              { value: 'private', label: '사립' },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleTypeChange(option.value as InstitutionFilter)}
                className={`block w-full px-4 py-2 text-left text-sm transition-colors hover:bg-gray-50 ${
                  filters.type === option.value
                    ? 'font-bold text-emerald-600'
                    : 'text-gray-700'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </>
      ) : null}

      <FavoritesPanel
        isOpen={isFavoritesPanelOpen}
        onClose={() => setIsFavoritesPanelOpen(false)}
      />
    </header>
  );
}

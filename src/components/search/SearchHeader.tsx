'use client';

import { useRef, useCallback, useState, useEffect } from 'react';
import Link from 'next/link';
import Search from 'lucide-react/dist/esm/icons/search';
import X from 'lucide-react/dist/esm/icons/x';
import Heart from 'lucide-react/dist/esm/icons/heart';
import ChevronDown from 'lucide-react/dist/esm/icons/chevron-down';
import Bus from 'lucide-react/dist/esm/icons/bus';
import MapPin from 'lucide-react/dist/esm/icons/map-pin';
import UserCheck from 'lucide-react/dist/esm/icons/user-check';
import Home from 'lucide-react/dist/esm/icons/home';
import Maximize from 'lucide-react/dist/esm/icons/maximize';
import Building2 from 'lucide-react/dist/esm/icons/building-2';
import Crosshair from 'lucide-react/dist/esm/icons/crosshair';
import { BrandMark } from '@/components/common/BrandMark';
import { KindergartenIcon } from '@/components/icons/KindergartenIcon';
import { useSearchStore, useFavoriteStore, useUIStore, type InstitutionFilter } from '@/stores';
import { useAddressSearch, useGeolocation, type KindergartenSearchResult } from '@/hooks';
import { RADIUS_MIN, RADIUS_MAX } from '@/types';
import { FavoritesPanel } from './FavoritesPanel';

/** 활성/비활성 필터 칩 클래스 */
const CHIP_ACTIVE = 'border-[rgba(78,169,109,0.26)] bg-[rgba(78,169,109,0.12)] text-[var(--brand-leaf)]';
const CHIP_INACTIVE = 'brand-chip text-[var(--brand-ink-soft)] hover:border-[rgba(203,188,174,0.48)]';

/** 토글형 필터 칩 정의 */
const TOGGLE_FILTERS = [
  { key: 'hasBus', label: '셔틀버스', icon: Bus },
  { key: 'hasVacancy', label: '여유정원', icon: UserCheck },
  { key: 'hasIndoorPlayground', label: '실내놀이터', icon: Home },
  { key: 'hasLargeSpace', label: '넓은 공간', icon: Maximize },
  { key: 'hasModernBuilding', label: '최신건물', icon: Building2 },
] as const;

/** 기관 유형 옵션 */
const TYPE_OPTIONS: { value: InstitutionFilter; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'public', label: '국공립' },
  { value: 'private', label: '사립' },
];

type ToggleFilterKey = (typeof TOGGLE_FILTERS)[number]['key'];

export function SearchHeader() {
  const inputRef = useRef<HTMLInputElement>(null);
  const radiusButtonRef = useRef<HTMLButtonElement>(null);
  const typeButtonRef = useRef<HTMLButtonElement>(null);
  const [isRadiusOpen, setIsRadiusOpen] = useState(false);
  const [isTypeOpen, setIsTypeOpen] = useState(false);
  const [radiusDropdownPos, setRadiusDropdownPos] = useState({ top: 0, left: 0 });
  const [typeDropdownPos, setTypeDropdownPos] = useState({ top: 0, left: 0 });
  const [hasMounted, setHasMounted] = useState(false);

  const favoriteCount = useFavoriteStore(state => state.getItemCount());

  const setBottomSheetOpen = useUIStore(state => state.setBottomSheetOpen);
  const isFavoritesPanelOpen = useUIStore(state => state.isFavoritesPanelOpen);
  const setFavoritesPanelOpen = useUIStore(state => state.setFavoritesPanelOpen);

  // Hydration mismatch 방지: 클라이언트 마운트 후에만 localStorage 값 사용
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 마운트 상태 추적은 의도적인 패턴
    setHasMounted(true);
  }, []);

  // 드롭다운 위치 계산
  useEffect(() => {
    if (isRadiusOpen && radiusButtonRef.current) {
      const rect = radiusButtonRef.current.getBoundingClientRect();
      setRadiusDropdownPos({ top: rect.bottom + 8, left: rect.left });
    }
  }, [isRadiusOpen]);

  useEffect(() => {
    if (isTypeOpen && typeButtonRef.current) {
      const rect = typeButtonRef.current.getBoundingClientRect();
      setTypeDropdownPos({ top: rect.bottom + 4, left: rect.left });
    }
  }, [isTypeOpen]);

  const {
    address,
    filters,
    setLocation,
    setAddress,
    setRadius,
    setType,
    setHasBus,
    setHasVacancy,
    setHasIndoorPlayground,
    setHasLargeSpace,
    setHasModernBuilding,
    search,
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
    setOpen,
  } = useAddressSearch();

  const { getCurrentPosition, isLoading: isGeoLoading } = useGeolocation();

  const { setDetailId } = useSearchStore();

  /** 필터 setter 맵 (토글 핸들러 통합용) */
  const filterSetters: Record<ToggleFilterKey, (value: boolean | null) => void> = {
    hasBus: setHasBus,
    hasVacancy: setHasVacancy,
    hasIndoorPlayground: setHasIndoorPlayground,
    hasLargeSpace: setHasLargeSpace,
    hasModernBuilding: setHasModernBuilding,
  };

  const handleSelectAddress = useCallback(
    (suggestion: typeof suggestions[0]) => {
      selectAddress(suggestion);
      setLocation({ lat: suggestion.lat, lng: suggestion.lng }, suggestion.address);
      search();
      inputRef.current?.blur();
    },
    [selectAddress, setLocation, search]
  );

  const handleSelectKindergarten = useCallback(
    (kindergarten: KindergartenSearchResult) => {
      selectKindergarten(kindergarten);
      setLocation({ lat: kindergarten.lat, lng: kindergarten.lng }, kindergarten.address);
      search();
      setDetailId(kindergarten.kindercode);
      inputRef.current?.blur();
    },
    [selectKindergarten, setLocation, search, setDetailId]
  );

  const handleCurrentLocation = useCallback(async () => {
    try {
      const coords = await getCurrentPosition();
      setLocation(coords);
      clearSelection();
      search();
    } catch {
      // 에러는 useGeolocation 내부에서 처리됨
    }
  }, [getCurrentPosition, setLocation, clearSelection, search]);

  const handleRadiusChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setRadius(Number(e.target.value));
    },
    [setRadius]
  );

  const handleRadiusChangeEnd = useCallback(() => {
    search();
  }, [search]);

  const handleTypeChange = useCallback(
    (type: InstitutionFilter) => {
      setType(type);
      setIsTypeOpen(false);
      setBottomSheetOpen(false);
      search();
    },
    [setType, setBottomSheetOpen, search]
  );

  const handleToggleFilter = useCallback(
    (key: ToggleFilterKey) => {
      const setter = filterSetters[key];
      setter(filters[key] === true ? null : true);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- filterSetters is stable (derived from store setters)
    [filters, setHasBus, setHasVacancy, setHasIndoorPlayground, setHasLargeSpace, setHasModernBuilding]
  );

  const handleClear = useCallback(() => {
    clearSelection();
    setAddress('');
    inputRef.current?.focus();
  }, [clearSelection, setAddress]);

  const handleCloseDropdowns = useCallback(() => {
    setIsRadiusOpen(false);
    setIsTypeOpen(false);
    setBottomSheetOpen(false);
  }, [setBottomSheetOpen]);

  /** 기관 유형 필터 라벨 */
  function getTypeLabel(type: InstitutionFilter): string {
    return TYPE_OPTIONS.find(o => o.value === type)?.label ?? '전체';
  }

  return (
    <header className="relative z-50 flex-none safe-area-top">
      <div className="mx-auto max-w-[1920px] px-4 pt-3">
        <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.06)] md:brand-shell">
      <div className="h-14 flex items-center justify-between gap-3 px-3 md:h-16 md:gap-4 md:px-5">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 flex-shrink-0">
          <BrandMark compact labelClassName="hidden md:block text-lg" />
        </Link>

        {/* Search Input */}
        <div className="flex-1 max-w-xl md:max-w-2xl relative group">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--brand-sand)] group-focus-within:text-[var(--brand-leaf)] transition-colors">
            <Search className="w-5 h-5" />
          </div>
          <input
            ref={inputRef}
            type="search"
            inputMode="search"
            enterKeyHint="search"
            value={query || address}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => {
              if (suggestions.length > 0 || kindergartenSuggestions.length > 0) {
                setOpen(true);
              }
            }}
            className="w-full rounded-full border border-white/80 bg-white/78 py-2.5 pl-10 pr-24 text-sm text-[var(--brand-ink)] outline-none transition-all placeholder:text-[var(--brand-ink-soft)] shadow-[0_14px_28px_rgba(125,132,96,0.08)] hover:bg-white/92 focus:border-[rgba(78,169,109,0.35)] focus:bg-white"
            placeholder="유치원, 주소 검색"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {(query || address) && (
              <>
                <button
                  onClick={handleClear}
                  className="min-h-[44px] min-w-[44px] rounded-full p-2.5 text-[var(--brand-ink-soft)] hover:bg-[rgba(203,188,174,0.18)] flex items-center justify-center"
                  title="지우기"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="h-3 w-px bg-[rgba(203,188,174,0.4)]" />
              </>
            )}
            <button
              onClick={handleCurrentLocation}
              disabled={isGeoLoading}
              className={`min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full transition-colors hover:bg-[rgba(203,188,174,0.18)] ${
                isGeoLoading ? 'text-[var(--brand-ink-soft)] animate-pulse' : 'text-[var(--brand-leaf)]'
              }`}
              title="내 위치 찾기"
            >
              <Crosshair className="w-4 h-4" />
            </button>
          </div>

          {/* Autocomplete Dropdown */}
          {isOpen && (
            <div className="fixed top-[var(--search-header-height,116px)] left-0 right-0 bottom-0 z-50 overflow-y-auto border-t border-white/70 bg-[var(--brand-page)] md:absolute md:top-full md:left-0 md:right-0 md:bottom-auto md:mt-2 md:h-auto md:overflow-hidden md:rounded-[1.6rem] md:border md:bg-white/95 md:shadow-[0_28px_60px_rgba(121,128,92,0.14)]">
              {/* 모바일 검색 결과 헤더 */}
              <div className="md:hidden sticky top-0 flex items-center justify-between border-b border-[rgba(203,188,174,0.24)] bg-[var(--brand-page)] px-4 py-3">
                <span className="text-sm font-medium text-[var(--brand-ink-soft)]">검색 결과</span>
                <button
                  onClick={() => setOpen(false)}
                  className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full text-[var(--brand-ink-soft)] hover:bg-white/70"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* 현재 위치 검색 옵션 */}
              <button
                onClick={handleCurrentLocation}
                disabled={isGeoLoading}
                className="flex w-full items-center gap-3 border-b border-[rgba(203,188,174,0.24)] px-4 py-3 text-left hover:bg-white/72"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[rgba(78,169,109,0.12)]">
                  <MapPin className="w-4 h-4 text-[var(--brand-leaf)]" />
                </div>
                <div>
                  <div className="font-medium text-[var(--brand-ink)]">
                    {isGeoLoading ? '위치 확인 중...' : '현재 위치로 검색'}
                  </div>
                  <div className="text-xs text-[var(--brand-ink-soft)]">현재 위치에서 검색</div>
                </div>
              </button>

              {/* 검색 결과 */}
              {isSearching ? (
                <div className="px-4 py-6 text-center text-gray-500">검색 중...</div>
              ) : (
                <>
                  {/* 유치원 검색 결과 */}
                  {kindergartenSuggestions.length > 0 && (
                    <div>
                      <div className="px-4 py-2 text-xs font-semibold text-gray-500 bg-gray-50 border-b border-gray-100">
                        유치원
                      </div>
                      <ul>
                        {kindergartenSuggestions.map((kindergarten) => (
                          <li key={kindergarten.kindercode}>
                            <button
                              onClick={() => handleSelectKindergarten(kindergarten)}
                              className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-white/72"
                            >
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                kindergarten.type === 'public'
                                  ? 'bg-emerald-100'
                                  : 'bg-indigo-100'
                              }`}>
                                <KindergartenIcon className={`w-4 h-4 ${
                                  kindergarten.type === 'public'
                                    ? 'text-emerald-600'
                                    : 'text-indigo-600'
                                }`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-[var(--brand-ink)] truncate">
                                  {kindergarten.name}
                                </div>
                                <div className="text-xs text-[var(--brand-ink-soft)] truncate">
                                  {kindergarten.address}
                                </div>
                              </div>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                kindergarten.type === 'public'
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-indigo-100 text-indigo-700'
                              }`}>
                                {kindergarten.type === 'public' ? '국공립' : '사립'}
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* 장소/주소 검색 결과 */}
                  {suggestions.length > 0 && (
                    <div>
                      <div className="px-4 py-2 text-xs font-semibold text-gray-500 bg-gray-50 border-b border-gray-100">
                        장소
                      </div>
                      <ul>
                        {suggestions.map((suggestion, index) => (
                          <li key={`${suggestion.lat}-${suggestion.lng}-${index}`}>
                            <button
                              onClick={() => handleSelectAddress(suggestion)}
                              className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-white/72"
                            >
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[rgba(203,188,174,0.18)]">
                                <MapPin className="w-4 h-4 text-[var(--brand-ink-soft)]" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-[var(--brand-ink)] truncate">
                                  {suggestion.placeName || suggestion.address}
                                </div>
                                {suggestion.placeName && (
                                  <div className="text-xs text-[var(--brand-ink-soft)] truncate">
                                    {suggestion.address}
                                  </div>
                                )}
                              </div>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* 검색 결과 없음 */}
                  {query.length >= 2 && suggestions.length === 0 && kindergartenSuggestions.length === 0 && (
                    <div className="px-4 py-6 text-center text-gray-500">
                      검색 결과가 없습니다
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Header Actions - 모바일: 찜목록만 표시 */}
        <button
          onClick={() => setFavoritesPanelOpen(true)}
          className="relative flex-shrink-0 rounded-2xl p-2 text-[var(--brand-ink-soft)] hover:bg-white/60 hover:text-[var(--brand-ink)] md:hidden"
        >
          <Heart className="w-5 h-5" />
          {hasMounted && favoriteCount > 0 ? (
            <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] min-w-4 h-4 rounded-full flex items-center justify-center font-bold px-1">
              {favoriteCount > 99 ? '99+' : favoriteCount}
            </span>
          ) : null}
        </button>

        {/* Header Actions - 데스크톱에서만 표시 */}
        <div className="hidden md:flex items-center gap-3 flex-shrink-0">
          <button
            onClick={() => setFavoritesPanelOpen(true)}
            className="relative flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium text-[var(--brand-ink-soft)] hover:bg-white/60 hover:text-[var(--brand-ink)]"
          >
            <Heart className="w-4 h-4" />
            찜한 목록
            {hasMounted && favoriteCount > 0 ? (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] min-w-5 h-5 rounded-full flex items-center justify-center font-bold px-1">
                {favoriteCount > 99 ? '99+' : favoriteCount}
              </span>
          ) : null}
          </button>
        </div>
      </div>

      {/* Filters (Scrollable) */}
      <div className="relative z-50 flex gap-2 overflow-x-auto overflow-y-visible border-t border-white/70 bg-white/44 px-4 py-3 hide-scrollbar md:px-5">
        {/* 반경 필터 버튼 */}
        <button
          ref={radiusButtonRef}
          onClick={() => {
            const newState = !isRadiusOpen;
            setIsRadiusOpen(newState);
            setIsTypeOpen(false);
            setBottomSheetOpen(newState);
          }}
          aria-haspopup="listbox"
          aria-expanded={isRadiusOpen}
          className={`flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-2 min-h-[36px] text-xs font-bold ${CHIP_ACTIVE}`}
        >
          {filters.radius}km <ChevronDown className={`w-3 h-3 transition-transform ${isRadiusOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* 기관 유형 필터 버튼 */}
        <button
          ref={typeButtonRef}
          onClick={() => {
            const newState = !isTypeOpen;
            setIsTypeOpen(newState);
            setIsRadiusOpen(false);
            setBottomSheetOpen(newState);
          }}
          aria-haspopup="listbox"
          aria-expanded={isTypeOpen}
          className={`flex items-center gap-1.5 px-3 py-2 min-h-[36px] rounded-full border text-xs font-medium whitespace-nowrap ${
            filters.type !== 'all'
              ? `${CHIP_ACTIVE} font-bold`
              : CHIP_INACTIVE
          }`}
        >
          {getTypeLabel(filters.type)}
          <ChevronDown className={`w-3 h-3 transition-transform ${isTypeOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* 토글형 필터 칩 */}
        {TOGGLE_FILTERS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => handleToggleFilter(key)}
            className={`flex items-center gap-1.5 px-3 py-2 min-h-[36px] rounded-full border text-xs font-medium whitespace-nowrap ${
              filters[key] === true ? CHIP_ACTIVE : CHIP_INACTIVE
            }`}
          >
            <Icon className="w-3.5 h-3.5" /> {label}
          </button>
        ))}
      </div>
        </div>
      </div>

      {/* Backdrop for search dropdown - positioned below header (hidden on mobile since dropdown is fullscreen) */}
      {isOpen && (
        <div
          className="hidden md:block fixed inset-x-0 top-[120px] bottom-0 z-40"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Backdrop for filter dropdowns - positioned below header */}
      {(isRadiusOpen || isTypeOpen) && (
        <div
          className="fixed inset-x-0 top-[120px] bottom-0 z-40"
          onClick={handleCloseDropdowns}
        />
      )}

      {/* 반경 필터 드롭다운 */}
      {isRadiusOpen && (
        <>
          {/* 모바일: 하단 시트 스타일 */}
          <div className="md:hidden fixed inset-x-0 bottom-0 bg-white rounded-t-2xl shadow-xl border-t border-gray-200 z-50 p-5 animate-slide-in-bottom">
            <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-4" />
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-gray-700">반경 설정</span>
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
              className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-500 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-emerald-500 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-md"
            />
            <div className="flex justify-between mt-2 text-xs text-gray-400">
              <span>{RADIUS_MIN}km</span>
              <span>{RADIUS_MAX}km</span>
            </div>
            <button
              onClick={handleCloseDropdowns}
              className="w-full mt-4 py-3 bg-emerald-600 text-white rounded-xl font-bold text-sm"
            >
              적용
            </button>
          </div>
          {/* 데스크톱: 기존 드롭다운 */}
          <div
            className="hidden md:block fixed bg-white rounded-xl shadow-xl border border-gray-200 z-50 p-4 min-w-[200px]"
            style={{ top: radiusDropdownPos.top, left: radiusDropdownPos.left }}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-gray-500">반경 설정</span>
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
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-500 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-emerald-500 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-md"
            />
            <div className="flex justify-between mt-2 text-xs text-gray-400">
              <span>{RADIUS_MIN}km</span>
              <span>{RADIUS_MAX}km</span>
            </div>
          </div>
        </>
      )}

      {/* 기관 유형 필터 드롭다운 */}
      {isTypeOpen && (
        <>
          {/* 모바일: 하단 시트 스타일 */}
          <div className="md:hidden fixed inset-x-0 bottom-0 bg-white rounded-t-2xl shadow-xl border-t border-gray-200 z-50 p-5 pb-10 animate-slide-in-bottom">
            <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-4" />
            <div className="text-sm font-medium text-gray-700 mb-3">유치원 종류</div>
            <p className="text-sm text-gray-500 mb-3">
              <span className="font-bold text-emerald-600">{getTypeLabel(filters.type)}</span>
            </p>
            <div className="space-y-2">
              {TYPE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleTypeChange(option.value)}
                  className={`w-full py-3 px-4 rounded-xl text-left text-sm font-medium transition-colors ${
                    filters.type === option.value
                      ? 'bg-emerald-50 text-emerald-700 border-2 border-emerald-500'
                      : 'bg-gray-50 text-gray-700 border-2 border-transparent'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          {/* 데스크톱: 기존 드롭다운 */}
          <div
            className="hidden md:block fixed bg-white rounded-lg shadow-xl border border-gray-200 z-50 min-w-[100px]"
            style={{ top: typeDropdownPos.top, left: typeDropdownPos.left }}
          >
            {TYPE_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => handleTypeChange(option.value)}
                className={`block w-full px-4 py-2 text-left text-sm hover:bg-gray-50 ${
                  filters.type === option.value ? 'text-emerald-600 font-bold' : 'text-gray-700'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </>
      )}

      {/* 찜한 목록 패널 */}
      <FavoritesPanel
        isOpen={isFavoritesPanelOpen}
        onClose={() => setFavoritesPanelOpen(false)}
      />
    </header>
  );
}

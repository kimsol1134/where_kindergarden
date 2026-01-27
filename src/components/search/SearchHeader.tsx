'use client';

import { useRef, useCallback, useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Search,
  X,
  Heart,
  User,
  SlidersHorizontal,
  ChevronDown,
  Bus,
  MapPin,
  UserCheck,
  Home,
  Maximize,
  Building2,
  Crosshair,
} from 'lucide-react';
import { KindergartenIcon } from '@/components/icons/KindergartenIcon';
import { useSearchStore, useFavoriteStore, useUIStore, type InstitutionFilter } from '@/stores';
import { useAddressSearch, useGeolocation, type KindergartenSearchResult } from '@/hooks';
import { RADIUS_MIN, RADIUS_MAX } from '@/types';
import { FavoritesPanel } from './FavoritesPanel';

export function SearchHeader() {
  const inputRef = useRef<HTMLInputElement>(null);
  const radiusButtonRef = useRef<HTMLButtonElement>(null);
  const typeButtonRef = useRef<HTMLButtonElement>(null);
  const [isRadiusOpen, setIsRadiusOpen] = useState(false);
  const [isTypeOpen, setIsTypeOpen] = useState(false);
  const [isFavoritesPanelOpen, setIsFavoritesPanelOpen] = useState(false);
  const [radiusDropdownPos, setRadiusDropdownPos] = useState({ top: 0, left: 0 });
  const [typeDropdownPos, setTypeDropdownPos] = useState({ top: 0, left: 0 });
  const [hasMounted, setHasMounted] = useState(false);

  // 찜하기 스토어 (hydration 이후에만 count 표시)
  const favoriteCount = useFavoriteStore(state => state.getItemCount());

  // UI 상태 관리 (광고와 BottomSheet 조율)
  const setBottomSheetOpen = useUIStore(state => state.setBottomSheetOpen);

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

  // 주소 선택 핸들러
  const handleSelectAddress = useCallback(
    (suggestion: typeof suggestions[0]) => {
      selectAddress(suggestion);
      setLocation({ lat: suggestion.lat, lng: suggestion.lng }, suggestion.address);
      search();
      inputRef.current?.blur();
    },
    [selectAddress, setLocation, search]
  );

  // 유치원 선택 핸들러
  const handleSelectKindergarten = useCallback(
    (kindergarten: KindergartenSearchResult) => {
      selectKindergarten(kindergarten);
      // 유치원 위치로 이동하고 검색
      setLocation({ lat: kindergarten.lat, lng: kindergarten.lng }, kindergarten.address);
      search();
      // 선택한 유치원의 상세 정보 표시
      setDetailId(kindergarten.kindercode);
      inputRef.current?.blur();
    },
    [selectKindergarten, setLocation, search, setDetailId]
  );

  // 현재 위치 검색
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

  // 반경 변경 핸들러 (슬라이더)
  const handleRadiusChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setRadius(Number(e.target.value));
    },
    [setRadius]
  );

  // 슬라이더에서 손을 뗐을 때 검색 실행
  const handleRadiusChangeEnd = useCallback(() => {
    search();
  }, [search]);

  // 유형 변경 핸들러
  const handleTypeChange = useCallback(
    (type: InstitutionFilter) => {
      setType(type);
      setIsTypeOpen(false);
      setBottomSheetOpen(false);
      search();
    },
    [setType, setBottomSheetOpen, search]
  );

  // 버스 필터 토글
  const handleBusToggle = useCallback(() => {
    setHasBus(filters.hasBus === true ? null : true);
  }, [setHasBus, filters.hasBus]);

  // 여유정원 필터 토글
  const handleVacancyToggle = useCallback(() => {
    setHasVacancy(filters.hasVacancy === true ? null : true);
  }, [setHasVacancy, filters.hasVacancy]);

  // 실내놀이터 필터 토글
  const handleIndoorPlaygroundToggle = useCallback(() => {
    setHasIndoorPlayground(filters.hasIndoorPlayground === true ? null : true);
  }, [setHasIndoorPlayground, filters.hasIndoorPlayground]);

  // 넓은 공간 필터 토글
  const handleLargeSpaceToggle = useCallback(() => {
    setHasLargeSpace(filters.hasLargeSpace === true ? null : true);
  }, [setHasLargeSpace, filters.hasLargeSpace]);

  // 최신 건물 필터 토글
  const handleModernBuildingToggle = useCallback(() => {
    setHasModernBuilding(filters.hasModernBuilding === true ? null : true);
  }, [setHasModernBuilding, filters.hasModernBuilding]);

  // 입력 초기화
  const handleClear = useCallback(() => {
    clearSelection();
    setAddress(''); // searchStore의 address도 초기화
    inputRef.current?.focus();
  }, [clearSelection, setAddress]);

  return (
    <header className="relative bg-white border-b border-gray-200 z-50 flex-none safe-area-top">
      <div className="max-w-[1920px] mx-auto px-4 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 flex-shrink-0">
          <Image
            src="/logo.png"
            alt="우리동네 유치원"
            width={40}
            height={40}
            className="rounded-lg"
          />
          <span className="text-lg font-bold tracking-tight text-gray-900 hidden md:block">
            우리동네 유치원
          </span>
        </Link>

        {/* Search Input */}
        <div className="flex-1 max-w-xl md:max-w-2xl relative group">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-emerald-500 transition-colors">
            <Search className="w-5 h-5" />
          </div>
          <input
            ref={inputRef}
            type="text"
            value={query || address}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => {
              if (suggestions.length > 0 || kindergartenSuggestions.length > 0) {
                setOpen(true);
              }
            }}
            className="w-full bg-gray-100 hover:bg-gray-50 focus:bg-white border border-transparent focus:border-emerald-500 rounded-full py-2.5 pl-10 pr-24 text-sm text-gray-900 placeholder:text-gray-500 transition-all outline-none shadow-sm"
            placeholder="주소, 유치원, 아파트 이름 검색"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {(query || address) && (
              <>
                <button
                  onClick={handleClear}
                  className="p-2.5 rounded-full hover:bg-gray-200 text-gray-400 min-w-[44px] min-h-[44px] flex items-center justify-center"
                  title="지우기"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="w-px h-3 bg-gray-300" />
              </>
            )}
            <button
              onClick={handleCurrentLocation}
              disabled={isGeoLoading}
              className={`p-1.5 rounded-full hover:bg-gray-200 transition-colors ${
                isGeoLoading ? 'text-gray-400 animate-pulse' : 'text-emerald-600'
              }`}
              title="내 위치 찾기"
            >
              <Crosshair className="w-4 h-4" />
            </button>
          </div>

          {/* Autocomplete Dropdown */}
          {isOpen && (
            <div className="fixed top-[116px] left-0 right-0 bottom-0 bg-white z-50 overflow-y-auto border-t border-gray-200 md:absolute md:top-full md:left-0 md:right-0 md:bottom-auto md:h-auto md:mt-2 md:rounded-xl md:shadow-xl md:border md:overflow-hidden">
              {/* 모바일 검색 결과 헤더 */}
              <div className="md:hidden sticky top-0 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">검색 결과</span>
                <button
                  onClick={() => setOpen(false)}
                  className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* 현재 위치 검색 옵션 */}
              <button
                onClick={handleCurrentLocation}
                disabled={isGeoLoading}
                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 text-left border-b border-gray-100"
              >
                <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
                  <MapPin className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <div className="font-medium text-gray-900">
                    {isGeoLoading ? '위치 확인 중...' : '현재 위치로 검색'}
                  </div>
                  <div className="text-xs text-gray-500">GPS를 사용하여 내 위치 찾기</div>
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
                              className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 text-left"
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
                                <div className="font-medium text-gray-900 truncate">
                                  {kindergarten.name}
                                </div>
                                <div className="text-xs text-gray-500 truncate">
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
                              className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 text-left"
                            >
                              <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                                <MapPin className="w-4 h-4 text-gray-400" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-gray-900 truncate">
                                  {suggestion.placeName || suggestion.address}
                                </div>
                                {suggestion.placeName && (
                                  <div className="text-xs text-gray-500 truncate">
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
          onClick={() => setIsFavoritesPanelOpen(true)}
          className="md:hidden relative p-2 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100 flex-shrink-0"
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
            onClick={() => setIsFavoritesPanelOpen(true)}
            className="relative flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 px-3 py-2 rounded-lg hover:bg-gray-100"
          >
            <Heart className="w-4 h-4" />
            찜한 목록
            {hasMounted && favoriteCount > 0 ? (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] min-w-5 h-5 rounded-full flex items-center justify-center font-bold px-1">
                {favoriteCount > 99 ? '99+' : favoriteCount}
              </span>
            ) : null}
          </button>
          <div className="h-6 w-px bg-gray-200" />
          <button className="flex items-center gap-2 text-sm font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-4 py-2 rounded-lg transition-colors">
            <User className="w-4 h-4" />
            로그인
          </button>
        </div>
      </div>

      {/* Filters (Scrollable) */}
      <div className="relative z-50 border-t border-gray-100 py-3 px-4 flex gap-2 overflow-x-auto overflow-y-visible hide-scrollbar bg-white">
        <button
          disabled
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gray-200 bg-gray-50 text-xs font-medium text-gray-400 cursor-not-allowed whitespace-nowrap"
          title="준비 중인 기능입니다"
        >
          <SlidersHorizontal className="w-3.5 h-3.5" /> 필터
        </button>
        <div className="w-px h-6 bg-gray-200 mx-1" />

        {/* 반경 필터 버튼 */}
        <button
          ref={radiusButtonRef}
          onClick={() => {
            const newState = !isRadiusOpen;
            setIsRadiusOpen(newState);
            setIsTypeOpen(false);
            setBottomSheetOpen(newState);
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-emerald-500 bg-emerald-50 text-emerald-700 text-xs font-bold whitespace-nowrap"
        >
          반경: {filters.radius}km <ChevronDown className={`w-3 h-3 transition-transform ${isRadiusOpen ? 'rotate-180' : ''}`} />
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
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium whitespace-nowrap ${
            filters.type !== 'all'
              ? 'border-emerald-500 bg-emerald-50 text-emerald-700 font-bold'
              : 'border-gray-200 bg-white text-gray-600 hover:border-gray-400'
          }`}
        >
          유형: {filters.type === 'all' ? '전체' : filters.type === 'public' ? '국공립' : '사립'}
          <ChevronDown className={`w-3 h-3 transition-transform ${isTypeOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* 셔틀버스 필터 */}
        <button
          onClick={handleBusToggle}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium whitespace-nowrap ${
            filters.hasBus === true
              ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
              : 'border-gray-200 bg-white text-gray-600 hover:border-gray-400'
          }`}
        >
          <Bus className="w-3.5 h-3.5" /> 셔틀버스
        </button>

        {/* 여유정원 필터 */}
        <button
          onClick={handleVacancyToggle}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium whitespace-nowrap ${
            filters.hasVacancy === true
              ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
              : 'border-gray-200 bg-white text-gray-600 hover:border-gray-400'
          }`}
        >
          <UserCheck className="w-3.5 h-3.5" /> 여유정원
        </button>

        {/* 실내놀이터 필터 */}
        <button
          onClick={handleIndoorPlaygroundToggle}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium whitespace-nowrap ${
            filters.hasIndoorPlayground === true
              ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
              : 'border-gray-200 bg-white text-gray-600 hover:border-gray-400'
          }`}
        >
          <Home className="w-3.5 h-3.5" /> 실내놀이터
        </button>

        {/* 넓은 공간 필터 */}
        <button
          onClick={handleLargeSpaceToggle}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium whitespace-nowrap ${
            filters.hasLargeSpace === true
              ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
              : 'border-gray-200 bg-white text-gray-600 hover:border-gray-400'
          }`}
        >
          <Maximize className="w-3.5 h-3.5" /> 넓은 공간
        </button>

        {/* 최신 건물 필터 */}
        <button
          onClick={handleModernBuildingToggle}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium whitespace-nowrap ${
            filters.hasModernBuilding === true
              ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
              : 'border-gray-200 bg-white text-gray-600 hover:border-gray-400'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" /> 최신건물
        </button>
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
          onClick={() => {
            setIsRadiusOpen(false);
            setIsTypeOpen(false);
            setBottomSheetOpen(false);
          }}
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
              onClick={() => {
                setIsRadiusOpen(false);
                setBottomSheetOpen(false);
              }}
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
            <div className="text-sm font-medium text-gray-700 mb-3">기관 유형</div>
            <div className="space-y-2">
              {[
                { value: 'all', label: '전체' },
                { value: 'public', label: '국공립' },
                { value: 'private', label: '사립' },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleTypeChange(option.value as InstitutionFilter)}
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
            <button
              onClick={() => handleTypeChange('all')}
              className={`block w-full px-4 py-2 text-left text-sm hover:bg-gray-50 ${
                filters.type === 'all' ? 'text-emerald-600 font-bold' : 'text-gray-700'
              }`}
            >
              전체
            </button>
            <button
              onClick={() => handleTypeChange('public')}
              className={`block w-full px-4 py-2 text-left text-sm hover:bg-gray-50 ${
                filters.type === 'public' ? 'text-emerald-600 font-bold' : 'text-gray-700'
              }`}
            >
              국공립
            </button>
            <button
              onClick={() => handleTypeChange('private')}
              className={`block w-full px-4 py-2 text-left text-sm hover:bg-gray-50 ${
                filters.type === 'private' ? 'text-emerald-600 font-bold' : 'text-gray-700'
              }`}
            >
              사립
            </button>
          </div>
        </>
      )}

      {/* 찜한 목록 패널 */}
      <FavoritesPanel
        isOpen={isFavoritesPanelOpen}
        onClose={() => setIsFavoritesPanelOpen(false)}
      />
    </header>
  );
}

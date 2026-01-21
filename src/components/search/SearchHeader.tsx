'use client';

import { useRef, useCallback, useState } from 'react';
import Link from 'next/link';
import {
  School,
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
} from 'lucide-react';
import { useSearchStore, type InstitutionFilter } from '@/stores';
import { useAddressSearch, useGeolocation, type KindergartenSearchResult } from '@/hooks';
import type { RadiusOption } from '@/types';

export function SearchHeader() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isRadiusOpen, setIsRadiusOpen] = useState(false);
  const [isTypeOpen, setIsTypeOpen] = useState(false);

  const {
    address,
    filters,
    setLocation,
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

  // 반경 변경 핸들러
  const handleRadiusChange = useCallback(
    (radius: RadiusOption) => {
      setRadius(radius);
      setIsRadiusOpen(false);
      search();
    },
    [setRadius, search]
  );

  // 유형 변경 핸들러
  const handleTypeChange = useCallback(
    (type: InstitutionFilter) => {
      setType(type);
      setIsTypeOpen(false);
      search();
    },
    [setType, search]
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
    inputRef.current?.focus();
  }, [clearSelection]);

  return (
    <header className="bg-white border-b border-gray-200 z-30 flex-none">
      <div className="max-w-[1920px] mx-auto px-4 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 flex-shrink-0">
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center text-white">
            <School className="w-5 h-5" />
          </div>
          <span className="text-lg font-bold tracking-tight text-gray-900 hidden md:block">
            우리동네 유치원
          </span>
        </Link>

        {/* Search Input */}
        <div className="flex-1 max-w-xl relative group">
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
            className="w-full bg-gray-100 hover:bg-gray-50 focus:bg-white border border-transparent focus:border-emerald-500 rounded-full py-2.5 pl-10 pr-12 text-sm transition-all outline-none shadow-sm"
            placeholder="지역, 기관명으로 검색해보세요"
          />
          {(query || address) && (
            <button
              onClick={handleClear}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full hover:bg-gray-200 text-gray-400"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {/* Autocomplete Dropdown */}
          {isOpen && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden z-50">
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
                              <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
                                <School className="w-4 h-4 text-emerald-600" />
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
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-orange-100 text-orange-700'
                              }`}>
                                {kindergarten.type === 'public' ? '공립' : '사립'}
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* 주소 검색 결과 */}
                  {suggestions.length > 0 && (
                    <div>
                      <div className="px-4 py-2 text-xs font-semibold text-gray-500 bg-gray-50 border-b border-gray-100">
                        주소
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
                                  {suggestion.address}
                                </div>
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

        {/* Header Actions */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <button className="hidden md:flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 px-3 py-2 rounded-lg hover:bg-gray-100">
            <Heart className="w-4 h-4" />
            찜한 목록
          </button>
          <div className="h-6 w-px bg-gray-200 hidden md:block" />
          <button className="flex items-center gap-2 text-sm font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-4 py-2 rounded-lg transition-colors">
            <User className="w-4 h-4" />
            로그인
          </button>
        </div>
      </div>

      {/* Filters (Scrollable) */}
      <div className="relative z-50 border-t border-gray-100 py-3 px-4 flex gap-2 overflow-x-auto hide-scrollbar bg-white">
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gray-300 bg-white text-xs font-medium hover:border-gray-800 hover:bg-gray-50 transition-colors whitespace-nowrap">
          <SlidersHorizontal className="w-3.5 h-3.5" /> 필터
        </button>
        <div className="w-px h-6 bg-gray-200 mx-1" />

        {/* 반경 필터 */}
        <div className="relative">
          <button
            onClick={() => {
              setIsRadiusOpen(!isRadiusOpen);
              setIsTypeOpen(false);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-emerald-500 bg-emerald-50 text-emerald-700 text-xs font-bold whitespace-nowrap"
          >
            반경: {filters.radius}km <ChevronDown className="w-3 h-3" />
          </button>
          {isRadiusOpen && (
            <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-xl border border-gray-200 z-50 min-w-[80px]">
              {[1, 2, 5].map((r) => (
                <button
                  key={r}
                  onClick={() => handleRadiusChange(r as RadiusOption)}
                  className={`block w-full px-4 py-2 text-left text-sm hover:bg-gray-50 ${
                    filters.radius === r ? 'text-emerald-600 font-bold' : 'text-gray-700'
                  }`}
                >
                  {r}km
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 기관 유형 필터 */}
        <div className="relative">
          <button
            onClick={() => {
              setIsTypeOpen(!isTypeOpen);
              setIsRadiusOpen(false);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium whitespace-nowrap ${
              filters.type !== 'all'
                ? 'border-emerald-500 bg-emerald-50 text-emerald-700 font-bold'
                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-400'
            }`}
          >
            유형: {filters.type === 'all' ? '전체' : filters.type === 'kindergarten' ? '유치원' : '어린이집'}
            <ChevronDown className="w-3 h-3" />
          </button>
          {isTypeOpen && (
            <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-xl border border-gray-200 z-50 min-w-[100px]">
              <button
                onClick={() => handleTypeChange('all')}
                className={`block w-full px-4 py-2 text-left text-sm hover:bg-gray-50 ${
                  filters.type === 'all' ? 'text-emerald-600 font-bold' : 'text-gray-700'
                }`}
              >
                전체
              </button>
              <button
                onClick={() => handleTypeChange('kindergarten')}
                className={`block w-full px-4 py-2 text-left text-sm hover:bg-gray-50 ${
                  filters.type === 'kindergarten' ? 'text-emerald-600 font-bold' : 'text-gray-700'
                }`}
              >
                유치원
              </button>
              <button
                onClick={() => handleTypeChange('daycare')}
                className={`block w-full px-4 py-2 text-left text-sm hover:bg-gray-50 ${
                  filters.type === 'daycare' ? 'text-emerald-600 font-bold' : 'text-gray-700'
                }`}
              >
                어린이집
              </button>
            </div>
          )}
        </div>

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

      {/* Backdrop for search dropdown */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Backdrop for filter dropdowns */}
      {(isRadiusOpen || isTypeOpen) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setIsRadiusOpen(false);
            setIsTypeOpen(false);
          }}
        />
      )}
    </header>
  );
}

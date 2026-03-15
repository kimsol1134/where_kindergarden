'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useSearchStore } from '@/stores/searchStore';
import type { RadiusOption } from '@/types';
import { RADIUS_DEFAULT } from '@/types';
import type { InstitutionFilter, SortOption, ViewMode } from '@/stores/searchStore';

/** URL 파라미터 키 */
const URL_PARAMS = {
  LAT: 'lat',
  LNG: 'lng',
  ADDRESS: 'address',
  RADIUS: 'radius',
  TYPE: 'type',
  HAS_BUS: 'hasBus',
  HAS_VACANCY: 'hasVacancy',
  HAS_INDOOR_PLAYGROUND: 'hasIndoorPlayground',
  HAS_LARGE_SPACE: 'hasLargeSpace',
  HAS_MODERN_BUILDING: 'hasModernBuilding',
  SORT: 'sort',
  VIEW: 'view',
  SELECTED: 'selected',
  MODE: 'mode',
} as const;

/**
 * URL 파라미터와 스토어 상태를 동기화하는 훅
 */
export function useURLSync() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isInitializedRef = useRef(false);

  const {
    location,
    address,
    filters,
    sortBy,
    viewMode,
    selectedId,
    setLocation,
    setRadius,
    setType,
    applyFilters,
    setSortBy,
    setViewMode,
    setSelectedId,
    search,
  } = useSearchStore();

  // URL에서 상태 초기화 (최초 마운트 시)
  useEffect(() => {
    if (isInitializedRef.current) return;
    isInitializedRef.current = true;

    const lat = searchParams.get(URL_PARAMS.LAT);
    const lng = searchParams.get(URL_PARAMS.LNG);
    const addressParam = searchParams.get(URL_PARAMS.ADDRESS);
    const radius = searchParams.get(URL_PARAMS.RADIUS);
    const type = searchParams.get(URL_PARAMS.TYPE);
    const hasBus = searchParams.get(URL_PARAMS.HAS_BUS);
    const hasVacancy = searchParams.get(URL_PARAMS.HAS_VACANCY);
    const hasIndoorPlayground = searchParams.get(URL_PARAMS.HAS_INDOOR_PLAYGROUND);
    const hasLargeSpace = searchParams.get(URL_PARAMS.HAS_LARGE_SPACE);
    const hasModernBuilding = searchParams.get(URL_PARAMS.HAS_MODERN_BUILDING);
    const sort = searchParams.get(URL_PARAMS.SORT);
    const view = searchParams.get(URL_PARAMS.VIEW);
    const selected = searchParams.get(URL_PARAMS.SELECTED);

    // 위치 복원
    if (lat && lng) {
      const parsedLat = parseFloat(lat);
      const parsedLng = parseFloat(lng);
      if (!isNaN(parsedLat) && !isNaN(parsedLng)) {
        setLocation({ lat: parsedLat, lng: parsedLng }, addressParam ?? '');
      }
    }

    // 필터 복원
    if (radius && isValidRadius(radius)) {
      setRadius(parseInt(radius, 10) as RadiusOption);
    }

    if (type && isValidType(type)) {
      setType(type);
    }

    applyFilters({
      hasBus: parseBooleanParam(hasBus),
      hasVacancy: parseBooleanParam(hasVacancy),
      hasIndoorPlayground: parseBooleanParam(hasIndoorPlayground),
      hasLargeSpace: parseBooleanParam(hasLargeSpace),
      hasModernBuilding: parseBooleanParam(hasModernBuilding),
    });

    // 정렬 복원
    if (sort && isValidSort(sort)) {
      setSortBy(sort);
    }

    // 뷰 모드 복원
    if (view && isValidViewMode(view)) {
      setViewMode(view);
    }

    // 선택된 아이템 복원
    if (selected) {
      setSelectedId(selected);
    }

    // 위치가 있으면 검색 실행
    if (lat && lng) {
      // 약간의 지연 후 검색 (상태 업데이트 완료 후)
      setTimeout(() => {
        search();
      }, 0);
    }
  }, [
    searchParams,
    setLocation,
    setRadius,
    setType,
    applyFilters,
    setSortBy,
    setViewMode,
    setSelectedId,
    search,
  ]);

  // 상태 변경 시 URL 업데이트
  const updateURL = useCallback(() => {
    const params = new URLSearchParams();

    if (location) {
      params.set(URL_PARAMS.LAT, String(location.lat));
      params.set(URL_PARAMS.LNG, String(location.lng));
    }

    if (address) {
      params.set(URL_PARAMS.ADDRESS, address);
    }

    if (filters.radius !== RADIUS_DEFAULT) {
      params.set(URL_PARAMS.RADIUS, String(filters.radius));
    }

    if (filters.type !== 'all') {
      params.set(URL_PARAMS.TYPE, filters.type);
    }

    if (filters.hasBus === true) {
      params.set(URL_PARAMS.HAS_BUS, '1');
    }

    if (filters.hasVacancy === true) {
      params.set(URL_PARAMS.HAS_VACANCY, '1');
    }

    if (filters.hasIndoorPlayground === true) {
      params.set(URL_PARAMS.HAS_INDOOR_PLAYGROUND, '1');
    }

    if (filters.hasLargeSpace === true) {
      params.set(URL_PARAMS.HAS_LARGE_SPACE, '1');
    }

    if (filters.hasModernBuilding === true) {
      params.set(URL_PARAMS.HAS_MODERN_BUILDING, '1');
    }

    if (sortBy !== 'distance') {
      params.set(URL_PARAMS.SORT, sortBy);
    }

    if (viewMode !== 'split') {
      params.set(URL_PARAMS.VIEW, viewMode);
    }

    if (selectedId) {
      params.set(URL_PARAMS.SELECTED, selectedId);
    }

    const queryString = params.toString();
    const newUrl = queryString ? `${pathname}?${queryString}` : pathname;

    // replace를 사용하여 히스토리 스택이 쌓이지 않도록 함
    router.replace(newUrl, { scroll: false });
  }, [location, address, filters, sortBy, viewMode, selectedId, pathname, router]);

  // location, filters, sortBy, viewMode, selectedId 변경 시 URL 업데이트
  useEffect(() => {
    // 초기화 전에는 URL 업데이트 안 함
    if (!isInitializedRef.current) return;

    updateURL();
  }, [
    location,
    address,
    filters.radius,
    filters.type,
    filters.hasBus,
    filters.hasVacancy,
    filters.hasIndoorPlayground,
    filters.hasLargeSpace,
    filters.hasModernBuilding,
    sortBy,
    viewMode,
    selectedId,
    updateURL,
  ]);

  // 검색 모드 확인 (mode=location은 현재 위치 검색 트리거용)
  const getSearchMode = useCallback((): 'location' | 'address' | null => {
    const mode = searchParams.get(URL_PARAMS.MODE);
    if (mode === 'location') return 'location';
    if (mode === 'address') return 'address';
    return null;
  }, [searchParams]);

  return {
    updateURL,
    getSearchMode,
  };
}

// 타입 가드 함수들
function isValidRadius(value: string): boolean {
  const num = parseInt(value, 10);
  return num === 1 || num === 2 || num === 3 || num === 5;
}

function isValidType(value: string): value is InstitutionFilter {
  return value === 'all' || value === 'public' || value === 'private';
}

function isValidSort(value: string): value is SortOption {
  return value === 'distance' || value === 'capacity' || value === 'areaPerChild';
}

function isValidViewMode(value: string): value is ViewMode {
  return value === 'list' || value === 'map' || value === 'split';
}

function parseBooleanParam(value: string | null): boolean | null {
  if (value === '1' || value === 'true') {
    return true;
  }

  return null;
}

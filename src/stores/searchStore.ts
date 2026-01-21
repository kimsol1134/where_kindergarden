import { create } from 'zustand';
import type { Coordinates, Kindergarten, RadiusOption } from '@/types';
import { useKindergartenStore, type KindergartenRaw } from './kindergartenStore';
import { calculateDistance } from '@/lib/geo';

/**
 * KindergartenRaw를 Kindergarten 타입으로 변환하고 거리 계산
 */
function transformToKindergarten(
  raw: KindergartenRaw,
  userLocation: Coordinates
): Kindergarten {
  const distance =
    Math.round(
      calculateDistance(userLocation, { lat: raw.lat, lng: raw.lng }) * 100
    ) / 100;

  return {
    kindercode: raw.kindercode,
    name: raw.name,
    type: raw.type,
    address: raw.address,
    lat: raw.lat,
    lng: raw.lng,
    distance,
    capacity: raw.capacity,
    currentCount: raw.current_count,
    hasBus: raw.has_bus,
    busCount: raw.bus_count,
    mealType: raw.meal_type ?? 'none',
    hasAfterSchool: raw.has_after_school,
    areaPerChild: raw.area_per_child,
    phone: raw.phone ?? undefined,
    hasPlayground: raw.has_playground,
  };
}

/** 기관 유형 필터 */
export type InstitutionFilter = 'all' | 'kindergarten' | 'daycare';

/** 정렬 옵션 */
export type SortOption = 'distance' | 'capacity' | 'areaPerChild';

/** 뷰 모드 */
export type ViewMode = 'list' | 'map' | 'split';

/** 검색 필터 */
export interface SearchFilters {
  radius: RadiusOption;
  type: InstitutionFilter;
  hasBus: boolean | null;
  hasAfterSchool: boolean | null;
}

/** 검색 스토어 상태 */
interface SearchState {
  // 위치 정보
  location: Coordinates | null;
  address: string;

  // 검색 결과
  results: Kindergarten[];
  totalCount: number;
  isLoading: boolean;
  error: string | null;

  // 필터 및 정렬
  filters: SearchFilters;
  sortBy: SortOption;

  // UI 상태
  viewMode: ViewMode;
  selectedId: string | null;
}

/** 검색 스토어 액션 */
interface SearchActions {
  // 위치 관련
  setLocation: (location: Coordinates, address?: string) => void;
  setAddress: (address: string) => void;
  clearLocation: () => void;

  // 검색
  search: () => Promise<void>;
  setResults: (results: Kindergarten[], count: number) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;

  // 필터
  setRadius: (radius: RadiusOption) => void;
  setType: (type: InstitutionFilter) => void;
  setHasBus: (hasBus: boolean | null) => void;
  setHasAfterSchool: (hasAfterSchool: boolean | null) => void;
  resetFilters: () => void;

  // 정렬
  setSortBy: (sortBy: SortOption) => void;

  // UI
  setViewMode: (mode: ViewMode) => void;
  setSelectedId: (id: string | null) => void;

  // 유틸리티
  getFilteredAndSortedResults: () => Kindergarten[];
  reset: () => void;
}

const DEFAULT_FILTERS: SearchFilters = {
  radius: 1,
  type: 'all',
  hasBus: null,
  hasAfterSchool: null,
};

const initialState: SearchState = {
  location: null,
  address: '',
  results: [],
  totalCount: 0,
  isLoading: false,
  error: null,
  filters: DEFAULT_FILTERS,
  sortBy: 'distance',
  viewMode: 'split',
  selectedId: null,
};

export const useSearchStore = create<SearchState & SearchActions>((set, get) => ({
  ...initialState,

  // 위치 관련 액션
  setLocation: (location, address = '') => {
    set({ location, address, error: null });
  },

  setAddress: (address) => {
    set({ address });
  },

  clearLocation: () => {
    set({ location: null, address: '', results: [], totalCount: 0 });
  },

  // 검색 액션
  search: async () => {
    const { location, filters } = get();

    if (!location) {
      set({ error: '위치 정보가 필요합니다.' });
      return;
    }

    set({ isLoading: true, error: null });

    try {
      // kindergartenStore에서 데이터 로드 확인
      const kindergartenStore = useKindergartenStore.getState();

      if (!kindergartenStore.isLoaded) {
        await kindergartenStore.loadData();
      }

      const allData = kindergartenStore.getAll();

      if (allData.length === 0) {
        set({
          error: kindergartenStore.error || '데이터를 로드할 수 없습니다.',
          isLoading: false,
        });
        return;
      }

      // 거리 계산 및 반경 필터링
      const results: Kindergarten[] = allData
        .map((item) => transformToKindergarten(item, location))
        .filter((item) => item.distance <= filters.radius)
        .toSorted((a, b) => a.distance - b.distance);

      set({
        results,
        totalCount: results.length,
        isLoading: false,
        error: null,
      });
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : '검색 중 오류가 발생했습니다.';
      set({ error: errorMessage, isLoading: false });
    }
  },

  setResults: (results, count) => {
    set({ results, totalCount: count });
  },

  setLoading: (isLoading) => {
    set({ isLoading });
  },

  setError: (error) => {
    set({ error });
  },

  // 필터 액션
  setRadius: (radius) => {
    set((state) => ({
      filters: { ...state.filters, radius },
    }));
  },

  setType: (type) => {
    set((state) => ({
      filters: { ...state.filters, type },
    }));
  },

  setHasBus: (hasBus) => {
    set((state) => ({
      filters: { ...state.filters, hasBus },
    }));
  },

  setHasAfterSchool: (hasAfterSchool) => {
    set((state) => ({
      filters: { ...state.filters, hasAfterSchool },
    }));
  },

  resetFilters: () => {
    set({ filters: DEFAULT_FILTERS });
  },

  // 정렬 액션
  setSortBy: (sortBy) => {
    set({ sortBy });
  },

  // UI 액션
  setViewMode: (mode) => {
    set({ viewMode: mode });
  },

  setSelectedId: (id) => {
    set({ selectedId: id });
  },

  // 필터링 및 정렬된 결과 반환
  getFilteredAndSortedResults: () => {
    const { results, filters, sortBy } = get();

    // 클라이언트 측 필터링 (버스, 방과후 등)
    let filtered = results;

    if (filters.hasBus !== null) {
      filtered = filtered.filter((k) => k.hasBus === filters.hasBus);
    }

    if (filters.hasAfterSchool !== null) {
      filtered = filtered.filter((k) => k.hasAfterSchool === filters.hasAfterSchool);
    }

    // 정렬 (toSorted 사용 - 원본 배열 불변성 유지)
    const sorted = filtered.toSorted((a, b) => {
      switch (sortBy) {
        case 'distance':
          return a.distance - b.distance;
        case 'capacity':
          return b.capacity - a.capacity;
        case 'areaPerChild':
          return b.areaPerChild - a.areaPerChild;
        default:
          return 0;
      }
    });

    return sorted;
  },

  // 리셋
  reset: () => {
    set(initialState);
  },
}));

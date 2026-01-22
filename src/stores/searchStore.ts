import { create } from 'zustand';
import type { Coordinates, Kindergarten, RadiusOption } from '@/types';
import { RADIUS_DEFAULT } from '@/types';
import { useKindergartenStore } from './kindergartenStore';
import { transformWithRawDistance } from '@/lib/transforms';

/** 기관 유형 필터 (공립/사립) */
export type InstitutionFilter = 'all' | 'public' | 'private';

/** 정렬 옵션 */
export type SortOption = 'distance' | 'capacity' | 'areaPerChild';

/** 뷰 모드 */
export type ViewMode = 'list' | 'map' | 'split';

/** 검색 필터 */
export interface SearchFilters {
  radius: RadiusOption;
  type: InstitutionFilter;
  hasBus: boolean | null;
  hasVacancy: boolean | null; // 여유정원 있음
  hasIndoorPlayground: boolean | null; // 실내놀이터
  hasLargeSpace: boolean | null; // 넓은 공간 (1인당 5㎡ 이상)
  hasModernBuilding: boolean | null; // 최신 건물 (2010년 이후)
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
  detailId: string | null; // 상세 패널에 표시할 유치원 ID
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
  setHasVacancy: (hasVacancy: boolean | null) => void;
  setHasIndoorPlayground: (hasIndoorPlayground: boolean | null) => void;
  setHasLargeSpace: (hasLargeSpace: boolean | null) => void;
  setHasModernBuilding: (hasModernBuilding: boolean | null) => void;
  resetFilters: () => void;

  // 정렬
  setSortBy: (sortBy: SortOption) => void;

  // UI
  setViewMode: (mode: ViewMode) => void;
  setSelectedId: (id: string | null) => void;
  setDetailId: (id: string | null) => void;
  getDetailKindergarten: () => Kindergarten | null;

  // 유틸리티
  getFilteredAndSortedResults: () => Kindergarten[];
  reset: () => void;
}

const DEFAULT_FILTERS: SearchFilters = {
  radius: RADIUS_DEFAULT,
  type: 'all',
  hasBus: null,
  hasVacancy: null,
  hasIndoorPlayground: null,
  hasLargeSpace: null,
  hasModernBuilding: null,
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
  detailId: null,
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
      // 원본 거리로 필터링 후 반올림된 거리를 사용 (경계값 문제 해결)
      const withDistance = allData.map((item) => transformWithRawDistance(item, location));
      const filtered = withDistance.filter(({ rawDistance }) => rawDistance <= filters.radius);
      const results: Kindergarten[] = filtered.map(({ kindergarten }) => kindergarten);
      // 정렬은 getFilteredAndSortedResults()에서 처리

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

  setHasVacancy: (hasVacancy) => {
    set((state) => ({
      filters: { ...state.filters, hasVacancy },
    }));
  },

  setHasIndoorPlayground: (hasIndoorPlayground) => {
    set((state) => ({
      filters: { ...state.filters, hasIndoorPlayground },
    }));
  },

  setHasLargeSpace: (hasLargeSpace) => {
    set((state) => ({
      filters: { ...state.filters, hasLargeSpace },
    }));
  },

  setHasModernBuilding: (hasModernBuilding) => {
    set((state) => ({
      filters: { ...state.filters, hasModernBuilding },
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

  setDetailId: (id) => {
    set({ detailId: id, selectedId: id });
  },

  getDetailKindergarten: () => {
    const { results, detailId } = get();
    if (!detailId) return null;
    return results.find((k) => k.kindercode === detailId) ?? null;
  },

  // 필터링 및 정렬된 결과 반환
  getFilteredAndSortedResults: () => {
    const { results, filters, sortBy } = get();

    // 클라이언트 측 필터링
    let filtered = results;

    // 유형 필터 (공립/사립)
    if (filters.type !== 'all') {
      filtered = filtered.filter((k) => k.type === filters.type);
    }

    if (filters.hasBus !== null) {
      filtered = filtered.filter((k) => k.hasBus === filters.hasBus);
    }

    // 여유정원 필터 (capacity > currentCount)
    if (filters.hasVacancy === true) {
      filtered = filtered.filter((k) => k.capacity > k.currentCount);
    }

    // 실내놀이터 필터 (indoorPlaygroundArea > 0)
    if (filters.hasIndoorPlayground === true) {
      filtered = filtered.filter((k) => k.indoorPlaygroundArea > 0);
    }

    // 넓은 공간 필터 (areaPerChild >= 5)
    if (filters.hasLargeSpace === true) {
      filtered = filtered.filter((k) => k.areaPerChild >= 5);
    }

    // 최신 건물 필터 (buildingYear >= 2010)
    if (filters.hasModernBuilding === true) {
      filtered = filtered.filter(
        (k) => k.buildingYear !== null && k.buildingYear >= 2010
      );
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

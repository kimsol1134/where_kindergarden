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

/** 검색 상태 */
export type SearchStatus =
  | 'idle'
  | 'locating'
  | 'results'
  | 'empty'
  | 'filtered_empty'
  | 'error';

/** 검색 필터 */
export interface SearchFilters {
  radius: RadiusOption;
  type: InstitutionFilter;
  hasBus: boolean | null;
  hasVacancy: boolean | null;
  hasIndoorPlayground: boolean | null;
  hasLargeSpace: boolean | null;
  hasModernBuilding: boolean | null;
}

/** 검색 스토어 상태 */
interface SearchState {
  location: Coordinates | null;
  address: string;
  results: Kindergarten[];
  totalCount: number;
  isLoading: boolean;
  error: string | null;
  filters: SearchFilters;
  sortBy: SortOption;
  viewMode: ViewMode;
  selectedId: string | null;
  detailId: string | null;
  status: SearchStatus;
  hasSearched: boolean;
}

/** 검색 스토어 액션 */
interface SearchActions {
  setLocation: (location: Coordinates, address?: string) => void;
  setAddress: (address: string) => void;
  clearQuery: () => void;
  clearLocation: () => void;
  clearSearchSession: () => void;
  startLocationSearch: () => void;
  search: () => Promise<void>;
  setResults: (results: Kindergarten[], count: number) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  setRadius: (radius: RadiusOption) => void;
  setType: (type: InstitutionFilter) => void;
  setHasBus: (hasBus: boolean | null) => void;
  setHasVacancy: (hasVacancy: boolean | null) => void;
  setHasIndoorPlayground: (hasIndoorPlayground: boolean | null) => void;
  setHasLargeSpace: (hasLargeSpace: boolean | null) => void;
  setHasModernBuilding: (hasModernBuilding: boolean | null) => void;
  applyFilters: (updates: Partial<SearchFilters>) => void;
  resetFilters: () => void;
  setSortBy: (sortBy: SortOption) => void;
  setViewMode: (mode: ViewMode) => void;
  setSelectedId: (id: string | null) => void;
  setDetailId: (id: string | null) => void;
  getDetailKindergarten: () => Kindergarten | null;
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
  status: 'idle',
  hasSearched: false,
};

function applyClientFilters(results: Kindergarten[], filters: SearchFilters): Kindergarten[] {
  let filtered = results;

  if (filters.type !== 'all') {
    filtered = filtered.filter((kindergarten) => kindergarten.type === filters.type);
  }

  if (filters.hasBus !== null) {
    filtered = filtered.filter((kindergarten) => kindergarten.hasBus === filters.hasBus);
  }

  if (filters.hasVacancy === true) {
    filtered = filtered.filter(
      (kindergarten) => kindergarten.capacity > kindergarten.currentCount
    );
  }

  if (filters.hasIndoorPlayground === true) {
    filtered = filtered.filter((kindergarten) => kindergarten.indoorPlaygroundArea > 0);
  }

  if (filters.hasLargeSpace === true) {
    filtered = filtered.filter((kindergarten) => kindergarten.areaPerChild >= 5);
  }

  if (filters.hasModernBuilding === true) {
    filtered = filtered.filter(
      (kindergarten) =>
        kindergarten.buildingYear !== null && kindergarten.buildingYear >= 2010
    );
  }

  return filtered;
}

function sortResults(results: Kindergarten[], sortBy: SortOption): Kindergarten[] {
  return results.toSorted((left, right) => {
    switch (sortBy) {
      case 'distance': {
        const leftDistance = left.distance ?? Number.POSITIVE_INFINITY;
        const rightDistance = right.distance ?? Number.POSITIVE_INFINITY;
        return leftDistance - rightDistance;
      }
      case 'capacity':
        return right.capacity - left.capacity;
      case 'areaPerChild':
        return right.areaPerChild - left.areaPerChild;
      default:
        return 0;
    }
  });
}

function deriveStatus(state: SearchState): SearchStatus {
  if (state.error) {
    return 'error';
  }

  if (state.status === 'locating' && state.location === null) {
    return 'locating';
  }

  if (!state.hasSearched) {
    return 'idle';
  }

  if (state.totalCount === 0) {
    return 'empty';
  }

  const filteredCount = applyClientFilters(state.results, state.filters).length;
  if (filteredCount === 0) {
    return 'filtered_empty';
  }

  return 'results';
}

function updateDerivedState(
  partial: Partial<SearchState>,
  previous: SearchState
): Partial<SearchState> {
  const nextState: SearchState = {
    ...previous,
    ...partial,
  };

  return {
    ...partial,
    status: deriveStatus(nextState),
  };
}

export const useSearchStore = create<SearchState & SearchActions>((set, get) => ({
  ...initialState,

  setLocation: (location, address = '') => {
    set((state) =>
      updateDerivedState(
        {
          location,
          address,
          error: null,
        },
        state
      )
    );
  },

  setAddress: (address) => {
    set({ address });
  },

  clearQuery: () => {
    set({ address: '' });
  },

  clearLocation: () => {
    set({
      location: null,
      address: '',
      results: [],
      totalCount: 0,
      selectedId: null,
      detailId: null,
      hasSearched: false,
      status: 'idle',
      error: null,
    });
  },

  clearSearchSession: () => {
    set({
      ...initialState,
      filters: { ...DEFAULT_FILTERS },
    });
  },

  startLocationSearch: () => {
    set((state) => ({
      ...state,
      status: 'locating',
      error: null,
      isLoading: false,
      selectedId: null,
      detailId: null,
    }));
  },

  search: async () => {
    const { location, filters } = get();

    if (!location) {
      set((state) =>
        updateDerivedState(
          {
            error: '위치 정보가 필요합니다.',
          },
          state
        )
      );
      return;
    }

    set((state) => ({
      ...state,
      isLoading: true,
      error: null,
    }));

    try {
      const kindergartenStore = useKindergartenStore.getState();

      if (!kindergartenStore.isLoaded) {
        await kindergartenStore.loadData();
      }

      const allData = kindergartenStore.getAll();

      if (allData.length === 0) {
        set((state) =>
          updateDerivedState(
            {
              error: kindergartenStore.error || '데이터를 로드할 수 없습니다.',
              isLoading: false,
            },
            state
          )
        );
        return;
      }

      const withDistance = allData.map((item) => transformWithRawDistance(item, location));
      const filtered = withDistance.filter(({ rawDistance }) => rawDistance <= filters.radius);
      const results: Kindergarten[] = filtered.map(({ kindergarten }) => kindergarten);

      set((state) =>
        updateDerivedState(
          {
            results,
            totalCount: results.length,
            isLoading: false,
            error: null,
            hasSearched: true,
            selectedId: results.some((item) => item.kindercode === state.selectedId)
              ? state.selectedId
              : null,
            detailId: results.some((item) => item.kindercode === state.detailId)
              ? state.detailId
              : null,
          },
          state
        )
      );
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : '검색 중 오류가 발생했습니다.';

      set((state) =>
        updateDerivedState(
          {
            error: errorMessage,
            isLoading: false,
          },
          state
        )
      );
    }
  },

  setResults: (results, count) => {
    set((state) =>
      updateDerivedState(
        {
          results,
          totalCount: count,
          hasSearched: true,
        },
        state
      )
    );
  },

  setLoading: (isLoading) => {
    set({ isLoading });
  },

  setError: (error) => {
    set((state) => updateDerivedState({ error }, state));
  },

  setRadius: (radius) => {
    set((state) =>
      updateDerivedState(
        {
          filters: { ...state.filters, radius },
        },
        state
      )
    );
  },

  setType: (type) => {
    set((state) =>
      updateDerivedState(
        {
          filters: { ...state.filters, type },
        },
        state
      )
    );
  },

  setHasBus: (hasBus) => {
    set((state) =>
      updateDerivedState(
        {
          filters: { ...state.filters, hasBus },
        },
        state
      )
    );
  },

  setHasVacancy: (hasVacancy) => {
    set((state) =>
      updateDerivedState(
        {
          filters: { ...state.filters, hasVacancy },
        },
        state
      )
    );
  },

  setHasIndoorPlayground: (hasIndoorPlayground) => {
    set((state) =>
      updateDerivedState(
        {
          filters: { ...state.filters, hasIndoorPlayground },
        },
        state
      )
    );
  },

  setHasLargeSpace: (hasLargeSpace) => {
    set((state) =>
      updateDerivedState(
        {
          filters: { ...state.filters, hasLargeSpace },
        },
        state
      )
    );
  },

  setHasModernBuilding: (hasModernBuilding) => {
    set((state) =>
      updateDerivedState(
        {
          filters: { ...state.filters, hasModernBuilding },
        },
        state
      )
    );
  },

  applyFilters: (updates) => {
    set((state) =>
      updateDerivedState(
        {
          filters: { ...state.filters, ...updates },
        },
        state
      )
    );
  },

  resetFilters: () => {
    set((state) =>
      updateDerivedState(
        {
          filters: { ...DEFAULT_FILTERS },
          sortBy: 'distance',
        },
        state
      )
    );
  },

  setSortBy: (sortBy) => {
    set((state) =>
      updateDerivedState(
        {
          sortBy,
        },
        state
      )
    );
  },

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
    return results.find((kindergarten) => kindergarten.kindercode === detailId) ?? null;
  },

  getFilteredAndSortedResults: () => {
    const { results, filters, sortBy } = get();
    return sortResults(applyClientFilters(results, filters), sortBy);
  },

  reset: () => {
    set(initialState);
  },
}));

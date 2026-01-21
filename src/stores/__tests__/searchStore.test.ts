import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useSearchStore } from '../searchStore';
import type { Kindergarten } from '@/types';

// 테스트용 유치원 데이터
const mockKindergartens: Kindergarten[] = [
  {
    kindercode: 'K001',
    name: '역삼유치원',
    type: 'public',
    address: '서울 강남구 역삼동',
    lat: 37.5,
    lng: 127.0,
    distance: 0.3,
    capacity: 120,
    currentCount: 110,
    hasBus: true,
    busCount: 2,
    mealType: 'direct',
    hasAfterSchool: true,
    areaPerChild: 5.5,
  },
  {
    kindercode: 'K002',
    name: '해맑은어린이집',
    type: 'private',
    address: '서울 강남구 논현동',
    lat: 37.51,
    lng: 127.01,
    distance: 0.5,
    capacity: 45,
    currentCount: 40,
    hasBus: false,
    busCount: 0,
    mealType: 'outsourced',
    hasAfterSchool: false,
    areaPerChild: 4.2,
  },
  {
    kindercode: 'K003',
    name: '꿈나무유치원',
    type: 'private',
    address: '서울 강남구 도곡동',
    lat: 37.52,
    lng: 127.02,
    distance: 1.2,
    capacity: 200,
    currentCount: 195,
    hasBus: true,
    busCount: 3,
    mealType: 'direct',
    hasAfterSchool: true,
    areaPerChild: 6.0,
  },
];

describe('useSearchStore', () => {
  beforeEach(() => {
    // 매 테스트 전 스토어 초기화
    useSearchStore.getState().reset();
  });

  describe('location', () => {
    it('should set location and address', () => {
      const store = useSearchStore.getState();
      store.setLocation({ lat: 37.5665, lng: 126.978 }, '서울시청');

      const state = useSearchStore.getState();
      expect(state.location).toEqual({ lat: 37.5665, lng: 126.978 });
      expect(state.address).toBe('서울시청');
    });

    it('should clear location', () => {
      const store = useSearchStore.getState();
      store.setLocation({ lat: 37.5665, lng: 126.978 }, '서울시청');
      store.clearLocation();

      const state = useSearchStore.getState();
      expect(state.location).toBeNull();
      expect(state.address).toBe('');
    });
  });

  describe('filters', () => {
    it('should set radius', () => {
      const store = useSearchStore.getState();
      store.setRadius(5);

      expect(useSearchStore.getState().filters.radius).toBe(5);
    });

    it('should set type', () => {
      const store = useSearchStore.getState();
      store.setType('kindergarten');

      expect(useSearchStore.getState().filters.type).toBe('kindergarten');
    });

    it('should set hasBus filter', () => {
      const store = useSearchStore.getState();
      store.setHasBus(true);

      expect(useSearchStore.getState().filters.hasBus).toBe(true);
    });

    it('should set hasAfterSchool filter', () => {
      const store = useSearchStore.getState();
      store.setHasAfterSchool(true);

      expect(useSearchStore.getState().filters.hasAfterSchool).toBe(true);
    });

    it('should reset filters to defaults', () => {
      const store = useSearchStore.getState();
      store.setRadius(5);
      store.setType('kindergarten');
      store.setHasBus(true);
      store.resetFilters();

      const state = useSearchStore.getState();
      expect(state.filters.radius).toBe(1);
      expect(state.filters.type).toBe('all');
      expect(state.filters.hasBus).toBeNull();
    });
  });

  describe('sorting', () => {
    it('should set sortBy', () => {
      const store = useSearchStore.getState();
      store.setSortBy('capacity');

      expect(useSearchStore.getState().sortBy).toBe('capacity');
    });
  });

  describe('view mode', () => {
    it('should set view mode', () => {
      const store = useSearchStore.getState();
      store.setViewMode('list');

      expect(useSearchStore.getState().viewMode).toBe('list');
    });
  });

  describe('selection', () => {
    it('should set selected id', () => {
      const store = useSearchStore.getState();
      store.setSelectedId('K001');

      expect(useSearchStore.getState().selectedId).toBe('K001');
    });

    it('should clear selected id', () => {
      const store = useSearchStore.getState();
      store.setSelectedId('K001');
      store.setSelectedId(null);

      expect(useSearchStore.getState().selectedId).toBeNull();
    });
  });

  describe('getFilteredAndSortedResults', () => {
    beforeEach(() => {
      const store = useSearchStore.getState();
      store.setResults(mockKindergartens, mockKindergartens.length);
    });

    it('should return results sorted by distance (default)', () => {
      const results = useSearchStore.getState().getFilteredAndSortedResults();

      expect(results[0].kindercode).toBe('K001'); // 0.3km
      expect(results[1].kindercode).toBe('K002'); // 0.5km
      expect(results[2].kindercode).toBe('K003'); // 1.2km
    });

    it('should return results sorted by capacity', () => {
      useSearchStore.getState().setSortBy('capacity');
      const results = useSearchStore.getState().getFilteredAndSortedResults();

      expect(results[0].kindercode).toBe('K003'); // 200명
      expect(results[1].kindercode).toBe('K001'); // 120명
      expect(results[2].kindercode).toBe('K002'); // 45명
    });

    it('should return results sorted by areaPerChild', () => {
      useSearchStore.getState().setSortBy('areaPerChild');
      const results = useSearchStore.getState().getFilteredAndSortedResults();

      expect(results[0].kindercode).toBe('K003'); // 6.0㎡
      expect(results[1].kindercode).toBe('K001'); // 5.5㎡
      expect(results[2].kindercode).toBe('K002'); // 4.2㎡
    });

    it('should filter by hasBus', () => {
      useSearchStore.getState().setHasBus(true);
      const results = useSearchStore.getState().getFilteredAndSortedResults();

      expect(results.length).toBe(2);
      expect(results.every((k) => k.hasBus)).toBe(true);
    });

    it('should filter by hasAfterSchool', () => {
      useSearchStore.getState().setHasAfterSchool(true);
      const results = useSearchStore.getState().getFilteredAndSortedResults();

      expect(results.length).toBe(2);
      expect(results.every((k) => k.hasAfterSchool)).toBe(true);
    });

    it('should apply multiple filters', () => {
      useSearchStore.getState().setHasBus(true);
      useSearchStore.getState().setHasAfterSchool(true);
      const results = useSearchStore.getState().getFilteredAndSortedResults();

      expect(results.length).toBe(2); // K001 and K003 have both
      expect(results.every((k) => k.hasBus && k.hasAfterSchool)).toBe(true);
    });
  });

  describe('search', () => {
    it('should set error when location is not set', async () => {
      await useSearchStore.getState().search();

      expect(useSearchStore.getState().error).toBe('위치 정보가 필요합니다.');
    });

    it('should set loading state during search', async () => {
      // Mock fetch
      global.fetch = vi.fn().mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => {
              resolve({
                json: () =>
                  Promise.resolve({
                    success: true,
                    data: { count: 0, items: [] },
                  }),
              });
            }, 100);
          })
      );

      useSearchStore.getState().setLocation({ lat: 37.5, lng: 127.0 });
      const searchPromise = useSearchStore.getState().search();

      // 로딩 상태 확인
      expect(useSearchStore.getState().isLoading).toBe(true);

      await searchPromise;

      // 로딩 완료 후 상태 확인
      expect(useSearchStore.getState().isLoading).toBe(false);
    });
  });

  describe('reset', () => {
    it('should reset all state to initial values', () => {
      const store = useSearchStore.getState();
      store.setLocation({ lat: 37.5, lng: 127.0 }, '서울');
      store.setRadius(5);
      store.setResults(mockKindergartens, 3);
      store.setSelectedId('K001');

      store.reset();

      const state = useSearchStore.getState();
      expect(state.location).toBeNull();
      expect(state.address).toBe('');
      expect(state.results).toEqual([]);
      expect(state.filters.radius).toBe(1);
      expect(state.selectedId).toBeNull();
    });
  });
});

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useSearchStore } from '../searchStore';
import { useKindergartenStore, type KindergartenRaw } from '../kindergartenStore';
import type { Kindergarten } from '@/types';
import { RADIUS_DEFAULT } from '@/types';

// 테스트용 유치원 Raw 데이터 (JSON 파일 형식)
const mockKindergartenRaw: KindergartenRaw[] = [
  {
    kindercode: 'K001',
    name: '역삼유치원',
    type: 'public',
    address: '서울 강남구 역삼동',
    lat: 37.5,
    lng: 127.0,
    capacity: 120,
    current_count: 110,
    has_bus: true,
    bus_count: 2,
    meal_type: 'direct',
    has_after_school: true,
    area_per_child: 5.5,
    has_playground: true,
    phone: '02-1234-5678',
    homepage: null,
    operation_hours: null,
    sido_code: '11',
    sigungu_code: '11680',
    class_count_age3: 1,
    class_count_age4: 1,
    class_count_age5: 1,
    capacity_age3: 30,
    capacity_age4: 40,
    capacity_age5: 50,
    current_age3: 28,
    current_age4: 38,
    current_age5: 44,
    class_count_mix: 0,
    capacity_mix: 0,
    current_mix: 0,
    capacity_special: 0,
    current_special: 0,
    establish_date: '19900301',
    building_year: 1990,
    floor_info: '지상2층',
    classroom_area: 200,
    indoor_playground_area: 50,
    outdoor_playground_area: 100,
    teacher_count: 8,
    senior_teacher_count: 2,
    cctv_count: 10,
  },
  {
    kindercode: 'K002',
    name: '해맑은어린이집',
    type: 'private',
    address: '서울 강남구 논현동',
    lat: 37.51,
    lng: 127.01,
    capacity: 45,
    current_count: 40,
    has_bus: false,
    bus_count: 0,
    meal_type: 'outsourced',
    has_after_school: false,
    area_per_child: 4.2,
    has_playground: false,
    phone: null,
    homepage: null,
    operation_hours: null,
    sido_code: '11',
    sigungu_code: '11680',
    class_count_age3: 1,
    class_count_age4: 1,
    class_count_age5: 0,
    capacity_age3: 20,
    capacity_age4: 25,
    capacity_age5: 0,
    current_age3: 18,
    current_age4: 22,
    current_age5: 0,
    class_count_mix: 0,
    capacity_mix: 0,
    current_mix: 0,
    capacity_special: 0,
    current_special: 0,
    establish_date: '20000301',
    building_year: 2000,
    floor_info: '지상1층',
    classroom_area: 100,
    indoor_playground_area: 20,
    outdoor_playground_area: 30,
    teacher_count: 4,
    senior_teacher_count: 1,
    cctv_count: 5,
  },
  {
    kindercode: 'K003',
    name: '꿈나무유치원',
    type: 'private',
    address: '서울 강남구 도곡동',
    lat: 37.52,
    lng: 127.02,
    capacity: 200,
    current_count: 195,
    has_bus: true,
    bus_count: 3,
    meal_type: 'direct',
    has_after_school: true,
    area_per_child: 6.0,
    has_playground: true,
    phone: '02-9876-5432',
    homepage: 'http://example.com',
    operation_hours: '08:00-18:00',
    sido_code: '11',
    sigungu_code: '11680',
    class_count_age3: 2,
    class_count_age4: 2,
    class_count_age5: 2,
    capacity_age3: 60,
    capacity_age4: 70,
    capacity_age5: 70,
    current_age3: 58,
    current_age4: 68,
    current_age5: 69,
    class_count_mix: 0,
    capacity_mix: 0,
    current_mix: 0,
    capacity_special: 0,
    current_special: 0,
    establish_date: '19850301',
    building_year: 1985,
    floor_info: '지상3층',
    classroom_area: 400,
    indoor_playground_area: 100,
    outdoor_playground_area: 200,
    teacher_count: 12,
    senior_teacher_count: 4,
    cctv_count: 20,
  },
];

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
    sidoCode: '11',
    sigunguCode: '11680',
    capacity: 120,
    currentCount: 110,
    classCountAge3: 2,
    classCountAge4: 2,
    classCountAge5: 2,
    capacityAge3: 40,
    capacityAge4: 40,
    capacityAge5: 40,
    currentAge3: 36,
    currentAge4: 38,
    currentAge5: 36,
    classCountMix: 0,
    capacityMix: 0,
    currentMix: 0,
    capacitySpecial: 0,
    currentSpecial: 0,
    hasBus: true,
    busCount: 2,
    mealType: 'direct',
    hasAfterSchool: true,
    establishDate: '20050301',
    areaPerChild: 5.5,
    hasPlayground: true,
    buildingYear: 2005,
    floorInfo: '1-2층',
    classroomArea: 300,
    indoorPlaygroundArea: 80,
    outdoorPlaygroundArea: 150,
    teacherCount: 12,
    seniorTeacherCount: 3,
    cctvCount: 10,
    phone: '02-1111-2222',
    homepage: 'http://yeoksam.kr',
    operationHours: '09:00~18:00',
  },
  {
    kindercode: 'K002',
    name: '해맑은어린이집',
    type: 'private',
    address: '서울 강남구 논현동',
    lat: 37.51,
    lng: 127.01,
    distance: 0.5,
    sidoCode: '11',
    sigunguCode: '11680',
    capacity: 45,
    currentCount: 40,
    classCountAge3: 1,
    classCountAge4: 1,
    classCountAge5: 1,
    capacityAge3: 15,
    capacityAge4: 15,
    capacityAge5: 15,
    currentAge3: 13,
    currentAge4: 14,
    currentAge5: 13,
    classCountMix: 0,
    capacityMix: 0,
    currentMix: 0,
    capacitySpecial: 0,
    currentSpecial: 0,
    hasBus: false,
    busCount: 0,
    mealType: 'outsourced',
    hasAfterSchool: false,
    establishDate: '20100601',
    areaPerChild: 4.2,
    hasPlayground: false,
    buildingYear: 2010,
    floorInfo: '1층',
    classroomArea: 100,
    indoorPlaygroundArea: 30,
    outdoorPlaygroundArea: 0,
    teacherCount: 5,
    seniorTeacherCount: 1,
    cctvCount: 4,
    phone: '02-3333-4444',
    homepage: null,
    operationHours: '08:00~19:00',
  },
  {
    kindercode: 'K003',
    name: '꿈나무유치원',
    type: 'private',
    address: '서울 강남구 도곡동',
    lat: 37.52,
    lng: 127.02,
    distance: 1.2,
    sidoCode: '11',
    sigunguCode: '11680',
    capacity: 200,
    currentCount: 195,
    classCountAge3: 3,
    classCountAge4: 3,
    classCountAge5: 3,
    capacityAge3: 66,
    capacityAge4: 67,
    capacityAge5: 67,
    currentAge3: 65,
    currentAge4: 65,
    currentAge5: 65,
    classCountMix: 0,
    capacityMix: 0,
    currentMix: 0,
    capacitySpecial: 0,
    currentSpecial: 0,
    hasBus: true,
    busCount: 3,
    mealType: 'direct',
    hasAfterSchool: true,
    establishDate: '19980901',
    areaPerChild: 6.0,
    hasPlayground: true,
    buildingYear: 1998,
    floorInfo: '1-3층',
    classroomArea: 500,
    indoorPlaygroundArea: 120,
    outdoorPlaygroundArea: 250,
    teacherCount: 20,
    seniorTeacherCount: 5,
    cctvCount: 16,
    phone: '02-5555-6666',
    homepage: 'http://kkumnamu.kr',
    operationHours: '07:30~19:30',
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
      store.setType('public');

      expect(useSearchStore.getState().filters.type).toBe('public');
    });

    it('should set hasBus filter', () => {
      const store = useSearchStore.getState();
      store.setHasBus(true);

      expect(useSearchStore.getState().filters.hasBus).toBe(true);
    });

    it('should set hasVacancy filter', () => {
      const store = useSearchStore.getState();
      store.setHasVacancy(true);

      expect(useSearchStore.getState().filters.hasVacancy).toBe(true);
    });

    it('should set hasIndoorPlayground filter', () => {
      const store = useSearchStore.getState();
      store.setHasIndoorPlayground(true);

      expect(useSearchStore.getState().filters.hasIndoorPlayground).toBe(true);
    });

    it('should set hasLargeSpace filter', () => {
      const store = useSearchStore.getState();
      store.setHasLargeSpace(true);

      expect(useSearchStore.getState().filters.hasLargeSpace).toBe(true);
    });

    it('should set hasModernBuilding filter', () => {
      const store = useSearchStore.getState();
      store.setHasModernBuilding(true);

      expect(useSearchStore.getState().filters.hasModernBuilding).toBe(true);
    });

    it('should reset filters to defaults', () => {
      const store = useSearchStore.getState();
      store.setRadius(5);
      store.setType('public');
      store.setHasBus(true);
      store.resetFilters();

      const state = useSearchStore.getState();
      expect(state.filters.radius).toBe(RADIUS_DEFAULT);
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

    it('should filter by hasVacancy', () => {
      useSearchStore.getState().setHasVacancy(true);
      const results = useSearchStore.getState().getFilteredAndSortedResults();

      // K001: 120 > 110 (여유정원 있음)
      // K002: 45 > 40 (여유정원 있음)
      // K003: 200 > 195 (여유정원 있음)
      expect(results.length).toBe(3);
      expect(results.every((k) => k.capacity > k.currentCount)).toBe(true);
    });

    it('should filter by hasLargeSpace', () => {
      useSearchStore.getState().setHasLargeSpace(true);
      const results = useSearchStore.getState().getFilteredAndSortedResults();

      // K001: 5.5㎡, K003: 6.0㎡ (5㎡ 이상)
      expect(results.length).toBe(2);
      expect(results.every((k) => k.areaPerChild >= 5)).toBe(true);
    });

    it('should apply multiple filters', () => {
      useSearchStore.getState().setHasBus(true);
      useSearchStore.getState().setHasLargeSpace(true);
      const results = useSearchStore.getState().getFilteredAndSortedResults();

      // K001 and K003 have both bus and large space
      expect(results.length).toBe(2);
      expect(results.every((k) => k.hasBus && k.areaPerChild >= 5)).toBe(true);
    });
  });

  describe('search', () => {
    beforeEach(() => {
      // kindergartenStore를 테스트 데이터로 초기화
      useKindergartenStore.setState({
        allData: mockKindergartenRaw,
        isLoaded: true,
        isLoading: false,
        error: null,
      });
    });

    afterEach(() => {
      // kindergartenStore 초기화
      useKindergartenStore.setState({
        allData: [],
        isLoaded: false,
        isLoading: false,
        error: null,
      });
    });

    it('should set error when location is not set', async () => {
      await useSearchStore.getState().search();

      expect(useSearchStore.getState().error).toBe('위치 정보가 필요합니다.');
    });

    it('should search kindergartens within radius', async () => {
      useSearchStore.getState().setLocation({ lat: 37.5, lng: 127.0 });
      useSearchStore.getState().setRadius(5); // 5km 반경

      await useSearchStore.getState().search();

      const state = useSearchStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.results.length).toBeGreaterThan(0);
      // 결과가 거리순으로 정렬되었는지 확인
      if (state.results.length > 1) {
        expect(state.results[0].distance).toBeLessThanOrEqual(state.results[1].distance);
      }
    });

    it('should complete search and set loading to false', async () => {
      useSearchStore.getState().setLocation({ lat: 37.5, lng: 127.0 });
      await useSearchStore.getState().search();

      // 검색 완료 후 로딩 상태 확인
      expect(useSearchStore.getState().isLoading).toBe(false);
      expect(useSearchStore.getState().error).toBeNull();
    });

    it('should filter by radius', async () => {
      useSearchStore.getState().setLocation({ lat: 37.5, lng: 127.0 });
      useSearchStore.getState().setRadius(1); // 1km 반경

      await useSearchStore.getState().search();

      const state = useSearchStore.getState();
      // 모든 결과가 1km 이내인지 확인
      expect(state.results.every((k) => k.distance <= 1)).toBe(true);
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
      expect(state.filters.radius).toBe(RADIUS_DEFAULT);
      expect(state.selectedId).toBeNull();
    });
  });
});

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useFavoriteStore } from '../favoriteStore';
import type { Kindergarten } from '@/types';

// 테스트용 유치원 데이터
const createMockKindergarten = (id: string, name: string): Kindergarten => ({
  kindercode: id,
  name,
  type: 'public',
  address: '서울 강남구',
  lat: 37.5,
  lng: 127.0,
  distance: 0.5,
  sidoCode: '11',
  sigunguCode: '11680',
  capacity: 100,
  currentCount: 90,
  classCountAge3: 2,
  classCountAge4: 2,
  classCountAge5: 2,
  capacityAge3: 30,
  capacityAge4: 35,
  capacityAge5: 35,
  currentAge3: 28,
  currentAge4: 32,
  currentAge5: 30,
  classCountMix: 0,
  capacityMix: 0,
  currentMix: 0,
  capacitySpecial: 0,
  currentSpecial: 0,
  hasBus: true,
  busCount: 2,
  mealType: 'direct',
  hasAfterSchool: true,
  establishDate: '20100301',
  areaPerChild: 5.0,
  hasPlayground: true,
  buildingYear: 2010,
  floorInfo: '1층',
  classroomArea: 200,
  indoorPlaygroundArea: 50,
  outdoorPlaygroundArea: 100,
  teacherCount: 10,
  seniorTeacherCount: 2,
  cctvCount: 8,
  phone: '02-1234-5678',
  homepage: 'http://example.com',
  operationHours: '09:00~18:00',
});

describe('useFavoriteStore', () => {
  beforeEach(() => {
    // 매 테스트 전 스토어 초기화
    useFavoriteStore.getState().clearAll();
  });

  describe('addItem', () => {
    it('should add an item to the favorites list', () => {
      const item = createMockKindergarten('K001', '역삼유치원');
      useFavoriteStore.getState().addItem(item);

      const state = useFavoriteStore.getState();
      expect(state.items).toHaveLength(1);
      expect(state.items[0].kindercode).toBe('K001');
      expect(state.items[0].name).toBe('역삼유치원');
      expect(state.items[0].type).toBe('public');
      expect(state.items[0].address).toBe('서울 강남구');
    });

    it('should store minimal data in FavoriteItem', () => {
      const item = createMockKindergarten('K001', '역삼유치원');
      useFavoriteStore.getState().addItem(item);

      const favoriteItem = useFavoriteStore.getState().items[0];
      expect(Object.keys(favoriteItem)).toHaveLength(5);
      expect(favoriteItem).toHaveProperty('kindercode');
      expect(favoriteItem).toHaveProperty('name');
      expect(favoriteItem).toHaveProperty('type');
      expect(favoriteItem).toHaveProperty('address');
      expect(favoriteItem).toHaveProperty('addedAt');
    });

    it('should set addedAt timestamp when adding', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      const item = createMockKindergarten('K001', '역삼유치원');
      useFavoriteStore.getState().addItem(item);

      expect(useFavoriteStore.getState().items[0].addedAt).toBe(now);

      vi.useRealTimers();
    });

    it('should not add duplicate items', () => {
      const item = createMockKindergarten('K001', '역삼유치원');
      useFavoriteStore.getState().addItem(item);
      useFavoriteStore.getState().addItem(item);

      expect(useFavoriteStore.getState().items).toHaveLength(1);
    });

    it('should allow adding multiple different items', () => {
      const item1 = createMockKindergarten('K001', '역삼유치원');
      const item2 = createMockKindergarten('K002', '해맑은어린이집');
      const item3 = createMockKindergarten('K003', '꿈나무유치원');

      useFavoriteStore.getState().addItem(item1);
      useFavoriteStore.getState().addItem(item2);
      useFavoriteStore.getState().addItem(item3);

      expect(useFavoriteStore.getState().items).toHaveLength(3);
    });
  });

  describe('removeItem', () => {
    it('should remove an item from the favorites list', () => {
      const item = createMockKindergarten('K001', '역삼유치원');
      useFavoriteStore.getState().addItem(item);
      useFavoriteStore.getState().removeItem('K001');

      expect(useFavoriteStore.getState().items).toHaveLength(0);
    });

    it('should not affect other items when removing one', () => {
      const item1 = createMockKindergarten('K001', '역삼유치원');
      const item2 = createMockKindergarten('K002', '해맑은어린이집');
      useFavoriteStore.getState().addItem(item1);
      useFavoriteStore.getState().addItem(item2);
      useFavoriteStore.getState().removeItem('K001');

      expect(useFavoriteStore.getState().items).toHaveLength(1);
      expect(useFavoriteStore.getState().items[0].kindercode).toBe('K002');
    });

    it('should do nothing when removing non-existent item', () => {
      const item = createMockKindergarten('K001', '역삼유치원');
      useFavoriteStore.getState().addItem(item);
      useFavoriteStore.getState().removeItem('K999');

      expect(useFavoriteStore.getState().items).toHaveLength(1);
    });

    it('should update itemsMap when removing', () => {
      const item = createMockKindergarten('K001', '역삼유치원');
      useFavoriteStore.getState().addItem(item);

      expect(useFavoriteStore.getState().itemsMap.has('K001')).toBe(true);

      useFavoriteStore.getState().removeItem('K001');

      expect(useFavoriteStore.getState().itemsMap.has('K001')).toBe(false);
    });
  });

  describe('toggleItem', () => {
    it('should add item when not in favorites', () => {
      const item = createMockKindergarten('K001', '역삼유치원');
      useFavoriteStore.getState().toggleItem(item);

      expect(useFavoriteStore.getState().items).toHaveLength(1);
      expect(useFavoriteStore.getState().isFavorite('K001')).toBe(true);
    });

    it('should remove item when already in favorites', () => {
      const item = createMockKindergarten('K001', '역삼유치원');
      useFavoriteStore.getState().addItem(item);
      useFavoriteStore.getState().toggleItem(item);

      expect(useFavoriteStore.getState().items).toHaveLength(0);
      expect(useFavoriteStore.getState().isFavorite('K001')).toBe(false);
    });

    it('should toggle correctly multiple times', () => {
      const item = createMockKindergarten('K001', '역삼유치원');

      useFavoriteStore.getState().toggleItem(item);
      expect(useFavoriteStore.getState().isFavorite('K001')).toBe(true);

      useFavoriteStore.getState().toggleItem(item);
      expect(useFavoriteStore.getState().isFavorite('K001')).toBe(false);

      useFavoriteStore.getState().toggleItem(item);
      expect(useFavoriteStore.getState().isFavorite('K001')).toBe(true);
    });
  });

  describe('clearAll', () => {
    it('should remove all items', () => {
      const item1 = createMockKindergarten('K001', '역삼유치원');
      const item2 = createMockKindergarten('K002', '해맑은어린이집');
      useFavoriteStore.getState().addItem(item1);
      useFavoriteStore.getState().addItem(item2);
      useFavoriteStore.getState().clearAll();

      expect(useFavoriteStore.getState().items).toHaveLength(0);
      expect(useFavoriteStore.getState().itemsMap.size).toBe(0);
    });
  });

  describe('isFavorite', () => {
    it('should return true if item is in favorites', () => {
      const item = createMockKindergarten('K001', '역삼유치원');
      useFavoriteStore.getState().addItem(item);

      expect(useFavoriteStore.getState().isFavorite('K001')).toBe(true);
    });

    it('should return false if item is not in favorites', () => {
      expect(useFavoriteStore.getState().isFavorite('K999')).toBe(false);
    });

    it('should use O(1) lookup via Map', () => {
      const item = createMockKindergarten('K001', '역삼유치원');
      useFavoriteStore.getState().addItem(item);

      // Map should be populated
      expect(useFavoriteStore.getState().itemsMap.has('K001')).toBe(true);
      expect(useFavoriteStore.getState().itemsMap.get('K001')?.name).toBe('역삼유치원');
    });
  });

  describe('getItemCount', () => {
    it('should return 0 when empty', () => {
      expect(useFavoriteStore.getState().getItemCount()).toBe(0);
    });

    it('should return the correct count', () => {
      const item1 = createMockKindergarten('K001', '역삼유치원');
      useFavoriteStore.getState().addItem(item1);
      expect(useFavoriteStore.getState().getItemCount()).toBe(1);

      const item2 = createMockKindergarten('K002', '해맑은어린이집');
      useFavoriteStore.getState().addItem(item2);
      expect(useFavoriteStore.getState().getItemCount()).toBe(2);
    });

    it('should update count after removal', () => {
      const item1 = createMockKindergarten('K001', '역삼유치원');
      const item2 = createMockKindergarten('K002', '해맑은어린이집');
      useFavoriteStore.getState().addItem(item1);
      useFavoriteStore.getState().addItem(item2);

      expect(useFavoriteStore.getState().getItemCount()).toBe(2);

      useFavoriteStore.getState().removeItem('K001');
      expect(useFavoriteStore.getState().getItemCount()).toBe(1);
    });
  });

  describe('itemsMap synchronization', () => {
    it('should keep itemsMap in sync with items array', () => {
      const item1 = createMockKindergarten('K001', '역삼유치원');
      const item2 = createMockKindergarten('K002', '해맑은어린이집');

      useFavoriteStore.getState().addItem(item1);
      expect(useFavoriteStore.getState().itemsMap.size).toBe(1);

      useFavoriteStore.getState().addItem(item2);
      expect(useFavoriteStore.getState().itemsMap.size).toBe(2);

      useFavoriteStore.getState().removeItem('K001');
      expect(useFavoriteStore.getState().itemsMap.size).toBe(1);
      expect(useFavoriteStore.getState().itemsMap.has('K001')).toBe(false);
      expect(useFavoriteStore.getState().itemsMap.has('K002')).toBe(true);
    });
  });
});

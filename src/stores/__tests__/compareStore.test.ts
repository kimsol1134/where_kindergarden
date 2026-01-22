import { describe, it, expect, beforeEach } from 'vitest';
import { useCompareStore } from '../compareStore';
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

describe('useCompareStore', () => {
  beforeEach(() => {
    // 매 테스트 전 스토어 초기화
    useCompareStore.getState().clearAll();
  });

  describe('addItem', () => {
    it('should add an item to the compare list', () => {
      const item = createMockKindergarten('K001', '역삼유치원');
      const result = useCompareStore.getState().addItem(item);

      expect(result).toBe(true);
      expect(useCompareStore.getState().items).toHaveLength(1);
      expect(useCompareStore.getState().items[0].kindercode).toBe('K001');
    });

    it('should not add duplicate items', () => {
      const item = createMockKindergarten('K001', '역삼유치원');
      useCompareStore.getState().addItem(item);
      const result = useCompareStore.getState().addItem(item);

      expect(result).toBe(false);
      expect(useCompareStore.getState().items).toHaveLength(1);
    });

    it('should not add more than 3 items', () => {
      const item1 = createMockKindergarten('K001', '역삼유치원');
      const item2 = createMockKindergarten('K002', '해맑은어린이집');
      const item3 = createMockKindergarten('K003', '꿈나무유치원');
      const item4 = createMockKindergarten('K004', '무지개유치원');

      useCompareStore.getState().addItem(item1);
      useCompareStore.getState().addItem(item2);
      useCompareStore.getState().addItem(item3);
      const result = useCompareStore.getState().addItem(item4);

      expect(result).toBe(false);
      expect(useCompareStore.getState().items).toHaveLength(3);
    });
  });

  describe('removeItem', () => {
    it('should remove an item from the compare list', () => {
      const item = createMockKindergarten('K001', '역삼유치원');
      useCompareStore.getState().addItem(item);
      useCompareStore.getState().removeItem('K001');

      expect(useCompareStore.getState().items).toHaveLength(0);
    });

    it('should not affect other items when removing one', () => {
      const item1 = createMockKindergarten('K001', '역삼유치원');
      const item2 = createMockKindergarten('K002', '해맑은어린이집');
      useCompareStore.getState().addItem(item1);
      useCompareStore.getState().addItem(item2);
      useCompareStore.getState().removeItem('K001');

      expect(useCompareStore.getState().items).toHaveLength(1);
      expect(useCompareStore.getState().items[0].kindercode).toBe('K002');
    });

    it('should do nothing when removing non-existent item', () => {
      const item = createMockKindergarten('K001', '역삼유치원');
      useCompareStore.getState().addItem(item);
      useCompareStore.getState().removeItem('K999');

      expect(useCompareStore.getState().items).toHaveLength(1);
    });
  });

  describe('clearAll', () => {
    it('should remove all items', () => {
      const item1 = createMockKindergarten('K001', '역삼유치원');
      const item2 = createMockKindergarten('K002', '해맑은어린이집');
      useCompareStore.getState().addItem(item1);
      useCompareStore.getState().addItem(item2);
      useCompareStore.getState().clearAll();

      expect(useCompareStore.getState().items).toHaveLength(0);
    });
  });

  describe('isInCompare', () => {
    it('should return true if item is in compare list', () => {
      const item = createMockKindergarten('K001', '역삼유치원');
      useCompareStore.getState().addItem(item);

      expect(useCompareStore.getState().isInCompare('K001')).toBe(true);
    });

    it('should return false if item is not in compare list', () => {
      expect(useCompareStore.getState().isInCompare('K999')).toBe(false);
    });
  });

  describe('canAdd', () => {
    it('should return true when list has less than 3 items', () => {
      expect(useCompareStore.getState().canAdd()).toBe(true);

      const item1 = createMockKindergarten('K001', '역삼유치원');
      useCompareStore.getState().addItem(item1);
      expect(useCompareStore.getState().canAdd()).toBe(true);

      const item2 = createMockKindergarten('K002', '해맑은어린이집');
      useCompareStore.getState().addItem(item2);
      expect(useCompareStore.getState().canAdd()).toBe(true);
    });

    it('should return false when list has 3 items', () => {
      const item1 = createMockKindergarten('K001', '역삼유치원');
      const item2 = createMockKindergarten('K002', '해맑은어린이집');
      const item3 = createMockKindergarten('K003', '꿈나무유치원');
      useCompareStore.getState().addItem(item1);
      useCompareStore.getState().addItem(item2);
      useCompareStore.getState().addItem(item3);

      expect(useCompareStore.getState().canAdd()).toBe(false);
    });
  });

  describe('getItemCount', () => {
    it('should return the correct count', () => {
      expect(useCompareStore.getState().getItemCount()).toBe(0);

      const item1 = createMockKindergarten('K001', '역삼유치원');
      useCompareStore.getState().addItem(item1);
      expect(useCompareStore.getState().getItemCount()).toBe(1);

      const item2 = createMockKindergarten('K002', '해맑은어린이집');
      useCompareStore.getState().addItem(item2);
      expect(useCompareStore.getState().getItemCount()).toBe(2);
    });
  });
});

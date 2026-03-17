import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useVacancyStore } from '../vacancyStore';
import type { VacancyDataset } from '@/types';

const mockVacancyData: VacancyDataset = {
  version: '2026-03-17T00:00:00.000Z',
  source: 'https://www.go-firstschool.go.kr/PAMS_SS',
  aidYear: '2026',
  totalCount: 2,
  positiveCount: 1,
  items: {
    K001: {
      kindercode: 'K001',
      aidYear: '2026',
      vacancyCount: 3,
      updatedAt: '2026-03-17',
      preschCd: 'P001',
      upperEduOfficeCd: 'U001',
      eduOfficeCd: 'E001',
      foundType: '사립',
      name: '강남유치원',
      address: '서울특별시 강남구',
      phone: '02-111-1111',
      detail: [{ rowNo: 1, age: '5세', course: '교육과정', vacancyCount: 3 }],
    },
    K002: {
      kindercode: 'K002',
      aidYear: '2026',
      vacancyCount: 0,
      updatedAt: null,
      preschCd: null,
      upperEduOfficeCd: null,
      eduOfficeCd: null,
      foundType: '국공립',
      name: '도곡유치원',
      address: '서울특별시 강남구',
      phone: null,
      detail: [],
    },
  },
};

describe('useVacancyStore', () => {
  beforeEach(() => {
    useVacancyStore.setState({
      data: null,
      isLoaded: false,
      isLoading: false,
      error: null,
      loadPromise: null,
    });
    vi.restoreAllMocks();
  });

  describe('loadData', () => {
    it('should load remote vacancy data first', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => mockVacancyData,
      } as Response);

      await useVacancyStore.getState().loadData();

      const state = useVacancyStore.getState();
      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(state.isLoaded).toBe(true);
      expect(state.data?.totalCount).toBe(2);
    });

    it('should fall back to bundled data when remote fetch fails', async () => {
      vi.spyOn(globalThis, 'fetch')
        .mockResolvedValueOnce({ ok: false, status: 500 } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockVacancyData,
        } as Response);

      await useVacancyStore.getState().loadData();

      const state = useVacancyStore.getState();
      expect(state.isLoaded).toBe(true);
      expect(state.error).toBeNull();
      expect(state.data?.positiveCount).toBe(1);
    });

    it('should handle local fallback failure', async () => {
      vi.spyOn(globalThis, 'fetch')
        .mockResolvedValueOnce({ ok: false, status: 500 } as Response)
        .mockResolvedValueOnce({ ok: false, status: 404 } as Response);

      await useVacancyStore.getState().loadData();

      const state = useVacancyStore.getState();
      expect(state.isLoaded).toBe(false);
      expect(state.error).toBe('공식 결원 데이터 로드 실패: 404');
    });

    it('should deduplicate concurrent loads', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => mockVacancyData,
      } as Response);

      const load1 = useVacancyStore.getState().loadData();
      const load2 = useVacancyStore.getState().loadData();

      await Promise.all([load1, load2]);

      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('getters', () => {
    beforeEach(() => {
      useVacancyStore.setState({
        data: mockVacancyData,
        isLoaded: true,
        isLoading: false,
        error: null,
        loadPromise: null,
      });
    });

    it('should return summary by kindergarten id', () => {
      expect(useVacancyStore.getState().getByKindergartenId('K001')?.vacancyCount).toBe(3);
      expect(useVacancyStore.getState().getByKindergartenId('missing')).toBeNull();
    });

    it('should return count by kindergarten id', () => {
      expect(useVacancyStore.getState().getCountByKindergartenId('K001')).toBe(3);
      expect(useVacancyStore.getState().getCountByKindergartenId('K002')).toBe(0);
      expect(useVacancyStore.getState().getCountByKindergartenId('missing')).toBe(0);
    });

    it('should distinguish official vacancy from registered zero', () => {
      expect(useVacancyStore.getState().hasOfficialVacancy('K001')).toBe(true);
      expect(useVacancyStore.getState().hasOfficialVacancy('K002')).toBe(false);
    });
  });
});

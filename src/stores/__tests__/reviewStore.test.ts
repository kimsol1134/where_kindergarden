import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useReviewStore } from '../reviewStore';
import type { ReviewsData } from '@/types';

const mockReviewsData: ReviewsData = {
  version: '2026-01-24',
  totalCount: 3,
  kindergartenCount: 2,
  reviews: {
    K001: [
      {
        id: 'rev-0001',
        kindergartenId: 'K001',
        title: '역삼유치원 후기',
        url: 'https://blog.naver.com/test1',
        source: 'naver_blog',
        sourceName: '테스트블로그',
        snippet: '좋은 유치원이었습니다.',
        date: '2025-09-15',
        collectedAt: '2026-01-24T00:00:00.000Z',
      },
      {
        id: 'rev-0002',
        kindergartenId: 'K001',
        title: '역삼유치원 방문 후기',
        url: 'https://cafe.naver.com/test2',
        source: 'naver_cafe',
        sourceName: '맘카페',
        snippet: '시설이 깨끗합니다.',
        date: '2025-08-10',
        collectedAt: '2026-01-24T00:00:00.000Z',
      },
    ],
    K002: [
      {
        id: 'rev-0003',
        kindergartenId: 'K002',
        title: '해맑은어린이집 후기',
        url: 'https://blog.naver.com/test3',
        source: 'naver_blog',
        sourceName: '또다른블로그',
        snippet: '선생님이 친절합니다.',
        date: null,
        collectedAt: '2026-01-24T00:00:00.000Z',
      },
    ],
  },
};

describe('useReviewStore', () => {
  beforeEach(() => {
    // 스토어 초기화
    useReviewStore.setState({
      data: null,
      isLoaded: false,
      isLoading: false,
      error: null,
      loadPromise: null,
    });
    vi.restoreAllMocks();
  });

  describe('loadData', () => {
    it('should load review data from JSON', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => mockReviewsData,
      } as Response);

      await useReviewStore.getState().loadData();

      const state = useReviewStore.getState();
      expect(state.isLoaded).toBe(true);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.data?.totalCount).toBe(3);
    });

    it('should not reload if already loaded', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => mockReviewsData,
      } as Response);

      await useReviewStore.getState().loadData();
      await useReviewStore.getState().loadData();

      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it('should handle fetch errors', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 404,
      } as Response);

      await useReviewStore.getState().loadData();

      const state = useReviewStore.getState();
      expect(state.isLoaded).toBe(false);
      expect(state.error).toBe('후기 데이터 로드 실패: 404');
    });

    it('should deduplicate concurrent loads', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => mockReviewsData,
      } as Response);

      const load1 = useReviewStore.getState().loadData();
      const load2 = useReviewStore.getState().loadData();

      await Promise.all([load1, load2]);

      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('getByKindergartenId', () => {
    beforeEach(() => {
      useReviewStore.setState({ data: mockReviewsData, isLoaded: true });
    });

    it('should return reviews for a kindergarten', () => {
      const reviews = useReviewStore.getState().getByKindergartenId('K001');
      expect(reviews).toHaveLength(2);
      expect(reviews[0].title).toBe('역삼유치원 후기');
    });

    it('should return empty array for unknown kindergarten', () => {
      const reviews = useReviewStore.getState().getByKindergartenId('K999');
      expect(reviews).toHaveLength(0);
    });

    it('should return empty array when data is not loaded', () => {
      useReviewStore.setState({ data: null, isLoaded: false });
      const reviews = useReviewStore.getState().getByKindergartenId('K001');
      expect(reviews).toHaveLength(0);
    });
  });

  describe('getCountByKindergartenId', () => {
    beforeEach(() => {
      useReviewStore.setState({ data: mockReviewsData, isLoaded: true });
    });

    it('should return count for a kindergarten', () => {
      expect(useReviewStore.getState().getCountByKindergartenId('K001')).toBe(2);
      expect(useReviewStore.getState().getCountByKindergartenId('K002')).toBe(1);
    });

    it('should return 0 for unknown kindergarten', () => {
      expect(useReviewStore.getState().getCountByKindergartenId('K999')).toBe(0);
    });

    it('should return 0 when data is not loaded', () => {
      useReviewStore.setState({ data: null, isLoaded: false });
      expect(useReviewStore.getState().getCountByKindergartenId('K001')).toBe(0);
    });
  });
});

import { create } from 'zustand';
import type { ReviewLink, ReviewsData } from '@/types';

interface ReviewState {
  data: ReviewsData | null;
  isLoaded: boolean;
  isLoading: boolean;
  error: string | null;
  loadPromise: Promise<void> | null;
}

interface ReviewActions {
  loadData: () => Promise<void>;
  getByKindergartenId: (kindergartenId: string) => ReviewLink[];
  getCountByKindergartenId: (kindergartenId: string) => number;
}

const initialState: ReviewState = {
  data: null,
  isLoaded: false,
  isLoading: false,
  error: null,
  loadPromise: null,
};

export const useReviewStore = create<ReviewState & ReviewActions>(
  (set, get) => ({
    ...initialState,

    loadData: async () => {
      const { isLoaded, isLoading, loadPromise } = get();

      if (isLoaded) {
        return;
      }

      if (isLoading && loadPromise) {
        return loadPromise;
      }

      const promise = (async () => {
        try {
          // 1. Try fetching from remote server first (Real-time updates)
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

            const response = await fetch('https://where-kindergarden.vercel.app/data/reviews.json', {
              signal: controller.signal,
              cache: 'no-store', // Always get fresh data
            });
            clearTimeout(timeoutId);

            if (response.ok) {
              const data: ReviewsData = await response.json();
              set({
                data,
                isLoaded: true,
                isLoading: false,
                error: null,
                loadPromise: null,
              });
              return; // Success, exit
            }
          } catch (remoteError) {
            console.warn('Remote review fetch failed, falling back to local:', remoteError);
          }

          // 2. Fallback to local data (Bundled with app)
          const response = await fetch('/data/reviews.json');

          if (!response.ok) {
            throw new Error(`후기 데이터 로드 실패: ${response.status}`);
          }

          const data: ReviewsData = await response.json();

          set({
            data,
            isLoaded: true,
            isLoading: false,
            error: null,
            loadPromise: null,
          });
        } catch (err) {
          const errorMessage =
            err instanceof Error ? err.message : '후기 데이터 로드 중 오류가 발생했습니다.';
          set({ error: errorMessage, isLoading: false, loadPromise: null });
        }
      })();

      set({ isLoading: true, error: null, loadPromise: promise });
      return promise;
    },

    getByKindergartenId: (kindergartenId: string) => {
      const { data } = get();
      if (!data) return [];
      return data.reviews[kindergartenId] ?? [];
    },

    getCountByKindergartenId: (kindergartenId: string) => {
      const { data } = get();
      if (!data) return 0;
      return data.reviews[kindergartenId]?.length ?? 0;
    },
  })
);

import { create } from 'zustand';
import type { VacancyDataset, VacancySummary } from '@/types';

const REMOTE_VACANCY_URL = 'https://where-kindergarden.vercel.app/data/vacancy.json';
const LOCAL_VACANCY_URL = '/data/vacancy.json';
const REQUEST_TIMEOUT_MS = 5000;

interface VacancyState {
  data: VacancyDataset | null;
  isLoaded: boolean;
  isLoading: boolean;
  error: string | null;
  loadPromise: Promise<void> | null;
}

interface VacancyActions {
  loadData: () => Promise<void>;
  getByKindergartenId: (kindergartenId: string) => VacancySummary | null;
  getCountByKindergartenId: (kindergartenId: string) => number;
  hasOfficialVacancy: (kindergartenId: string) => boolean;
}

const initialState: VacancyState = {
  data: null,
  isLoaded: false,
  isLoading: false,
  error: null,
  loadPromise: null,
};

async function fetchVacancyDataset(url: string, useNoStore: boolean): Promise<VacancyDataset> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      cache: useNoStore ? 'no-store' : 'default',
    });

    if (!response.ok) {
      throw new Error(`공식 결원 데이터 로드 실패: ${response.status}`);
    }

    return (await response.json()) as VacancyDataset;
  } finally {
    clearTimeout(timeoutId);
  }
}

export const useVacancyStore = create<VacancyState & VacancyActions>((set, get) => ({
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
        try {
          const remoteData = await fetchVacancyDataset(REMOTE_VACANCY_URL, true);
          set({
            data: remoteData,
            isLoaded: true,
            isLoading: false,
            error: null,
            loadPromise: null,
          });
          return;
        } catch {
          // Fall back to bundled data.
        }

        const localData = await fetchVacancyDataset(LOCAL_VACANCY_URL, false);
        set({
          data: localData,
          isLoaded: true,
          isLoading: false,
          error: null,
          loadPromise: null,
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : '공식 결원 데이터 로드 중 오류가 발생했습니다.';
        set({
          error: errorMessage,
          isLoading: false,
          loadPromise: null,
        });
      }
    })();

    set({ isLoading: true, error: null, loadPromise: promise });
    return promise;
  },

  getByKindergartenId: (kindergartenId) => {
    const { data } = get();
    if (!data) {
      return null;
    }

    return data.items[kindergartenId] ?? null;
  },

  getCountByKindergartenId: (kindergartenId) => {
    const item = get().getByKindergartenId(kindergartenId);
    return item?.vacancyCount ?? 0;
  },

  hasOfficialVacancy: (kindergartenId) => {
    return get().getCountByKindergartenId(kindergartenId) > 0;
  },
}));

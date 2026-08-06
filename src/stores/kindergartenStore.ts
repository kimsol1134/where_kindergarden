import { create } from 'zustand';

/**
 * JSON 파일에서 로드되는 유치원 원시 데이터 타입
 * public/data/kindergartens.json의 구조와 일치해야 함
 */
export interface KindergartenRaw {
  kindercode: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  type: 'public' | 'private';
  phone: string | null;
  homepage: string | null;
  operation_hours: string | null;
  sido_code: string;
  sigungu_code: string;
  capacity: number;
  current_count: number;
  class_count_age3: number;
  class_count_age4: number;
  class_count_age5: number;
  capacity_age3: number;
  capacity_age4: number;
  capacity_age5: number;
  current_age3: number;
  current_age4: number;
  current_age5: number;
  class_count_mix: number;
  capacity_mix: number;
  current_mix: number;
  capacity_special: number;
  current_special: number;
  establish_date: string;
  has_bus: boolean;
  bus_count: number;
  meal_type: 'direct' | 'outsourced' | null;
  has_after_school: boolean;
  area_per_child: number;
  has_playground: boolean;
  building_year: number | null;
  floor_info: string | null;
  classroom_area: number;
  indoor_playground_area: number;
  outdoor_playground_area: number;
  teacher_count: number;
  senior_teacher_count: number;
  cctv_count: number;
}

/** 유치원 데이터 스토어 상태 */
interface KindergartenState {
  allData: KindergartenRaw[];
  isLoaded: boolean;
  isLoading: boolean;
  error: string | null;
  loadPromise: Promise<void> | null;
}

/** 유치원 데이터 스토어 액션 */
interface KindergartenActions {
  loadData: () => Promise<void>;
  getAll: () => KindergartenRaw[];
  getByKindercode: (code: string) => KindergartenRaw | undefined;
}

const initialState: KindergartenState = {
  allData: [],
  isLoaded: false,
  isLoading: false,
  error: null,
  loadPromise: null,
};

export const useKindergartenStore = create<KindergartenState & KindergartenActions>(
  (set, get) => ({
    ...initialState,

    /**
     * JSON 파일에서 전체 유치원 데이터를 로드
     * 앱 시작 시 한 번만 호출되어야 함
     * 여러 호출자가 동시에 호출해도 하나의 로드만 수행되고 모두 대기
     */
    loadData: async () => {
      const { isLoaded, isLoading, loadPromise } = get();

      // 이미 로드됨
      if (isLoaded) {
        return;
      }

      // 로딩 중이면 기존 Promise 대기
      if (isLoading && loadPromise) {
        return loadPromise;
      }

      // 새 로드 시작
      const promise = (async () => {
        try {
          const response = await fetch('/data/kindergartens.json', { cache: 'no-store' });

          if (!response.ok) {
            throw new Error(`데이터 로드 실패: ${response.status}`);
          }

          const data: KindergartenRaw[] = await response.json();

          set({
            allData: data,
            isLoaded: true,
            isLoading: false,
            error: null,
            loadPromise: null,
          });
        } catch (err) {
          const errorMessage =
            err instanceof Error ? err.message : '데이터 로드 중 오류가 발생했습니다.';
          set({ error: errorMessage, isLoading: false, loadPromise: null });
        }
      })();

      set({ isLoading: true, error: null, loadPromise: promise });
      return promise;
    },

    /**
     * 전체 데이터 반환
     */
    getAll: () => get().allData,

    /**
     * kindercode로 특정 유치원 조회
     */
    getByKindercode: (code: string) => {
      return get().allData.find((item) => item.kindercode === code);
    },
  })
);

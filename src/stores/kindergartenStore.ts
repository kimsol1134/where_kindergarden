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
};

export const useKindergartenStore = create<KindergartenState & KindergartenActions>(
  (set, get) => ({
    ...initialState,

    /**
     * JSON 파일에서 전체 유치원 데이터를 로드
     * 앱 시작 시 한 번만 호출되어야 함
     */
    loadData: async () => {
      const { isLoaded, isLoading } = get();

      // 이미 로드됨 또는 로딩 중이면 스킵
      if (isLoaded || isLoading) {
        return;
      }

      set({ isLoading: true, error: null });

      try {
        const response = await fetch('/data/kindergartens.json');

        if (!response.ok) {
          throw new Error(`데이터 로드 실패: ${response.status}`);
        }

        const data: KindergartenRaw[] = await response.json();

        set({
          allData: data,
          isLoaded: true,
          isLoading: false,
          error: null,
        });
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : '데이터 로드 중 오류가 발생했습니다.';
        set({ error: errorMessage, isLoading: false });
      }
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

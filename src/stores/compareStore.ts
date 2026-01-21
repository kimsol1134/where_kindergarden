import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Kindergarten } from '@/types';

/** 비교함 최대 아이템 수 */
const MAX_COMPARE_ITEMS = 3;

/** 비교 스토어 상태 */
interface CompareState {
  items: Kindergarten[];
}

/** 비교 스토어 액션 */
interface CompareActions {
  addItem: (item: Kindergarten) => boolean;
  removeItem: (id: string) => void;
  clearAll: () => void;
  setItems: (items: Kindergarten[]) => void;
  isInCompare: (id: string) => boolean;
  canAdd: () => boolean;
  getItemCount: () => number;
}

export const useCompareStore = create<CompareState & CompareActions>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item) => {
        const { items, canAdd, isInCompare } = get();

        // 이미 추가된 아이템인지 확인
        if (isInCompare(item.kindercode)) {
          return false;
        }

        // 최대 개수 확인
        if (!canAdd()) {
          return false;
        }

        set({ items: [...items, item] });
        return true;
      },

      removeItem: (id) => {
        set((state) => ({
          items: state.items.filter((item) => item.kindercode !== id),
        }));
      },

      clearAll: () => {
        set({ items: [] });
      },

      setItems: (items) => {
        // 최대 3개까지만 저장
        set({ items: items.slice(0, MAX_COMPARE_ITEMS) });
      },

      isInCompare: (id) => {
        return get().items.some((item) => item.kindercode === id);
      },

      canAdd: () => {
        return get().items.length < MAX_COMPARE_ITEMS;
      },

      getItemCount: () => {
        return get().items.length;
      },
    }),
    {
      name: 'kindergarten-compare',
      // partialize를 사용하여 필요한 데이터만 저장
      partialize: (state) => ({ items: state.items }),
    }
  )
);

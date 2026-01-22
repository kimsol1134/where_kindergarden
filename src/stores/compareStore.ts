import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Kindergarten } from '@/types';

/** 비교함 최대 아이템 수 */
const MAX_COMPARE_ITEMS = 3;

/** 비교 스토어 상태 */
interface CompareState {
  items: Kindergarten[];
  /** Map for O(1) lookup by kindercode */
  itemsMap: Map<string, Kindergarten>;
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

/** Helper to create Map from items array */
function createItemsMap(items: Kindergarten[]): Map<string, Kindergarten> {
  return new Map(items.map(item => [item.kindercode, item]));
}

export const useCompareStore = create<CompareState & CompareActions>()(
  persist(
    (set, get) => ({
      items: [],
      itemsMap: new Map(),

      addItem: (item) => {
        const { itemsMap, canAdd } = get();

        // O(1) 조회: 이미 추가된 아이템인지 확인
        if (itemsMap.has(item.kindercode)) {
          return false;
        }

        // 최대 개수 확인
        if (!canAdd()) {
          return false;
        }

        const newItems = [...get().items, item];
        set({
          items: newItems,
          itemsMap: createItemsMap(newItems),
        });
        return true;
      },

      removeItem: (id) => {
        const newItems = get().items.filter((item) => item.kindercode !== id);
        set({
          items: newItems,
          itemsMap: createItemsMap(newItems),
        });
      },

      clearAll: () => {
        set({ items: [], itemsMap: new Map() });
      },

      setItems: (items) => {
        // 최대 3개까지만 저장
        const limitedItems = items.slice(0, MAX_COMPARE_ITEMS);
        set({
          items: limitedItems,
          itemsMap: createItemsMap(limitedItems),
        });
      },

      // O(1) lookup using Map
      isInCompare: (id) => {
        return get().itemsMap.has(id);
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
      // partialize를 사용하여 필요한 데이터만 저장 (Map은 저장하지 않음)
      partialize: (state) => ({ items: state.items }),
      // onRehydrateStorage: 로컬 스토리지에서 복원 시 Map 재생성
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.itemsMap = createItemsMap(state.items);
        }
      },
    }
  )
);

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Kindergarten, InstitutionType } from '@/types';

/**
 * 찜하기 저장용 최소 데이터 구조
 * client-version-localstorage: 필요한 필드만 저장
 */
export interface FavoriteItem {
  kindercode: string;
  name: string;
  type: InstitutionType;
  address: string;
  addedAt: number;
}

/** 찜하기 스토어 상태 */
interface FavoriteState {
  items: FavoriteItem[];
  /** Map for O(1) lookup by kindercode (js-set-map-lookups) */
  itemsMap: Map<string, FavoriteItem>;
}

/** 찜하기 스토어 액션 */
interface FavoriteActions {
  addItem: (kindergarten: Kindergarten) => void;
  removeItem: (kindercode: string) => void;
  toggleItem: (kindergarten: Kindergarten) => void;
  clearAll: () => void;
  isFavorite: (kindercode: string) => boolean;
  getItemCount: () => number;
}

/** Helper to create Map from items array */
function createItemsMap(items: FavoriteItem[]): Map<string, FavoriteItem> {
  return new Map(items.map(item => [item.kindercode, item]));
}

export const useFavoriteStore = create<FavoriteState & FavoriteActions>()(
  persist(
    (set, get) => ({
      items: [],
      itemsMap: new Map(),

      addItem: (kindergarten) => {
        const { itemsMap } = get();
        // O(1) lookup: 이미 추가된 아이템인지 확인
        if (itemsMap.has(kindergarten.kindercode)) return;

        const newItem: FavoriteItem = {
          kindercode: kindergarten.kindercode,
          name: kindergarten.name,
          type: kindergarten.type,
          address: kindergarten.address,
          addedAt: Date.now(),
        };

        // rerender-functional-setstate 패턴
        set((state) => {
          const newItems = [...state.items, newItem];
          return {
            items: newItems,
            itemsMap: createItemsMap(newItems),
          };
        });
      },

      removeItem: (kindercode) => {
        set((state) => {
          const newItems = state.items.filter(item => item.kindercode !== kindercode);
          return {
            items: newItems,
            itemsMap: createItemsMap(newItems),
          };
        });
      },

      toggleItem: (kindergarten) => {
        const { itemsMap, addItem, removeItem } = get();
        if (itemsMap.has(kindergarten.kindercode)) {
          removeItem(kindergarten.kindercode);
        } else {
          addItem(kindergarten);
        }
      },

      clearAll: () => set({ items: [], itemsMap: new Map() }),

      // O(1) lookup using Map
      isFavorite: (kindercode) => get().itemsMap.has(kindercode),

      getItemCount: () => get().items.length,
    }),
    {
      // client-version-localstorage: 버전 관리
      name: 'kindergarten-favorites:v1',
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

import { create } from 'zustand';

interface UIState {
  isBottomSheetOpen: boolean;
  isFavoritesPanelOpen: boolean;
  compareBarHeight: number;
  toast: { message: string; type: 'success' | 'error' } | null;
  setBottomSheetOpen: (open: boolean) => void;
  setFavoritesPanelOpen: (open: boolean) => void;
  setCompareBarHeight: (height: number) => void;
  showToast: (message: string, type: 'success' | 'error') => void;
  dismissToast: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  isBottomSheetOpen: false,
  isFavoritesPanelOpen: false,
  compareBarHeight: 0,
  toast: null,
  setBottomSheetOpen: (open) => set({ isBottomSheetOpen: open }),
  setFavoritesPanelOpen: (open) => set({ isFavoritesPanelOpen: open }),
  setCompareBarHeight: (height) => set({ compareBarHeight: height }),
  showToast: (message, type) => set({ toast: { message, type } }),
  dismissToast: () => set({ toast: null }),
}));

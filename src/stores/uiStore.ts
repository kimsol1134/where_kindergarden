import { create } from 'zustand';
import { AD_BANNER_HEIGHT } from '@/lib/constants';
import { isNative } from '@/lib/utils/platform';

function getInitialAdBannerHeight(): number {
  if (typeof window !== 'undefined' && isNative()) {
    return AD_BANNER_HEIGHT;
  }
  return 0;
}

interface UIState {
  isBottomSheetOpen: boolean;
  isFavoritesPanelOpen: boolean;
  adBannerHeight: number;
  compareBarHeight: number;
  toast: { message: string; type: 'success' | 'error' } | null;
  setBottomSheetOpen: (open: boolean) => void;
  setFavoritesPanelOpen: (open: boolean) => void;
  setAdBannerHeight: (height: number) => void;
  setCompareBarHeight: (height: number) => void;
  showToast: (message: string, type: 'success' | 'error') => void;
  dismissToast: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  isBottomSheetOpen: false,
  isFavoritesPanelOpen: false,
  adBannerHeight: getInitialAdBannerHeight(),
  compareBarHeight: 0,
  toast: null,
  setBottomSheetOpen: (open) => set({ isBottomSheetOpen: open }),
  setFavoritesPanelOpen: (open) => set({ isFavoritesPanelOpen: open }),
  setAdBannerHeight: (height) => set({ adBannerHeight: height }),
  setCompareBarHeight: (height) => set({ compareBarHeight: height }),
  showToast: (message, type) => set({ toast: { message, type } }),
  dismissToast: () => set({ toast: null }),
}));

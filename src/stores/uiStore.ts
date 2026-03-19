import { create } from 'zustand';
import { Capacitor } from '@capacitor/core';

const AD_BANNER_HEIGHT = 50;

// 네이티브 플랫폼에서는 광고 배너 높이를 초기값으로 설정
const getInitialAdBannerHeight = () => {
  if (typeof window !== 'undefined' && Capacitor.isNativePlatform()) {
    return AD_BANNER_HEIGHT;
  }
  return 0;
};

interface UIState {
  isBottomSheetOpen: boolean;
  adBannerHeight: number;
  compareBarHeight: number;
  toast: { message: string; type: 'success' | 'error' } | null;
  setBottomSheetOpen: (open: boolean) => void;
  setAdBannerHeight: (height: number) => void;
  setCompareBarHeight: (height: number) => void;
  showToast: (message: string, type: 'success' | 'error') => void;
  dismissToast: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  isBottomSheetOpen: false,
  adBannerHeight: getInitialAdBannerHeight(),
  compareBarHeight: 0,
  toast: null,
  setBottomSheetOpen: (open) => set({ isBottomSheetOpen: open }),
  setAdBannerHeight: (height) => set({ adBannerHeight: height }),
  setCompareBarHeight: (height) => set({ compareBarHeight: height }),
  showToast: (message, type) => set({ toast: { message, type } }),
  dismissToast: () => set({ toast: null }),
}));

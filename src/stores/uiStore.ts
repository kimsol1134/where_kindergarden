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
  setBottomSheetOpen: (open: boolean) => void;
  setAdBannerHeight: (height: number) => void;
}

export const useUIStore = create<UIState>((set) => ({
  isBottomSheetOpen: false,
  adBannerHeight: getInitialAdBannerHeight(),
  setBottomSheetOpen: (open) => set({ isBottomSheetOpen: open }),
  setAdBannerHeight: (height) => set({ adBannerHeight: height }),
}));

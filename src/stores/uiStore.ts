import { create } from 'zustand';

interface UIState {
  isBottomSheetOpen: boolean;
  adBannerHeight: number;
  setBottomSheetOpen: (open: boolean) => void;
  setAdBannerHeight: (height: number) => void;
}

export const useUIStore = create<UIState>((set) => ({
  isBottomSheetOpen: false,
  adBannerHeight: 0,
  setBottomSheetOpen: (open) => set({ isBottomSheetOpen: open }),
  setAdBannerHeight: (height) => set({ adBannerHeight: height }),
}));

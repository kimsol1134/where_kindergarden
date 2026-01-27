'use client';

import { useEffect, useRef } from 'react';
import { AdMob, BannerAdSize, BannerAdPosition } from '@capacitor-community/admob';
import { useUIStore } from '@/stores';

const AD_BANNER_HEIGHT = 50;

export function MobileAdBanner() {
  const isAdLoaded = useRef(false);
  const isBottomSheetOpen = useUIStore((state) => state.isBottomSheetOpen);
  const setAdBannerHeight = useUIStore((state) => state.setAdBannerHeight);

  useEffect(() => {
    const initAd = async () => {
      try {
        await AdMob.initialize({
          testingDevices: ['2077ef9a63d2b398840261c8221a0c9b'],
          initializeForTesting: true,
        });

        await AdMob.showBanner({
          adId: 'ca-app-pub-5648788643644962/5397823299',
          adSize: BannerAdSize.ADAPTIVE_BANNER,
          position: BannerAdPosition.BOTTOM_CENTER,
          margin: 0,
          isTesting: false,
        });

        isAdLoaded.current = true;
        setAdBannerHeight(AD_BANNER_HEIGHT);
      } catch {
        setAdBannerHeight(0);
      }
    };

    initAd();

    return () => {
      if (isAdLoaded.current) {
        AdMob.hideBanner().catch(() => {});
        AdMob.removeBanner().catch(() => {});
      }
      setAdBannerHeight(0);
    };
  }, [setAdBannerHeight]);

  useEffect(() => {
    if (!isAdLoaded.current) return;

    if (isBottomSheetOpen) {
      AdMob.hideBanner().catch(() => {});
    } else {
      AdMob.resumeBanner().catch(() => {});
    }
  }, [isBottomSheetOpen]);

  return <div style={{ height: `${AD_BANNER_HEIGHT}px` }} aria-hidden="true" />;
}

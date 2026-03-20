'use client';

import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { MobileAdBanner } from './MobileAdBanner';
import { WebAdBanner } from './WebAdBanner';
import { AD_BANNER_HEIGHT } from '@/lib/constants';
import { useUIStore } from '@/stores/uiStore';

export function AdContainer() {
  const [platform, setPlatform] = useState<'web' | 'native' | null>(null);
  const setAdBannerHeight = useUIStore((state) => state.setAdBannerHeight);

  useEffect(() => {
    const isNative = Capacitor.isNativePlatform();
    setPlatform(isNative ? 'native' : 'web');

    // 네이티브 플랫폼일 때 body 클래스 및 CSS 변수 설정
    if (isNative) {
      document.body.classList.add('native-platform');
      document.documentElement.style.setProperty('--ad-banner-height', `${AD_BANNER_HEIGHT}px`);
      setAdBannerHeight(AD_BANNER_HEIGHT);
    }

    return () => {
      document.body.classList.remove('native-platform');
      document.documentElement.style.setProperty('--ad-banner-height', '0px');
    };
  }, [setAdBannerHeight]);

  if (!platform) return null;

  return (
    <div className="w-full flex justify-center items-center bg-gray-50 border-t border-gray-100 dark:bg-gray-900 dark:border-gray-800">
      {platform === 'native' ? <MobileAdBanner /> : <WebAdBanner />}
    </div>
  );
}

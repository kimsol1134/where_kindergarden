'use client';

import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { MobileAdBanner } from './MobileAdBanner';
import { WebAdBanner } from './WebAdBanner';
import { useUIStore } from '@/stores';

const AD_BANNER_HEIGHT = 50;

export function AdContainer() {
  const [platform, setPlatform] = useState<'web' | 'native' | null>(null);
  const setAdBannerHeight = useUIStore((state) => state.setAdBannerHeight);

  useEffect(() => {
    const isNative = Capacitor.isNativePlatform();
    setPlatform(isNative ? 'native' : 'web');

    // 네이티브 플랫폼일 때 즉시 광고 높이 설정 (광고 로드 전에도 공간 확보)
    if (isNative) {
      setAdBannerHeight(AD_BANNER_HEIGHT);
    }
  }, [setAdBannerHeight]);

  if (!platform) return null;

  return (
    <div className="w-full flex justify-center items-center bg-gray-50 border-t border-gray-100 dark:bg-gray-900 dark:border-gray-800">
      {platform === 'native' ? <MobileAdBanner /> : <WebAdBanner />}
    </div>
  );
}

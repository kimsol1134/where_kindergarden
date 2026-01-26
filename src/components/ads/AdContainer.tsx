'use client';

import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { MobileAdBanner } from './MobileAdBanner';
import { WebAdBanner } from './WebAdBanner';

export function AdContainer() {
  const [platform, setPlatform] = useState<'web' | 'native' | null>(null);

  useEffect(() => {
    // Check platform on client-side to avoid hydration mismatch
    const isNative = Capacitor.isNativePlatform();
    setPlatform(isNative ? 'native' : 'web');
  }, []);

  if (!platform) return null; // Wait for client-side check

  return (
    <div className="w-full flex justify-center items-center bg-gray-50 border-t border-gray-100 dark:bg-gray-900 dark:border-gray-800">
      {platform === 'native' ? <MobileAdBanner /> : <WebAdBanner />}
    </div>
  );
}

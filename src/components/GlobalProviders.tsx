'use client';

import { SplashScreen } from '@/components/common/SplashScreen';

export function GlobalProviders({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SplashScreen />
      {children}
    </>
  );
}

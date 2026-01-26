'use client';

import { useEffect } from 'react';
import { SplashScreen } from '@/components/common/SplashScreen';
import { EmailAuthModal } from '@/components/auth/EmailAuthModal';
import { useAuthStore } from '@/stores/authStore';

export function GlobalProviders({ children }: { children: React.ReactNode }) {
  const initialize = useAuthStore((state) => state.initialize);

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <>
      <SplashScreen />
      <EmailAuthModal />
      {children}
    </>
  );
}

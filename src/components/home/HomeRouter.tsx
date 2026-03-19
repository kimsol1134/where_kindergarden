'use client';

import { useState, useEffect, type ReactNode } from 'react';
import { isNative } from '@/lib/utils/platform';
import { AppHome } from './AppHome';

interface HomeRouterProps {
  children: ReactNode;
}

/**
 * 네이티브 앱이면 AppHome을, 웹이면 기존 랜딩페이지(children)를 렌더링합니다.
 * Hydration mismatch를 방지하기 위해 마운트 후에만 분기합니다.
 */
export function HomeRouter({ children }: HomeRouterProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (mounted && isNative()) {
    return <AppHome />;
  }

  return <>{children}</>;
}

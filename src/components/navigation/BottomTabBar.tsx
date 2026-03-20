'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Search, Heart, MoreHorizontal } from 'lucide-react';
import { isNative } from '@/lib/utils/platform';
import { useFavoriteStore, useUIStore } from '@/stores';

export function BottomTabBar() {
  const pathname = usePathname();
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  const favoriteCount = useFavoriteStore((state) => state.getItemCount());
  const setFavoritesPanelOpen = useUIStore((state) => state.setFavoritesPanelOpen);
  const isFavoritesPanelOpen = useUIStore((state) => state.isFavoritesPanelOpen);

  useEffect(() => {
    if (isNative()) {
      setMounted(true); // eslint-disable-line react-hooks/set-state-in-effect -- hydration guard
    }
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) {
      document.documentElement.style.setProperty('--tab-bar-height', '0px');
      return;
    }

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const height = entry.borderBoxSize?.[0]?.blockSize ?? entry.contentRect.height;
        document.documentElement.style.setProperty('--tab-bar-height', `${height}px`);
      }
    });

    observer.observe(el);

    return () => {
      observer.disconnect();
      document.documentElement.style.setProperty('--tab-bar-height', '0px');
    };
  }, [mounted]);

  if (!mounted) return null;

  function handleFavoritesTab(): void {
    if (pathname === '/search') {
      setFavoritesPanelOpen(!isFavoritesPanelOpen);
    } else {
      setFavoritesPanelOpen(true);
      router.push('/search');
    }
  }

  const tabs = [
    {
      key: 'search',
      label: '탐색',
      icon: Search,
      isActive: pathname === '/search' || pathname === '/',
      onClick: () => {
        if (pathname !== '/search' && pathname !== '/') {
          router.push('/search');
        }
      },
    },
    {
      key: 'favorites',
      label: '찜',
      icon: Heart,
      isActive: isFavoritesPanelOpen,
      badge: favoriteCount > 0 ? favoriteCount : undefined,
      onClick: handleFavoritesTab,
    },
    {
      key: 'more',
      label: '더보기',
      icon: MoreHorizontal,
      isActive: pathname === '/about',
      onClick: () => {
        if (pathname !== '/about') {
          router.push('/about');
        }
      },
    },
  ];

  return (
    <nav
      ref={containerRef}
      className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-gray-200 shadow-[0_-2px_10px_rgba(0,0,0,0.06)]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="flex items-center justify-around h-14">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={tab.onClick}
            className={`flex flex-col items-center justify-center flex-1 h-full min-w-[64px] relative transition-colors ${
              tab.isActive
                ? 'text-[var(--brand-leaf)]'
                : 'text-gray-400'
            }`}
            aria-label={tab.label}
          >
            <div className="relative">
              <tab.icon
                className={`w-5 h-5 ${tab.key === 'favorites' && tab.isActive ? 'fill-[var(--brand-leaf)]' : ''}`}
              />
              {tab.badge !== undefined && (
                <span className="absolute -top-1.5 -right-2.5 bg-red-500 text-white text-[9px] min-w-[16px] h-4 rounded-full flex items-center justify-center font-bold px-1">
                  {tab.badge > 99 ? '99+' : tab.badge}
                </span>
              )}
            </div>
            <span className="text-[10px] font-medium mt-0.5">{tab.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}

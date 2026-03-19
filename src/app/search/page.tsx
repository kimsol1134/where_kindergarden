'use client';

import { useEffect, useState, useCallback, useRef, Suspense } from 'react';
import { X } from 'lucide-react';
import { SearchHeader } from '@/components/search/SearchHeader';
import { KindergartenList } from '@/components/search/KindergartenList';
import { MapView } from '@/components/search/MapView';
import { CompareFloatingBar } from '@/components/search/CompareFloatingBar';
import { PanelResizer } from '@/components/search/PanelResizer';
import { useSearchStore, useCompareStore, useUIStore } from '@/stores';
// Direct imports instead of barrel imports for better tree-shaking
import { useGeolocation } from '@/hooks/useGeolocation';
import { useURLSync } from '@/hooks/useURLSync';

/** 패널 너비 제한 (px) */
const PANEL_MIN_WIDTH = 320;
const PANEL_MAX_WIDTH = 700;
const PANEL_DEFAULT_WIDTH = 450;

/** 모바일 뷰 모드 타입 */
type MobileViewMode = 'list' | 'map';

function SearchPageContent() {
  const { location, setLocation, search, isLoading, error, setError } = useSearchStore();
  const { items } = useCompareStore();
  const { getCurrentPosition } = useGeolocation();
  const { getSearchMode } = useURLSync();

  // 모바일에서 리스트/지도 뷰 전환 상태
  const [mobileView, setMobileView] = useState<MobileViewMode>('list');

  // 데스크탑에서 패널 너비 상태
  const [panelWidth, setPanelWidth] = useState(PANEL_DEFAULT_WIDTH);

  // Toast system (global via uiStore)
  const toast = useUIStore((state) => state.toast);
  const showToast = useUIStore((state) => state.showToast);
  const dismissToast = useUIStore((state) => state.dismissToast);
  const [isToastFading, setIsToastFading] = useState(false);
  const manualDismissTimer = useRef<ReturnType<typeof setTimeout>>(null);

  // Show toast when search error occurs
  useEffect(() => {
    if (error) {
      showToast(error, 'error');
      setError(null);
    }
  }, [error, showToast, setError]);

  // Auto-dismiss toast after 5s
  useEffect(() => {
    if (toast) {
      if (manualDismissTimer.current) {
        clearTimeout(manualDismissTimer.current);
        manualDismissTimer.current = null;
      }
      setIsToastFading(false);
      const fadeTimer = setTimeout(() => setIsToastFading(true), 4700);
      const hideTimer = setTimeout(() => dismissToast(), 5000);
      return () => {
        clearTimeout(fadeTimer);
        clearTimeout(hideTimer);
      };
    }
  }, [toast, dismissToast]);

  // Manual toast dismiss
  const handleDismissToast = useCallback(() => {
    setIsToastFading(true);
    manualDismissTimer.current = setTimeout(() => dismissToast(), 300);
  }, [dismissToast]);

  // mode=location 파라미터가 있으면 현재 위치로 검색
  useEffect(() => {
    const mode = getSearchMode();

    if (mode === 'location' && !location) {
      getCurrentPosition()
        .then((coords) => {
          setLocation(coords);
          // 검색은 useURLSync에서 처리됨
        })
        .catch(() => {
          // 에러는 useGeolocation 내부에서 처리됨
        });
    }
  }, [getSearchMode, location, getCurrentPosition, setLocation]);

  // location이 설정되면 검색 실행 (URL에서 복원된 경우 제외)
  useEffect(() => {
    if (location && !isLoading) {
      search();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location?.lat, location?.lng]);

  return (
    <div className="flex h-screen flex-col text-[var(--brand-ink)]">
      <SearchHeader />
      <main className="flex-1 flex overflow-hidden relative">
        <KindergartenList
          mobileView={mobileView}
          onToggleMobileView={() => setMobileView(mobileView === 'list' ? 'map' : 'list')}
          panelWidth={panelWidth}
        />
        <PanelResizer
          onResize={setPanelWidth}
          minWidth={PANEL_MIN_WIDTH}
          maxWidth={PANEL_MAX_WIDTH}
          initialWidth={panelWidth}
        />
        <MapView
          mobileView={mobileView}
          onToggleMobileView={() => setMobileView(mobileView === 'list' ? 'map' : 'list')}
        />
      </main>
      {items.length > 0 && <CompareFloatingBar />}

      {/* 전역 토스트 - Auto-dismiss after 5s with fade animation */}
      {toast && (
        <div
          className={`fixed bottom-4 left-1/2 -translate-x-1/2 ${
            toast.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'
          } text-white px-4 py-2 rounded-lg shadow-lg z-[55] flex items-center gap-3 transition-opacity duration-300 ${
            isToastFading ? 'opacity-0' : 'opacity-100'
          }`}
        >
          <span>{toast.message}</span>
          <button
            onClick={handleDismissToast}
            className="min-w-[44px] min-h-[44px] -mr-2 flex items-center justify-center hover:bg-white/20 rounded-full transition-colors"
            aria-label="닫기"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<SearchPageSkeleton />}>
      <SearchPageContent />
    </Suspense>
  );
}

function SearchPageSkeleton() {
  return (
    <div className="flex h-screen flex-col text-[var(--brand-ink)]">
      {/* Header Skeleton */}
      <header className="z-30 flex-none px-4 pt-3">
        <div className="brand-shell mx-auto flex h-16 max-w-[1920px] items-center justify-between gap-4 px-4">
          <div className="h-10 w-10 rounded-2xl bg-[rgba(203,188,174,0.22)] animate-pulse" />
          <div className="h-10 max-w-xl flex-1 rounded-full bg-[rgba(255,255,255,0.82)] animate-pulse" />
          <div className="h-8 w-20 rounded-full bg-[rgba(255,255,255,0.82)] animate-pulse" />
        </div>
      </header>
      <main className="flex-1 flex overflow-hidden relative">
        {/* List Skeleton */}
        <aside className="z-20 flex w-full flex-col border-r border-white/70 bg-white/72 md:w-[450px] lg:w-[500px]">
          <div className="border-b border-[rgba(203,188,174,0.18)] px-5 py-4">
            <div className="h-6 w-32 rounded bg-[rgba(203,188,174,0.22)] animate-pulse" />
          </div>
          <div className="flex-1 space-y-4 overflow-y-auto bg-[rgba(246,245,239,0.72)] p-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="brand-card rounded-[1.4rem] p-4">
                <div className="flex gap-4">
                  <div className="h-20 w-20 rounded-[1rem] bg-[rgba(203,188,174,0.22)] animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-24 rounded bg-[rgba(203,188,174,0.22)] animate-pulse" />
                    <div className="h-5 w-32 rounded bg-[rgba(203,188,174,0.22)] animate-pulse" />
                    <div className="h-3 w-40 rounded bg-[rgba(203,188,174,0.22)] animate-pulse" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </aside>
        {/* Map Skeleton */}
        <div className="flex-1 animate-pulse bg-[linear-gradient(180deg,rgba(255,255,255,0.76),rgba(78,169,109,0.12))]" />
      </main>
    </div>
  );
}

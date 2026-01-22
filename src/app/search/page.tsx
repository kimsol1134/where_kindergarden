'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { X } from 'lucide-react';
import { SearchHeader } from '@/components/search/SearchHeader';
import { KindergartenList } from '@/components/search/KindergartenList';
import { MapView } from '@/components/search/MapView';
import { CompareFloatingBar } from '@/components/search/CompareFloatingBar';
import { useSearchStore, useCompareStore } from '@/stores';
// Direct imports instead of barrel imports for better tree-shaking
import { useGeolocation } from '@/hooks/useGeolocation';
import { useURLSync } from '@/hooks/useURLSync';

/** 모바일 뷰 모드 타입 */
type MobileViewMode = 'list' | 'map';

function SearchPageContent() {
  const { location, setLocation, search, isLoading, error, setError } = useSearchStore();
  const { items } = useCompareStore();
  const { getCurrentPosition } = useGeolocation();
  const { getSearchMode } = useURLSync();

  // 모바일에서 리스트/지도 뷰 전환 상태
  const [mobileView, setMobileView] = useState<MobileViewMode>('list');

  // Toast visibility and animation state
  const [isToastVisible, setIsToastVisible] = useState(false);
  const [isToastFading, setIsToastFading] = useState(false);

  // Handle toast visibility based on error state
  useEffect(() => {
    if (error) {
      setIsToastVisible(true);
      setIsToastFading(false);

      // Auto-dismiss after 5 seconds
      const fadeTimer = setTimeout(() => {
        setIsToastFading(true);
      }, 4700); // Start fade 300ms before hide

      const hideTimer = setTimeout(() => {
        setIsToastVisible(false);
        setError(null);
      }, 5000);

      return () => {
        clearTimeout(fadeTimer);
        clearTimeout(hideTimer);
      };
    }
  }, [error, setError]);

  // Manual toast dismiss
  const handleDismissToast = useCallback(() => {
    setIsToastFading(true);
    setTimeout(() => {
      setIsToastVisible(false);
      setError(null);
    }, 300);
  }, [setError]);

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
    <div className="bg-gray-50 text-gray-800 flex flex-col h-screen">
      <SearchHeader />
      <main className="flex-1 flex overflow-hidden relative">
        <KindergartenList
          mobileView={mobileView}
          onToggleMobileView={() => setMobileView(mobileView === 'list' ? 'map' : 'list')}
        />
        <MapView
          mobileView={mobileView}
          onToggleMobileView={() => setMobileView(mobileView === 'list' ? 'map' : 'list')}
        />
      </main>
      {items.length > 0 && <CompareFloatingBar />}

      {/* 전역 에러 토스트 - Auto-dismiss after 5s with fade animation */}
      {isToastVisible && (
        <div
          className={`fixed bottom-4 left-1/2 -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 flex items-center gap-3 transition-opacity duration-300 ${
            isToastFading ? 'opacity-0' : 'opacity-100'
          }`}
        >
          <span>{error}</span>
          <button
            onClick={handleDismissToast}
            className="min-w-[44px] min-h-[44px] -mr-2 flex items-center justify-center hover:bg-red-600 rounded-full transition-colors"
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
    <div className="bg-gray-50 text-gray-800 flex flex-col h-screen">
      {/* Header Skeleton */}
      <header className="bg-white border-b border-gray-200 z-30 flex-none">
        <div className="max-w-[1920px] mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <div className="w-8 h-8 bg-gray-200 rounded-lg animate-pulse" />
          <div className="flex-1 max-w-xl h-10 bg-gray-200 rounded-full animate-pulse" />
          <div className="w-20 h-8 bg-gray-200 rounded-lg animate-pulse" />
        </div>
      </header>
      <main className="flex-1 flex overflow-hidden relative">
        {/* List Skeleton */}
        <aside className="w-full md:w-[450px] lg:w-[500px] bg-white flex flex-col border-r border-gray-200 z-20">
          <div className="px-5 py-4 border-b border-gray-100">
            <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-xl p-4 border border-gray-200">
                <div className="flex gap-4">
                  <div className="w-20 h-20 rounded-lg bg-gray-200 animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                    <div className="h-5 w-32 bg-gray-200 rounded animate-pulse" />
                    <div className="h-3 w-40 bg-gray-200 rounded animate-pulse" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </aside>
        {/* Map Skeleton */}
        <div className="flex-1 bg-gray-200 animate-pulse" />
      </main>
    </div>
  );
}

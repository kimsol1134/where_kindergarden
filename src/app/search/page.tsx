'use client';

import { useEffect, useCallback, useState, Suspense } from 'react';
import { SearchHeader } from '@/components/search/SearchHeader';
import { KindergartenList } from '@/components/search/KindergartenList';
import { MapView } from '@/components/search/MapView';
import { CompareFloatingBar } from '@/components/search/CompareFloatingBar';
import { PanelResizer } from '@/components/search/PanelResizer';
import { useSearchStore, useCompareStore } from '@/stores';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useURLSync } from '@/hooks/useURLSync';
import { trackUXEvent } from '@/lib/analytics';

const PANEL_MIN_WIDTH = 320;
const PANEL_MAX_WIDTH = 700;
const PANEL_DEFAULT_WIDTH = 450;

type MobileViewMode = 'list' | 'map';

function SearchPageContent() {
  const {
    location,
    status,
    detailId,
    setLocation,
    setError,
    search,
    startLocationSearch,
    viewMode,
    setViewMode,
  } = useSearchStore();
  const { items } = useCompareStore();
  const { getCurrentPosition } = useGeolocation();
  const { getSearchMode } = useURLSync();

  const mobileView: MobileViewMode = viewMode === 'map' ? 'map' : 'list';

  const [panelWidth, setPanelWidth] = useState(PANEL_DEFAULT_WIDTH);

  const handleCurrentLocationSearch = useCallback(async () => {
    startLocationSearch();

    try {
      const coords = await getCurrentPosition();
      setLocation(coords);
      setViewMode('list');
      trackUXEvent('search_started', { source: 'current_location' });
      await search();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : '위치 정보를 가져오지 못했습니다. 주소로 검색해보세요.';

      setError(message);
    }
  }, [getCurrentPosition, search, setError, setLocation, setViewMode, startLocationSearch]);

  const handleToggleMobileView = useCallback(() => {
    setViewMode(mobileView === 'list' ? 'map' : 'list');
  }, [mobileView, setViewMode]);

  useEffect(() => {
    const mode = getSearchMode();

    if (mode === 'location' && !location && status === 'idle') {
      void handleCurrentLocationSearch();
    }
  }, [getSearchMode, handleCurrentLocationSearch, location, status]);

  return (
    <div className="flex h-screen flex-col bg-gray-50 text-gray-800">
      <SearchHeader
        isLocating={status === 'locating'}
        onRequestCurrentLocation={handleCurrentLocationSearch}
      />
      <main className="relative flex flex-1 overflow-hidden">
        <KindergartenList
          mobileView={mobileView}
          onToggleMobileView={handleToggleMobileView}
          onRequestCurrentLocation={handleCurrentLocationSearch}
          panelWidth={panelWidth}
        />
        <PanelResizer
          onResize={setPanelWidth}
          minWidth={PANEL_MIN_WIDTH}
          maxWidth={PANEL_MAX_WIDTH}
          initialWidth={panelWidth}
        />
        <MapView />
      </main>
      {items.length > 0 && !detailId ? <CompareFloatingBar /> : null}
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
    <div className="flex h-screen flex-col bg-gray-50 text-gray-800">
      <header className="flex-none border-b border-gray-200 bg-white z-30">
        <div className="mx-auto flex h-16 max-w-[1920px] items-center justify-between gap-4 px-4">
          <div className="h-8 w-8 animate-pulse rounded-lg bg-gray-200" />
          <div className="h-10 max-w-xl flex-1 animate-pulse rounded-full bg-gray-200" />
          <div className="h-8 w-10 animate-pulse rounded-lg bg-gray-200" />
        </div>
      </header>
      <main className="relative flex flex-1 overflow-hidden">
        <aside className="z-20 flex w-full flex-col border-r border-gray-200 bg-white md:w-[450px] lg:w-[500px]">
          <div className="border-b border-gray-100 px-5 py-4">
            <div className="h-6 w-32 animate-pulse rounded bg-gray-200" />
          </div>
          <div className="flex-1 space-y-4 overflow-y-auto bg-gray-50 p-4">
            {[1, 2, 3].map((item) => (
              <div key={item} className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="flex gap-4">
                  <div className="h-20 w-20 animate-pulse rounded-lg bg-gray-200" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
                    <div className="h-5 w-32 animate-pulse rounded bg-gray-200" />
                    <div className="h-3 w-40 animate-pulse rounded bg-gray-200" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </aside>
        <div className="flex-1 animate-pulse bg-gray-200" />
      </main>
    </div>
  );
}

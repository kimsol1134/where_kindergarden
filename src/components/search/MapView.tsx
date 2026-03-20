'use client';

import { useRef, useEffect, useCallback, useMemo } from 'react';
import { Crosshair, Plus, Minus, RotateCw, List, Loader2, MapPin } from 'lucide-react';
import { useSearchStore, useCompareStore } from '@/stores';
import { useKakaoMap, useGeolocation } from '@/hooks';
import type { Kindergarten } from '@/types';

/** 모바일 뷰 모드 타입 */
type MobileViewMode = 'list' | 'map';

interface MapViewProps {
  mobileView: MobileViewMode;
  onToggleMobileView: () => void;
}

export function MapView({ mobileView, onToggleMobileView }: MapViewProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);

  const {
    location,
    results,
    isLoading,
    selectedId,
    setSelectedId,
    setLocation,
    search,
  } = useSearchStore();

  const { items: compareItems } = useCompareStore();

  // 비교함 아이템 ID 추출 (순서 보존)
  const compareItemIds = useMemo(
    () => compareItems.map((item) => item.kindercode),
    [compareItems]
  );

  const { getCurrentPosition, isLoading: isGeoLoading } = useGeolocation();

  // 마커 클릭 핸들러
  const handleMarkerClick = useCallback(
    (kindergarten: Kindergarten) => {
      setSelectedId(kindergarten.kindercode);
    },
    [setSelectedId]
  );

  const {
    isLoaded,
    isError,
    errorMessage,
    getLevel,
    setCenter,
    setLevel,
    updateMarkers,
    selectMarker,
    updateCompareItems,
    showCurrentLocation,
  } = useKakaoMap(mapContainerRef, {
    center: location ?? { lat: 37.5665, lng: 126.978 },
    level: 5,
    onMarkerClick: handleMarkerClick,
  });

  // 결과가 변경되면 마커 업데이트 (사용자 위치 포함)
  useEffect(() => {
    if (isLoaded && results.length > 0) {
      updateMarkers(results, location ?? undefined);
    }
  }, [isLoaded, results, location, updateMarkers]);

  // 선택된 마커 하이라이트
  useEffect(() => {
    if (isLoaded) {
      selectMarker(selectedId);
    }
  }, [isLoaded, selectedId, selectMarker]);

  // 현재 위치 표시
  useEffect(() => {
    if (isLoaded && location) {
      showCurrentLocation(location);
    }
  }, [isLoaded, location, showCurrentLocation]);

  // 비교함 상태가 변경되면 마커 업데이트
  useEffect(() => {
    if (isLoaded) {
      updateCompareItems(compareItemIds);
    }
  }, [isLoaded, compareItemIds, updateCompareItems]);

  // 지도 에러 시 모바일에서 목록 뷰로 자동 전환
  useEffect(() => {
    if (isError && mobileView === 'map') {
      onToggleMobileView();
    }
  }, [isError, mobileView, onToggleMobileView]);

  // 현재 위치로 이동
  const handleCurrentLocation = useCallback(async () => {
    try {
      const coords = await getCurrentPosition();
      setLocation(coords);
      setCenter(coords);
      search();
    } catch {
      // 에러는 useGeolocation 내부에서 처리됨
    }
  }, [getCurrentPosition, setLocation, setCenter, search]);

  // 확대
  const handleZoomIn = useCallback(() => {
    const currentLevel = getLevel();
    setLevel(Math.max(1, currentLevel - 1));
  }, [getLevel, setLevel]);

  // 축소
  const handleZoomOut = useCallback(() => {
    const currentLevel = getLevel();
    setLevel(Math.min(14, currentLevel + 1));
  }, [getLevel, setLevel]);

  // 이 지역 재검색
  const handleResearch = useCallback(() => {
    if (location) {
      search();
    }
  }, [location, search]);

  return (
    <div className="flex-1 bg-gray-100 relative h-full w-full">
      {/* 지도 컨테이너 */}
      <div ref={mapContainerRef} className="absolute inset-0">
        {/* 로딩 상태 */}
        {!isLoaded && !isError && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-200">
            <div className="flex flex-col items-center text-gray-500">
              <Loader2 className="w-8 h-8 animate-spin mb-2" />
              <span className="text-sm">지도를 불러오는 중...</span>
            </div>
          </div>
        )}

        {/* 에러 상태 */}
        {isError && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100/80">
            <div className="bg-white rounded-xl shadow-md p-5 mx-4 max-w-xs text-center">
              <MapPin className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-700 mb-1">지도를 불러올 수 없습니다</p>
              <p className="text-xs text-gray-500 mb-3">{errorMessage}</p>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-emerald-500 text-white rounded-lg font-medium text-sm hover:bg-emerald-600 transition-colors min-h-[44px] min-w-[120px]"
              >
                다시 시도
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Map Controls - 44px min touch targets */}
      <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
        <button
          onClick={handleCurrentLocation}
          disabled={isGeoLoading}
          className="bg-white min-w-[44px] min-h-[44px] rounded shadow-md text-gray-600 hover:text-emerald-600 hover:bg-gray-50 disabled:opacity-50 flex items-center justify-center"
          title="현재 위치로 이동"
        >
          {isGeoLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Crosshair className="w-5 h-5" />
          )}
        </button>
        <button
          onClick={handleZoomIn}
          className="bg-white min-w-[44px] min-h-[44px] rounded shadow-md text-gray-600 hover:text-emerald-600 hover:bg-gray-50 flex items-center justify-center"
          title="확대"
        >
          <Plus className="w-5 h-5" />
        </button>
        <button
          onClick={handleZoomOut}
          className="bg-white min-w-[44px] min-h-[44px] rounded shadow-md text-gray-600 hover:text-emerald-600 hover:bg-gray-50 flex items-center justify-center"
          title="축소"
        >
          <Minus className="w-5 h-5" />
        </button>
      </div>

      {/* Re-search Button */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
        <button
          onClick={handleResearch}
          disabled={isLoading || !location}
          className="bg-white px-4 py-2 rounded-full shadow-md text-emerald-600 text-sm font-bold flex items-center gap-2 hover:bg-gray-50 transition-transform hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RotateCw className="w-4 h-4" />
          )}
          이 지역 재검색
        </button>
      </div>

      {/* 모바일 목록 탭 - 좌측 중앙 플로팅 탭 */}
      {mobileView === 'map' && (
        <button
          onClick={onToggleMobileView}
          className="md:hidden fixed left-0 top-1/2 -translate-y-1/2 bg-white/95 backdrop-blur-sm text-gray-700 pr-3 pl-2 py-2.5 rounded-r-full shadow-[0_2px_12px_rgba(0,0,0,0.15)] border border-l-0 border-gray-200 flex items-center gap-1 font-medium text-xs z-50 active:scale-95 transition-transform"
        >
          <span className="text-xs text-gray-600">목록</span>
          <List className="w-4 h-4 text-emerald-600" />
        </button>
      )}

      {/* 결과 개수 표시 */}
      {isLoaded && results.length > 0 && (
        <div className="absolute bottom-4 left-4 bg-white px-3 py-1.5 rounded-full shadow-md text-xs text-gray-600 z-10 hidden md:block">
          {results.length}개 기관 표시 중
        </div>
      )}
    </div>
  );
}

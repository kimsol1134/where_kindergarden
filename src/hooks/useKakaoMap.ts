'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { Coordinates, Kindergarten } from '@/types';

/** Kakao Maps 전역 타입 선언 */
declare global {
  interface Window {
    kakao: {
      maps: {
        load: (callback: () => void) => void;
        Map: new (
          container: HTMLElement,
          options: { center: KakaoLatLng; level: number }
        ) => KakaoMap;
        LatLng: new (lat: number, lng: number) => KakaoLatLng;
        Marker: new (options: {
          position: KakaoLatLng;
          map?: KakaoMap;
          image?: KakaoMarkerImage;
        }) => KakaoMarker;
        MarkerImage: new (
          src: string,
          size: KakaoSize,
          options?: { offset?: KakaoPoint }
        ) => KakaoMarkerImage;
        Size: new (width: number, height: number) => KakaoSize;
        Point: new (x: number, y: number) => KakaoPoint;
        InfoWindow: new (options: {
          content: string;
          removable?: boolean;
        }) => KakaoInfoWindow;
        CustomOverlay: new (options: {
          content: string | HTMLElement;
          position: KakaoLatLng;
          xAnchor?: number;
          yAnchor?: number;
          zIndex?: number;
          map?: KakaoMap;
        }) => KakaoCustomOverlay;
        event: {
          addListener: (
            target: KakaoMarker | KakaoMap,
            type: string,
            callback: () => void
          ) => void;
          removeListener: (
            target: KakaoMarker | KakaoMap,
            type: string,
            callback: () => void
          ) => void;
        };
        LatLngBounds: new () => KakaoLatLngBounds;
        services: {
          Geocoder: new () => KakaoGeocoder;
          Places: new () => KakaoPlaces;
          Status: {
            OK: string;
            ZERO_RESULT: string;
            ERROR: string;
          };
        };
      };
    };
  }

  /** Kakao Geocoder 인터페이스 */
  interface KakaoGeocoder {
    addressSearch: (
      address: string,
      callback: (result: KakaoAddressResult[], status: string) => void
    ) => void;
    coord2RegionCode: (
      lng: number,
      lat: number,
      callback: (result: KakaoRegionResult[], status: string) => void
    ) => void;
  }

  /** Kakao Places 인터페이스 */
  interface KakaoPlaces {
    keywordSearch: (
      keyword: string,
      callback: (result: KakaoPlaceResult[], status: string, pagination: KakaoPagination) => void,
      options?: { size?: number }
    ) => void;
  }

  /** Kakao 주소 검색 결과 */
  interface KakaoAddressResult {
    address_name: string;
    x: string;
    y: string;
    address?: {
      region_1depth_name: string;
      region_2depth_name: string;
      region_3depth_name: string;
      h_code: string;
      b_code: string;
    };
    road_address?: {
      address_name: string;
      region_1depth_name: string;
      region_2depth_name: string;
      region_3depth_name: string;
    };
  }

  /** Kakao 지역 코드 결과 */
  interface KakaoRegionResult {
    region_type: string;
    address_name: string;
    region_1depth_name: string;
    region_2depth_name: string;
    region_3depth_name: string;
    code: string;
    x: number;
    y: number;
  }

  /** Kakao 장소 검색 결과 */
  interface KakaoPlaceResult {
    id: string;
    place_name: string;
    category_name: string;
    address_name: string;
    road_address_name: string;
    x: string;
    y: string;
    phone: string;
    place_url: string;
  }

  /** Kakao 페이지네이션 */
  interface KakaoPagination {
    totalCount: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  }

  interface KakaoLatLng {
    getLat: () => number;
    getLng: () => number;
  }

  interface KakaoMap {
    setCenter: (latLng: KakaoLatLng) => void;
    setLevel: (level: number) => void;
    getLevel: () => number;
    setBounds: (bounds: KakaoLatLngBounds, paddingTop?: number, paddingRight?: number, paddingBottom?: number, paddingLeft?: number) => void;
  }

  interface KakaoMarker {
    setMap: (map: KakaoMap | null) => void;
    getPosition: () => KakaoLatLng;
    setImage: (image: KakaoMarkerImage) => void;
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface KakaoMarkerImage {}

  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface KakaoSize {}

  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface KakaoPoint {}

  interface KakaoInfoWindow {
    open: (map: KakaoMap, marker: KakaoMarker) => void;
    close: () => void;
    setContent: (content: string) => void;
  }

  interface KakaoCustomOverlay {
    setMap: (map: KakaoMap | null) => void;
    setPosition: (position: KakaoLatLng) => void;
    setContent: (content: string | HTMLElement) => void;
  }

  interface KakaoLatLngBounds {
    extend: (latLng: KakaoLatLng) => void;
  }
}

/** 마커 데이터 타입 */
interface MarkerData {
  id: string;
  marker: KakaoMarker;
  kindergarten: Kindergarten;
}

/** Kakao Map 훅 상태 */
interface KakaoMapState {
  isLoaded: boolean;
  isError: boolean;
  errorMessage: string | null;
}

/** Kakao Map 훅 옵션 */
interface KakaoMapOptions {
  center?: Coordinates;
  level?: number;
  onMarkerClick?: (kindergarten: Kindergarten) => void;
}

const KAKAO_SDK_URL = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.NEXT_PUBLIC_KAKAO_JS_KEY}&autoload=false&libraries=services`;
const DEFAULT_CENTER: Coordinates = { lat: 37.5665, lng: 126.978 }; // 서울시청
const DEFAULT_LEVEL = 5;
const SDK_LOAD_TIMEOUT_MS = 10000; // SDK 로드 타임아웃 (10초)

/** 마커 색상 상수 */
const MARKER_COLORS = {
  default: '#10B981',      // 에메랄드
  selected: '#059669',     // 진한 에메랄드
  compare: '#F97316',      // 오렌지
  compareSelected: '#EA580C', // 진한 오렌지
} as const;

/** 마커 크기 상수 */
const MARKER_SIZE = {
  width: 20,
  height: 25,
} as const;

/**
 * 마커 SVG Data URL 생성
 * @param options.isSelected - 선택 상태
 * @param options.comparePosition - 비교함 위치 (1, 2, 3) 또는 null
 */
function generateMarkerDataUrl(options: {
  isSelected: boolean;
  comparePosition: number | null;
}): string {
  const { isSelected, comparePosition } = options;
  const isCompare = comparePosition !== null;

  // 색상 결정
  let fillColor: string;
  if (isCompare) {
    fillColor = isSelected ? MARKER_COLORS.compareSelected : MARKER_COLORS.compare;
  } else {
    fillColor = isSelected ? MARKER_COLORS.selected : MARKER_COLORS.default;
  }

  // SVG 생성 (20x25 크기로 축소)
  let svg: string;
  if (isCompare) {
    // 비교함 마커: 숫자 표시
    svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="25" viewBox="0 0 20 25">
        <path d="M10 0C4.477 0 0 4.477 0 10c0 5.523 10 15 10 15s10-9.477 10-15C20 4.477 15.523 0 10 0z" fill="${fillColor}"/>
        <circle cx="10" cy="9" r="6" fill="white"/>
        <text x="10" y="12" text-anchor="middle" font-family="Arial, sans-serif" font-size="9" font-weight="bold" fill="${fillColor}">${comparePosition}</text>
      </svg>
    `;
  } else if (isSelected) {
    // 선택된 마커: 채워진 원
    svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="25" viewBox="0 0 20 25">
        <path d="M10 0C4.477 0 0 4.477 0 10c0 5.523 10 15 10 15s10-9.477 10-15C20 4.477 15.523 0 10 0z" fill="${fillColor}"/>
        <circle cx="10" cy="9" r="4" fill="white"/>
      </svg>
    `;
  } else {
    // 기본 마커: 링 모양
    svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="25" viewBox="0 0 20 25">
        <path d="M10 0C4.477 0 0 4.477 0 10c0 5.523 10 15 10 15s10-9.477 10-15C20 4.477 15.523 0 10 0z" fill="${fillColor}"/>
        <circle cx="10" cy="9" r="4" fill="none" stroke="white" stroke-width="1.5"/>
      </svg>
    `;
  }

  return 'data:image/svg+xml,' + encodeURIComponent(svg.trim());
}

/**
 * Kakao Maps SDK 래핑 훅
 */
export function useKakaoMap(
  containerRef: React.RefObject<HTMLDivElement | null>,
  options: KakaoMapOptions = {}
) {
  const { center = DEFAULT_CENTER, level = DEFAULT_LEVEL, onMarkerClick } = options;

  const [state, setState] = useState<KakaoMapState>({
    isLoaded: false,
    isError: false,
    errorMessage: null,
  });

  const mapRef = useRef<KakaoMap | null>(null);
  const markersRef = useRef<MarkerData[]>([]);
  const currentLocationMarkerRef = useRef<KakaoMarker | null>(null);
  const customOverlayRef = useRef<KakaoCustomOverlay | null>(null);
  const selectedMarkerIdRef = useRef<string | null>(null);
  const compareItemsRef = useRef<string[]>([]); // 비교함 아이템 ID 배열 (순서 보존)

  // SDK 스크립트 로드
  useEffect(() => {
    // API 키 체크
    if (!process.env.NEXT_PUBLIC_KAKAO_JS_KEY) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- SDK 로드 실패 시 상태 업데이트 필요
      setState({
        isLoaded: false,
        isError: true,
        errorMessage: 'Kakao API 키가 설정되지 않았습니다.',
      });
      return;
    }

    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let isResolved = false;

    const resolveSuccess = () => {
      if (isResolved) return;
      isResolved = true;
      if (timeoutId) clearTimeout(timeoutId);
      setState({ isLoaded: true, isError: false, errorMessage: null });
    };

    const resolveError = (message: string) => {
      if (isResolved) return;
      isResolved = true;
      if (timeoutId) clearTimeout(timeoutId);
      setState({ isLoaded: false, isError: true, errorMessage: message });
    };

    const existingScript = document.getElementById('kakao-maps-sdk');

    if (existingScript) {
      // 이미 로드된 경우
      if (window.kakao?.maps) {
        window.kakao.maps.load(resolveSuccess);
      } else {
        // 스크립트는 있지만 kakao 객체가 없는 경우 - 로드 실패
        resolveError('Kakao Maps SDK 로드에 실패했습니다. 도메인 설정을 확인해주세요.');
      }
      return;
    }

    // 타임아웃 설정 (SDK 로드가 조용히 실패하는 경우 대응)
    timeoutId = setTimeout(() => {
      resolveError('지도 로딩 시간이 초과되었습니다. 네트워크 연결을 확인해주세요.');
    }, SDK_LOAD_TIMEOUT_MS);

    const script = document.createElement('script');
    script.id = 'kakao-maps-sdk';
    script.src = KAKAO_SDK_URL;
    script.async = true;

    script.onload = () => {
      if (window.kakao?.maps) {
        window.kakao.maps.load(() => {
          resolveSuccess();
        });
      } else {
        resolveError('Kakao Maps SDK가 로드되었지만 초기화에 실패했습니다.');
      }
    };

    script.onerror = () => {
      resolveError('Kakao Maps SDK 로드에 실패했습니다. 네트워크 연결을 확인해주세요.');
    };

    document.head.appendChild(script);

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      // 스크립트는 재사용을 위해 제거하지 않음
    };
  }, []);

  // 지도 초기화
  useEffect(() => {
    if (!state.isLoaded || !containerRef.current || mapRef.current) {
      return;
    }

    const { kakao } = window;
    const mapCenter = new kakao.maps.LatLng(center.lat, center.lng);
    const mapOptions = {
      center: mapCenter,
      level,
    };

    mapRef.current = new kakao.maps.Map(containerRef.current, mapOptions);

    // CustomOverlay는 표시할 때 생성
  }, [state.isLoaded, containerRef, center.lat, center.lng, level]);

  // 지도 중심 이동
  const setCenter = useCallback((coords: Coordinates) => {
    if (!mapRef.current || !window.kakao) return;

    const newCenter = new window.kakao.maps.LatLng(coords.lat, coords.lng);
    mapRef.current.setCenter(newCenter);
  }, []);

  // 지도 레벨 설정
  const setLevel = useCallback((newLevel: number) => {
    if (!mapRef.current) return;
    mapRef.current.setLevel(newLevel);
  }, []);

  // 인포윈도우 표시
  const showInfoWindow = useCallback((marker: KakaoMarker, kindergarten: Kindergarten) => {
    if (!mapRef.current || !window.kakao) return;

    // 기존 오버레이 제거
    if (customOverlayRef.current) {
      customOverlayRef.current.setMap(null);
    }

    const position = marker.getPosition();

    // 닫기 버튼이 있는 스타일링된 컨텐츠
    const content = `
      <div style="
        position: relative;
        background: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.25);
        padding: 10px 12px;
        min-width: 120px;
        font-size: 13px;
        border: 1px solid #e5e7eb;
        transform: translateY(-8px);
      ">
        <button onclick="this.parentElement.parentElement.style.display='none'" style="
          position: absolute;
          top: 4px;
          right: 6px;
          background: none;
          border: none;
          font-size: 16px;
          cursor: pointer;
          color: #9ca3af;
          padding: 0;
          line-height: 1;
        ">×</button>
        <strong style="display: block; margin-bottom: 3px; padding-right: 16px; color: #111827;">${kindergarten.name}</strong>
        <span style="color: #6b7280; font-size: 12px;">${kindergarten.distance.toFixed(1)}km</span>
        <div style="
          position: absolute;
          bottom: -8px;
          left: 50%;
          transform: translateX(-50%);
          width: 0;
          height: 0;
          border-left: 8px solid transparent;
          border-right: 8px solid transparent;
          border-top: 8px solid white;
          filter: drop-shadow(0 2px 2px rgba(0,0,0,0.1));
        "></div>
      </div>
    `;

    // 새 CustomOverlay 생성 (yAnchor를 높게 설정하여 마커 위에 표시)
    customOverlayRef.current = new window.kakao.maps.CustomOverlay({
      content,
      position,
      xAnchor: 0.5,
      yAnchor: 1.3, // 마커 위로 충분히 올림
      zIndex: 100,
    });

    customOverlayRef.current.setMap(mapRef.current);
  }, []);

  // 비교함 위치 가져오기 (1, 2, 3 또는 null)
  const getComparePosition = useCallback((kindercode: string): number | null => {
    const index = compareItemsRef.current.indexOf(kindercode);
    return index === -1 ? null : index + 1;
  }, []);

  // 마커 생성 함수
  const createMarker = useCallback(
    (kindergarten: Kindergarten, isSelected = false): KakaoMarker | null => {
      if (!mapRef.current || !window.kakao) return null;

      const { kakao } = window;
      const position = new kakao.maps.LatLng(kindergarten.lat, kindergarten.lng);

      // 마커 이미지 설정 (비교함 상태 포함)
      const comparePosition = getComparePosition(kindergarten.kindercode);
      const imageSrc = generateMarkerDataUrl({ isSelected, comparePosition });
      const imageSize = new kakao.maps.Size(MARKER_SIZE.width, MARKER_SIZE.height);
      const imageOption = { offset: new kakao.maps.Point(MARKER_SIZE.width / 2, MARKER_SIZE.height) };
      const markerImage = new kakao.maps.MarkerImage(imageSrc, imageSize, imageOption);

      const marker = new kakao.maps.Marker({
        position,
        map: mapRef.current,
        image: markerImage,
      });

      // 클릭 이벤트
      kakao.maps.event.addListener(marker, 'click', () => {
        onMarkerClick?.(kindergarten);
        showInfoWindow(marker, kindergarten);
      });

      return marker;
    },
    [onMarkerClick, showInfoWindow, getComparePosition]
  );

  // 마커 업데이트
  const updateMarkers = useCallback(
    (kindergartens: Kindergarten[], userLocation?: Coordinates) => {
      if (!mapRef.current || !window.kakao) return;

      // 기존 마커 제거
      markersRef.current.forEach(({ marker }) => {
        marker.setMap(null);
      });
      markersRef.current = [];

      // 새 마커 생성
      kindergartens.forEach((k) => {
        const marker = createMarker(k, selectedMarkerIdRef.current === k.kindercode);
        if (marker) {
          markersRef.current.push({
            id: k.kindercode,
            marker,
            kindergarten: k,
          });
        }
      });

      // 마커가 모두 보이도록 지도 범위 조정 (사용자 위치 포함)
      if (kindergartens.length > 0) {
        const bounds = new window.kakao.maps.LatLngBounds();

        // 사용자 현재 위치를 bounds에 포함
        if (userLocation) {
          bounds.extend(new window.kakao.maps.LatLng(userLocation.lat, userLocation.lng));
        }

        kindergartens.forEach((k) => {
          bounds.extend(new window.kakao.maps.LatLng(k.lat, k.lng));
        });
        mapRef.current.setBounds(bounds, 50, 50, 50, 50);
      }
    },
    [createMarker]
  );

  // 선택된 마커 하이라이트
  const selectMarker = useCallback((id: string | null) => {
    if (!window.kakao) return;

    selectedMarkerIdRef.current = id;

    markersRef.current.forEach(({ marker, kindergarten }) => {
      const isSelected = kindergarten.kindercode === id;
      const comparePosition = getComparePosition(kindergarten.kindercode);
      const imageSrc = generateMarkerDataUrl({ isSelected, comparePosition });
      const imageSize = new window.kakao.maps.Size(MARKER_SIZE.width, MARKER_SIZE.height);
      const imageOption = { offset: new window.kakao.maps.Point(MARKER_SIZE.width / 2, MARKER_SIZE.height) };
      const markerImage = new window.kakao.maps.MarkerImage(imageSrc, imageSize, imageOption);
      marker.setImage(markerImage);

      // 선택된 마커로 인포윈도우 표시
      if (isSelected) {
        showInfoWindow(marker, kindergarten);
      }
    });
  }, [showInfoWindow, getComparePosition]);

  // 비교함 아이템 업데이트
  const updateCompareItems = useCallback((compareItemIds: string[]) => {
    if (!window.kakao) return;

    compareItemsRef.current = compareItemIds;

    // 모든 마커의 이미지 업데이트
    markersRef.current.forEach(({ marker, kindergarten }) => {
      const isSelected = kindergarten.kindercode === selectedMarkerIdRef.current;
      const comparePosition = getComparePosition(kindergarten.kindercode);
      const imageSrc = generateMarkerDataUrl({ isSelected, comparePosition });
      const imageSize = new window.kakao.maps.Size(MARKER_SIZE.width, MARKER_SIZE.height);
      const imageOption = { offset: new window.kakao.maps.Point(MARKER_SIZE.width / 2, MARKER_SIZE.height) };
      const markerImage = new window.kakao.maps.MarkerImage(imageSrc, imageSize, imageOption);
      marker.setImage(markerImage);
    });
  }, [getComparePosition]);

  // 현재 위치 마커 표시
  const showCurrentLocation = useCallback((coords: Coordinates) => {
    if (!mapRef.current || !window.kakao) return;

    const { kakao } = window;

    // 기존 현재 위치 마커 제거
    if (currentLocationMarkerRef.current) {
      currentLocationMarkerRef.current.setMap(null);
    }

    const position = new kakao.maps.LatLng(coords.lat, coords.lng);

    // 현재 위치 마커 이미지 (파란 점)
    const imageSrc = 'data:image/svg+xml,' + encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20">
        <circle cx="10" cy="10" r="8" fill="#4285F4" stroke="white" stroke-width="3"/>
      </svg>
    `);
    const imageSize = new kakao.maps.Size(20, 20);
    const imageOption = { offset: new kakao.maps.Point(10, 10) };
    const markerImage = new kakao.maps.MarkerImage(imageSrc, imageSize, imageOption);

    currentLocationMarkerRef.current = new kakao.maps.Marker({
      position,
      map: mapRef.current,
      image: markerImage,
    });

    // 지도 중심을 현재 위치로 이동
    mapRef.current.setCenter(position);
  }, []);

  // 인포윈도우 닫기
  const closeInfoWindow = useCallback(() => {
    if (customOverlayRef.current) {
      customOverlayRef.current.setMap(null);
    }
  }, []);

  // 지도 존재 여부 확인 (렌더링 중 ref 접근 방지)
  const getMap = useCallback(() => mapRef.current, []);

  // 현재 줌 레벨 가져오기
  const getLevel = useCallback(() => mapRef.current?.getLevel() ?? 5, []);

  return {
    ...state,
    getMap,
    getLevel,
    setCenter,
    setLevel,
    updateMarkers,
    selectMarker,
    updateCompareItems,
    showCurrentLocation,
    closeInfoWindow,
  };
}

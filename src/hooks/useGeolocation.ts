'use client';

import { useState, useCallback, useRef } from 'react';
import { Geolocation } from '@capacitor/geolocation';
import type { Coordinates } from '@/types';
import { isNative } from '@/lib/utils/platform';

interface GeolocationState {
  coordinates: Coordinates | null;
  error: string | null;
  isLoading: boolean;
}

interface GeolocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
  /** 최초 위치 요청 전 호출되는 콜백. true 반환 시 진행, false 반환 시 취소 */
  onBeforeRequest?: () => Promise<boolean>;
}

const DEFAULT_ENABLE_HIGH_ACCURACY = true;
const DEFAULT_TIMEOUT = 10000;
const DEFAULT_MAXIMUM_AGE = 0;

/** Capacitor 에러 메시지를 사용자 친화적 메시지로 변환 */
function toNativeErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();

  if (lower.includes('denied') || lower.includes('permission')) {
    return '위치 권한이 거부되었습니다. 설정에서 위치 권한을 허용해주세요.';
  }
  if (lower.includes('unavailable') || lower.includes('location services')) {
    return '위치 정보를 사용할 수 없습니다. 위치 서비스가 켜져 있는지 확인해주세요.';
  }
  if (lower.includes('timeout')) {
    return '위치 요청 시간이 초과되었습니다.';
  }
  return '위치를 가져오는데 실패했습니다.';
}

/** 브라우저 GeolocationPositionError 코드를 사용자 친화적 메시지로 변환 */
function toBrowserErrorMessage(error: GeolocationPositionError): string {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return '위치 권한이 거부되었습니다. 브라우저 설정에서 위치 권한을 허용해주세요.';
    case error.POSITION_UNAVAILABLE:
      return '위치 정보를 사용할 수 없습니다.';
    case error.TIMEOUT:
      return '위치 요청 시간이 초과되었습니다.';
    default:
      return '알 수 없는 오류가 발생했습니다.';
  }
}

function extractCoordinates(position: { coords: { latitude: number; longitude: number } }): Coordinates {
  return {
    lat: position.coords.latitude,
    lng: position.coords.longitude,
  };
}

export function useGeolocation(options: GeolocationOptions = {}) {
  const [state, setState] = useState<GeolocationState>({
    coordinates: null,
    error: null,
    isLoading: false,
  });

  const enableHighAccuracy = options.enableHighAccuracy ?? DEFAULT_ENABLE_HIGH_ACCURACY;
  const timeout = options.timeout ?? DEFAULT_TIMEOUT;
  const maximumAge = options.maximumAge ?? DEFAULT_MAXIMUM_AGE;
  const onBeforeRequest = options.onBeforeRequest;

  const permissionShownRef = useRef(false);

  const getCurrentPosition = useCallback(async (): Promise<Coordinates> => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    if (onBeforeRequest && !permissionShownRef.current) {
      permissionShownRef.current = true;
      const shouldProceed = await onBeforeRequest();
      if (!shouldProceed) {
        setState((prev) => ({ ...prev, isLoading: false }));
        throw new Error('사용자가 위치 요청을 취소했습니다.');
      }
    }

    try {
      const positionOptions = { enableHighAccuracy, timeout, maximumAge };
      const coords = isNative()
        ? extractCoordinates(await Geolocation.getCurrentPosition(positionOptions))
        : await getBrowserPosition(positionOptions);

      setState({ coordinates: coords, error: null, isLoading: false });
      return coords;
    } catch (error) {
      const errorMessage = isNative()
        ? toNativeErrorMessage(error)
        : error instanceof Error
          ? error.message
          : '위치를 가져오는데 실패했습니다.';

      setState({ coordinates: null, error: errorMessage, isLoading: false });
      throw error;
    }
  }, [enableHighAccuracy, timeout, maximumAge, onBeforeRequest]);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  return {
    ...state,
    getCurrentPosition,
    clearError,
  };
}

function getBrowserPosition(options: PositionOptions): Promise<Coordinates> {
  if (!navigator.geolocation) {
    return Promise.reject(new Error('이 브라우저는 위치 서비스를 지원하지 않습니다.'));
  }

  return new Promise<Coordinates>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => resolve(extractCoordinates(position)),
      (error) => reject(new Error(toBrowserErrorMessage(error))),
      options,
    );
  });
}

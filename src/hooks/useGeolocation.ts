'use client';

import { useState, useCallback } from 'react';
import { Geolocation } from '@capacitor/geolocation';
import type { Coordinates } from '@/types';
import { isNative } from '@/lib/utils/platform';

/** Geolocation 상태 */
interface GeolocationState {
  coordinates: Coordinates | null;
  error: string | null;
  isLoading: boolean;
}

/** Geolocation 훅 옵션 */
interface GeolocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
}

const DEFAULT_OPTIONS: GeolocationOptions = {
  enableHighAccuracy: true,
  timeout: 10000,
  maximumAge: 0,
};

/**
 * 브라우저 Geolocation API를 래핑하는 훅
 */
export function useGeolocation(options: GeolocationOptions = {}) {
  const [state, setState] = useState<GeolocationState>({
    coordinates: null,
    error: null,
    isLoading: false,
  });

  // 개별 옵션 값들을 추출 (의존성 배열에서 사용)
  const enableHighAccuracy = options.enableHighAccuracy ?? DEFAULT_OPTIONS.enableHighAccuracy;
  const timeout = options.timeout ?? DEFAULT_OPTIONS.timeout;
  const maximumAge = options.maximumAge ?? DEFAULT_OPTIONS.maximumAge;

  const getCurrentPosition = useCallback(async (): Promise<Coordinates> => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      let coords: Coordinates;

      if (isNative()) {
        // Capacitor 플러그인 사용 (권한 요청 자동 처리)
        const position = await Geolocation.getCurrentPosition({
          enableHighAccuracy,
          timeout,
          maximumAge,
        });
        coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
      } else {
        // 브라우저 Geolocation API 사용
        if (!navigator.geolocation) {
          throw new Error('이 브라우저는 위치 서비스를 지원하지 않습니다.');
        }

        coords = await new Promise<Coordinates>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              resolve({
                lat: position.coords.latitude,
                lng: position.coords.longitude,
              });
            },
            (error) => {
              let errorMessage: string;

              switch (error.code) {
                case error.PERMISSION_DENIED:
                  errorMessage = '위치 권한이 거부되었습니다. 브라우저 설정에서 위치 권한을 허용해주세요.';
                  break;
                case error.POSITION_UNAVAILABLE:
                  errorMessage = '위치 정보를 사용할 수 없습니다.';
                  break;
                case error.TIMEOUT:
                  errorMessage = '위치 요청 시간이 초과되었습니다.';
                  break;
                default:
                  errorMessage = '알 수 없는 오류가 발생했습니다.';
              }
              reject(new Error(errorMessage));
            },
            { enableHighAccuracy, timeout, maximumAge }
          );
        });
      }

      setState({
        coordinates: coords,
        error: null,
        isLoading: false,
      });
      return coords;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '위치를 가져오는데 실패했습니다.';
      setState({
        coordinates: null,
        error: errorMessage,
        isLoading: false,
      });
      throw error;
    }
  }, [enableHighAccuracy, timeout, maximumAge]);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  return {
    ...state,
    getCurrentPosition,
    clearError,
  };
}

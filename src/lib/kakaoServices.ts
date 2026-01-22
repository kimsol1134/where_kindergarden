'use client';

import type { GeocodeResult } from '@/types';

/**
 * Kakao SDK Services가 로드되었는지 확인
 */
export function isKakaoServicesLoaded(): boolean {
  return !!(window.kakao?.maps?.services);
}

/**
 * Kakao SDK를 사용한 주소 검색 (클라이언트 사이드)
 * 서버 API 호출 없이 직접 Kakao SDK를 사용
 */
export function searchAddressWithKakaoSDK(query: string): Promise<GeocodeResult[]> {
  return new Promise((resolve, reject) => {
    if (!isKakaoServicesLoaded()) {
      reject(new Error('Kakao Services SDK가 로드되지 않았습니다.'));
      return;
    }

    const geocoder = new window.kakao.maps.services.Geocoder();
    const places = new window.kakao.maps.services.Places();
    const results: GeocodeResult[] = [];
    let pendingCalls = 2;

    const checkComplete = () => {
      pendingCalls--;
      if (pendingCalls === 0) {
        // 중복 제거 및 정렬
        const uniqueResults = removeDuplicateResults(results);
        resolve(uniqueResults);
      }
    };

    // 1. 주소 검색
    geocoder.addressSearch(query, (addressResults, status) => {
      if (status === window.kakao.maps.services.Status.OK) {
        addressResults.forEach((result) => {
          const hCode = result.address?.h_code || '';
          results.push({
            lat: parseFloat(result.y),
            lng: parseFloat(result.x),
            address: result.address_name,
            sidoCode: hCode.substring(0, 2),
            sigunguCode: hCode.substring(0, 5),
            placeName: undefined,
          });
        });
      }
      checkComplete();
    });

    // 2. 키워드 검색 (장소명, 아파트 이름 등)
    places.keywordSearch(query, (placeResults, status) => {
      if (status === window.kakao.maps.services.Status.OK) {
        placeResults.slice(0, 5).forEach((result) => {
          results.push({
            lat: parseFloat(result.y),
            lng: parseFloat(result.x),
            address: result.address_name,
            sidoCode: '', // 키워드 검색은 지역코드 없음
            sigunguCode: '',
            placeName: result.place_name,
          });
        });
      }
      checkComplete();
    }, { size: 5 });
  });
}

/**
 * Kakao SDK를 사용한 역지오코딩 (좌표 → 지역정보)
 */
export function reverseGeocodeWithKakaoSDK(
  lat: number,
  lng: number
): Promise<{ sidoCode: string; sigunguCode: string; sidoName: string; sigunguName: string } | null> {
  return new Promise((resolve, reject) => {
    if (!isKakaoServicesLoaded()) {
      reject(new Error('Kakao Services SDK가 로드되지 않았습니다.'));
      return;
    }

    const geocoder = new window.kakao.maps.services.Geocoder();

    geocoder.coord2RegionCode(lng, lat, (results, status) => {
      if (status !== window.kakao.maps.services.Status.OK) {
        resolve(null);
        return;
      }

      // H (행정동) 타입 찾기
      const adminResult = results.find((r) => r.region_type === 'H');

      if (!adminResult) {
        resolve(null);
        return;
      }

      const code = adminResult.code;

      resolve({
        sidoCode: code.substring(0, 2),
        sigunguCode: code.substring(0, 5),
        sidoName: adminResult.region_1depth_name,
        sigunguName: adminResult.region_2depth_name,
      });
    });
  });
}

/**
 * 중복 결과 제거 (주소 기준)
 */
function removeDuplicateResults(results: GeocodeResult[]): GeocodeResult[] {
  const seen = new Set<string>();
  return results.filter((result) => {
    const key = `${result.lat.toFixed(5)},${result.lng.toFixed(5)}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

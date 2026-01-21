import type { Coordinates } from '@/types';

const EARTH_RADIUS_KM = 6371;

/**
 * 두 좌표 사이의 거리를 계산합니다 (Haversine formula)
 * @param point1 - 첫 번째 좌표
 * @param point2 - 두 번째 좌표
 * @returns 거리 (km)
 */
export function calculateDistance(
  point1: Coordinates,
  point2: Coordinates
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(point2.lat - point1.lat);
  const dLng = toRad(point2.lng - point1.lng);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(point1.lat)) *
      Math.cos(toRad(point2.lat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_KM * c;
}

/**
 * 주어진 반경 내에 있는지 확인합니다
 * @param center - 중심 좌표
 * @param point - 확인할 좌표
 * @param radiusKm - 반경 (km)
 * @returns 반경 내에 있으면 true
 */
export function isWithinRadius(
  center: Coordinates,
  point: Coordinates,
  radiusKm: number
): boolean {
  return calculateDistance(center, point) <= radiusKm;
}

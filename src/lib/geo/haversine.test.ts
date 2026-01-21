import { describe, it, expect } from 'vitest';
import { calculateDistance, isWithinRadius } from './haversine';

describe('calculateDistance', () => {
  it('서울시청과 남산타워 사이 거리를 계산한다', () => {
    const seoulCityHall = { lat: 37.5665, lng: 126.978 };
    const namsanTower = { lat: 37.5512, lng: 126.9882 };

    const distance = calculateDistance(seoulCityHall, namsanTower);

    // 약 1.89km
    expect(distance).toBeCloseTo(1.89, 1);
  });

  it('같은 좌표의 거리는 0이다', () => {
    const point = { lat: 37.5665, lng: 126.978 };

    const distance = calculateDistance(point, point);

    expect(distance).toBe(0);
  });

  it('서울에서 부산까지 거리를 계산한다', () => {
    const seoul = { lat: 37.5665, lng: 126.978 };
    const busan = { lat: 35.1796, lng: 129.0756 };

    const distance = calculateDistance(seoul, busan);

    // 약 325km
    expect(distance).toBeCloseTo(325, -1);
  });
});

describe('isWithinRadius', () => {
  const center = { lat: 37.5665, lng: 126.978 };

  it('반경 내의 좌표는 true를 반환한다', () => {
    const nearby = { lat: 37.567, lng: 126.979 }; // 약 0.1km 거리

    expect(isWithinRadius(center, nearby, 1)).toBe(true);
  });

  it('반경 밖의 좌표는 false를 반환한다', () => {
    const farAway = { lat: 37.6, lng: 127.0 }; // 약 4km 거리

    expect(isWithinRadius(center, farAway, 1)).toBe(false);
  });

  it('정확히 반경 거리에 있는 좌표는 true를 반환한다', () => {
    const namsanTower = { lat: 37.5512, lng: 126.9882 }; // 약 1.89km

    expect(isWithinRadius(center, namsanTower, 2)).toBe(true);
    expect(isWithinRadius(center, namsanTower, 1)).toBe(false);
  });
});

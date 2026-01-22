import type { Kindergarten, Coordinates, MealType } from '@/types';
import type { KindergartenRaw } from '@/stores/kindergartenStore';
import { calculateDistance } from '@/lib/geo';

/**
 * KindergartenRaw를 Kindergarten 타입으로 변환
 * @param raw - 원본 데이터
 * @param userLocation - 사용자 위치 (거리 계산용, 없으면 distance=-1)
 */
export function transformToKindergarten(
  raw: KindergartenRaw,
  userLocation?: Coordinates
): Kindergarten {
  const distance = userLocation
    ? Math.round(calculateDistance(userLocation, { lat: raw.lat, lng: raw.lng }) * 100) / 100
    : -1;

  return transformToKindergartenWithDistance(raw, distance);
}

/**
 * KindergartenRaw를 Kindergarten 타입으로 변환 (거리값 직접 지정)
 * @param raw - 원본 데이터
 * @param distance - 표시할 거리값
 */
export function transformToKindergartenWithDistance(
  raw: KindergartenRaw,
  distance: number
): Kindergarten {
  return {
    kindercode: raw.kindercode,
    name: raw.name,
    type: raw.type === 'public' ? 'public' : 'private',
    address: raw.address,
    lat: raw.lat,
    lng: raw.lng,
    distance,
    sidoCode: raw.sido_code,
    sigunguCode: raw.sigungu_code,

    // 정원/현원
    capacity: raw.capacity,
    currentCount: raw.current_count,

    // 연령별 학급 수
    classCountAge3: raw.class_count_age3,
    classCountAge4: raw.class_count_age4,
    classCountAge5: raw.class_count_age5,

    // 연령별 정원
    capacityAge3: raw.capacity_age3,
    capacityAge4: raw.capacity_age4,
    capacityAge5: raw.capacity_age5,

    // 연령별 현원
    currentAge3: raw.current_age3,
    currentAge4: raw.current_age4,
    currentAge5: raw.current_age5,

    // 혼합반
    classCountMix: raw.class_count_mix,
    capacityMix: raw.capacity_mix,
    currentMix: raw.current_mix,

    // 특수학급
    capacitySpecial: raw.capacity_special,
    currentSpecial: raw.current_special,

    // 운영 정보
    hasBus: raw.has_bus,
    busCount: raw.bus_count,
    mealType: (raw.meal_type ?? 'none') as MealType,
    hasAfterSchool: raw.has_after_school,
    establishDate: raw.establish_date,

    // 시설 정보
    areaPerChild: raw.area_per_child,
    hasPlayground: raw.has_playground,
    buildingYear: raw.building_year,
    floorInfo: raw.floor_info,
    classroomArea: raw.classroom_area,
    indoorPlaygroundArea: raw.indoor_playground_area,
    outdoorPlaygroundArea: raw.outdoor_playground_area,

    // 교직원 정보
    teacherCount: raw.teacher_count,
    seniorTeacherCount: raw.senior_teacher_count,

    // 안전 정보
    cctvCount: raw.cctv_count,

    // 연락처
    phone: raw.phone,
    homepage: raw.homepage,
    operationHours: raw.operation_hours,
  };
}

/**
 * 원본 거리로 필터링 후 반올림된 거리로 Kindergarten 생성
 * 경계값 문제 해결을 위해 필터링은 반올림 전 거리로 수행
 */
export function transformWithRawDistance(
  raw: KindergartenRaw,
  userLocation: Coordinates
): { kindergarten: Kindergarten; rawDistance: number } {
  const rawDistance = calculateDistance(userLocation, { lat: raw.lat, lng: raw.lng });
  const roundedDistance = Math.round(rawDistance * 100) / 100;

  return {
    kindergarten: transformToKindergartenWithDistance(raw, roundedDistance),
    rawDistance,
  };
}

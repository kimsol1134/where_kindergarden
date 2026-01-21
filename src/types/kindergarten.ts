/**
 * 유치원/어린이집 관련 타입 정의
 */

/** 기관 유형 */
export type InstitutionType = 'public' | 'private' | 'home';

/** 급식 방식 */
export type MealType = 'direct' | 'outsourced' | 'none';

/** 좌표 */
export interface Coordinates {
  lat: number;
  lng: number;
}

/** 유치원/어린이집 기본 정보 */
export interface Kindergarten {
  kindercode: string;
  name: string;
  type: InstitutionType;
  address: string;
  lat: number;
  lng: number;
  distance: number; // km

  // 정원/현원
  capacity: number; // 정원
  currentCount: number; // 현원

  // 연령별 학급 수
  classCountAge3: number;
  classCountAge4: number;
  classCountAge5: number;

  // 연령별 정원
  capacityAge3: number;
  capacityAge4: number;
  capacityAge5: number;

  // 연령별 현원
  currentAge3: number;
  currentAge4: number;
  currentAge5: number;

  // 운영 정보
  hasBus: boolean;
  busCount: number;
  mealType: MealType;
  hasAfterSchool: boolean;
  establishDate: string; // 설립일

  // 시설 정보
  areaPerChild: number; // 1인당 면적 (㎡)
  hasPlayground: boolean;
  buildingYear: number | null; // 건축년도
  floorInfo: string | null; // 층 정보
  classroomArea: number; // 교실 면적
  indoorPlaygroundArea: number; // 실내놀이터 면적
  outdoorPlaygroundArea: number; // 실외놀이터 면적

  // 교직원 정보
  teacherCount: number;
  seniorTeacherCount: number;

  // 안전 정보
  cctvCount: number;

  // 연락처
  phone: string | null;
  homepage: string | null;
  operationHours: string | null;
}

/** 검색 결과 */
export interface SearchResult {
  count: number;
  items: Kindergarten[];
}

/** 검색 파라미터 */
export interface SearchParams {
  lat: number;
  lng: number;
  radius: 1 | 2 | 5;
  type?: 'all' | 'kindergarten' | 'daycare';
}

/** 비교 데이터 */
export interface ComparisonData {
  ids: string[];
  items: Kindergarten[];
}

/** 반경 옵션 */
export const RADIUS_OPTIONS = [1, 2, 5] as const;
export type RadiusOption = (typeof RADIUS_OPTIONS)[number];

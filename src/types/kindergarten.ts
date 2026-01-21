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
  capacity: number; // 정원
  currentCount: number; // 현원
  hasBus: boolean;
  busCount: number;
  mealType: MealType;
  hasAfterSchool: boolean;
  areaPerChild: number; // 1인당 면적 (㎡)
  phone?: string;
  hasPlayground?: boolean;
  afterSchoolHours?: string;
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

/**
 * Kakao 행정구역 코드를 최신 유치원 공개 데이터의 시도 코드로 정규화한다.
 *
 * 2026년 공개 코드표는 행정 시도 코드를 직접 사용한다. 2026년 개편 이전 응답이나
 * 캐시도 검색이 끊기지 않도록 광주/전남, 강원, 전북의 구 코드를 별칭으로 유지한다.
 */

const ADMIN_TO_PUBLIC_SIDO_MAP: Record<string, string> = {
  '11': '11', // 서울
  '12': '12', // 전남광주통합특별시
  '26': '26', // 부산
  '27': '27', // 대구
  '28': '28', // 인천
  '29': '12', // 광주 구 코드
  '30': '30', // 대전
  '31': '31', // 울산
  '36': '36', // 세종
  '41': '41', // 경기
  '42': '51', // 강원 구 코드
  '51': '51', // 강원특별자치도
  '43': '43', // 충북
  '44': '44', // 충남
  '45': '52', // 전북 구 코드
  '52': '52', // 전북특별자치도
  '46': '12', // 전남 구 코드
  '47': '47', // 경북
  '48': '48', // 경남
  '50': '50', // 제주
};

const SIDO_NAME_TO_PUBLIC_CODE: Record<string, string> = {
  '서울': '11',
  '서울특별시': '11',
  '전남광주': '12',
  '전남광주통합특별시': '12',
  '광주': '12',
  '광주광역시': '12',
  '전남': '12',
  '전라남도': '12',
  '부산': '26',
  '부산광역시': '26',
  '대구': '27',
  '대구광역시': '27',
  '인천': '28',
  '인천광역시': '28',
  '대전': '30',
  '대전광역시': '30',
  '울산': '31',
  '울산광역시': '31',
  '세종': '36',
  '세종특별자치시': '36',
  '경기': '41',
  '경기도': '41',
  '강원': '51',
  '강원도': '51',
  '강원특별자치도': '51',
  '충북': '43',
  '충청북도': '43',
  '충남': '44',
  '충청남도': '44',
  '전북': '52',
  '전라북도': '52',
  '전북특별자치도': '52',
  '경북': '47',
  '경상북도': '47',
  '경남': '48',
  '경상남도': '48',
  '제주': '50',
  '제주특별자치도': '50',
};

export interface RegionCodeConversionResult {
  /** 이름은 하위 호환을 위해 유지하지만 값은 최신 공개 데이터의 시도 코드다. */
  eduSidoCode: string;
  sigunguName: string;
}

export function convertToEduSidoCode(adminSidoCode: string): string | null {
  return ADMIN_TO_PUBLIC_SIDO_MAP[adminSidoCode] ?? null;
}

export function convertSidoNameToEduCode(sidoName: string): string | null {
  return SIDO_NAME_TO_PUBLIC_CODE[sidoName] ?? null;
}

export function convertRegionCode(
  adminSidoCode: string,
  sidoName: string,
  sigunguName: string
): RegionCodeConversionResult | null {
  const publicSidoCode =
    convertToEduSidoCode(adminSidoCode) ?? convertSidoNameToEduCode(sidoName);
  if (!publicSidoCode) {
    return null;
  }

  return { eduSidoCode: publicSidoCode, sigunguName };
}

export function getSupportedAdminSidoCodes(): string[] {
  return Object.keys(ADMIN_TO_PUBLIC_SIDO_MAP);
}

export function getSupportedEduSidoCodes(): string[] {
  return [...new Set(Object.values(ADMIN_TO_PUBLIC_SIDO_MAP))];
}

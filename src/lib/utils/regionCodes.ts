/**
 * 행정안전부 시도코드 → 교육부 시도코드 매핑
 *
 * Kakao API는 행정안전부의 행정동 코드를 사용하고,
 * 유치원 알리미 API는 교육부의 시도교육청 코드를 사용합니다.
 */

/** 행정안전부 시도코드 → 교육부 시도코드 매핑 */
const ADMIN_TO_EDU_SIDO_MAP: Record<string, string> = {
  '11': '11', // 서울
  '26': '21', // 부산
  '27': '22', // 대구
  '28': '23', // 인천
  '29': '24', // 광주
  '30': '25', // 대전
  '31': '26', // 울산
  '36': '29', // 세종
  '41': '27', // 경기
  '42': '28', // 강원특별자치도 (구 코드)
  '51': '28', // 강원특별자치도 (신 코드)
  '43': '34', // 충북
  '44': '35', // 충남
  '45': '36', // 전북특별자치도 (구 코드)
  '52': '36', // 전북특별자치도 (신 코드)
  '46': '37', // 전남
  '47': '38', // 경북
  '48': '39', // 경남
  '50': '40', // 제주
};

/** 시도명 매핑 (시도코드 조회 실패시 fallback) */
const SIDO_NAME_TO_EDU_CODE: Record<string, string> = {
  '서울': '11',
  '서울특별시': '11',
  '부산': '21',
  '부산광역시': '21',
  '대구': '22',
  '대구광역시': '22',
  '인천': '23',
  '인천광역시': '23',
  '광주': '24',
  '광주광역시': '24',
  '대전': '25',
  '대전광역시': '25',
  '울산': '26',
  '울산광역시': '26',
  '세종': '29',
  '세종특별자치시': '29',
  '경기': '27',
  '경기도': '27',
  '강원': '28',
  '강원도': '28',
  '강원특별자치도': '28',
  '충북': '34',
  '충청북도': '34',
  '충남': '35',
  '충청남도': '35',
  '전북': '36',
  '전라북도': '36',
  '전북특별자치도': '36',
  '전남': '37',
  '전라남도': '37',
  '경북': '38',
  '경상북도': '38',
  '경남': '39',
  '경상남도': '39',
  '제주': '40',
  '제주특별자치도': '40',
};

export interface RegionCodeConversionResult {
  eduSidoCode: string;
  sigunguName: string;
}

/**
 * 행정안전부 시도코드를 교육부 시도코드로 변환
 * @param adminSidoCode 행정안전부 시도코드 (예: "42")
 * @returns 교육부 시도코드 (예: "28") 또는 null
 */
export function convertToEduSidoCode(adminSidoCode: string): string | null {
  return ADMIN_TO_EDU_SIDO_MAP[adminSidoCode] ?? null;
}

/**
 * 시도명을 교육부 시도코드로 변환
 * @param sidoName 시도명 (예: "강원특별자치도")
 * @returns 교육부 시도코드 (예: "28") 또는 null
 */
export function convertSidoNameToEduCode(sidoName: string): string | null {
  return SIDO_NAME_TO_EDU_CODE[sidoName] ?? null;
}

/**
 * 행정안전부 코드를 교육부 코드로 변환 (종합)
 * 시도코드 변환이 실패하면 시도명으로 재시도
 *
 * @param adminSidoCode 행정안전부 시도코드
 * @param sidoName 시도명 (fallback용)
 * @param sigunguName 시군구명 (필터링용)
 * @returns 변환 결과 또는 null
 */
export function convertRegionCode(
  adminSidoCode: string,
  sidoName: string,
  sigunguName: string
): RegionCodeConversionResult | null {
  // 먼저 시도코드로 변환 시도
  let eduSidoCode = convertToEduSidoCode(adminSidoCode);

  // 실패하면 시도명으로 재시도
  if (!eduSidoCode) {
    eduSidoCode = convertSidoNameToEduCode(sidoName);
  }

  if (!eduSidoCode) {
    return null;
  }

  return {
    eduSidoCode,
    sigunguName,
  };
}

/**
 * 지원되는 모든 행정안전부 시도코드 목록
 */
export function getSupportedAdminSidoCodes(): string[] {
  return Object.keys(ADMIN_TO_EDU_SIDO_MAP);
}

/**
 * 지원되는 모든 교육부 시도코드 목록
 */
export function getSupportedEduSidoCodes(): string[] {
  return [...new Set(Object.values(ADMIN_TO_EDU_SIDO_MAP))];
}

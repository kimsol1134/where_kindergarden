/**
 * 유치원 알리미 URL 생성 유틸리티
 *
 * 유치원 알리미 Open API에서 교육비용 정보는 제공되지 않으므로,
 * 유치원 알리미 상세 페이지로 외부 링크를 제공합니다.
 */

const KINDERGARTEN_INFO_BASE_URL = 'https://e-childschoolinfo.moe.go.kr/presch/preschSumry.do';

/**
 * 유치원 알리미 상세 페이지 URL 생성
 * @param kindercode 유치원 코드 (예: J100007660)
 * @returns 유치원 알리미 상세 페이지 URL
 */
export function getKindergartenInfoUrl(kindercode: string): string {
  return `${KINDERGARTEN_INFO_BASE_URL}?pPresch=${encodeURIComponent(kindercode)}`;
}

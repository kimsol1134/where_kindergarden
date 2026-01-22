/**
 * 유치원 알리미 URL 생성 유틸리티
 *
 * 유치원 알리미 Open API에서 교육비용 정보는 제공되지 않으므로,
 * 유치원 알리미 검색 페이지로 외부 링크를 제공합니다.
 *
 * 참고: API의 kindercode가 UUID 형식으로 변경되어 상세 페이지 직접 링크가
 * 불가능하므로, 유치원 이름 + 지역 코드로 검색 결과 페이지로 연결합니다.
 */

const KINDERGARTEN_SEARCH_URL = 'https://e-childschoolinfo.moe.go.kr/kinderMt/combineFind.do';

interface KindergartenSearchParams {
  name: string;
  sidoCode: string;
  sigunguCode: string;
}

/**
 * 유치원 알리미 검색 결과 페이지 URL 생성
 * @param params 유치원 이름과 지역 코드
 * @returns 유치원 알리미 검색 결과 페이지 URL (해당 유치원으로 필터링된 결과)
 */
export function getKindergartenInfoUrl(params: KindergartenSearchParams): string {
  const { name, sidoCode, sigunguCode } = params;
  const queryParams = new URLSearchParams({
    organName: name,
    sidoCode,
    sggCode: sigunguCode,
  });
  return `${KINDERGARTEN_SEARCH_URL}?${queryParams.toString()}`;
}

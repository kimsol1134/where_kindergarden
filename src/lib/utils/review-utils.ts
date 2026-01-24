/**
 * HTML 태그 제거
 */
export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/&[a-z]+;/gi, ' ').trim();
}

/**
 * Naver API 날짜 포맷 (YYYYMMDD → YYYY-MM-DD)
 */
export function formatNaverDate(dateStr: string | undefined): string | null {
  if (!dateStr || dateStr.length !== 8) return null;
  const year = dateStr.substring(0, 4);
  const month = dateStr.substring(4, 6);
  const day = dateStr.substring(6, 8);
  return `${year}-${month}-${day}`;
}

/**
 * 주소에서 검색용 지역명을 추출
 * "인천광역시 서구 검단로..." → "인천 서구"
 * "경기도 김포시 풍무로..." → "김포"
 */
export function extractRegionName(address: string): string {
  const parts = address.split(/\s+/);
  if (parts.length < 2) return '';

  const sido = parts[0]
    .replace('광역시', '')
    .replace('특별시', '')
    .replace('특별자치시', '')
    .replace('특별자치도', '')
    .replace('도', '');

  const sigungu = parts[1]
    .replace('시', '')
    .replace('구', '')
    .replace('군', '');

  if (parts[0].includes('광역시') || parts[0].includes('특별시')) {
    return `${sido} ${parts[1]}`;
  }
  return sigungu;
}

const POSITIVE_KEYWORDS = [
  '후기', '다녀보니', '솔직', '재원', '추천', '장단점', '비추',
  '원비', '커리큘럼', '선생님', '급식', '통학버스', '방과후',
  '놀이', '적응', '학부모', '수업', '프로그램', '입학', '졸업',
  '보육', '돌봄', '연장보육', '아이가', '환경', '시설',
];

const NEGATIVE_KEYWORDS = [
  '시공', '블라인드', '인테리어', '리모델링', '도배', '페인트',
  '맛집', '카페', '레스토랑', '음식점',
  '태권도', '피아노', '미술학원', '영어학원', '수영',
  '부동산', '아파트', '분양', '매매', '전세', '모델하우스', '입주',
  '원아모집',
  '납품', '업체', '견적', '공사',
  '샌드위치', '다과박스', '단체주문', '배송', '답례품',
  '꽃박람회', '촬영', 'MBC', 'KBS', 'SBS', '방송', '출연',
  '베이커리', '꽃집', '네일', '미용실',
];

/**
 * 제목+본문 기반 관련성 점수 계산
 * 양성 키워드 +1, 음성 키워드 -2
 */
export function calculateRelevanceScore(title: string, snippet: string): number {
  const text = `${title} ${snippet}`.toLowerCase();
  let score = 0;

  for (const keyword of POSITIVE_KEYWORDS) {
    if (text.includes(keyword)) score += 1;
  }
  for (const keyword of NEGATIVE_KEYWORDS) {
    if (text.includes(keyword)) score -= 2;
  }

  return score;
}

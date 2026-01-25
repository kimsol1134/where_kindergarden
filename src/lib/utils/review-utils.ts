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
  '마사지', '아로마', '스파',
  '커피차', '간식차', '푸드트럭', '케이터링',
  '풍선장식', '포토존장식',
  '보일러', '헬스장', '렌탈',
  '경매', '오피스텔',
];

/**
 * 제목+본문 기반 관련성 점수 계산 (v1 - 하위호환)
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

// ============================================================================
// V2: 강화된 관련성 점수 계산
// ============================================================================

/** 고품질 후기 키워드 (가중치 +2) */
const HIGH_QUALITY_KEYWORDS = [
  '솔직후기', '재원생', '졸업생', '졸업후기', '1년', '2년', '3년',
  '다녀보니', '보내보니', '다녔어요', '다닙니다', '보냈어요',
  '장점', '단점', '장단점', '비추', '강추', '추천드려요',
];

/** 다른 시도명 (잘못된 지역 연결 감지용) */
const OTHER_SIDO_NAMES = [
  '대구', '부산', '대전', '울산', '광주', '세종', '제주',
  '충북', '충남', '전북', '전남', '경북', '경남', '강원',
];

/** 스팸 타이틀 패턴 */
const SPAM_TITLE_PATTERNS = [
  /임장/i, /분양/i, /모델하우스/i, /재건축/i,
  /미용실/i, /네일/i, /속눈썹/i, /피부관리/i,
  /떡공방/i, /떡집/i, /베이커리/i, /꽃집/i,
  /치과.*후기/i, /한의원.*후기/i,
  /태권도/i, /피아노학원/i, /음악학원/i, /수학교습소/i, /러닝센터/i,
  /풍선.*장식/i, /인형극.*업체/i, /출강/i,
  /팬텀싱어/i, /포레스텔라/i, /콘서트/i,
  /등산.*코스/i, /산책.*후기/i, /눈썰매/i,
  /강아지유치원/i, /펫.*호텔/i,
  /파파존스/i, /피자.*할인/i, /운동화.*추천/i,
  /이력서/i, /에버랜드/i, /롯데월드/i,
];

export interface RelevanceResult {
  score: number;
  reasons: string[];
  isSpam: boolean;
}

/**
 * 제목+본문 기반 관련성 점수 계산 (v2 - 강화 버전)
 * 
 * 점수 체계:
 * - 유치원 이름 포함: +3
 * - 지역명 포함: +2
 * - 고품질 키워드: +2 each
 * - 일반 긍정 키워드: +1 each
 * - 다른 시도 유치원 언급: -10 (스팸 처리)
 * - 스팸 패턴 매칭: -10 (스팸 처리)
 * - 일반 부정 키워드: -2 each
 */
export function calculateRelevanceScoreV2(
  title: string,
  snippet: string,
  kindergartenName: string,
  regionName: string
): RelevanceResult {
  const text = `${title} ${snippet}`.toLowerCase();
  const titleLower = title.toLowerCase();
  let score = 0;
  const reasons: string[] = [];
  let isSpam = false;

  // 1. 스팸 패턴 체크 (최우선)
  for (const pattern of SPAM_TITLE_PATTERNS) {
    if (pattern.test(title)) {
      isSpam = true;
      reasons.push(`스팸패턴: ${pattern.toString()}`);
      return { score: -10, reasons, isSpam };
    }
  }

  // 2. 다른 시도 유치원 언급 체크 (지역 불일치)
  for (const sido of OTHER_SIDO_NAMES) {
    // "대구 유치원", "부산 유치원" 등 패턴 체크
    const pattern = new RegExp(`${sido}[^가-힣]*유치원`, 'i');
    if (pattern.test(title)) {
      // 경기도 광주와 광역시 광주 구분
      if (sido === '광주' && regionName.includes('광주')) continue;
      
      isSpam = true;
      reasons.push(`다른시도: ${sido}`);
      return { score: -10, reasons, isSpam };
    }
  }

  // 3. 유치원 이름 포함 여부 (+3)
  const nameWithoutSuffix = kindergartenName
    .replace(/유치원$/, '')
    .replace(/어린이집$/, '')
    .trim();
  
  if (nameWithoutSuffix.length >= 2 && text.includes(nameWithoutSuffix.toLowerCase())) {
    score += 3;
    reasons.push('유치원명포함:+3');
  }

  // 4. 지역명 포함 여부 (+2)
  const regionParts = regionName.split(/\s+/);
  for (const part of regionParts) {
    if (part.length >= 2 && text.includes(part.toLowerCase())) {
      score += 2;
      reasons.push(`지역명(${part}):+2`);
      break; // 한 번만 가점
    }
  }

  // 5. 고품질 후기 키워드 (+2 each)
  for (const keyword of HIGH_QUALITY_KEYWORDS) {
    if (text.includes(keyword)) {
      score += 2;
      reasons.push(`고품질(${keyword}):+2`);
    }
  }

  // 6. 일반 긍정 키워드 (+1 each)
  for (const keyword of POSITIVE_KEYWORDS) {
    if (text.includes(keyword)) {
      score += 1;
      // reasons에는 추가하지 않음 (너무 많아짐)
    }
  }

  // 7. 일반 부정 키워드 (-2 each)
  for (const keyword of NEGATIVE_KEYWORDS) {
    if (text.includes(keyword)) {
      score -= 2;
      reasons.push(`부정키워드(${keyword}):-2`);
    }
  }

  return { score, reasons, isSpam };
}

/**
 * 스팸 타이틀인지 빠르게 체크
 */
export function isSpamTitle(title: string): boolean {
  for (const pattern of SPAM_TITLE_PATTERNS) {
    if (pattern.test(title)) return true;
  }
  
  for (const sido of OTHER_SIDO_NAMES) {
    const pattern = new RegExp(`^${sido}.*유치원`, 'i');
    if (pattern.test(title)) return true;
  }
  
  return false;
}

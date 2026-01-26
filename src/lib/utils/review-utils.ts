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
  // 시공/인테리어
  '시공', '블라인드', '인테리어', '리모델링', '도배', '페인트', '고무매트철거',
  // 음식점
  '맛집', '카페', '레스토랑', '음식점', '족발', '곱창', '김밥', '붕어빵',
  // 학원/스포츠 (유치원 아님)
  '태권도', '피아노', '미술학원', '영어학원', '수영장추천',
  '축구클럽', '축구교실', '음악줄넘기', '리듬체조학원',
  // 부동산
  '부동산', '아파트', '분양', '매매', '전세', '모델하우스', '입주', '임장후기',
  '원아모집',
  // 업체 광고
  '납품', '업체', '견적', '공사',
  '샌드위치', '다과박스', '단체주문', '배송', '답례품',
  '꽃박람회', '촬영', 'MBC', 'KBS', 'SBS', '방송', '출연',
  '베이커리', '꽃집', '네일', '미용실',
  '마사지', '아로마', '스파',
  '커피차', '간식차', '푸드트럭', '케이터링',
  '풍선장식', '포토존장식', '포토존설치',
  '보일러', '헬스장', '렌탈', '슬러시기계',
  '경매', '오피스텔',
  // 공연/이벤트 광고
  '마술공연', '출장마술', '인형극단', '인형극섭외',
  '원예수업', '원예체험', '부모교육강의', '부모교육강사',
  // 등산/관광
  '등산코스', '산행후기', '석성산', '무봉산', '광교산등산',
  '흠뻑쇼', '월드컵경기장',
  // 기타
  '링키영어', '써지컬스틸', '힐링연수',
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
  // 부동산
  /임장/i, /분양/i, /모델하우스/i, /재건축/i, /아파트.*학군/i,
  // 미용/뷰티
  /미용실/i, /네일/i, /속눈썹/i, /피부관리/i,
  // 음식/요식업
  /떡공방/i, /떡집/i, /베이커리/i, /꽃집/i, /족발.*맛집/i, /곱창.*맛집/i,
  // 의료
  /치과.*후기/i, /한의원.*후기/i,
  // 학원/스포츠 (유치원 아님)
  /태권도/i, /피아노학원/i, /음악학원/i, /수학교습소/i, /러닝센터/i,
  /축구클럽.*후기/i, /축구교실.*후기/i, /음악줄넘기/i,
  // 업체 광고
  /풍선.*장식/i, /인형극.*업체/i, /출강/i,
  /마술공연.*섭외/i, /출장마술/i,
  /원예.*체험.*후기/i, /원예수업.*후기/i,
  /부모교육.*강의/i, /부모교육.*강사/i,
  /포토존.*설치/i, /슬러시.*기계/i,
  /고무매트.*철거/i, /커튼.*블라인드/i,
  // 콘서트/이벤트
  /팬텀싱어/i, /포레스텔라/i, /콘서트/i, /흠뻑쇼/i,
  // 등산/관광
  /등산.*코스/i, /산책.*후기/i, /눈썰매/i,
  /석성산.*등산/i, /무봉산.*등산/i, /산행.*후기/i,
  /연등축제/i, /청련암.*전통사찰/i,
  // 기타
  /강아지유치원/i, /펫.*호텔/i,
  /파파존스/i, /피자.*할인/i, /운동화.*추천/i,
  /이력서/i, /에버랜드/i, /롯데월드/i,
  /키즈카페.*후기/i, /로라바운스/i,
  /헌법재판소/i, /탄핵/i,
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

// ============================================================================
// V3: 지역 검증 로직 (서울/경기 상호 오염 방지)
// ============================================================================

/** 서울 구 이름 목록 (경기 수집 시 필터용) */
const SEOUL_GU_NAMES = [
  '종로구', '중구', '용산구', '성동구', '광진구', '동대문구', '중랑구',
  '성북구', '강북구', '도봉구', '노원구', '은평구', '서대문구', '마포구',
  '양천구', '강서구', '구로구', '금천구', '영등포구', '동작구', '관악구',
  '서초구', '강남구', '송파구', '강동구',
];

/** 경기 시/군 이름 목록 (서울 수집 시 필터용) */
const GYEONGGI_CITY_NAMES = [
  '수원', '성남', '고양', '용인', '부천', '안산', '안양', '남양주', '화성',
  '평택', '의정부', '시흥', '파주', '광명', '김포', '군포', '광주', '이천',
  '양주', '오산', '구리', '안성', '포천', '의왕', '하남', '여주', '양평',
  '동두천', '과천', '가평', '연천',
  // 구 이름 (성남시 분당구 등)
  '분당', '수지', '기흥', '처인', '일산', '덕양', '풍덕천', '영통', '권선',
  '장안', '팔달', '동안', '만안', '단원', '상록', '소사', '오정', '원미',
];

/** 인천 구/군 이름 목록 */
const INCHEON_GU_NAMES = [
  '중구', '동구', '미추홀구', '연수구', '남동구', '부평구', '계양구', '서구',
  '강화군', '옹진군', '검단',
];

interface LocationValidation {
  isValid: boolean;
  reason: string;
  detectedLocation?: string;
}

/**
 * 수집 대상 지역과 검색 결과의 지역이 일치하는지 검증
 *
 * @param text - 검사할 텍스트 (제목 + snippet)
 * @param targetSidoCode - 수집 대상 시도 코드 ('11'=서울, '41'=경기, '28'=인천)
 * @param targetAddress - 유치원 주소 (옵션)
 * @returns 지역 일치 여부와 사유
 *
 * 사용 예:
 * - 서울(11) 수집 시: 경기 지역 언급 있으면 invalid
 * - 경기(41) 수집 시: 서울 구 이름 언급 있으면 invalid
 */
export function validateLocationMatch(
  text: string,
  targetSidoCode: string,
  targetAddress?: string
): LocationValidation {
  const textLower = text.toLowerCase();

  // 서울 수집 시: 경기 지역 필터
  if (targetSidoCode === '11') {
    for (const city of GYEONGGI_CITY_NAMES) {
      // "수원 유치원", "분당 어린이집" 등 패턴
      const pattern = new RegExp(`${city}[시구]?\\s*(유치원|어린이집)`, 'i');
      if (pattern.test(text)) {
        // 예외: 같은 이름이 주소에도 있으면 통과 (예: 유치원명에 지역명 포함)
        if (targetAddress && targetAddress.includes(city)) continue;

        return {
          isValid: false,
          reason: `경기지역(${city}) 언급`,
          detectedLocation: city,
        };
      }

      // "경기 수원", "경기도 성남" 등 명시적 경기 언급
      const explicitPattern = new RegExp(`경기(도)?\\s*${city}`, 'i');
      if (explicitPattern.test(text)) {
        return {
          isValid: false,
          reason: `경기도 명시(${city})`,
          detectedLocation: `경기 ${city}`,
        };
      }
    }
  }

  // 경기 수집 시: 서울 구 이름 필터
  if (targetSidoCode === '41') {
    for (const gu of SEOUL_GU_NAMES) {
      // "강남구 유치원", "서초 어린이집" 등 패턴
      const guName = gu.replace('구', '');
      const pattern = new RegExp(`${guName}(구)?\\s*(유치원|어린이집)`, 'i');
      if (pattern.test(text)) {
        // 예외: 경기도에도 같은 이름이 있을 수 있음 (예: 광주시 중앙동)
        // 주소에 서울이 포함되어 있지 않으면 스킵
        if (targetAddress && !targetAddress.includes('서울')) {
          // 경기 광주, 경기 중구 등 예외 처리
          if (['광주', '중구', '강서구'].includes(gu)) continue;
        }

        return {
          isValid: false,
          reason: `서울지역(${gu}) 언급`,
          detectedLocation: `서울 ${gu}`,
        };
      }

      // "서울 강남", "서울시 서초" 등 명시적 서울 언급
      const explicitPattern = new RegExp(`서울(시|특별시)?\\s*${guName}`, 'i');
      if (explicitPattern.test(text)) {
        return {
          isValid: false,
          reason: `서울시 명시(${gu})`,
          detectedLocation: `서울 ${gu}`,
        };
      }
    }
  }

  // 인천 수집 시: 서울/경기 필터
  if (targetSidoCode === '28') {
    // 서울 필터
    for (const gu of SEOUL_GU_NAMES) {
      const explicitPattern = new RegExp(`서울(시|특별시)?\\s*${gu.replace('구', '')}`, 'i');
      if (explicitPattern.test(text)) {
        return {
          isValid: false,
          reason: `서울지역(${gu}) 언급`,
          detectedLocation: `서울 ${gu}`,
        };
      }
    }

    // 경기 필터 (인천과 인접한 경기 지역)
    const adjacentGyeonggi = ['김포', '부천', '시흥'];
    for (const city of adjacentGyeonggi) {
      const explicitPattern = new RegExp(`경기(도)?\\s*${city}`, 'i');
      if (explicitPattern.test(text)) {
        return {
          isValid: false,
          reason: `경기지역(${city}) 언급`,
          detectedLocation: `경기 ${city}`,
        };
      }
    }
  }

  return { isValid: true, reason: '' };
}

/**
 * 제외어가 포함된 검색 쿼리 생성
 *
 * @param baseQuery - 기본 검색어
 * @param targetSidoCode - 수집 대상 시도 코드
 * @returns 제외어가 추가된 쿼리
 */
export function buildQueryWithExclusions(
  baseQuery: string,
  targetSidoCode: string
): string {
  // 공통 제외어
  const commonExclusions = [
    '-태권도', '-피아노학원', '-음악학원', '-마술공연', '-출장마술',
    '-등산', '-산행', '-네일', '-미용실', '-부동산', '-임장',
  ];

  // 시도별 추가 제외어
  let sidoExclusions: string[] = [];

  if (targetSidoCode === '11') {
    // 서울 수집 시: 경기 주요 도시 제외
    sidoExclusions = ['-수원', '-분당', '-용인', '-성남', '-고양', '-일산'];
  } else if (targetSidoCode === '41') {
    // 경기 수집 시: 서울 주요 구 제외 (중복 방지)
    sidoExclusions = ['-서울강남', '-서울서초', '-서울송파'];
  } else if (targetSidoCode === '28') {
    // 인천 수집 시: 인접 경기 제외
    sidoExclusions = ['-김포', '-부천'];
  }

  const allExclusions = [...commonExclusions, ...sidoExclusions];
  return `${baseQuery} ${allExclusions.join(' ')}`;
}

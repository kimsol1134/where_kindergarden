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
  // 시공/리모델링 업체 (V11)
  '놀이터시공', '인조잔디시공', '고무매트시공', '놀이시설시공',
  '실내놀이터시공', '벽화시공', '바닥시공', '조경시공',
  // 유아체육/이벤트 업체 (V11)
  '이동동물원', '페이스페인팅', '에어바운스대여', '버블쇼',
  '과학실험출장', '체험학습업체',
  // 관광/종교 (V11)
  '운현궁', '궁궐나들이', '고궁산책', '성당혼배',
  // 청소/보험 (V11)
  '에어컨청소', '입주청소', '이사청소', '태아보험', '실비보험',
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
  // 시공/리모델링 (V11)
  /놀이터.*시공.*후기/i, /유치원.*리모델링.*시공/i,
  /고무매트.*시공/i, /인조잔디.*시공/i, /실내놀이터.*시공/i,
  /벽화.*시공.*후기/i, /바닥.*시공.*업체/i, /조경.*시공.*후기/i,
  // 유아체육/이벤트 업체 (V11)
  /유아체육.*전문/i, /이동동물원/i, /페이스페인팅.*출장/i,
  /에어바운스.*대여/i, /버블쇼.*섭외/i, /과학실험.*출장/i,
  // 관광/종교 (V11)
  /운현궁/i, /성당.*혼배/i, /궁궐.*나들이/i, /고궁.*산책/i,
  // 청소/보험 (V11)
  /에어컨.*청소.*후기/i, /입주청소/i, /이사청소/i,
  /태아보험/i, /실비보험/i,
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
// V4: 통합 스팸 패턴 (Single Source of Truth)
// filter-reviews.ts, curate-reviews.ts, verify-all-reviews.ts 에서 import
// ============================================================================

/** 통합 스팸 타이틀 패턴 — filter-reviews.ts의 624개 패턴 전체 */
export const UNIFIED_SPAM_TITLE_PATTERNS: RegExp[] = [
  // 부동산/임장
  /임장/i, /모델하우스/i, /분양/i, /재건축.*단지/i, /뉴타운.*임장/i,
  /아파트.*매매/i, /벽산블루밍.*후기/i, /아파트.*리뷰/i, /아파트.*학군/i,
  /청약.*정보/i,
  // 고물상
  /고물상/i, /호성자원/i,
  // 미용/뷰티
  /네일/i, /미용(?!.*유치원)/i, /속눈썹/i, /피부관리/i, /헤어.*컷/i, /염색.*후기/i,
  // 음식/배달/마사지
  /마사지/i, /꽃집/i, /꽃배달/i, /베이커리/i, /인테리어/i, /풍선.*장식/i,
  /풍선날다/i, /떡공방/i, /떡집.*추천/i, /백일떡/i, /냉면.*추천/i, /국밥.*추천/i,
  /순댓국/i, /피자.*할인/i, /파파존스/i, /카페.*추천(?!.*유치원)/i, /맛집.*추천/i,
  /치킨.*추천/i,
  // 의료
  /치과.*후기/i, /한의원.*후기(?!.*유치원)/i, /정밀초음파/i, /입체초음파/i,
  /임신.*주차/i, /소아과.*후기/i, /병원.*진료/i,
  // 학원 (유치원 아님)
  /태권도(?!.*유치원)/i, /음악학원/i, /피아노학원/i, /러닝센터/i, /해법교실/i,
  /공부방/i, /스마트해법/i, /영어학원.*후기(?!.*유치원)/i, /도현학원/i, /정일품학원/i,
  /축구클럽.*후기/i, /축구교실.*후기/i, /음악줄넘기/i, /리듬체조학원/i,
  /수영.*강습/i, /발레학원/i,
  // 업체 광고
  /마술공연.*섭외/i, /출장마술.*후기/i, /인형극.*섭외/i, /원예.*체험.*후기/i,
  /원예수업.*후기/i, /부모교육.*강의/i, /부모교육.*강사/i, /포토존.*설치/i,
  /풍선장식.*업체/i, /슬러시.*기계/i, /커피차.*섭외/i, /간식차.*섭외/i,
  /고무매트.*철거/i, /커튼.*블라인드/i, /페인트.*시공/i, /방역.*업체/i,
  // 무관한 장소/활동
  /등산.*코스/i, /눈썰매장/i, /어린이회관slp/i, /강아지유치원/i, /가볼만한.*곳/i,
  /아차산.*절/i, /영화사.*방문/i, /아쿠아리움.*일상/i, /생태곤충원/i,
  // 등산/관광
  /석성산.*등산/i, /무봉산.*등산/i, /광교산.*등산/i, /산행.*후기/i,
  /둘레길.*코스/i, /트레킹.*후기/i, /등산로.*추천/i,
  // 무관한 제품/서비스
  /운동화.*추천/i, /휠라.*키즈/i, /나이키.*키즈/i, /음향수리/i, /렌탈.*후기/i,
  /정수기.*후기/i,
  // 무관한 교육/프로그램
  /창의드론/i, /이력서/i, /출강/i,
  // 해외 유치원
  /나트랑.*유치원/i, /베트남.*유치원/i, /해외.*유치원(?!.*후기)/i,
  // 콘서트/공연
  /팬텀싱어/i, /포레스텔라/i, /콘서트.*후기(?!.*유치원)/i, /인형극단.*업체/i,
  /인형극.*전문.*업체/i, /체험단.*발표/i, /당첨자.*발표/i, /가요무대/i, /팬카페/i,
  /흠뻑쇼/i, /월드컵.*경기장/i, /뮤지컬.*후기(?!.*유치원)/i, /페스티벌.*후기/i,
  // 종교/이단
  /이단.*단체/i, /이단.*계열/i, /연등축제/i, /청련암.*전통사찰/i,
  /교회.*역사(?!.*유치원)/i, /교회.*설교/i, /교회.*예배(?!.*유치원)/i,
  /목사님.*설교/i, /부활절.*예배/i, /성경.*공부(?!.*유치원)/i,
  /선교사.*이야기/i, /절.*방문.*후기(?!.*유치원)/i, /사찰.*탐방/i,
  // 결혼/웨딩
  /결혼식.*후기(?!.*유치원)/i, /웨딩홀.*후기/i, /웨딩.*촬영/i,
  /돌잔치.*후기(?!.*유치원)/i, /신혼여행/i, /예식장.*추천/i, /스드메.*추천/i,
  // 상품 광고
  /블로퍼.*추천/i, /여성.*블로퍼/i, /추천가격/i,
  // 영화/영상
  /영화.*블로그/i, /영화.*관람/i, /영화.*추천/i, /영화.*손익분기점/i, /영화.*출연/i,
  // 중고등학교/학원
  /중간고사.*기말고사/i, /수학교습소/i,
  // 산책/여행
  /산책.*후기(?!.*유치원)/i, /백세길.*산책/i,
  // 키즈카페/놀이시설
  /키즈카페.*후기(?!.*유치원)/i, /로라바운스/i, /플레이존/i,
  /에버랜드.*후기/i, /롯데월드.*후기/i,
  // 정치/사회
  /헌법재판소/i, /탄핵/i, /선거.*후보/i,
  // 맛집/카페/음식점
  /수제돈까스/i, /칼국수.*맛집/i, /순대국/i, /삼겹살.*맛집/i, /쌈밥.*맛집/i,
  /쭈꾸미/i, /족발.*맛집/i, /고기.*맛집/i, /정육점/i, /식자재마트/i, /카스테라/i,
  /떡.*맛집/i, /떡꼬치/i,
  // 서비스업 광고
  /CCTV.*설치/i, /CCTV.*수리/i, /방충망.*시공/i, /하수구.*뚫/i, /하수구.*막힘/i,
  /에어컨.*설치/i, /주차선.*도색/i, /음향장비.*설치/i, /단열필름.*시공/i,
  /타일.*시공/i, /세면대.*설치/i, /슬라이딩문.*교체/i,
  // 학원/교육
  /링키영어/i, /샘솟미술/i, /영렘브란트/i, /아트스타/i, /플레이하트/i,
  /노랑수학/i, /잼있는.*영어학원/i, /축구.*아카데미/i,
  /축구교실(?!.*유치원)/i, /체육.*후기(?!.*유치원)/i,
  // 부동산 추가
  /아파트경매/i, /입지정보/i, /3룸.*찾는다면/i, /투룸.*찾는다면/i,
  /역세권.*인프라/i, /복덕방/i,
  // 목공방/체험 업체
  /목공방.*단체/i, /목공방.*후기/i, /샌드아트.*공연/i, /인생네컷.*포토부스/i,
  /커피차.*출장/i, /푸드트럭.*후기/i, /케이터링.*후기/i,
  // 소설/창작물
  /소설.*블/i,
  // 무관한 관광/여행
  /고려궁지/i, /벚꽃.*축제/i, /강화산성/i, /전주.*한옥마을/i, /아라보타닉파크/i,
  /인생네컷/i,
  // 키즈카페 특정
  /기흥키즈카페/i, /GLC키즈카페/i,
  // 업체 후기 (유치원과 무관)
  /천하여장군/i, /꽃다발서비스/i, /와프.*플라워/i, /무인키즈풀/i, /헬스장.*PT/i,
  /글램핏/i, /전기구이통닭/i, /치킨선도부/i, /돌잔치.*업체/i,
  // 어린이집/유치원 관련 아닌 업체
  /원예키트.*후기/i, /SBS아카데미.*미용/i, /네일아트.*지도과정/i,
  // 교육 기관 광고
  /힙스.*국제학교/i, /HIFS.*국제학교/i,
  // 유치원 위치 언급만 있는 맛집/시설
  /손두부.*맛집/i, /가마솥콩/i, /생선구이.*맛집/i, /멸치부터.*고래까지/i,
  /모래놀이카페/i, /샌드브로/i, /신촌설렁탕/i, /병천토속순대/i,
  // 맛집 추가
  /오리탕.*후기/i, /브런치.*맛집/i, /노포.*맛집/i, /시래기.*맛집/i,
  /안주.*맛집/i, /대형카페.*후기/i, /선정쌈밥/i,
  // 기타 학원/교육
  /아담리즈수학/i, /폴리어학원/i, /프라임에듀/i, /플레이팩토.*보드/i,
  /디테일링.*샵/i,
  // 해운대/부산 지역
  /해운대.*미술학원/i, /동래캠퍼스/i, /양산.*트리마제/i,
  // 맛집 추가
  /감성.*카페.*푸딩.*맛집/i, /안주가.*맛있는/i, /인하대후문.*맛집/i, /막리단길/i,
  // 학원/체육관
  /한빛태권도/i,
  // 기타 업체
  /2024.*하계.*직무연수/i,
  // 학원 블로그 홍보글
  /윤선생.*영어숲.*크리스마스/i, /아소비.*김포.*감정/i, /한자.*자격.*급수/i,
  /엘리프어학원.*용화/i,
  // 해운대 미술학원
  /조선.*후기.*도입된/i, /모바일.*게임.*집착/i,
  // 태권도
  /가현초.*신현북초.*서현유치원/i,
  // 학원 블로그 홍보글 추가
  /한자.*자격증.*취득.*아소비/i, /아소비혁신호반/i, /1:1.*재원생.*간담회/i,
  /근처.*유치부.*영어.*CLT/i,
  // 타 지역 학원 블로그
  /덕계.*영어.*링키홈/i, /링키.*영어.*동부산/i, /링키영어.*양산/i,
  // 시공/리모델링 업체 포트폴리오
  /놀이터.*시공.*후기/i, /유치원.*리모델링.*시공/i, /고무매트.*시공/i,
  /놀이시설.*시공/i, /인조잔디.*시공/i, /현관.*중문.*시공/i, /도어.*시공.*후기/i,
  /바닥.*시공.*업체/i, /조경.*시공.*후기/i, /유치원.*인테리어.*시공/i,
  /어린이집.*인테리어.*시공/i, /놀이방.*시공/i, /벽화.*시공.*후기/i,
  /실내놀이터.*시공/i,
  // 유아체육/이벤트/출장 업체
  /유아체육.*전문/i, /이동동물원.*후기/i, /이동동물원.*체험/i,
  /페이스페인팅.*출장/i, /에어바운스.*대여/i, /파티.*풍선.*업체/i, /버블쇼.*섭외/i,
  /과학실험.*출장/i, /체험학습.*업체/i, /이벤트.*업체.*후기/i,
  // 관광/역사/종교 블로그
  /운현궁.*나들이/i, /운현궁.*방문/i, /성당.*혼배/i, /성당.*미사(?!.*유치원)/i,
  /궁궐.*나들이/i, /고궁.*산책/i, /한옥마을.*체험/i, /박물관.*체험(?!.*유치원)/i,
  /수목원.*나들이/i, /둘레길.*나들이/i,
  // 사진/촬영 업체
  /스냅.*촬영.*후기/i, /셀프스튜디오/i, /가족사진.*촬영(?!.*유치원)/i,
  /프로필.*촬영.*후기/i,
  // 보험/재테크
  /어린이.*보험.*후기(?!.*유치원)/i, /태아보험/i, /실비보험/i,
  // 청소/세탁 업체
  /에어컨.*청소.*후기/i, /입주청소/i, /이사청소/i, /세탁기.*청소.*후기/i,
  /매트리스.*청소/i,
  // 피트니스/운동
  /필라테스(?!.*유치원)/i, /헬스장(?!.*유치원)/i, /퍼스널트레이닝/i,
  /요가.*(해소|수련|힐링)/i,
  // 세차
  /세차장(?!.*유치원)/i, /셀프세차/i, /손세차/i, /출장세차/i,
  /디테일링.*세차/i, /워시아지트/i, /오토모티브.*세차/i,
  // 패스트푸드/음식점
  /왓더버거/i, /왓더런치/i, /마라탕(?!.*유치원)/i,
  // 애견/반려동물
  /애견호텔/i, /애견유치원/i, /애견미용/i, /멍균관대/i, /놀러오개/i,
  /동물병원(?!.*유치원)/i,
  // 법률/전문서비스
  /변호사.*(후기|추천|상담)/i, /법률사무소/i,
  // 이사
  /포장이사/i, /이삿짐.*센터/i,
  // 상품 리뷰/중고
  /가습기.*(추천|후기|장점|단점|가격|BEST|구매평)/i, /유모차.*드려요/i,
  /식기세척기.*설치(?!.*유치원)/i,
  // 다이어트
  /다이어트.*(후기|추천)/i, /바디라인.*정리/i,
  // 숙박/리조트
  /파크하얏트/i, /5성급.*호텔/i, /해외.*가족연수/i, /키즈풀빌라/i,
  /워터파크.*후기(?!.*유치원)/i,
  // 코딩교구 광고
  /ㅋㄷㅋㄷ코딩/i, /피지컬컴퓨팅.*교구/i,
  // 과외 광고
  /과외.*(국어|영어|수학|한국사|전문)/i, /전문과외/i, /예비중학생.*(국어|수학|영어)/i,
  // 업체 포트폴리오
  /모래소독.*\d{3,}번째/i, /키제코.*모래소독/i, /키제코.*방역/i,
  // 자원봉사 공고
  /자원봉사자.*위촉.*공고/i,
  // 버스광고
  /시내버스.*광고/i, /버스쉘터.*광고/i,
  // 아파트/부동산 리뷰
  /거주후기(?!.*유치원)/i,
  // 종교 무관
  /성지순례/i, /주교좌/i,
  // 로또
  /로또.*명당/i,
  // 스키/리조트
  /런투스키스쿨/i,
  // 도서관/장난감 대여
  /송도국제도서관/i,
  // 소아과
  /소아청소년과의원/i,
  // 의류매장
  /여성복.*옷가게/i,
  // V13: 공방/출장수업
  /캔들.*공방.*출장/i, /비누.*공방.*출장/i, /공예.*체험.*출장/i,
  /도자기.*체험.*출장/i, /천연비누.*만들기.*출장/i, /슬라임.*체험.*출장/i,
  /원데이클래스.*출장/i, /쿠킹클래스.*출장/i, /바리스타.*체험.*출장/i,
  // 퍼스널컬러/강사 출강
  /퍼스널컬러.*진단/i, /스피치.*강사.*출강/i, /이미지.*컨설팅.*출강/i,
  /마인드.*교육.*출강/i,
  // 요양원/방문요양
  /요양원(?!.*유치원)/i, /방문요양/i, /요양센터/i, /요양보호사/i,
  /노인.*돌봄/i, /주간보호센터/i,
  // 운전연수/자동차
  /운전연수(?!.*유치원)/i, /도로연수/i, /자동차.*정비/i,
  // 소개팅
  /소개팅/i, /미팅.*모임/i,
  // 교육청 주간소식
  /교육청.*주간/i, /주간소식.*교육/i, /교육지원청.*소식/i,
  // 족보/경매/논문
  /족보.*유치원/i, /경매.*유치원/i, /논문.*유치원(?!.*후기)/i,
  // 자전거/동호회
  /자전거.*동호회/i, /자전거.*라이딩.*코스/i, /라이딩.*후기(?!.*유치원)/i,
  // 초등학교 입학/학원
  /초등학교.*입학(?!.*유치원)/i, /초등.*방과후(?!.*유치원)/i,
  /초등.*학원.*추천(?!.*유치원)/i, /예비초등.*학원/i,
  // 대치/학원 SEO
  /대치알파학원/i, /대치동.*학원.*후기/i,
  // 간호학원/직업학원
  /간호학원/i, /간호조무사.*학원/i, /직업학원/i, /직업훈련/i,
  // 인형극/마술/공연 업체 포트폴리오
  /인형극.*공연.*후기(?!.*유치원)/i, /마술.*공연.*후기(?!.*유치원)/i,
  /버블쇼.*공연.*후기/i, /샌드아트.*공연.*후기/i, /동화구연.*출장/i,
  // 시설공사/놀이터 시공 업체
  /놀이터.*설치.*업체/i, /유아.*놀이기구.*설치/i, /어린이.*놀이시설.*설치/i,
  /바닥재.*시공(?!.*유치원)/i, /탄성포장.*시공/i, /우레탄.*시공/i,
  // 유치원 근처 맛집/카페
  /맛집.*유치원.*근처/i, /카페.*유치원.*옆/i, /유치원.*앞.*맛집/i,
  /유치원.*건너편.*카페/i,

  // === V14: 질문글/정보글/포럼 템플릿 패턴 ===
  // 질문글
  /추천.*해\s*주세요/i, /알려\s*주세요/i, /어디가\s*좋을까요/i,
  /고민이에요/i, /고민입니다/i, /어떤가요\s*\?/i, /어떨까요\s*\?/i,
  // 정보 나열글
  /총정리/i, /현황.*정리/i,
];

/** 스팸 snippet 패턴 — title에는 없지만 snippet에서 잡아야 하는 패턴 */
export const SPAM_SNIPPET_PATTERNS: RegExp[] = [
  // 포럼 템플릿/등업글
  /양식에\s*맞지\s*않으면\s*등업/i,
  /제목\s*예시\)\s*(OO|지역)/i,
  /가입인사\s*\+\s*후기.*작성\s*시/i,
  /빠른\s*등업/i,
  /카페에서\s*얻고\s*싶으신\s*정보/i,
  /업체\s*관계자.*별명에\s*업체명/i,
  /등업.*조건/i,
  /가입\s*양식/i,
  /등업글/i,
  /카페\s*가입.*양식/i,
  // 부동산
  /매매|전세|월세|평당|평형/i,
  /임장.*보고서/i,
  /투자.*스터디/i,
  // 광고/홍보 snippet 패턴
  /상담\s*문의.*\d{2,4}-\d{3,4}-\d{4}/i,
  /견적.*무료/i,
  /출장.*접수.*가능/i,
];

// ============================================================================
// V4: 콘텐츠 유형 분류
// ============================================================================

/** 콘텐츠 유형: review(후기), template(포럼양식), question(질문), info_list(정보나열), unknown */
export type ContentType = 'review' | 'template' | 'question' | 'info_list' | 'unknown';

const TEMPLATE_PATTERNS = [
  /양식에\s*맞지\s*않으면/i,
  /제목\s*예시\)/i,
  /가입인사\s*\+\s*후기/i,
  /카페에서\s*얻고\s*싶으신/i,
  /업체\s*관계자.*별명/i,
  /등업.*조건/i,
  /등업글/i,
  /카페\s*가입.*양식/i,
  /빠른\s*등업/i,
];

const QUESTION_PATTERNS = [
  /추천.*해\s*주세요/i,
  /알려\s*주세요/i,
  /어디가\s*좋을까요/i,
  /고민이에요/i,
  /고민입니다/i,
  /어떤가요\s*\?/i,
  /어떨까요\s*\?/i,
  /도움.*부탁/i,
  /궁금합니다/i,
  /질문.*드려요/i,
  /여쭤봅니다/i,
];

const INFO_LIST_PATTERNS = [
  /총정리/i,
  /현황.*정리/i,
  /모음집/i,
  /리스트.*정리/i,
  /한눈에\s*보기/i,
  /일람표/i,
];

/** 타이틀에 강한 후기 지표가 있는지 확인 (카페 등업 양식에 포함된 실제 후기 보호) */
const STRONG_REVIEW_TITLE_INDICATORS = [
  /후기/i, /다녀보니/i, /보내보니/i, /다녔어요/i, /다닙니다/i,
  /보냈어요/i, /장단점/i, /솔직/i, /재원생/i, /졸업/i,
];

function hasTitleReviewIndicator(title: string): boolean {
  return STRONG_REVIEW_TITLE_INDICATORS.some(p => p.test(title));
}

/**
 * 콘텐츠 유형 분류
 *
 * title + snippet을 분석하여 해당 콘텐츠가 실제 후기인지,
 * 포럼 양식/질문글/정보 나열인지 판별.
 * 타이틀에 "후기", "다녀보니" 등 강한 리뷰 지표가 있으면
 * snippet의 포럼 양식에도 불구하고 template로 판별하지 않음.
 */
export function classifyContentType(title: string, snippet: string): ContentType {
  // 질문글 — title 기준 (질문글은 리뷰 지표 여부와 무관하게 판별)
  for (const p of QUESTION_PATTERNS) {
    if (p.test(title)) return 'question';
  }

  // 정보 나열 — title 기준
  for (const p of INFO_LIST_PATTERNS) {
    if (p.test(title)) return 'info_list';
  }

  // 포럼 템플릿 — snippet 기준 (타이틀에 후기 지표 있으면 skip)
  if (!hasTitleReviewIndicator(title)) {
    for (const p of TEMPLATE_PATTERNS) {
      if (p.test(snippet)) return 'template';
    }
  }

  return 'unknown';
}

/**
 * 스팸 리뷰 여부를 title + snippet으로 종합 판단
 * filter-reviews.ts, curate-reviews.ts, verify-all-reviews.ts에서 공통 사용
 */
export function isSpamReview(review: { title: string; snippet: string }): { isSpam: boolean; reason: string } {
  // 1. 타이틀 패턴 검사
  for (const pattern of UNIFIED_SPAM_TITLE_PATTERNS) {
    if (pattern.test(review.title)) {
      return { isSpam: true, reason: `타이틀 패턴: ${pattern.toString()}` };
    }
  }

  // 2. Snippet 패턴 검사
  for (const pattern of SPAM_SNIPPET_PATTERNS) {
    if (pattern.test(review.snippet)) {
      return { isSpam: true, reason: `Snippet 패턴: ${pattern.toString()}` };
    }
  }

  // 3. 콘텐츠 유형 검사
  const contentType = classifyContentType(review.title, review.snippet);
  if (contentType === 'template') {
    return { isSpam: true, reason: `콘텐츠 유형: ${contentType}` };
  }

  return { isSpam: false, reason: '' };
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

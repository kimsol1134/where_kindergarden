/**
 * 후기 데이터 자동 정제 스크립트
 * 스팸/무관 콘텐츠를 자동으로 필터링
 *
 * 사용법:
 *   pnpm filter:reviews              # 모든 시도 파일 필터링
 *   pnpm filter:reviews -- --sido 11 # 특정 시도만 필터링
 *   pnpm filter:reviews -- --dry-run # 미리보기 (파일 수정 안함)
 *   pnpm filter:reviews -- --min-score 2 # relevanceScore < 2인 리뷰 제거 (시군구 파일 전용)
 */

import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// 스팸 키워드 정의 (title + snippet 검사)
// ============================================================================

const SPAM_TITLE_PATTERNS = [
  // 부동산/임장
  /임장/i,
  /모델하우스/i,
  /분양/i,
  /재건축.*단지/i,
  /뉴타운.*임장/i,
  /아파트.*매매/i,
  /벽산블루밍.*후기/i,
  /아파트.*리뷰/i,
  /아파트.*학군/i,
  /청약.*정보/i,

  // 고물상/자원
  /고물상/i,
  /호성자원/i,

  // 미용/뷰티
  /네일/i,
  /미용(?!.*유치원)/i,
  /속눈썹/i,
  /피부관리/i,
  /헤어.*컷/i,
  /염색.*후기/i,

  // 음식/배달
  /마사지/i,
  /꽃집/i,
  /꽃배달/i,
  /베이커리/i,
  /인테리어/i,
  /풍선.*장식/i,
  /풍선날다/i,
  /떡공방/i,
  /떡집.*추천/i,
  /백일떡/i,
  /냉면.*추천/i,
  /국밥.*추천/i,
  /순댓국/i,
  /피자.*할인/i,
  /파파존스/i,
  /카페.*추천(?!.*유치원)/i,
  /맛집.*추천/i,
  /치킨.*추천/i,

  // 의료
  /치과.*후기/i,
  /한의원.*후기(?!.*유치원)/i,
  /정밀초음파/i,
  /입체초음파/i,
  /임신.*주차/i,
  /소아과.*후기/i,
  /병원.*진료/i,

  // 학원 (유치원 아님)
  /태권도(?!.*유치원)/i,
  /음악학원/i,
  /피아노학원/i,
  /러닝센터/i,
  /해법교실/i,
  /공부방/i,
  /스마트해법/i,
  /영어학원.*후기(?!.*유치원)/i,
  /도현학원/i,
  /정일품학원/i,
  /축구클럽.*후기/i,
  /축구교실.*후기/i,
  /음악줄넘기/i,
  /리듬체조학원/i,
  /수영.*강습/i,
  /발레학원/i,

  // 업체 광고 (V3 추가)
  /마술공연.*섭외/i,
  /출장마술.*후기/i,
  /인형극.*섭외/i,
  /원예.*체험.*후기/i,
  /원예수업.*후기/i,
  /부모교육.*강의/i,
  /부모교육.*강사/i,
  /포토존.*설치/i,
  /풍선장식.*업체/i,
  /슬러시.*기계/i,
  /커피차.*섭외/i,
  /간식차.*섭외/i,
  /고무매트.*철거/i,
  /커튼.*블라인드/i,
  /페인트.*시공/i,
  /방역.*업체/i,

  // 무관한 장소/활동
  /등산.*코스/i,
  /눈썰매장/i,
  /어린이회관slp/i,
  /강아지유치원/i,
  /가볼만한.*곳/i,
  /아차산.*절/i,
  /영화사.*방문/i,
  /아쿠아리움.*일상/i,
  /생태곤충원/i,

  // 등산/관광 (V3 추가)
  /석성산.*등산/i,
  /무봉산.*등산/i,
  /광교산.*등산/i,
  /산행.*후기/i,
  /둘레길.*코스/i,
  /트레킹.*후기/i,
  /등산로.*추천/i,

  // 무관한 제품/서비스
  /운동화.*추천/i,
  /휠라.*키즈/i,
  /나이키.*키즈/i,
  /음향수리/i,
  /렌탈.*후기/i,
  /정수기.*후기/i,

  // 무관한 교육/프로그램
  /창의드론/i,
  /이력서/i,
  /출강/i,

  // 해외 유치원 (잘못 연결)
  /나트랑.*유치원/i,
  /베트남.*유치원/i,
  /해외.*유치원(?!.*후기)/i,

  // 콘서트/공연 (V3 추가)
  /팬텀싱어/i,
  /포레스텔라/i,
  /콘서트.*후기(?!.*유치원)/i,
  /인형극단.*업체/i,
  /인형극.*전문.*업체/i,
  /체험단.*발표/i,
  /당첨자.*발표/i,
  /가요무대/i,
  /팬카페/i,
  /흠뻑쇼/i,
  /월드컵.*경기장/i,
  /뮤지컬.*후기(?!.*유치원)/i,
  /페스티벌.*후기/i,

  // 종교/이단 (V10 확장)
  /이단.*단체/i,
  /이단.*계열/i,
  /연등축제/i,
  /청련암.*전통사찰/i,
  /교회.*역사(?!.*유치원)/i,
  /교회.*설교/i,
  /교회.*예배(?!.*유치원)/i,
  /목사님.*설교/i,
  /부활절.*예배/i,
  /성경.*공부(?!.*유치원)/i,
  /선교사.*이야기/i,
  /절.*방문.*후기(?!.*유치원)/i,
  /사찰.*탐방/i,

  // 결혼/웨딩 (V10 추가)
  /결혼식.*후기(?!.*유치원)/i,
  /웨딩홀.*후기/i,
  /웨딩.*촬영/i,
  /돌잔치.*후기(?!.*유치원)/i,
  /신혼여행/i,
  /예식장.*추천/i,
  /스드메.*추천/i,

  // 상품 광고
  /블로퍼.*추천/i,
  /여성.*블로퍼/i,
  /여성.*블로퍼/i,
  /추천가격/i,

  // 영화/영상 (유치원 이름 '영화유치원' 주의)
  /영화.*블로그/i,
  /영화.*관람/i,
  /영화.*추천/i,
  /영화.*손익분기점/i,
  /영화.*출연/i,

  // 중고등학교/학원
  /중간고사.*기말고사/i,
  /수학교습소/i,

  // 산책/여행
  /산책.*후기(?!.*유치원)/i,
  /백세길.*산책/i,

  // 키즈카페/놀이시설 (V3 추가)
  /키즈카페.*후기(?!.*유치원)/i,
  /로라바운스/i,
  /플레이존/i,
  /에버랜드.*후기/i,
  /롯데월드.*후기/i,

  // 정치/사회 (V3 추가)
  /헌법재판소/i,
  /탄핵/i,
  /선거.*후보/i,

  // 타 지역 유치원 패턴은 LOCATION_MISMATCH_PATTERNS 및 LOCATION_PATTERNS_BY_SIDO에서 처리

  // 맛집/카페/음식점 (V4 추가)
  /수제돈까스/i,
  /칼국수.*맛집/i,
  /순대국/i,
  /삼겹살.*맛집/i,
  /쌈밥.*맛집/i,
  /쭈꾸미/i,
  /족발.*맛집/i,
  /고기.*맛집/i,
  /정육점/i,
  /식자재마트/i,
  /카스테라/i,
  /떡.*맛집/i,
  /떡꼬치/i,

  // 서비스업 광고 (V4 추가)
  /CCTV.*설치/i,
  /CCTV.*수리/i,
  /방충망.*시공/i,
  /하수구.*뚫/i,
  /하수구.*막힘/i,
  /에어컨.*설치/i,
  /주차선.*도색/i,
  /음향장비.*설치/i,
  /단열필름.*시공/i,
  /타일.*시공/i,
  /세면대.*설치/i,
  /슬라이딩문.*교체/i,

  // 학원/교육 (V4 추가)
  /링키영어/i,
  /샘솟미술/i,
  /영렘브란트/i,
  /아트스타/i,
  /플레이하트/i,
  /노랑수학/i,
  /잼있는.*영어학원/i,
  /축구.*아카데미/i,
  /축구교실(?!.*유치원)/i,
  /체육.*후기(?!.*유치원)/i,

  // 부동산 (V4 추가)
  /아파트경매/i,
  /입지정보/i,
  /3룸.*찾는다면/i,
  /투룸.*찾는다면/i,
  /역세권.*인프라/i,
  /복덕방/i,

  // 목공방/체험 업체
  /목공방.*단체/i,
  /목공방.*후기/i,
  /샌드아트.*공연/i,
  /인생네컷.*포토부스/i,
  /커피차.*출장/i,
  /푸드트럭.*후기/i,
  /케이터링.*후기/i,

  // 소설/창작물
  /소설.*블/i,

  // 무관한 관광/여행
  /고려궁지/i,
  /벚꽃.*축제/i,
  /강화산성/i,
  /전주.*한옥마을/i,
  /아라보타닉파크/i,
  /인생네컷/i,

  // 기흥/용인/분당 키즈카페
  /기흥키즈카페/i,
  /GLC키즈카페/i,

  // 타 지역 추가는 LOCATION_PATTERNS_BY_SIDO에서 처리

  // 업체 후기 (유치원과 무관)
  /천하여장군/i,
  /꽃다발서비스/i,
  /와프.*플라워/i,
  /무인키즈풀/i,
  /헬스장.*PT/i,
  /글램핏/i,
  /전기구이통닭/i,
  /치킨선도부/i,
  /돌잔치.*업체/i,

  // 어린이집/유치원 관련 아닌 업체
  /원예키트.*후기/i,
  /SBS아카데미.*미용/i,
  /네일아트.*지도과정/i,

  // 교육 기관 광고 (V4 추가)
  /힙스.*국제학교/i,
  /HIFS.*국제학교/i,

  // 유치원 위치 언급만 있는 맛집/시설
  /손두부.*맛집/i,
  /가마솥콩/i,
  /생선구이.*맛집/i,
  /멸치부터.*고래까지/i,
  /모래놀이카페/i,
  /샌드브로/i,
  /신촌설렁탕/i,
  /병천토속순대/i,

  // 맛집 추가 (V5)
  /오리탕.*후기/i,
  /브런치.*맛집/i,
  /노포.*맛집/i,
  /시래기.*맛집/i,
  /안주.*맛집/i,
  /대형카페.*후기/i,
  /선정쌈밥/i,

  // 기타 학원/교육 (V5)
  /아담리즈수학/i,
  /폴리어학원/i,
  /프라임에듀/i,
  /플레이팩토.*보드/i,
  /디테일링.*샵/i,

  // 해운대/부산 지역
  /해운대.*미술학원/i,
  /동래캠퍼스/i,
  /양산.*트리마제/i,

  // 맛집 추가 (V6)
  /감성.*카페.*푸딩.*맛집/i,
  /안주가.*맛있는/i,
  /인하대후문.*맛집/i,
  /막리단길/i,

  // 학원/체육관 (V6)
  /한빛태권도/i,

  // 기타 업체 (V6)
  /2024.*하계.*직무연수/i,

  // 학원 블로그 홍보글 (V7)
  /윤선생.*영어숲.*크리스마스/i,
  /아소비.*김포.*감정/i,
  /한자.*자격.*급수/i,
  /엘리프어학원.*용화/i,

  // 해운대 미술학원 (V7)
  /조선.*후기.*도입된/i,
  /모바일.*게임.*집착/i,

  // 태권도 (V7)
  /가현초.*신현북초.*서현유치원/i,

  // 학원 블로그 홍보글 추가 (V8)
  /한자.*자격증.*취득.*아소비/i,
  /아소비혁신호반/i,
  /1:1.*재원생.*간담회/i,
  /근처.*유치부.*영어.*CLT/i,

  // 타 지역 학원 블로그 (V9)
  /덕계.*영어.*링키홈/i,
  /링키.*영어.*동부산/i,
  /링키영어.*양산/i,

  // 시공/리모델링 업체 포트폴리오 (V11 - 전수 큐레이션)
  /놀이터.*시공.*후기/i,
  /유치원.*리모델링.*시공/i,
  /고무매트.*시공/i,
  /놀이시설.*시공/i,
  /인조잔디.*시공/i,
  /현관.*중문.*시공/i,
  /도어.*시공.*후기/i,
  /바닥.*시공.*업체/i,
  /조경.*시공.*후기/i,
  /유치원.*인테리어.*시공/i,
  /어린이집.*인테리어.*시공/i,
  /놀이방.*시공/i,
  /벽화.*시공.*후기/i,
  /실내놀이터.*시공/i,

  // 유아체육/이벤트/출장 업체 (V11)
  /유아체육.*전문/i,
  /이동동물원.*후기/i,
  /이동동물원.*체험/i,
  /페이스페인팅.*출장/i,
  /에어바운스.*대여/i,
  /파티.*풍선.*업체/i,
  /버블쇼.*섭외/i,
  /과학실험.*출장/i,
  /체험학습.*업체/i,
  /이벤트.*업체.*후기/i,

  // 관광/역사/종교 블로그 (V11)
  /운현궁.*나들이/i,
  /운현궁.*방문/i,
  /성당.*혼배/i,
  /성당.*미사(?!.*유치원)/i,
  /궁궐.*나들이/i,
  /고궁.*산책/i,
  /한옥마을.*체험/i,
  /박물관.*체험(?!.*유치원)/i,
  /수목원.*나들이/i,
  /둘레길.*나들이/i,

  // 사진/촬영 업체 (V11)
  /스냅.*촬영.*후기/i,
  /셀프스튜디오/i,
  /가족사진.*촬영(?!.*유치원)/i,
  /프로필.*촬영.*후기/i,

  // 보험/재테크 (V11)
  /어린이.*보험.*후기(?!.*유치원)/i,
  /태아보험/i,
  /실비보험/i,

  // 청소/세탁 업체 (V11)
  /에어컨.*청소.*후기/i,
  /입주청소/i,
  /이사청소/i,
  /세탁기.*청소.*후기/i,
  /매트리스.*청소/i,

  // 피트니스/운동 (V12 - 전수 큐레이션)
  /필라테스(?!.*유치원)/i,
  /헬스장(?!.*유치원)/i,
  /퍼스널트레이닝/i,
  /요가.*(해소|수련|힐링)/i,

  // 세차 (V12)
  /세차장(?!.*유치원)/i,
  /셀프세차/i,
  /손세차/i,
  /출장세차/i,
  /디테일링.*세차/i,
  /워시아지트/i,
  /오토모티브.*세차/i,

  // 패스트푸드/음식점 (V12)
  /왓더버거/i,
  /왓더런치/i,
  /마라탕(?!.*유치원)/i,

  // 애견/반려동물 (V12)
  /애견호텔/i,
  /애견유치원/i,
  /애견미용/i,
  /멍균관대/i,
  /놀러오개/i,
  /동물병원(?!.*유치원)/i,

  // 법률/전문서비스 (V12)
  /변호사.*(후기|추천|상담)/i,
  /법률사무소/i,

  // 이사 (V12)
  /포장이사/i,
  /이삿짐.*센터/i,

  // 상품 리뷰/중고 (V12)
  /가습기.*(추천|후기|장점|단점|가격|BEST|구매평)/i,
  /유모차.*드려요/i,
  /식기세척기.*설치(?!.*유치원)/i,

  // 다이어트 (V12)
  /다이어트.*(후기|추천)/i,
  /바디라인.*정리/i,

  // 숙박/리조트 (V12)
  /파크하얏트/i,
  /5성급.*호텔/i,
  /해외.*가족연수/i,
  /키즈풀빌라/i,
  /워터파크.*후기(?!.*유치원)/i,

  // 코딩교구 광고 (V12)
  /ㅋㄷㅋㄷ코딩/i,
  /피지컬컴퓨팅.*교구/i,

  // 과외 광고 (V12)
  /과외.*(국어|영어|수학|한국사|전문)/i,
  /전문과외/i,
  /예비중학생.*(국어|수학|영어)/i,

  // 업체 포트폴리오 (V12)
  /모래소독.*\d{3,}번째/i,
  /키제코.*모래소독/i,
  /키제코.*방역/i,

  // 자원봉사 공고 (V12)
  /자원봉사자.*위촉.*공고/i,

  // 버스광고 (V12)
  /시내버스.*광고/i,
  /버스쉘터.*광고/i,

  // 아파트/부동산 리뷰 (V12)
  /거주후기(?!.*유치원)/i,

  // 종교 무관 (V12)
  /성지순례/i,
  /주교좌/i,

  // 로또 (V12)
  /로또.*명당/i,

  // 스키/리조트 (V12)
  /런투스키스쿨/i,

  // 도서관/장난감 대여 (V12)
  /송도국제도서관/i,

  // 소아과 (V12)
  /소아청소년과의원/i,

  // 의류매장 (V12)
  /여성복.*옷가게/i,

];
// 시도별 시군구명 패턴 매핑 (해당 시도의 리뷰에서는 적용하지 않음)
const LOCATION_PATTERNS_BY_SIDO: Record<string, RegExp[]> = {
  '41': [ // 경기도 시군구
    /분당구/i, /수정구/i, /야탑/i, /이매/i, /죽전/i, /보정동/i,
    /용인시/i, /수지구/i, /기흥구/i, /동탄/i, /화성시/i, /평택시/i,
    /오산시/i, /광명시/i, /시흥시/i, /파주시/i, /김포시/i, /고양시/i,
    /일산/i, /광교/i, /위례/i, /성남시/i,
  ],
  '11': [ // 서울 구
    /송파구/i, /강동구/i, /강서구.*입학/i, /목동/i, /동대문구/i,
    /성북구/i, /강북구/i,
  ],
  '26': [/부산시/i], '27': [/대구시/i], '28': [/인천시/i],
  '29': [/광주시(?!.*경기)/i], '30': [/대전시/i], '31': [/울산시/i],
  '36': [/세종시/i], '42': [/춘천시/i, /원주시/i],
  '43': [/청주시/i], '44': [/천안시/i],
  '46': [/전주시/i], '47': [/포항시/i, /구미시/i, /경산시/i],
  '48': [/창원시/i, /김해시/i, /진주시/i, /마산/i, /거제시/i],
  '50': [/제주시/i],
};

function getLocationSpamPatterns(currentSidoCode: string): RegExp[] {
  const patterns: RegExp[] = [];
  for (const [sidoCode, sidoPatterns] of Object.entries(LOCATION_PATTERNS_BY_SIDO)) {
    if (sidoCode !== currentSidoCode) {
      patterns.push(...sidoPatterns);
    }
  }
  return patterns;
}

// 지역 불일치 패턴 (시도 코드 → 패턴 매핑)
// 현재 처리 중인 시도에 해당하는 패턴은 적용하지 않음
const LOCATION_MISMATCH_PATTERNS: Record<string, RegExp> = {
  '27': /(?:^|\s|[\[\(])대구.*유치원/i,
  '26': /(?:^|\s|[\[\(])부산.*유치원/i,
  '30': /(?:^|\s|[\[\(])대전.*유치원/i,
  '29': /(?:^|\s|[\[\(])광주.*유치원(?!.*경기)/i,  // 경기 광주 제외
  '31': /(?:^|\s|[\[\(])울산.*유치원/i,
  '36': /(?:^|\s|[\[\(])세종.*유치원/i,
  '43': /(?:^|\s|[\[\(])충북.*유치원/i,
  '44': /(?:^|\s|[\[\(])충남.*유치원/i,
  '45': /(?:^|\s|[\[\(])전북.*유치원/i,
  '46': /(?:^|\s|[\[\(])전남.*유치원/i,
  '47': /(?:^|\s|[\[\(])경북.*유치원/i,
  '48': /(?:^|\s|[\[\(])경남.*유치원/i,
  '42': /(?:^|\s|[\[\(])강원.*유치원/i,
  '50': /(?:^|\s|[\[\(])제주.*유치원/i,
  '28': /(?:^|\s|[\[\(])인천.*유치원/i,
  '11': /(?:^|\s|[\[\(])서울.*유치원/i,
  '41': /(?:^|\s|[\[\(])경기.*유치원/i,
};

const SPAM_SNIPPET_PATTERNS = [
  // 부동산
  /매매|전세|월세|평당|평형/i,
  /임장.*보고서/i,
  /투자.*스터디/i,
];

// ============================================================================
// 타입 정의
// ============================================================================

interface ReviewLink {
  id: string;
  kindergartenId: string;
  title: string;
  url: string;
  source: 'naver_blog' | 'naver_cafe' | 'google' | 'other';
  sourceName: string;
  snippet: string;
  date: string | null;
  collectedAt: string;
  relevanceScore?: number;
  [key: string]: unknown;
}

interface ReviewsData {
  version: string;
  totalCount: number;
  kindergartenCount: number;
  lastCuratedAt?: string;
  reviews: Record<string, ReviewLink[]>;
}

interface FilterResult {
  id: string;
  title: string;
  reason: string;
}

// ============================================================================
// 필터링 로직
// ============================================================================

function isSpam(review: ReviewLink, currentSidoCode?: string): { isSpam: boolean; reason: string } {
  // 타이틀 검사
  for (const pattern of SPAM_TITLE_PATTERNS) {
    if (pattern.test(review.title)) {
      return { isSpam: true, reason: `타이틀 패턴: ${pattern.toString()}` };
    }
  }

  // 지역 불일치 검사 (현재 시도 제외)
  for (const [sidoCode, pattern] of Object.entries(LOCATION_MISMATCH_PATTERNS)) {
    // 현재 처리 중인 시도의 패턴은 건너뜀
    if (currentSidoCode && sidoCode === currentSidoCode) continue;

    if (pattern.test(review.title)) {
      return { isSpam: true, reason: `지역 불일치: ${pattern.toString()}` };
    }
  }

  // 타 지역 시군구명 검사 (현재 시도에 속하지 않는 패턴만 적용)
  if (currentSidoCode) {
    const locationPatterns = getLocationSpamPatterns(currentSidoCode);
    for (const pattern of locationPatterns) {
      if (pattern.test(review.title) || pattern.test(review.snippet)) {
        return { isSpam: true, reason: `타 지역 시군구: ${pattern.toString()}` };
      }
    }
  }

  // Snippet 검사
  for (const pattern of SPAM_SNIPPET_PATTERNS) {
    if (pattern.test(review.snippet)) {
      return { isSpam: true, reason: `Snippet 패턴: ${pattern.toString()}` };
    }
  }

  return { isSpam: false, reason: '' };
}

// ============================================================================
// 메인 실행
// ============================================================================

function main() {
  const args = process.argv.slice(2);
  const sidoIdx = args.indexOf('--sido');
  const sidoCode = sidoIdx !== -1 ? args[sidoIdx + 1] : null;
  const isDryRun = args.includes('--dry-run');
  const minScoreIdx = args.indexOf('--min-score');
  const minScore = minScoreIdx !== -1 ? parseInt(args[minScoreIdx + 1], 10) : null;

  const REVIEWS_DIR = path.resolve('public/data/reviews');
  
  if (!fs.existsSync(REVIEWS_DIR)) {
    console.error('ERROR: public/data/reviews/ 디렉토리를 찾을 수 없습니다.');
    process.exit(1);
  }
  
  // 대상 파일 결정 (하위 디렉토리 포함)
  let files: string[] = [];
  
  if (sidoCode) {
    // 특정 시도의 메인 파일과 하위 디렉토리 파일 모두 처리
    const mainFile = `${sidoCode}.json`;
    const subDir = path.join(REVIEWS_DIR, sidoCode);
    
    if (fs.existsSync(path.join(REVIEWS_DIR, mainFile))) {
      files.push(mainFile);
    }
    
    if (fs.existsSync(subDir) && fs.statSync(subDir).isDirectory()) {
      const subFiles = fs.readdirSync(subDir).filter(f => f.endsWith('.json'));
      files.push(...subFiles.map(f => `${sidoCode}/${f}`));
    }
    
    if (files.length === 0) {
      console.error(`ERROR: ${sidoCode} 관련 파일을 찾을 수 없습니다.`);
      process.exit(1);
    }
  } else {
    // 모든 JSON 파일과 하위 디렉토리 파일 처리
    const SKIP_FILES = ['reviews.json', 'reviews.backup.json', 'unknown.json'];
    const items = fs.readdirSync(REVIEWS_DIR);
    for (const item of items) {
      const itemPath = path.join(REVIEWS_DIR, item);
      if (item.endsWith('.json') && !SKIP_FILES.includes(item)) {
        files.push(item);
      } else if (fs.statSync(itemPath).isDirectory()) {
        const subFiles = fs.readdirSync(itemPath).filter(f => f.endsWith('.json'));
        files.push(...subFiles.map(f => `${item}/${f}`));
      }
    }
  }
  
  console.log('=== 후기 데이터 자동 필터링 ===');
  console.log(`모드: ${isDryRun ? '미리보기 (dry-run)' : '실제 수정'}`);
  console.log(`대상 파일: ${files.length}개`);
  if (minScore !== null) {
    console.log(`최소 관련성 점수: ${minScore} (시군구 파일만 적용)`);
  }
  console.log('');
  
  let totalRemoved = 0;
  
  for (const file of files) {
    const filePath = path.join(REVIEWS_DIR, file);
    const data: ReviewsData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    // 시도 코드 추출: "28.json" → "28", "28/28110.json" → "28"
    const currentSidoCode = file.includes('/') ? file.split('/')[0] : file.replace('.json', '');
    const isSigunguFile = file.includes('/');

    console.log(`\n--- 처리 중: ${file} (${data.totalCount}건, 시도: ${currentSidoCode}) ---`);

    const removedItems: FilterResult[] = [];
    const newReviews: Record<string, ReviewLink[]> = {};
    let newTotal = 0;

    for (const [kindergartenId, reviews] of Object.entries(data.reviews)) {
      const filtered: ReviewLink[] = [];

      for (const review of reviews) {
        const { isSpam: spam, reason } = isSpam(review, currentSidoCode);

        if (spam) {
          removedItems.push({
            id: review.id,
            title: review.title.substring(0, 60),
            reason,
          });
        } else if (
          minScore !== null &&
          isSigunguFile &&
          typeof review.relevanceScore === 'number' &&
          review.relevanceScore < minScore
        ) {
          removedItems.push({
            id: review.id,
            title: review.title.substring(0, 60),
            reason: `관련성 점수 미달: ${review.relevanceScore} < ${minScore}`,
          });
        } else {
          filtered.push(review);
        }
      }
      
      if (filtered.length > 0) {
        newReviews[kindergartenId] = filtered;
        newTotal += filtered.length;
      }
    }
    
    console.log(`  제거 대상: ${removedItems.length}건`);
    
    if (removedItems.length > 0) {
      console.log('  --- 제거 목록 ---');
      for (const item of removedItems.slice(0, 20)) {
        console.log(`    [${item.id}] "${item.title}..."`);
        console.log(`       사유: ${item.reason}`);
      }
      if (removedItems.length > 20) {
        console.log(`    ... 외 ${removedItems.length - 20}건`);
      }
    }
    
    totalRemoved += removedItems.length;
    
    if (!isDryRun && removedItems.length > 0) {
      const newData: ReviewsData = {
        version: new Date().toISOString().split('T')[0],
        totalCount: newTotal,
        kindergartenCount: Object.keys(newReviews).length,
        lastCuratedAt: new Date().toISOString(),
        reviews: newReviews,
      };
      
      fs.writeFileSync(filePath, JSON.stringify(newData, null, 2));
      console.log(`  저장 완료: ${data.totalCount}건 → ${newTotal}건`);
    }
  }
  
  console.log('\n=== 결과 요약 ===');
  console.log(`총 제거: ${totalRemoved}건`);
  if (isDryRun) {
    console.log('(dry-run 모드: 실제 파일은 수정되지 않음)');
  }
}

main();

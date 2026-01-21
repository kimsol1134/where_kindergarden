/**
 * 유치원 알리미 Open API 응답 타입 정의
 * https://e-childschoolinfo.moe.go.kr/
 */

/** API 공통 응답 구조 */
export interface KindergartenApiResponse<T> {
  kinderInfo: T[];
}

/** 일반 현황 API 응답 (기본 정보) */
export interface BasicInfoResponse {
  kindercode: string; // 유치원 코드
  kindername: string; // 유치원명
  establish: string; // 설립유형 (공립단설, 공립병설, 사립, 법인 등)
  edate: string; // 설립일
  oession: string; // 운영시간
  addr: string; // 주소
  telno: string; // 전화번호
  hpaddr: string; // 홈페이지 주소
  opertime: string; // 운영시간
  clcnt3: string; // 만3세 학급수
  clcnt4: string; // 만4세 학급수
  clcnt5: string; // 만5세 학급수
  mixclcnt: string; // 혼합 학급수
  shclcnt: string; // 특수 학급수
  ppcnt3: string; // 만3세 정원
  ppcnt4: string; // 만4세 정원
  ppcnt5: string; // 만5세 정원
  mixppcnt: string; // 혼합 정원
  shppcnt: string; // 특수 정원
  ppCnt: string; // 총 정원
}

/** 현원 API 응답 */
export interface CurrentCountResponse {
  kindercode: string;
  pm3_acnt: string; // 만3세 남아
  pf3_acnt: string; // 만3세 여아
  pm4_acnt: string; // 만4세 남아
  pf4_acnt: string; // 만4세 여아
  pm5_acnt: string; // 만5세 남아
  pf5_acnt: string; // 만5세 여아
  mixm_acnt: string; // 혼합 남아
  mixf_acnt: string; // 혼합 여아
  shm_acnt: string; // 특수 남아
  shf_acnt: string; // 특수 여아
}

/** 통학차량 API 응답 */
export interface SchoolBusResponse {
  kindercode: string;
  vhcnt: string; // 차량 대수
  opra_yn: string; // 운영여부 (Y/N)
}

/** 급식 현황 API 응답 */
export interface MealInfoResponse {
  kindercode: string;
  mlsvof: string; // 급식 운영 형태 (직영, 위탁 등)
  phgrinfl: string; // 조리실 정보
}

/** 면적 현황 API 응답 */
export interface AreaInfoResponse {
  kindercode: string;
  gfa: string; // 건물 연면적
  pga: string; // 놀이터 면적
  plgrdco: string; // 실외 놀이터 수
}

/** 방과후 과정 API 응답 */
export interface AfterSchoolResponse {
  kindercode: string;
  afschDn: string; // 방과후 운영 여부
}

/** 시군구 코드 */
export interface SigunguCode {
  sidoCode: string;
  sigunguCode: string;
  sidoName: string;
  sigunguName: string;
}

/** API 엔드포인트 타입 (실제 API 엔드포인트명) */
export type ApiEndpoint =
  | 'basicInfo' // 기본현황
  | 'schoolBus' // 통학차량현황
  | 'schoolMeal' // 급식운영현황
  | 'classArea' // 교실면적현황
  | 'afterSchoolPresent'; // 방과후 과정 편성 운영 현황

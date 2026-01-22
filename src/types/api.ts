/**
 * API 응답 타입 정의
 */

/** 성공 응답 */
export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

/** 실패 응답 */
export interface ApiErrorResponse {
  success: false;
  error: string;
}

/** API 응답 타입 */
export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

/** 지오코딩 요청 */
export interface GeocodeRequest {
  address: string;
}

/** 지오코딩 응답 */
export interface GeocodeResult {
  lat: number;
  lng: number;
  address: string;
  placeName?: string; // 장소명 (아파트, 건물 등)
  sidoCode: string;
  sigunguCode: string;
}

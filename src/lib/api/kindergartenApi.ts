/**
 * 유치원 알리미 Open API 클라이언트
 * https://e-childschoolinfo.moe.go.kr/
 */

import type {
  BasicInfoResponse,
  SchoolBusResponse,
  MealInfoResponse,
  AreaInfoResponse,
  AfterSchoolResponse,
  KindergartenApiResponse,
} from '@/types';

const API_BASE_URL = 'https://e-childschoolinfo.moe.go.kr/api/notice';

interface FetchOptions {
  sidoCode: string;
  sggCode: string; // 시군구 코드
}

/**
 * 유치원 알리미 API 호출 함수
 */
async function fetchKindergartenApi<T>(
  endpoint: string,
  options: FetchOptions
): Promise<T[]> {
  const apiKey = process.env.KINDERGARTEN_API_KEY;

  if (!apiKey) {
    throw new Error('KINDERGARTEN_API_KEY is not configured');
  }

  const params = new URLSearchParams({
    key: apiKey,
    sidoCode: options.sidoCode,
    sggCode: options.sggCode,
  });

  const url = `${API_BASE_URL}/${endpoint}.do?${params.toString()}`;

  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
    },
    next: { revalidate: 86400 }, // 24시간 캐싱
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  const data: KindergartenApiResponse<T> = await response.json();
  return data.kinderInfo || [];
}

/**
 * 일반현황 조회 (기본 정보)
 */
export async function fetchBasicInfo(
  options: FetchOptions
): Promise<BasicInfoResponse[]> {
  return fetchKindergartenApi<BasicInfoResponse>('basicInfo', options);
}

/**
 * 통학차량 현황 조회
 */
export async function fetchSchoolBus(
  options: FetchOptions
): Promise<SchoolBusResponse[]> {
  return fetchKindergartenApi<SchoolBusResponse>('schoolBus', options);
}

/**
 * 급식 현황 조회
 */
export async function fetchMealInfo(
  options: FetchOptions
): Promise<MealInfoResponse[]> {
  return fetchKindergartenApi<MealInfoResponse>('schoolMeal', options);
}

/**
 * 면적 현황 조회
 */
export async function fetchAreaInfo(
  options: FetchOptions
): Promise<AreaInfoResponse[]> {
  return fetchKindergartenApi<AreaInfoResponse>('classArea', options);
}

/**
 * 방과후 과정 조회
 */
export async function fetchAfterSchool(
  options: FetchOptions
): Promise<AfterSchoolResponse[]> {
  return fetchKindergartenApi<AfterSchoolResponse>('afterSchoolPresent', options);
}

/**
 * 모든 정보 병렬 조회
 * 현원현황(childAbstnt) API는 공식 제공되지 않아 빈 배열 반환
 */
export async function fetchAllKindergartenInfo(options: FetchOptions) {
  const [basicInfo, schoolBus, mealInfo, areaInfo, afterSchool] =
    await Promise.all([
      fetchBasicInfo(options),
      fetchSchoolBus(options),
      fetchMealInfo(options),
      fetchAreaInfo(options),
      fetchAfterSchool(options),
    ]);

  return {
    basicInfo,
    currentCount: [], // 현원현황 API 미제공
    schoolBus,
    mealInfo,
    areaInfo,
    afterSchool,
  };
}

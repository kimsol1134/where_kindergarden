import { NextRequest, NextResponse } from 'next/server';
import {
  fetchAllKindergartenInfo,
  transformToKindergartens,
  reverseGeocode,
  geocodeAddress,
} from '@/lib/api';
import { calculateDistance } from '@/lib/geo';
import { getSupabase } from '@/lib/supabase';
import type { Kindergarten, ApiResponse, SearchResult, KindergartenRow } from '@/types';

export const dynamic = 'force-dynamic';

interface SearchParams {
  lat: number;
  lng: number;
  radius: number;
  type: 'all' | 'kindergarten' | 'daycare';
}

function parseSearchParams(searchParams: URLSearchParams): SearchParams | null {
  const lat = parseFloat(searchParams.get('lat') || '');
  const lng = parseFloat(searchParams.get('lng') || '');
  const radius = parseInt(searchParams.get('radius') || '1', 10);
  const type = (searchParams.get('type') || 'all') as SearchParams['type'];

  if (isNaN(lat) || isNaN(lng)) {
    return null;
  }

  return { lat, lng, radius, type };
}

/**
 * 유치원 목록을 DB에서 조회하거나 API에서 가져와서 캐싱
 */
async function getKindergartensForSigungu(
  sidoCode: string,
  sigunguCode: string
): Promise<Omit<Kindergarten, 'distance'>[]> {
  const supabase = getSupabase();

  // 1. 먼저 DB에서 해당 시군구의 지오코딩된 유치원 조회
  const { data: cachedData } = await supabase
    .from('kindergartens')
    .select('*')
    .eq('sigungu_code', sigunguCode)
    .returns<KindergartenRow[]>();

  // 2. 유치원 알리미 API에서 최신 데이터 조회
  const apiData = await fetchAllKindergartenInfo({
    sidoCode,
    sggCode: sigunguCode,
  });

  const transformedData = transformToKindergartens(apiData);

  // 3. 지오코딩된 데이터를 Map으로 변환
  const cachedMap = new Map(
    (cachedData || []).map((item) => [
      item.kindercode,
      { lat: item.lat, lng: item.lng },
    ])
  );

  // 4. API 데이터에 좌표 추가
  const result: Omit<Kindergarten, 'distance'>[] = [];

  for (const item of transformedData) {
    const cached = cachedMap.get(item.kindercode);

    if (cached) {
      result.push({
        ...item,
        lat: cached.lat,
        lng: cached.lng,
      });
    } else {
      // 캐시에 없으면 지오코딩 수행
      const geocoded = await geocodeAddress(item.address);

      if (geocoded) {
        // DB에 저장
        await supabase.from('kindergartens').upsert({
          kindercode: item.kindercode,
          name: item.name,
          address: item.address,
          lat: geocoded.lat,
          lng: geocoded.lng,
          sido_code: sidoCode,
          sigungu_code: sigunguCode,
        });

        result.push({
          ...item,
          lat: geocoded.lat,
          lng: geocoded.lng,
        });
      }
    }
  }

  return result;
}

export async function GET(
  request: NextRequest
): Promise<NextResponse<ApiResponse<SearchResult>>> {
  try {
    const params = parseSearchParams(request.nextUrl.searchParams);

    if (!params) {
      return NextResponse.json(
        { success: false, error: '위치 정보(lat, lng)가 필요합니다.' },
        { status: 400 }
      );
    }

    // 1. 좌표로 시군구 코드 조회
    const regionInfo = await reverseGeocode(params.lat, params.lng);

    if (!regionInfo) {
      return NextResponse.json(
        { success: false, error: '해당 위치의 지역 정보를 찾을 수 없습니다.' },
        { status: 400 }
      );
    }

    // 2. 해당 시군구의 유치원 데이터 조회
    const kindergartens = await getKindergartensForSigungu(
      regionInfo.sidoCode,
      regionInfo.sigunguCode
    );

    // 3. 거리 계산 및 반경 필터링
    const userLocation = { lat: params.lat, lng: params.lng };

    const filteredItems: Kindergarten[] = kindergartens
      .map((item) => ({
        ...item,
        distance:
          Math.round(
            calculateDistance(userLocation, { lat: item.lat, lng: item.lng }) *
              100
          ) / 100,
      }))
      .filter((item) => item.distance <= params.radius)
      .sort((a, b) => a.distance - b.distance);

    return NextResponse.json({
      success: true,
      data: {
        count: filteredItems.length,
        items: filteredItems,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

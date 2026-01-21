import { NextRequest, NextResponse } from 'next/server';
import {
  fetchAllKindergartenInfo,
  transformToKindergartens,
  reverseGeocode,
  geocodeAddress,
} from '@/lib/api';
import { calculateDistance } from '@/lib/geo';
import { getSupabase } from '@/lib/supabase';
import { convertRegionCode } from '@/lib/utils/regionCodes';
import type { Kindergarten, ApiResponse, SearchResult, KindergartenRow, InstitutionType, MealType } from '@/types';

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
 * DB에 캐싱된 데이터를 Kindergarten 타입으로 변환
 */
function transformCachedToKindergarten(row: KindergartenRow): Omit<Kindergarten, 'distance'> {
  return {
    kindercode: row.kindercode,
    name: row.name,
    type: (row.type as InstitutionType) || 'private',
    address: row.address,
    lat: row.lat,
    lng: row.lng,
    capacity: row.capacity || 0,
    currentCount: 0, // 현원은 API에서만 가져올 수 있음
    hasBus: row.has_bus || false,
    busCount: row.bus_count || 0,
    mealType: (row.meal_type as MealType) || 'none',
    hasAfterSchool: row.has_after_school || false,
    areaPerChild: Number(row.area_per_child) || 0,
    phone: row.phone || undefined,
    hasPlayground: row.has_playground || false,
  };
}

/**
 * 유치원 목록을 DB에서 조회하거나 API에서 가져와서 캐싱
 *
 * 캐싱 전략:
 * 1. DB에 detail_cached_at이 있는 데이터가 있으면 캐시에서 반환 (빠름)
 * 2. 없으면 API 호출 후 DB에 상세 정보까지 저장 (느림, 최초 1회)
 *
 * @param eduSidoCode 교육부 시도코드
 * @param sigunguName 시군구명 (주소 필터링용)
 * @param adminSigunguCode 행정안전부 시군구코드 (DB 저장용)
 */
async function getKindergartensForSigungu(
  eduSidoCode: string,
  sigunguName: string,
  adminSigunguCode: string
): Promise<Omit<Kindergarten, 'distance'>[]> {
  const supabase = getSupabase();

  // 1. DB에서 해당 시군구의 캐싱된 상세 데이터 조회
  const { data: cachedData } = await supabase
    .from('kindergartens')
    .select('*')
    .eq('sigungu_code', adminSigunguCode)
    .not('detail_cached_at', 'is', null)
    .returns<KindergartenRow[]>();

  // 캐시된 상세 데이터가 있으면 바로 반환 (API 호출 없이)
  if (cachedData && cachedData.length > 0) {
    return cachedData.map(transformCachedToKindergarten);
  }

  // 2. 캐시 없음 - 유치원 알리미 API 호출
  const apiData = await fetchAllKindergartenInfo({
    sidoCode: eduSidoCode,
    sggCode: adminSigunguCode,
  });

  const transformedData = transformToKindergartens(apiData);

  // 3. 기존 지오코딩 데이터를 Map으로 변환 (상세 데이터 없는 것도 포함)
  const { data: geocodedData } = await supabase
    .from('kindergartens')
    .select('kindercode, lat, lng')
    .eq('sigungu_code', adminSigunguCode);

  const geocodedMap = new Map(
    (geocodedData || []).map((item) => [
      item.kindercode,
      { lat: item.lat, lng: item.lng },
    ])
  );

  // 4. API 데이터에 좌표 추가 및 DB에 상세 정보 저장
  const result: Omit<Kindergarten, 'distance'>[] = [];
  const now = new Date().toISOString();

  for (const item of transformedData) {
    const cached = geocodedMap.get(item.kindercode);
    let lat: number;
    let lng: number;

    if (cached) {
      lat = cached.lat;
      lng = cached.lng;
    } else {
      // 캐시에 없으면 지오코딩 수행
      const geocoded = await geocodeAddress(item.address);
      if (!geocoded) continue;
      lat = geocoded.lat;
      lng = geocoded.lng;
    }

    // DB에 상세 정보 포함하여 upsert
    await supabase.from('kindergartens').upsert({
      kindercode: item.kindercode,
      name: item.name,
      address: item.address,
      lat,
      lng,
      sido_code: eduSidoCode,
      sigungu_code: adminSigunguCode,
      // 상세 정보 캐싱
      type: item.type,
      capacity: item.capacity,
      has_bus: item.hasBus,
      bus_count: item.busCount,
      meal_type: item.mealType,
      has_after_school: item.hasAfterSchool,
      area_per_child: item.areaPerChild,
      phone: item.phone || null,
      has_playground: item.hasPlayground || false,
      detail_cached_at: now,
    });

    result.push({
      ...item,
      lat,
      lng,
    });
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

    // 2. 행정안전부 코드를 교육부 코드로 변환
    const convertedRegion = convertRegionCode(
      regionInfo.sidoCode,
      regionInfo.sidoName,
      regionInfo.sigunguName
    );

    if (!convertedRegion) {
      return NextResponse.json(
        { success: false, error: '지원되지 않는 지역입니다.' },
        { status: 400 }
      );
    }

    // 3. 해당 시군구의 유치원 데이터 조회
    // 원본 행정 코드로 먼저 시도
    let kindergartens = await getKindergartensForSigungu(
      regionInfo.sidoCode,
      regionInfo.sigunguName,
      regionInfo.sigunguCode
    );

    // 원본 코드로 실패하면 교육부 코드로 재시도
    if (kindergartens.length === 0) {
      kindergartens = await getKindergartensForSigungu(
        convertedRegion.eduSidoCode,
        convertedRegion.sigunguName,
        regionInfo.sigunguCode
      );
    }

    // 4. 거리 계산 및 반경 필터링
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

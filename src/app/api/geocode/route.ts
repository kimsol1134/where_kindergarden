import { NextRequest, NextResponse } from 'next/server';
import { geocodeAddress, searchKeyword } from '@/lib/api';
import type { ApiResponse, GeocodeResult } from '@/types';

export const dynamic = 'force-dynamic';

/**
 * 주소 검색 / 지오코딩 API
 * GET /api/geocode?q=서울시 강남구
 */
export async function GET(
  request: NextRequest
): Promise<NextResponse<ApiResponse<GeocodeResult | GeocodeResult[]>>> {
  try {
    const query = request.nextUrl.searchParams.get('q');
    const mode = request.nextUrl.searchParams.get('mode') || 'geocode';

    if (!query) {
      return NextResponse.json(
        { success: false, error: '검색어(q)가 필요합니다.' },
        { status: 400 }
      );
    }

    if (mode === 'search') {
      // 키워드 검색 (주소, 아파트, 장소 이름 등)
      const results = await searchKeyword(query);

      const geocodeResults: GeocodeResult[] = results.map((doc) => ({
        lat: parseFloat(doc.y),
        lng: parseFloat(doc.x),
        address: doc.road_address_name || doc.address_name,
        placeName: doc.place_name,
        sidoCode: '', // 키워드 검색에서는 행정코드 제공 안 함
        sigunguCode: '',
      }));

      return NextResponse.json({
        success: true,
        data: geocodeResults,
      });
    } else {
      // 단일 주소 지오코딩
      const result = await geocodeAddress(query);

      if (!result) {
        return NextResponse.json(
          { success: false, error: '주소를 찾을 수 없습니다.' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: result,
      });
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

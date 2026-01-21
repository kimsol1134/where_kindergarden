import { NextRequest, NextResponse } from 'next/server';
import { geocodeAddress, searchAddress } from '@/lib/api';
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
      // 주소 검색 자동완성
      const results = await searchAddress(query);

      const geocodeResults: GeocodeResult[] = results.map((doc) => {
        const hCode = doc.address?.h_code || '';
        return {
          lat: parseFloat(doc.y),
          lng: parseFloat(doc.x),
          address: doc.address_name,
          sidoCode: hCode.substring(0, 2),
          sigunguCode: hCode.substring(0, 5),
        };
      });

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

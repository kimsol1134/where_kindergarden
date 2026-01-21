/**
 * Kakao API 클라이언트
 */

interface KakaoAddressDocument {
  address_name: string;
  x: string; // longitude
  y: string; // latitude
  address: {
    region_1depth_name: string; // 시도
    region_2depth_name: string; // 시군구
    region_3depth_name: string; // 동
    h_code: string; // 행정코드
    b_code: string; // 법정코드
  };
}

interface KakaoAddressResponse {
  documents: KakaoAddressDocument[];
  meta: {
    total_count: number;
    pageable_count: number;
    is_end: boolean;
  };
}

interface KakaoCoord2RegionDocument {
  region_type: string;
  address_name: string;
  region_1depth_name: string;
  region_2depth_name: string;
  region_3depth_name: string;
  code: string;
  x: number;
  y: number;
}

interface KakaoCoord2RegionResponse {
  documents: KakaoCoord2RegionDocument[];
  meta: {
    total_count: number;
  };
}

export interface GeocodeResult {
  lat: number;
  lng: number;
  address: string;
  sidoCode: string;
  sigunguCode: string;
}

export interface ReverseGeocodeResult {
  sidoCode: string;
  sigunguCode: string;
  sidoName: string;
  sigunguName: string;
}

/**
 * 주소 → 좌표 변환 (지오코딩)
 */
export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  const apiKey = process.env.KAKAO_REST_API_KEY;

  if (!apiKey) {
    throw new Error('KAKAO_REST_API_KEY is not configured');
  }

  const params = new URLSearchParams({
    query: address,
  });

  const response = await fetch(
    `https://dapi.kakao.com/v2/local/search/address.json?${params.toString()}`,
    {
      headers: {
        Authorization: `KakaoAK ${apiKey}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Kakao API request failed: ${response.status}`);
  }

  const data: KakaoAddressResponse = await response.json();

  if (data.documents.length === 0) {
    return null;
  }

  const doc = data.documents[0];
  const hCode = doc.address?.h_code || '';

  return {
    lat: parseFloat(doc.y),
    lng: parseFloat(doc.x),
    address: doc.address_name,
    sidoCode: hCode.substring(0, 2),
    sigunguCode: hCode.substring(0, 5),
  };
}

/**
 * 좌표 → 지역 정보 변환 (역지오코딩)
 */
export async function reverseGeocode(
  lat: number,
  lng: number
): Promise<ReverseGeocodeResult | null> {
  const apiKey = process.env.KAKAO_REST_API_KEY;

  if (!apiKey) {
    throw new Error('KAKAO_REST_API_KEY is not configured');
  }

  const params = new URLSearchParams({
    x: lng.toString(),
    y: lat.toString(),
  });

  const response = await fetch(
    `https://dapi.kakao.com/v2/local/geo/coord2regioncode.json?${params.toString()}`,
    {
      headers: {
        Authorization: `KakaoAK ${apiKey}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Kakao API request failed: ${response.status}`);
  }

  const data: KakaoCoord2RegionResponse = await response.json();

  // H (행정동) 타입 찾기
  const adminDoc = data.documents.find((doc) => doc.region_type === 'H');

  if (!adminDoc) {
    return null;
  }

  const code = adminDoc.code;

  return {
    sidoCode: code.substring(0, 2),
    sigunguCode: code.substring(0, 5),
    sidoName: adminDoc.region_1depth_name,
    sigunguName: adminDoc.region_2depth_name,
  };
}

/**
 * 주소 검색 자동완성
 */
export async function searchAddress(query: string): Promise<KakaoAddressDocument[]> {
  const apiKey = process.env.KAKAO_REST_API_KEY;

  if (!apiKey) {
    throw new Error('KAKAO_REST_API_KEY is not configured');
  }

  const params = new URLSearchParams({
    query,
    size: '10',
  });

  const response = await fetch(
    `https://dapi.kakao.com/v2/local/search/address.json?${params.toString()}`,
    {
      headers: {
        Authorization: `KakaoAK ${apiKey}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Kakao API request failed: ${response.status}`);
  }

  const data: KakaoAddressResponse = await response.json();
  return data.documents;
}

import { isNative } from '@/lib/utils/platform';

/**
 * API Base URL 설정
 *
 * - 네이티브 앱: Vercel 호스팅 URL 사용 (Static Export는 API Route 미지원)
 * - 웹: 상대 경로 사용 (개발 서버 또는 Vercel 배포 환경)
 */
export function getApiBaseUrl(): string {
  if (isNative()) {
    // 네이티브 앱에서는 Vercel 배포 URL 사용
    // 환경 변수가 없으면 빈 문자열 (개발 중에는 웹 모드로 테스트)
    return process.env.NEXT_PUBLIC_API_BASE_URL || '';
  }
  // 웹에서는 상대 경로 사용
  return '';
}

/**
 * API 엔드포인트 URL 생성
 */
export function getApiUrl(path: string): string {
  const baseUrl = getApiBaseUrl();
  return `${baseUrl}${path}`;
}

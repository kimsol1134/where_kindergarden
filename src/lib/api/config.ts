/**
 * API Base URL 설정
 * 웹에서는 상대 경로 사용 (개발 서버 또는 Vercel 배포 환경)
 */
export function getApiBaseUrl(): string {
  return '';
}

/**
 * API 엔드포인트 URL 생성
 */
export function getApiUrl(path: string): string {
  return path;
}

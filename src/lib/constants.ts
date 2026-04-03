/** 프로덕션 사이트 URL */
export const SITE_URL = 'https://where-kindergarden.vercel.app';

/** 전국 유치원 수 (sync-kindergartens 기준) */
export const TOTAL_KINDERGARTEN_COUNT = 7950;

/** OG 공유 이미지 */
export const OG_IMAGE = {
  path: '/og-image.png',
  width: 1200,
  height: 630,
} as const;

/** 데이터 버전 정보 */
export const DATA_VERSION = {
  label: '2026년 1학기',
  updatedAt: '2026-01-21',
} as const;

/** AdMob 배너 높이 (px) */
export const AD_BANNER_HEIGHT = 50;

/** localStorage 키: 위치 권한 사전 안내 표시 여부 */
export const LOCATION_PERMISSION_KEY = 'location-permission-shown';

/** 데스크탑 패널 너비 제한 (px) */
export const PANEL_MIN_WIDTH = 320;
export const PANEL_MAX_WIDTH = 700;
export const PANEL_DEFAULT_WIDTH = 450;

/** 토스트 타이밍 (ms) */
export const TOAST_FADE_DELAY = 4700;
export const TOAST_DISMISS_DELAY = 5000;
export const TOAST_MANUAL_DISMISS_DELAY = 300;

/** 기관 유형별 라벨 및 스타일 */
export const TYPE_STYLES = {
  public: { label: '국공립', className: 'text-emerald-600 bg-emerald-50' },
  private: { label: '사립', className: 'text-indigo-600 bg-indigo-50' },
  home: { label: '가정', className: 'text-gray-600 bg-gray-100' },
} as const;

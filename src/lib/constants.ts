import kindergartenMetadata from '../../public/data/kindergartens.meta.json';
import regionMetadata from '../../public/data/region-codes.meta.json';

/** 프로덕션 사이트 URL */
export const SITE_URL = 'https://where-kindergarden.vercel.app';

/** 전국 유치원 수 (sync-kindergartens 기준) */
export const TOTAL_KINDERGARTEN_COUNT = kindergartenMetadata.totalCount;

/** 최신 공식 코드표의 시/도 수 */
export const TOTAL_SIDO_COUNT = regionMetadata.sidoCount;

/** OG 공유 이미지 */
export const OG_IMAGE = {
  path: '/og-image-20260612.png',
  width: 1200,
  height: 630,
} as const;

/** 데이터 버전 정보 */
export const DATA_VERSION = {
  label: kindergartenMetadata.sourceLabel,
  updatedAt: kindergartenMetadata.collectedAt.slice(0, 10),
  year: kindergartenMetadata.sourceVersion.slice(0, 4),
} as const;

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

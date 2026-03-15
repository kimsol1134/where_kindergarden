/**
 * 카카오톡 공유 기능
 */
import { Share } from '@capacitor/share';
import type { KakaoShareFeedOptions } from '@/types/kakao.d';
import { isNative } from '@/lib/utils/platform';
import type { Coordinates } from '@/types';

interface ShareToKakaoParams {
  title: string;
  description: string;
  compareIds: string[];
  location?: Coordinates | null;
  address?: string;
}

/**
 * 비교표 공유 URL 생성
 */
export function generateCompareSharePath(
  kindercodes: string[],
  location?: Coordinates | null,
  address?: string
): string {
  const params = new URLSearchParams();
  params.set('ids', kindercodes.join(','));

  if (location) {
    params.set('lat', String(location.lat));
    params.set('lng', String(location.lng));
  }

  if (address) {
    params.set('address', address);
  }

  return `/compare?${params.toString()}`;
}

export function generateCompareShareUrl(
  kindercodes: string[],
  location?: Coordinates | null,
  address?: string
): string {
  const base = typeof window !== 'undefined' ? window.location.origin : '';
  return `${base}${generateCompareSharePath(kindercodes, location, address)}`;
}

/**
 * 카카오톡으로 비교표 공유
 */
export function shareToKakao({
  title,
  description,
  compareIds,
  location,
  address,
}: ShareToKakaoParams): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  if (!window.Kakao?.Share) {
    return false;
  }

  const url = generateCompareShareUrl(compareIds, location, address);
  const imageUrl = `${window.location.origin}/og-image.png`;

  const options: KakaoShareFeedOptions = {
    objectType: 'feed',
    content: {
      title,
      description,
      imageUrl,
      link: {
        mobileWebUrl: url,
        webUrl: url,
      },
    },
    buttons: [
      {
        title: '비교표 보기',
        link: {
          mobileWebUrl: url,
          webUrl: url,
        },
      },
    ],
  };

  window.Kakao.Share.sendDefault(options);
  return true;
}

/**
 * 네이티브 공유 시트 열기 (iOS/Android)
 */
export async function shareNative({
  title,
  description,
  compareIds,
  location,
  address,
}: ShareToKakaoParams): Promise<boolean> {
  const url = generateCompareShareUrl(compareIds, location, address);

  try {
    await Share.share({
      title,
      text: description,
      url,
      dialogTitle: '유치원 비교표 공유',
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * 플랫폼에 맞는 공유 방식 자동 선택
 * - 네이티브 앱: 네이티브 공유 시트 사용
 * - 웹: 카카오톡 공유 또는 클립보드 복사
 */
export async function shareComparison({
  title,
  description,
  compareIds,
  location,
  address,
}: ShareToKakaoParams): Promise<boolean> {
  if (isNative()) {
    return shareNative({ title, description, compareIds, location, address });
  }

  // 웹에서는 카카오톡 공유 시도
  const kakaoSuccess = shareToKakao({ title, description, compareIds, location, address });
  if (!kakaoSuccess) {
    // 카카오톡 공유 실패 시 클립보드 복사
    return copyShareUrl(compareIds, location, address);
  }
  return kakaoSuccess;
}

/**
 * 클립보드에 URL 복사
 */
export async function copyShareUrl(
  kindercodes: string[],
  location?: Coordinates | null,
  address?: string
): Promise<boolean> {
  if (typeof window === 'undefined') {
    return false;
  }

  const url = generateCompareShareUrl(kindercodes, location, address);

  try {
    await navigator.clipboard.writeText(url);
    return true;
  } catch {
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = url;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      return true;
    } catch {
      return false;
    } finally {
      document.body.removeChild(textArea);
    }
  }
}

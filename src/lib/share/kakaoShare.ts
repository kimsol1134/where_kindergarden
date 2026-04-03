/**
 * 카카오톡 공유 기능
 */
import { Share } from '@capacitor/share';
import type { KakaoShareFeedOptions } from '@/types/kakao.d';
import { isNative } from '@/lib/utils/platform';
import { SITE_URL, TOTAL_KINDERGARTEN_COUNT, OG_IMAGE } from '@/lib/constants';

interface ShareToKakaoParams {
  title: string;
  description: string;
  compareIds: string[];
}

/**
 * 비교표 공유 URL 생성
 */
export function generateCompareShareUrl(kindercodes: string[]): string {
  return `${SITE_URL}/compare?ids=${kindercodes.join(',')}`;
}

/**
 * 카카오톡으로 비교표 공유
 */
export function shareToKakao({
  title,
  description,
  compareIds,
}: ShareToKakaoParams): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  if (!window.Kakao?.Share) {
    alert('카카오톡 공유를 사용할 수 없습니다.');
    return false;
  }

  const url = generateCompareShareUrl(compareIds);
  const imageUrl = `${SITE_URL}${OG_IMAGE.path}`;

  const options: KakaoShareFeedOptions = {
    objectType: 'feed',
    content: {
      title,
      description,
      imageUrl,
      imageWidth: OG_IMAGE.width,
      imageHeight: OG_IMAGE.height,
      link: {
        mobileWebUrl: url,
        webUrl: url,
      },
    },
    social: {
      viewCount: TOTAL_KINDERGARTEN_COUNT,
    },
    buttons: [
      {
        title: '비교표 바로 보기',
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
}: ShareToKakaoParams): Promise<boolean> {
  const url = generateCompareShareUrl(compareIds);

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
}: ShareToKakaoParams): Promise<boolean> {
  if (isNative()) {
    return shareNative({ title, description, compareIds });
  }

  // 웹에서는 카카오톡 공유 시도
  const kakaoSuccess = shareToKakao({ title, description, compareIds });
  if (!kakaoSuccess) {
    // 카카오톡 공유 실패 시 클립보드 복사
    return copyShareUrl(compareIds);
  }
  return kakaoSuccess;
}

/**
 * 클립보드에 URL 복사
 */
export async function copyShareUrl(kindercodes: string[]): Promise<boolean> {
  if (typeof window === 'undefined') {
    return false;
  }

  const url = generateCompareShareUrl(kindercodes);

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

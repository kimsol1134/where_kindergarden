/**
 * 카카오톡 공유 기능
 */
import type { KakaoShareFeedOptions } from '@/types/kakao.d';

interface ShareToKakaoParams {
  title: string;
  description: string;
  compareIds: string[];
}

/**
 * 비교표 공유 URL 생성
 */
export function generateCompareShareUrl(kindercodes: string[]): string {
  const base = typeof window !== 'undefined' ? window.location.origin : '';
  return `${base}/compare?ids=${kindercodes.join(',')}`;
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

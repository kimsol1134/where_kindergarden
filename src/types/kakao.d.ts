/**
 * Kakao JavaScript SDK 타입 선언
 */

interface KakaoShareLink {
  mobileWebUrl: string;
  webUrl: string;
}

interface KakaoShareContent {
  title: string;
  description: string;
  imageUrl: string;
  imageWidth?: number;
  imageHeight?: number;
  link: KakaoShareLink;
}

interface KakaoShareSocial {
  likeCount?: number;
  commentCount?: number;
  sharedCount?: number;
  viewCount?: number;
  subscriberCount?: number;
}

interface KakaoShareButton {
  title: string;
  link: KakaoShareLink;
}

interface KakaoShareFeedOptions {
  objectType: 'feed';
  content: KakaoShareContent;
  social?: KakaoShareSocial;
  buttons?: KakaoShareButton[];
}

interface KakaoShare {
  sendDefault: (options: KakaoShareFeedOptions) => void;
}

interface KakaoSDK {
  init: (key: string) => void;
  isInitialized: () => boolean;
  Share: KakaoShare;
}

declare global {
  interface Window {
    Kakao?: KakaoSDK;
  }
}

export type {
  KakaoShareLink,
  KakaoShareContent,
  KakaoShareSocial,
  KakaoShareButton,
  KakaoShareFeedOptions,
  KakaoShare,
  KakaoSDK,
};

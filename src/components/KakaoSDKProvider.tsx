'use client';

import { useEffect } from 'react';

const KAKAO_SDK_URL = 'https://t1.kakaocdn.net/kakao_js_sdk/2.7.0/kakao.min.js';

/**
 * Kakao SDK 초기화 Provider
 * 앱 전체에서 Kakao SDK를 사용할 수 있도록 초기화
 */
export function KakaoSDKProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const kakaoKey = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;

    if (!kakaoKey) {
      return;
    }

    // 이미 SDK가 로드되어 있으면 초기화만 수행
    if (window.Kakao) {
      if (!window.Kakao.isInitialized()) {
        window.Kakao.init(kakaoKey);
      }
      return;
    }

    // SDK 스크립트 동적 로드
    const script = document.createElement('script');
    script.src = KAKAO_SDK_URL;
    script.async = true;
    script.onload = () => {
      if (window.Kakao && !window.Kakao.isInitialized()) {
        window.Kakao.init(kakaoKey);
      }
    };
    document.head.appendChild(script);

    return () => {
      // Cleanup: 스크립트 제거 (optional, 보통 제거하지 않음)
    };
  }, []);

  return <>{children}</>;
}

import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.solkim.kindergarden',
  appName: '우리동네 유치원',
  webDir: 'out',
  server: {
    // iOS는 HTTPS 사용 (Mixed Content 정책 대응)
    // Android는 http 유지 (Kakao Maps SDK 호환)
    androidScheme: 'http',
    iosScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      backgroundColor: "#ffffff",
      launchShowDuration: 2000,
      launchAutoHide: true,
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
  },
};

export default config;

import type { Metadata, Viewport } from 'next';
import './globals.css';
import { GlobalProviders } from '@/components/GlobalProviders';
import { KakaoSDKProvider } from '@/components/KakaoSDKProvider';

/*
 * Font optimization: To use next/font/local for better performance,
 * download Pretendard font files to public/fonts/:
 * - Pretendard-Regular.woff2
 * - Pretendard-Medium.woff2
 * - Pretendard-SemiBold.woff2
 * - Pretendard-Bold.woff2
 *
 * Then uncomment and configure localFont below.
 * Currently using CDN fallback in globals.css.
 */

export const metadata: Metadata = {
  title: '우리동네 유치원',
  description:
    '현재 위치 기반으로 주변 유치원을 검색하고 비교해보세요.',
  openGraph: {
    title: '우리동네 유치원',
    description:
      '현재 위치 기반으로 주변 유치원을 검색하고 비교해보세요.',
    images: ['/og-image.png'],
    type: 'website',
    locale: 'ko_KR',
  },
  icons: {
    icon: '/favicon.ico',
  },
  verification: {
    google: '9xdRn2UOPOTpBwDt2oILqTEvY-X27sQbcy20V4p7yb4',
    other: {
      'naver-site-verification': 'e087398a93c79ec531bd7e5f9d5356da210c4b44',
    },
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: '우리동네 유치원',
    startupImage: [
      '/startup.png',
    ],
  },
};


export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover', // iOS Safe Area 지원
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-white antialiased">
        <GlobalProviders>
          <KakaoSDKProvider>{children}</KakaoSDKProvider>
        </GlobalProviders>
      </body>
    </html>
  );
}

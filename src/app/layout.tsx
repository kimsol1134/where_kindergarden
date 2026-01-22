import type { Metadata, Viewport } from 'next';
import './globals.css';
import { KakaoSDKProvider } from '@/components/KakaoSDKProvider';

export const metadata: Metadata = {
  title: '우리동네 유치원',
  description:
    '현재 위치 기반으로 주변 유치원과 어린이집을 검색하고 비교해보세요.',
  openGraph: {
    title: '우리동네 유치원',
    description:
      '현재 위치 기반으로 주변 유치원과 어린이집을 검색하고 비교해보세요.',
    images: ['/og-image.png'],
    type: 'website',
    locale: 'ko_KR',
  },
  icons: {
    icon: '/favicon.ico',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-white antialiased">
        <KakaoSDKProvider>{children}</KakaoSDKProvider>
      </body>
    </html>
  );
}

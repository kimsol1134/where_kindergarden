import type { Metadata, Viewport } from 'next';
import './globals.css';
import { GlobalProviders } from '@/components/GlobalProviders';
import { KakaoSDKProvider } from '@/components/KakaoSDKProvider';
import { WebsiteJsonLd, OrganizationJsonLd } from '@/components/JsonLd';
import { AdContainer } from '@/components/ads/AdContainer';
import { OfflineBanner } from '@/components/common/OfflineBanner';
import { Analytics } from '@vercel/analytics/next';

export const metadata: Metadata = {
  metadataBase: new URL('https://where-kindergarden.vercel.app'),
  title: {
    default: '우리동네 유치원 - 내 주변 유치원 검색 및 비교',
    template: '%s | 우리동네 유치원',
  },
  description:
    '내 주변 국공립, 사립 유치원을 찾고 계신가요? 우리동네 유치원에서 거리순, 비용순으로 비교하고 아이에게 딱 맞는 유치원을 발견하세요.',
  keywords: [
    '유치원',
    '유치원 검색',
    '주변 유치원',
    '유치원 비교',
    '우리동네 유치원',
    '유치원 찾기',
    '유치원 알리미',
    '공립 유치원',
    '사립 유치원',
    '영유아 학교',
    '유치원 입학금',
    '국공립 유치원',
    '영어 유치원',
    '유치원 상담',
    '처음학교로',
  ],
  authors: [{ name: '우리동네 유치원' }],
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    url: 'https://where-kindergarden.vercel.app',
    siteName: '우리동네 유치원',
    title: '우리동네 유치원 - 내 주변 유치원 검색 및 비교',
    description:
      '현재 위치 기반으로 주변 유치원을 검색하고 비교해보세요. 전국 7,950개 이상의 유치원 정보를 한눈에 확인할 수 있습니다.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: '우리동네 유치원 - 내 주변 유치원 검색 및 비교',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '우리동네 유치원 - 내 주변 유치원 검색 및 비교',
    description:
      '현재 위치 기반으로 주변 유치원을 검색하고 비교해보세요.',
    images: ['/og-image.png'],
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-icon.png',
    shortcut: '/icon-small.png',
  },
  verification: {
    google: '9xdRn2UOPOTpBwDt2oILqTEvY-X27sQbcy20V4p7yb4',
    other: {
      'naver-site-verification': 'e087398a93c79ec531bd7e5f9d5356da210c4b44',
    },
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
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
  viewportFit: 'cover',
  themeColor: '#f6f5ef',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className="min-h-screen antialiased text-[var(--brand-ink)]">
        <OfflineBanner />
        <GlobalProviders>
          <KakaoSDKProvider>{children}</KakaoSDKProvider>
        </GlobalProviders>
        <WebsiteJsonLd />
        <OrganizationJsonLd />
        <AdContainer />
        <Analytics />
      </body>
    </html>
  );
}

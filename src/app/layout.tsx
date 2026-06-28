import type { Metadata, Viewport } from 'next';
import './globals.css';
import { GlobalProviders } from '@/components/GlobalProviders';
import { KakaoSDKProvider } from '@/components/KakaoSDKProvider';
import { WebsiteJsonLd, OrganizationJsonLd } from '@/components/JsonLd';
import { OfflineBanner } from '@/components/common/OfflineBanner';
import { Analytics } from '@vercel/analytics/next';

const SITE_URL = 'https://where-kindergarden.vercel.app';
const FAVICON_URL = `${SITE_URL}/favicon-20260612.png`;
const OG_IMAGE_URL = `${SITE_URL}/og-image-20260612.png`;
const OG_IMAGE_ALT =
  '유치원 알리미 - 우리동네 유치원, 내 주변 유치원을 찾고 한눈에 비교하세요';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: '유치원 알리미 - 우리동네 유치원, 찾기·비교·후기',
    template: '%s | 유치원 알리미 - 우리동네 유치원',
  },
  description:
    '교육부 유치원 알리미 데이터와 학부모 후기를 광고 없이 확인하세요. 내 주변 유치원을 거리순으로 찾고 통학버스, 급식, 방과후 과정을 비교할 수 있습니다.',
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
    url: SITE_URL,
    siteName: '유치원 알리미 - 우리동네 유치원',
    title: '유치원 알리미 - 우리동네 유치원, 찾기·비교·후기',
    description:
      '교육부 유치원 알리미 데이터와 학부모 후기를 광고 없이 확인하고, 주변 유치원을 한눈에 비교해보세요.',
    images: [
      {
        url: OG_IMAGE_URL,
        width: 1200,
        height: 630,
        alt: OG_IMAGE_ALT,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '유치원 알리미 - 우리동네 유치원, 찾기·비교·후기',
    description:
      '교육부 유치원 알리미 데이터와 학부모 후기를 광고 없이 확인하세요.',
    images: [
      {
        url: OG_IMAGE_URL,
        width: 1200,
        height: 630,
        alt: OG_IMAGE_ALT,
      },
    ],
  },
  icons: {
    shortcut: [{ url: FAVICON_URL, sizes: '48x48', type: 'image/png' }],
    icon: [
      { url: FAVICON_URL, sizes: '48x48', type: 'image/png' },
      { url: `${SITE_URL}/favicon.ico`, sizes: 'any', type: 'image/x-icon' },
    ],
    apple: [
      {
        url: `${SITE_URL}/apple-touch-icon.png`,
        sizes: '180x180',
        type: 'image/png',
      },
    ],
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
    startupImage: ['/startup.png'],
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
        <Analytics />
      </body>
    </html>
  );
}

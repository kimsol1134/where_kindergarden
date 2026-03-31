import type { MetadataRoute } from 'next';

export const dynamic = 'force-static';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: '우리동네 유치원',
    short_name: '우리동네 유치원',
    description:
      '현재 위치 기반으로 주변 유치원을 검색하고 비교해보세요. 앱 아이콘과 동일한 브랜드 언어로 웹과 iPhone 앱을 함께 제공합니다.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f6f5ef',
    theme_color: '#f6f5ef',
    icons: [
      {
        src: '/icon.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/apple-icon.png',
        sizes: '180x180',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  };
}

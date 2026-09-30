import type { MetadataRoute } from 'next';

export const dynamic = 'force-static';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: '우리동네 유치원 - 내 주변 유치원 찾기',
    short_name: '우리동네 유치원',
    description:
      '교육부 유치원 알리미 공시 데이터와 학부모 후기 원문을 확인하고, 내 주변 유치원을 비교하세요.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f6f5ef',
    theme_color: '#f6f5ef',
    icons: [
      { src: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512x512.png', sizes: '512x512', type: 'image/png' },
      { src: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png', purpose: 'any' },
    ],
  };
}

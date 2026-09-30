import type { Metadata } from 'next';
import { OG_IMAGE } from '@/lib/constants';

/**
 * 검색 페이지 SEO 메타데이터
 * https://searchadvisor.naver.com/guide/markup-content
 */
export const metadata: Metadata = {
  title: '내 주변 유치원 검색 지도',
  description:
    '현재 위치나 주소를 입력해 가까운 유치원을 지도에서 찾고 거리순, 국공립·사립, 셔틀버스, 여유정원 조건으로 비교하세요.',
  alternates: {
    canonical: '/search',
  },
  openGraph: {
    title: '내 주변 유치원 검색 지도 | 우리동네 유치원',
    description:
      '가까운 유치원을 지도에서 찾고 거리순, 국공립·사립, 셔틀버스, 여유정원 조건으로 비교하세요.',
    url: '/search',
    images: [
      {
        url: OG_IMAGE.path,
        width: OG_IMAGE.width,
        height: OG_IMAGE.height,
        alt: '우리동네 유치원 - 내 주변 유치원 검색 지도',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '내 주변 유치원 검색 지도 | 우리동네 유치원',
    description:
      '가까운 유치원을 지도에서 찾고 거리순, 국공립·사립, 셔틀버스, 여유정원 조건으로 비교하세요.',
    images: [OG_IMAGE.path],
  },
};

export default function SearchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

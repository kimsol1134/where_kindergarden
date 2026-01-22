import type { Metadata } from 'next';

/**
 * 검색 페이지 SEO 메타데이터
 * https://searchadvisor.naver.com/guide/markup-content
 */
export const metadata: Metadata = {
  title: '유치원 검색',
  description:
    '내 주변 유치원을 검색하고 비교해보세요. GPS 위치 기반으로 가까운 유치원을 찾아드립니다. 반경 1km, 2km, 5km 필터로 원하는 거리의 유치원만 확인할 수 있습니다.',
  alternates: {
    canonical: '/search',
  },
  openGraph: {
    title: '유치원 검색 - 우리동네 유치원',
    description:
      '내 주변 유치원을 검색하고 비교해보세요. GPS 위치 기반으로 가까운 유치원을 찾아드립니다.',
    url: '/search',
  },
  twitter: {
    title: '유치원 검색 - 우리동네 유치원',
    description:
      '내 주변 유치원을 검색하고 비교해보세요. GPS 위치 기반으로 가까운 유치원을 찾아드립니다.',
  },
};

export default function SearchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

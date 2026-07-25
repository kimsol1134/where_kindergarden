import type { Metadata } from 'next';
import { OG_IMAGE } from '@/lib/constants';

/**
 * 비교 페이지 SEO 메타데이터
 * https://searchadvisor.naver.com/guide/markup-content
 */
export const metadata: Metadata = {
  title: '유치원 비교 - 거리·정원·셔틀 한눈에',
  description:
    '후보 유치원을 나란히 놓고 거리, 정원, 교사 현황, 특수학급, 셔틀버스, 급식 정보를 한눈에 비교하세요.',
  alternates: {
    canonical: '/compare',
  },
  openGraph: {
    title: '유치원 비교 - 거리·정원·셔틀 한눈에 | 우리동네 유치원',
    description:
      '후보 유치원을 나란히 놓고 거리, 정원, 교사 현황, 특수학급, 셔틀버스, 급식 정보를 비교하세요.',
    url: '/compare',
    images: [
      {
        url: OG_IMAGE.path,
        width: OG_IMAGE.width,
        height: OG_IMAGE.height,
        alt: '유치원 비교 - 우리동네 유치원',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '유치원 비교 - 거리·정원·셔틀 한눈에 | 우리동네 유치원',
    description:
      '후보 유치원을 나란히 놓고 거리, 정원, 교사 현황, 특수학급, 셔틀버스, 급식 정보를 비교하세요.',
    images: [OG_IMAGE.path],
  },
};

export default function CompareLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

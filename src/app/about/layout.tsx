import type { Metadata } from 'next';
import { OG_IMAGE } from '@/lib/constants';

const ABOUT_DESCRIPTION =
  '현재 위치나 주소로 가까운 유치원을 찾고 거리, 정원, 셔틀버스, 급식 등 주요 정보를 비교하는 우리동네 유치원 서비스를 소개합니다.';

export const metadata: Metadata = {
  title: '서비스 소개',
  description: ABOUT_DESCRIPTION,
  alternates: {
    canonical: '/about/',
  },
  openGraph: {
    title: '서비스 소개 | 우리동네 유치원',
    description: ABOUT_DESCRIPTION,
    url: '/about/',
    images: [OG_IMAGE.path],
  },
  twitter: {
    card: 'summary_large_image',
    title: '서비스 소개 | 우리동네 유치원',
    description: ABOUT_DESCRIPTION,
    images: [OG_IMAGE.path],
  },
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return children;
}

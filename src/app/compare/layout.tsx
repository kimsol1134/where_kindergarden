import type { Metadata } from 'next';

/**
 * 비교 페이지 SEO 메타데이터
 * https://searchadvisor.naver.com/guide/markup-content
 */
export const metadata: Metadata = {
  title: '유치원 비교',
  description:
    '선택한 유치원들을 한눈에 비교해보세요. 교육비, 교사 비율, 특수학급, 통학차량 등 상세 정보를 비교할 수 있습니다.',
  alternates: {
    canonical: '/compare',
  },
  openGraph: {
    title: '유치원 비교 - 우리동네 유치원',
    description:
      '선택한 유치원들을 한눈에 비교해보세요. 교육비, 교사 비율, 특수학급 등 상세 정보를 비교할 수 있습니다.',
    url: '/compare',
  },
  twitter: {
    title: '유치원 비교 - 우리동네 유치원',
    description:
      '선택한 유치원들을 한눈에 비교해보세요. 교육비, 교사 비율, 특수학급 등 상세 정보를 비교할 수 있습니다.',
  },
};

export default function CompareLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

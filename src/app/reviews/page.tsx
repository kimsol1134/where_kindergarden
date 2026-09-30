import type { Metadata } from 'next';
import { OG_IMAGE } from '@/lib/constants';
import { ReviewsBrowser } from './ReviewsBrowser';

export const metadata: Metadata = {
  title: '유치원 후기 전체 확인',
  description: '수집된 유치원 후기와 원문 링크를 한 화면에서 확인합니다.',
  alternates: {
    canonical: '/reviews/',
  },
  openGraph: {
    title: '유치원 후기 전체 확인 | 우리동네 유치원',
    description: '수집된 유치원 후기와 원문 링크를 한 화면에서 확인합니다.',
    url: '/reviews/',
    images: [OG_IMAGE.path],
  },
  twitter: {
    card: 'summary_large_image',
    title: '유치원 후기 전체 확인 | 우리동네 유치원',
    description: '수집된 유치원 후기와 원문 링크를 한 화면에서 확인합니다.',
    images: [OG_IMAGE.path],
  },
};

export default function ReviewsPage() {
  return <ReviewsBrowser />;
}

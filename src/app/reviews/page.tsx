import type { Metadata } from 'next';
import { ReviewsBrowser } from './ReviewsBrowser';

export const metadata: Metadata = {
  title: '후기 전체 확인 | 우리동네 유치원',
  description: '수집된 유치원 후기와 원문 링크를 한 화면에서 확인합니다.',
};

export default function ReviewsPage() {
  return <ReviewsBrowser />;
}

import type { Metadata } from 'next';
import { ReviewsBrowser } from '../ReviewsBrowser';

export const metadata: Metadata = {
  title: '전체 후기 원문 링크 | 우리동네 유치원',
  description: '수집된 모든 유치원 후기의 원문 링크를 한 페이지에서 확인합니다.',
};

export default function AllReviewLinksPage() {
  return <ReviewsBrowser variant="links" />;
}

import type { Metadata } from 'next';
import { AllReviewLinksPage as AllReviewLinksPageContent } from './AllReviewLinksPage';

export const metadata: Metadata = {
  title: '전체 후기 원문 링크 | 우리동네 유치원',
  description: '수집된 모든 유치원 후기의 원문 링크를 정적 웹 페이지에서 확인합니다.',
  alternates: {
    canonical: '/reviews/all',
  },
};

export default function AllReviewLinksPage() {
  return <AllReviewLinksPageContent pageNumber={1} />;
}

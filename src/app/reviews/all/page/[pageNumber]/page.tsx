import type { Metadata } from 'next';
import { AllReviewLinksPage } from '../../AllReviewLinksPage';
import { getReviewLinkPageCount } from '@/lib/review-link-index';

interface ReviewLinksPageRouteProps {
  params: Promise<{
    pageNumber: string;
  }>;
}

export function generateStaticParams() {
  return Array.from({ length: getReviewLinkPageCount() }, (_, index) => ({
    pageNumber: String(index + 1),
  }));
}

export async function generateMetadata({ params }: ReviewLinksPageRouteProps): Promise<Metadata> {
  const { pageNumber } = await params;

  return {
    title: `전체 후기 원문 링크 ${pageNumber}페이지 | 우리동네 유치원`,
    description: '수집된 유치원 후기 원문 링크를 페이지별로 확인합니다.',
    alternates: {
      canonical: pageNumber === '1' ? '/reviews/all' : `/reviews/all/page/${pageNumber}`,
    },
  };
}

export default async function ReviewLinksPageRoute({ params }: ReviewLinksPageRouteProps) {
  const { pageNumber } = await params;
  const parsedPageNumber = Number.parseInt(pageNumber, 10);

  return <AllReviewLinksPage pageNumber={Number.isNaN(parsedPageNumber) ? 0 : parsedPageNumber} />;
}

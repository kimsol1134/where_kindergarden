export type ReviewSource = 'naver_blog' | 'naver_cafe' | 'google' | 'other';

export interface ReviewLink {
  id: string;
  kindergartenId: string;
  title: string;
  url: string;
  source: ReviewSource;
  sourceName: string;
  snippet: string;
  date: string | null;
  collectedAt: string;
}

export interface ReviewsData {
  version: string;
  totalCount: number;
  kindergartenCount: number;
  reviews: Record<string, ReviewLink[]>;
}

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

// Review Suggestion Types
export type ReviewSuggestionType = 'add' | 'delete';

export interface ReviewSuggestionBase {
  kindergartenId: string;
  reason?: string;
  submitterEmail?: string;
}

export interface ReviewAddSuggestion extends ReviewSuggestionBase {
  type: 'add';
  url: string;
  title: string;
  source: ReviewSource;
}

export interface ReviewDeleteSuggestion extends ReviewSuggestionBase {
  type: 'delete';
  reviewId: string;
}

export type ReviewSuggestion = ReviewAddSuggestion | ReviewDeleteSuggestion;

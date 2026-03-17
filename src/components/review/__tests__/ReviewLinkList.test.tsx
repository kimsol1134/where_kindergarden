import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ReviewLinkList } from '../ReviewLinkList';
import { useReviewStore } from '@/stores';
import type { ReviewsData } from '@/types';

const mockReviewsData: ReviewsData = {
  version: '2026-01-24',
  totalCount: 2,
  kindergartenCount: 1,
  reviews: {
    K001: [
      {
        id: 'rev-0001',
        kindergartenId: 'K001',
        title: '첫 번째 후기',
        url: 'https://blog.naver.com/1',
        source: 'naver_blog',
        sourceName: '블로그1',
        snippet: '좋은 곳입니다.',
        date: '2025-08-10',
        collectedAt: '2026-01-24T00:00:00.000Z',
      },
      {
        id: 'rev-0002',
        kindergartenId: 'K001',
        title: '두 번째 후기',
        url: 'https://blog.naver.com/2',
        source: 'naver_cafe',
        sourceName: '카페1',
        snippet: '추천합니다.',
        date: '2025-09-15',
        collectedAt: '2026-01-24T00:00:00.000Z',
      },
    ],
  },
};

describe('ReviewLinkList', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should show empty state when no reviews exist', () => {
    useReviewStore.setState({
      data: { version: '2026-01-24', totalCount: 0, kindergartenCount: 0, reviews: {} },
      isLoaded: true,
      isLoading: false,
      error: null,
      loadPromise: null,
    });

    render(<ReviewLinkList kindergartenId="K999" />);
    expect(screen.getByText('수집된 후기가 없습니다')).toBeInTheDocument();
  });

  it('should render review list when data exists', () => {
    useReviewStore.setState({
      data: mockReviewsData,
      isLoaded: true,
      isLoading: false,
      error: null,
      loadPromise: null,
    });

    render(<ReviewLinkList kindergartenId="K001" />);
    expect(screen.getByText('첫 번째 후기')).toBeInTheDocument();
    expect(screen.getByText('두 번째 후기')).toBeInTheDocument();
  });

  it('should sort reviews by date descending', () => {
    useReviewStore.setState({
      data: mockReviewsData,
      isLoaded: true,
      isLoading: false,
      error: null,
      loadPromise: null,
    });

    render(<ReviewLinkList kindergartenId="K001" />);
    const links = screen.getAllByRole('link');
    expect(links[0]).toHaveAttribute('href', 'https://blog.naver.com/2');
    expect(links[1]).toHaveAttribute('href', 'https://blog.naver.com/1');
  });

  it('should show error message on error', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({
        ok: false,
        status: 502,
      } as Response)
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
      } as Response);

    useReviewStore.setState({
      data: null,
      isLoaded: false,
      isLoading: false,
      error: null,
      loadPromise: null,
    });

    render(<ReviewLinkList kindergartenId="K001" />);

    const errorEl = await screen.findByText('후기 데이터 로드 실패: 500');
    expect(errorEl).toBeInTheDocument();
  });

  it('should show loading state', () => {
    useReviewStore.setState({
      data: null,
      isLoaded: false,
      isLoading: true,
      error: null,
      loadPromise: Promise.resolve(),
    });

    render(<ReviewLinkList kindergartenId="K001" />);
    expect(screen.getByText('후기 로딩 중...')).toBeInTheDocument();
  });
});

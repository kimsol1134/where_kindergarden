import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ReviewPreview } from '../ReviewPreview';
import { useReviewStore } from '@/stores';
import type { ReviewsData } from '@/types';

const mockReviewsData: ReviewsData = {
  version: '2026-01-24',
  totalCount: 3,
  kindergartenCount: 1,
  reviews: {
    K001: [
      {
        id: 'rev-0001',
        kindergartenId: 'K001',
        title: '가장 오래된 후기',
        url: 'https://blog.naver.com/1',
        source: 'naver_blog',
        sourceName: '블로그1',
        snippet: '첫 번째 후기입니다.',
        date: '2024-06-01',
        collectedAt: '2026-01-24T00:00:00.000Z',
      },
      {
        id: 'rev-0002',
        kindergartenId: 'K001',
        title: '중간 후기',
        url: 'https://blog.naver.com/2',
        source: 'naver_blog',
        sourceName: '블로그2',
        snippet: '두 번째 후기입니다.',
        date: '2025-01-15',
        collectedAt: '2026-01-24T00:00:00.000Z',
      },
      {
        id: 'rev-0003',
        kindergartenId: 'K001',
        title: '가장 최신 후기',
        url: 'https://blog.naver.com/3',
        source: 'naver_cafe',
        sourceName: '카페1',
        snippet: '세 번째 후기입니다.',
        date: '2025-09-20',
        collectedAt: '2026-01-24T00:00:00.000Z',
      },
    ],
  },
};

describe('ReviewPreview', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should not render when no reviews exist', () => {
    useReviewStore.setState({
      data: { version: '2026-01-24', totalCount: 0, kindergartenCount: 0, reviews: {} },
      isLoaded: true,
      isLoading: false,
      error: null,
      loadPromise: null,
    });

    const { container } = render(
      <ReviewPreview kindergartenId="K999" onViewAll={() => {}} />
    );
    expect(container.innerHTML).toBe('');
  });

  it('should show at most 2 preview reviews', () => {
    useReviewStore.setState({
      data: mockReviewsData,
      isLoaded: true,
      isLoading: false,
      error: null,
      loadPromise: null,
    });

    render(<ReviewPreview kindergartenId="K001" onViewAll={() => {}} />);
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(2);
  });

  it('should show reviews sorted by date descending (newest first)', () => {
    useReviewStore.setState({
      data: mockReviewsData,
      isLoaded: true,
      isLoading: false,
      error: null,
      loadPromise: null,
    });

    render(<ReviewPreview kindergartenId="K001" onViewAll={() => {}} />);
    const links = screen.getAllByRole('link');
    expect(links[0]).toHaveAttribute('href', 'https://blog.naver.com/3');
    expect(links[1]).toHaveAttribute('href', 'https://blog.naver.com/2');
  });

  it('should display total count badge', () => {
    useReviewStore.setState({
      data: mockReviewsData,
      isLoaded: true,
      isLoading: false,
      error: null,
      loadPromise: null,
    });

    render(<ReviewPreview kindergartenId="K001" onViewAll={() => {}} />);
    expect(screen.getByText('3건')).toBeInTheDocument();
  });

  it('should call onViewAll when "전체보기" button is clicked', () => {
    useReviewStore.setState({
      data: mockReviewsData,
      isLoaded: true,
      isLoading: false,
      error: null,
      loadPromise: null,
    });

    const onViewAll = vi.fn();
    render(<ReviewPreview kindergartenId="K001" onViewAll={onViewAll} />);
    fireEvent.click(screen.getByText('후기 전체보기 →'));
    expect(onViewAll).toHaveBeenCalledOnce();
  });

  it('should handle reviews with null dates', () => {
    const dataWithNullDates: ReviewsData = {
      version: '2026-01-24',
      totalCount: 2,
      kindergartenCount: 1,
      reviews: {
        K002: [
          {
            id: 'rev-a',
            kindergartenId: 'K002',
            title: '날짜 없는 후기',
            url: 'https://blog.naver.com/a',
            source: 'naver_blog',
            sourceName: '블로그A',
            snippet: '날짜가 없습니다.',
            date: null,
            collectedAt: '2026-01-24T00:00:00.000Z',
          },
          {
            id: 'rev-b',
            kindergartenId: 'K002',
            title: '날짜 있는 후기',
            url: 'https://blog.naver.com/b',
            source: 'naver_blog',
            sourceName: '블로그B',
            snippet: '날짜가 있습니다.',
            date: '2025-05-01',
            collectedAt: '2026-01-24T00:00:00.000Z',
          },
        ],
      },
    };

    useReviewStore.setState({
      data: dataWithNullDates,
      isLoaded: true,
      isLoading: false,
      error: null,
      loadPromise: null,
    });

    render(<ReviewPreview kindergartenId="K002" onViewAll={() => {}} />);
    const links = screen.getAllByRole('link');
    // Reviews with dates should come first
    expect(links[0]).toHaveAttribute('href', 'https://blog.naver.com/b');
    expect(links[1]).toHaveAttribute('href', 'https://blog.naver.com/a');
  });
});

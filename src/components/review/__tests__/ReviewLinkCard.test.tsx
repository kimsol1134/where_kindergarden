import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ReviewLinkCard } from '../ReviewLinkCard';
import type { ReviewLink } from '@/types';

const createMockReview = (overrides: Partial<ReviewLink> = {}): ReviewLink => ({
  id: 'rev-0001',
  kindergartenId: 'K001',
  title: '역삼유치원 후기입니다',
  url: 'https://blog.naver.com/test',
  source: 'naver_blog',
  sourceName: '테스트블로그',
  snippet: '좋은 유치원이었습니다. 선생님이 친절합니다.',
  date: '2025-09-15',
  collectedAt: '2026-01-24T00:00:00.000Z',
  ...overrides,
});

describe('ReviewLinkCard', () => {
  it('should render title', () => {
    render(<ReviewLinkCard review={createMockReview()} />);
    expect(screen.getByText('역삼유치원 후기입니다')).toBeInTheDocument();
  });

  it('should render snippet', () => {
    render(<ReviewLinkCard review={createMockReview()} />);
    expect(screen.getByText('좋은 유치원이었습니다. 선생님이 친절합니다.')).toBeInTheDocument();
  });

  it('should render date', () => {
    render(<ReviewLinkCard review={createMockReview()} />);
    expect(screen.getByText('2025-09-15')).toBeInTheDocument();
  });

  it('should not render date when null', () => {
    render(<ReviewLinkCard review={createMockReview({ date: null })} />);
    expect(screen.queryByText(/\d{4}-\d{2}-\d{2}/)).not.toBeInTheDocument();
  });

  it('should render source badge for naver_blog', () => {
    render(<ReviewLinkCard review={createMockReview({ source: 'naver_blog' })} />);
    expect(screen.getByText('블로그')).toBeInTheDocument();
  });

  it('should render source badge for naver_cafe', () => {
    render(<ReviewLinkCard review={createMockReview({ source: 'naver_cafe' })} />);
    expect(screen.getByText('카페')).toBeInTheDocument();
  });

  it('should render source badge for studyholic', () => {
    render(<ReviewLinkCard review={createMockReview({ source: 'studyholic' })} />);
    expect(screen.getByText('스터디홀릭')).toBeInTheDocument();
  });

  it('should render source badge for google', () => {
    render(<ReviewLinkCard review={createMockReview({ source: 'google' })} />);
    expect(screen.getByText('웹')).toBeInTheDocument();
  });

  it('should render source badge for other', () => {
    render(<ReviewLinkCard review={createMockReview({ source: 'other' })} />);
    expect(screen.getByText('기타')).toBeInTheDocument();
  });

  it('should render as an external link', () => {
    render(<ReviewLinkCard review={createMockReview()} />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', 'https://blog.naver.com/test');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('should render source name when provided', () => {
    render(<ReviewLinkCard review={createMockReview({ sourceName: '맘스블로그' })} />);
    expect(screen.getByText('맘스블로그')).toBeInTheDocument();
  });
});

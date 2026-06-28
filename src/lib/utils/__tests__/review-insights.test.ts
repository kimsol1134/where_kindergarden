import { describe, expect, it } from 'vitest';
import { getReviewInsights } from '../review-insights';
import type { ReviewLink } from '@/types';

const baseReview: ReviewLink = {
  id: 'rev-1',
  kindergartenId: 'K001',
  title: '입학설명회 후기',
  url: 'https://example.com',
  source: 'naver_blog',
  sourceName: '블로그',
  snippet: '',
  date: null,
  collectedAt: '2026-06-24T00:00:00.000Z',
};

describe('getReviewInsights', () => {
  it('detects recent, positive, check, and low-ad signals', () => {
    const insights = getReviewInsights(
      {
        ...baseReview,
        title: '따뜻하고 만족했던 입학설명회 후기',
        snippet: '상담 때 통학차량 노선과 모집 일정을 확인했습니다.',
        date: '2026-03-01',
      },
      new Date('2026-06-24T00:00:00.000Z')
    );

    expect(insights.map((insight) => insight.label)).toEqual([
      '최근 후기',
      '긍정 언급',
      '확인 필요',
      '광고성 낮음',
    ]);
  });

  it('does not mark adlike posts as low-ad', () => {
    const insights = getReviewInsights({
      ...baseReview,
      title: '유치원 체험단 이벤트 후기',
      snippet: '협찬 할인 예약문의',
      date: '2026-02-01',
    });

    expect(insights.map((insight) => insight.label)).not.toContain('광고성 낮음');
  });
});

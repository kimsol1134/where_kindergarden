import { describe, expect, it } from 'vitest';
import type { ReviewsData } from '@/types/review';
import {
  mergeRawReviewsIntoRegionData,
  type RawReviewLink,
} from '../../../../scripts/lib/review-curation';

describe('review curation merge', () => {
  it('raw metadata를 보존하면서 region data에 병합한다', () => {
    const regionData: ReviewsData = {
      version: '2026-04-07',
      totalCount: 0,
      kindergartenCount: 0,
      reviews: {},
    };
    const rawReview: RawReviewLink = {
      kindergartenId: 'kid-1',
      kindergartenName: '뒤나미스유치원',
      title: '뒤나미스 유치원 보내시는 분 만족도 어떠신가요?',
      url: 'https://cafe.naver.com/yeongjongdolove/983584',
      source: 'naver_cafe',
      sourceName: '영맘',
      snippet: '만약 첫째 보내고 계신다면 둘째도 보낼 만큼 만족도 있으신가요?',
      summary:
        '질문: 둘째도 보낼 정도로 만족하는지 궁금함 / 답변: 프로그램과 선생님 만족도가 높다는 응답 다수',
      tags: ['질문글'],
      date: '2025-11-20',
      collectedAt: '2026-04-07T12:00:00.000Z',
      accessMode: 'login',
      evidenceType: 'longform_post',
      extractionMethod: 'playwright_naver_search_direct_read',
      structuredFields: {
        questionSummary: '둘째도 보낼 정도로 만족하는지 궁금함',
        answerSummary: '프로그램과 선생님 만족도가 높다는 응답 다수',
        answerEvidenceCount: 4,
      },
      approvalStatus: 'pending',
    };

    const merged = mergeRawReviewsIntoRegionData(regionData, [rawReview], {
      filterSpam: false,
      preserveContent: true,
    });
    const review = merged.data.reviews['kid-1'][0];

    expect(merged.addedCount).toBe(1);
    expect(review.summary).toBe(rawReview.summary);
    expect(review.tags).toEqual(['질문글']);
    expect(review.accessMode).toBe('login');
    expect(review.structuredFields).toMatchObject({
      questionSummary: rawReview.structuredFields?.questionSummary,
      answerSummary: rawReview.structuredFields?.answerSummary,
      answerEvidenceCount: 4,
    });
    expect(review.approvalStatus).toBe('pending');
  });
});

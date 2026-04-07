import { describe, expect, it } from 'vitest';
import {
  buildNewlyRemovedItems,
  buildNewlyVerifiedItems,
  buildReviewBodyCacheEntry,
  buildReviewBodyCacheLookup,
  buildReviewFingerprint,
  buildReviewVerificationStateEntry,
  buildReviewVerificationStateLookup,
  decideIncrementalReviewAction,
  findReusableBodyCacheEntry,
  pickRandomSamples,
} from '@/lib/utils/review-verification-incremental';
import { normalizeReviewUrl } from '@/lib/utils/review-verification';
import type { ReviewVerificationRunReportItem } from '@/types/review';

describe('review verification incremental fingerprint', () => {
  it('동일한 review fingerprint는 안정적으로 생성된다', () => {
    const fingerprint = buildReviewFingerprint({
      kindergartenId: 'kid-1',
      title: '행복한유치원 후기',
      snippet: '강남에서 아이를 보내본 후기',
    });

    expect(fingerprint).toBe(
      buildReviewFingerprint({
        kindergartenId: 'kid-1',
        title: '행복한유치원 후기',
        snippet: '강남에서 아이를 보내본 후기',
      })
    );
  });

  it('title 또는 snippet이 바뀌면 fingerprint도 바뀐다', () => {
    const before = buildReviewFingerprint({
      kindergartenId: 'kid-1',
      title: '행복한유치원 후기',
      snippet: '강남에서 아이를 보내본 후기',
    });
    const after = buildReviewFingerprint({
      kindergartenId: 'kid-1',
      title: '행복한유치원 입학설명회 후기',
      snippet: '강남에서 아이를 보내본 후기',
    });

    expect(before).not.toBe(after);
  });
});

describe('review verification incremental action', () => {
  it('reviewId가 달라도 normalizedUrl과 fingerprint가 같으면 state를 재사용한다', () => {
    const stateEntry = buildReviewVerificationStateEntry({
      reviewId: 'rev-old',
      kindergartenId: 'kid-1',
      kindergartenName: '행복한유치원',
      sidoCode: '11',
      url: 'https://blog.naver.com/post/1',
      title: '행복한유치원 후기',
      snippet: '강남에서 아이를 보내본 후기',
      finalStatus: 'verified',
      confidence: 0.92,
      reviewedAt: '2026-03-10T00:00:00.000Z',
    });
    const lookup = buildReviewVerificationStateLookup([stateEntry]);

    const action = decideIncrementalReviewAction(lookup, {
      reviewId: 'rev-new',
      kindergartenId: 'kid-1',
      url: 'http://blog.naver.com/post/1/',
      title: '행복한유치원 후기',
      snippet: '강남에서 아이를 보내본 후기',
    });

    expect(action.needsEvaluation).toBe(false);
    expect(action.matchedBy).toBe('normalizedUrl');
    expect(action.previousStatus).toBe('verified');
  });

  it('fingerprint가 바뀌면 재검증 대상으로 분류한다', () => {
    const stateEntry = buildReviewVerificationStateEntry({
      reviewId: 'rev-1',
      kindergartenId: 'kid-1',
      kindergartenName: '행복한유치원',
      sidoCode: '11',
      url: 'https://blog.naver.com/post/1',
      title: '행복한유치원 후기',
      snippet: '강남에서 아이를 보내본 후기',
      finalStatus: 'verified',
      confidence: 0.92,
      reviewedAt: '2026-03-10T00:00:00.000Z',
    });
    const lookup = buildReviewVerificationStateLookup([stateEntry]);

    const action = decideIncrementalReviewAction(lookup, {
      reviewId: 'rev-1',
      kindergartenId: 'kid-1',
      url: 'https://blog.naver.com/post/1',
      title: '행복한유치원 설명회 후기',
      snippet: '강남에서 아이를 보내본 후기',
    });

    expect(action.needsEvaluation).toBe(true);
    expect(action.reason).toBe('fingerprint_changed');
  });

  it('과거 uncertain 판정은 다시 검증한다', () => {
    const stateEntry = buildReviewVerificationStateEntry({
      reviewId: 'rev-1',
      kindergartenId: 'kid-1',
      kindergartenName: '행복한유치원',
      sidoCode: '11',
      url: 'https://blog.naver.com/post/1',
      title: '행복한유치원 후기',
      snippet: '강남에서 아이를 보내본 후기',
      finalStatus: 'uncertain',
      confidence: 0.45,
      reviewedAt: '2026-03-10T00:00:00.000Z',
    });
    const lookup = buildReviewVerificationStateLookup([stateEntry]);

    const action = decideIncrementalReviewAction(lookup, {
      reviewId: 'rev-1',
      kindergartenId: 'kid-1',
      url: 'https://blog.naver.com/post/1',
      title: '행복한유치원 후기',
      snippet: '강남에서 아이를 보내본 후기',
    });

    expect(action.needsEvaluation).toBe(true);
    expect(action.reason).toBe('previous_uncertain');
  });
});

describe('review verification body cache', () => {
  it('같은 normalizedUrl과 fingerprint일 때만 body cache를 재사용한다', () => {
    const cacheEntry = buildReviewBodyCacheEntry({
      reviewId: 'rev-1',
      kindergartenId: 'kid-1',
      url: 'https://blog.naver.com/post/1',
      title: '행복한유치원 후기',
      snippet: '강남에서 아이를 보내본 후기',
      bodyText: '상세 본문',
      textLength: 4,
      scrapedAt: '2026-03-10T00:00:00.000Z',
      status: 'success',
    });
    const lookup = buildReviewBodyCacheLookup([cacheEntry]);
    const matchingFingerprint = buildReviewFingerprint({
      kindergartenId: 'kid-1',
      title: '행복한유치원 후기',
      snippet: '강남에서 아이를 보내본 후기',
    });

    expect(
      findReusableBodyCacheEntry(
        lookup,
        normalizeReviewUrl('https://blog.naver.com/post/1'),
        matchingFingerprint
      )
    ).not.toBeNull();
    expect(
      findReusableBodyCacheEntry(
        lookup,
        normalizeReviewUrl('https://blog.naver.com/post/1'),
        buildReviewFingerprint({
          kindergartenId: 'kid-1',
          title: '행복한유치원 설명회 후기',
          snippet: '강남에서 아이를 보내본 후기',
        })
      )
    ).toBeNull();
  });
});

describe('review verification run report helpers', () => {
  const items: ReviewVerificationRunReportItem[] = [
    {
      reviewId: 'rev-1',
      kindergartenId: 'kid-1',
      kindergartenName: '행복한유치원',
      normalizedUrl: 'blog.naver.com/post/1',
      url: 'https://blog.naver.com/post/1',
      title: 'verified',
      snippet: '',
      previousStatus: null,
      nextStatus: 'verified',
      confidence: 0.9,
      reviewedAt: '2026-03-10T00:00:00.000Z',
      reused: false,
    },
    {
      reviewId: 'rev-2',
      kindergartenId: 'kid-2',
      kindergartenName: '무지개유치원',
      normalizedUrl: 'blog.naver.com/post/2',
      url: 'https://blog.naver.com/post/2',
      title: 'removed',
      snippet: '',
      previousStatus: 'verified',
      nextStatus: 'mismatch',
      confidence: 0.92,
      reviewedAt: '2026-03-10T00:00:00.000Z',
      reused: false,
    },
  ];

  it('newly verified와 newly removed를 구분한다', () => {
    expect(buildNewlyVerifiedItems(items).map((item) => item.reviewId)).toEqual([
      'rev-1',
    ]);
    expect(buildNewlyRemovedItems(items).map((item) => item.reviewId)).toEqual([
      'rev-2',
    ]);
  });

  it('랜덤 샘플링은 seed 기준으로 재현 가능하다', () => {
    expect(
      pickRandomSamples(
        ['a', 'b', 'c', 'd', 'e'],
        3,
        42
      )
    ).toEqual(pickRandomSamples(['a', 'b', 'c', 'd', 'e'], 3, 42));
  });
});

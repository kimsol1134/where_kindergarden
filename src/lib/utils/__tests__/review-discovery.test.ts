import { describe, expect, it } from 'vitest';
import {
  assessStrictReviewDiscoveryIntent,
  getReviewDiscoveryShard,
  isInReviewDiscoveryShard,
} from '@/lib/utils/review-discovery';

describe('review discovery shards', () => {
  it('assigns an identifier to exactly one stable shard', () => {
    const identifier = 'abc-kindergarten-id';
    const first = getReviewDiscoveryShard(identifier, 2);

    expect(first).toBe(getReviewDiscoveryShard(identifier, 2));
    expect([0, 1].filter((index) => isInReviewDiscoveryShard(identifier, index, 2))).toEqual([
      first,
    ]);
  });

  it('rejects invalid shard configurations', () => {
    expect(() => getReviewDiscoveryShard('id', 0)).toThrow('positive integer');
    expect(() => isInReviewDiscoveryShard('id', 2, 2)).toThrow(
      'between 0 and shardCount - 1'
    );
  });
});

describe('strict review discovery intent', () => {
  it('keeps parent experience and decision content', () => {
    expect(
      assessStrictReviewDiscoveryIntent({
        title: '행복유치원 재원생 학부모 후기',
        snippet: '급식과 통학버스를 직접 경험한 내용을 정리했어요.',
      })
    ).toEqual({ eligible: true, reason: 'parent_experience_or_decision' });
  });

  it('rejects nearby-business ads even when the kindergarten name appears', () => {
    expect(
      assessStrictReviewDiscoveryIntent({
        title: '3세부터 시작하는 창의 미술 수업 소개',
        snippet: '글벗유치원 앞, 픽업 가능',
        sourceName: '재미있는 미술 스튜디오',
      })
    ).toEqual({ eligible: false, reason: 'vendor_or_nearby_ad' });
  });

  it('rejects incidental name mentions without review intent', () => {
    expect(
      assessStrictReviewDiscoveryIntent({
        title: '오늘 공연에만 집중',
        snippet: '행사장에 가락유치원에서도 참석했어요.',
      })
    ).toEqual({ eligible: false, reason: 'no_review_intent' });

    expect(
      assessStrictReviewDiscoveryIntent({
        title: '오늘 공연에만 집중',
        snippet:
          '장애인 시설들에서 많이 오셨고 특수교사도 참석했어요. 가락유치원...',
        sourceName: '장애인 시인 일상',
      })
    ).toEqual({ eligible: false, reason: 'no_review_intent' });
  });
});

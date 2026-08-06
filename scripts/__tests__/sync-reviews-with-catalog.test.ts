import { describe, expect, it } from 'vitest';
import type { ReviewLink } from '../../src/types/review';
import {
  addReviews,
  restoreRetiredReviews,
} from '../sync-reviews-with-catalog';

function review(id: string, kindergartenId: string, url: string): ReviewLink {
  return {
    id,
    kindergartenId,
    title: `후기 ${id}`,
    url,
    source: 'naver_blog',
    sourceName: '네이버 블로그',
    snippet: '학부모 후기',
    date: null,
    collectedAt: '2026-07-01T00:00:00.000Z',
  };
}

describe('review catalog retirement', () => {
  it('deduplicates reviews within an institution while normalizing the denormalized ID', () => {
    const buckets = new Map<string, ReviewLink[]>();
    const keys = new Map<string, Set<string>>();

    const result = addReviews(buckets, keys, 'current-id', [
      review('first', 'legacy-id', 'https://blog.naver.com/parent/123'),
      review('duplicate', 'legacy-id', 'https://blog.naver.com/parent/123'),
    ]);

    expect(result).toEqual({ added: 1, duplicates: 1 });
    expect(buckets.get('current-id')).toHaveLength(1);
    expect(buckets.get('current-id')?.[0].kindergartenId).toBe('current-id');
  });

  it('restores archived reviews only when the same official institution ID reappears', () => {
    const activeBuckets = new Map<string, ReviewLink[]>();
    const activeKeys = new Map<string, Set<string>>();
    const retiredBuckets = new Map<string, ReviewLink[]>();
    const retiredKeys = new Map<string, Set<string>>();
    addReviews(retiredBuckets, retiredKeys, 'reopened-id', [
      review('reopened-review', 'reopened-id', 'https://blog.naver.com/parent/456'),
    ]);
    addReviews(retiredBuckets, retiredKeys, 'still-retired-id', [
      review('retired-review', 'still-retired-id', 'https://blog.naver.com/parent/789'),
    ]);

    const restored = restoreRetiredReviews(
      activeBuckets,
      activeKeys,
      retiredBuckets,
      retiredKeys,
      new Set(['reopened-id'])
    );

    expect(restored).toBe(1);
    expect(activeBuckets.get('reopened-id')?.[0].id).toBe('reopened-review');
    expect(retiredBuckets.has('reopened-id')).toBe(false);
    expect(retiredBuckets.get('still-retired-id')?.[0].id).toBe('retired-review');
  });
});

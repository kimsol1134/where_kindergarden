import { describe, expect, it } from 'vitest';
import type {
  ReviewAuditEntry,
  ReviewsData,
  ReviewVerificationStateEntry,
} from '@/types/review';
import {
  applyReviewAuditToRegionData,
  buildReviewAuditBatch,
  buildReviewAuditEntries,
  buildReviewAuditStats,
} from '../../../../scripts/evals/lib/review-audit';
import type { KindergartenEntry } from '../../../../scripts/lib/review-verification-pipeline';

const kindergartens: KindergartenEntry[] = [
  {
    kindercode: 'kid-1',
    name: '행복한유치원',
    address: '서울특별시 강남구 테헤란로 1',
    sido_code: '11',
    sigungu_code: '11680',
  },
  {
    kindercode: 'kid-2',
    name: '무지개유치원',
    address: '서울특별시 강남구 테헤란로 2',
    sido_code: '11',
    sigungu_code: '11680',
  },
];

describe('review audit queue', () => {
  it('builder가 기존 audit verdict를 보존한다', () => {
    const reviewsData: ReviewsData = {
      version: '2026-04-05',
      totalCount: 1,
      kindergartenCount: 1,
      reviews: {
        'kid-1': [
          {
            id: 'rev-1',
            kindergartenId: 'kid-1',
            title: '행복한유치원 보내보니',
            url: 'https://blog.naver.com/post/1',
            source: 'naver_blog',
            sourceName: '',
            snippet: '행복한유치원 선생님과 급식이 만족스러웠어요.',
            date: null,
            collectedAt: '2026-04-05T00:00:00.000Z',
          },
        ],
      },
    };
    const previousEntries: ReviewAuditEntry[] = [
      {
        reviewId: 'rev-1',
        kindergartenId: 'kid-1',
        kindergartenName: '행복한유치원',
        kindergartenAddress: '서울특별시 강남구 테헤란로 1',
        sidoCode: '11',
        sigunguCode: '11680',
        normalizedUrl: 'blog.naver.com/post/1',
        url: 'https://blog.naver.com/post/1',
        source: 'naver_blog',
        sourceName: '',
        title: '행복한유치원 보내보니',
        snippet: '행복한유치원 선생님과 급식이 만족스러웠어요.',
        date: null,
        collectedAt: '2026-04-05T00:00:00.000Z',
        currentShipped: true,
        autoStatus: 'verified',
        autoConfidence: 0.9,
        autoReasons: ['auto'],
        finalAuditStatus: 'verified',
        auditReason: 'manual verified',
        reviewedAt: '2026-04-05T01:00:00.000Z',
        reviewedBy: 'tester',
      },
    ];

    const entries = buildReviewAuditEntries({
      currentReviewsData: reviewsData,
      kindergartens,
      previousEntries,
    });

    expect(entries).toHaveLength(1);
    expect(entries[0].finalAuditStatus).toBe('verified');
    expect(entries[0].auditReason).toBe('manual verified');
    expect(entries[0].reviewedBy).toBe('tester');
  });

  it('stats가 verified만 visible precision numerator로 계산한다', () => {
    const entries: ReviewAuditEntry[] = [
      {
        reviewId: 'rev-1',
        kindergartenId: 'kid-1',
        kindergartenName: '행복한유치원',
        kindergartenAddress: '서울특별시 강남구 테헤란로 1',
        sidoCode: '11',
        sigunguCode: '11680',
        normalizedUrl: 'blog.naver.com/post/1',
        url: 'https://blog.naver.com/post/1',
        source: 'naver_blog',
        sourceName: '',
        title: 'verified',
        snippet: 'verified',
        date: null,
        collectedAt: '2026-04-05T00:00:00.000Z',
        currentShipped: true,
        autoStatus: 'verified',
        autoConfidence: 0.9,
        autoReasons: [],
        finalAuditStatus: 'verified',
      },
      {
        reviewId: 'rev-2',
        kindergartenId: 'kid-2',
        kindergartenName: '무지개유치원',
        kindergartenAddress: '서울특별시 강남구 테헤란로 2',
        sidoCode: '11',
        sigunguCode: '11680',
        normalizedUrl: 'blog.naver.com/post/2',
        url: 'https://blog.naver.com/post/2',
        source: 'naver_blog',
        sourceName: '',
        title: 'invalid',
        snippet: 'invalid',
        date: null,
        collectedAt: '2026-04-05T00:00:00.000Z',
        currentShipped: true,
        autoStatus: 'mismatch',
        autoConfidence: 0.4,
        autoReasons: [],
        finalAuditStatus: null,
      },
    ];

    const stats = buildReviewAuditStats(entries, '/tmp/audit.jsonl');
    expect(stats.visibleCount).toBe(2);
    expect(stats.visibleVerifiedCount).toBe(1);
    expect(stats.invalidVisibleCount).toBe(1);
    expect(stats.visiblePrecision).toBe(0.5);
  });

  it('batch prioritization이 visible low confidence와 reused-without-direct-name를 앞세운다', () => {
    const entries: ReviewAuditEntry[] = [
      {
        reviewId: 'rev-1',
        kindergartenId: 'kid-1',
        kindergartenName: '행복한유치원',
        kindergartenAddress: '서울특별시 강남구 테헤란로 1',
        sidoCode: '11',
        sigunguCode: '11680',
        normalizedUrl: 'blog.naver.com/post/1',
        url: 'https://blog.naver.com/post/1',
        source: 'naver_blog',
        sourceName: '',
        title: '강남 유치원 총정리',
        snippet: '추천해주세요. 모집요강과 지원금 정보를 모았습니다.',
        date: null,
        collectedAt: '2026-04-05T00:00:00.000Z',
        currentShipped: true,
        autoStatus: 'generic_info',
        autoConfidence: 0.2,
        autoReasons: [],
        finalAuditStatus: null,
      },
      {
        reviewId: 'rev-2',
        kindergartenId: 'kid-2',
        kindergartenName: '무지개유치원',
        kindergartenAddress: '서울특별시 강남구 테헤란로 2',
        sidoCode: '11',
        sigunguCode: '11680',
        normalizedUrl: 'blog.naver.com/post/2',
        url: 'https://blog.naver.com/post/2',
        source: 'naver_blog',
        sourceName: '',
        title: '무지개유치원 보내보니',
        snippet: '선생님이 좋아요.',
        date: null,
        collectedAt: '2026-04-05T00:00:00.000Z',
        currentShipped: false,
        autoStatus: 'verified',
        autoConfidence: 0.95,
        autoReasons: [],
        finalAuditStatus: null,
      },
    ];
    const stateEntries: ReviewVerificationStateEntry[] = [
      {
        reviewId: 'rev-1',
        kindergartenId: 'kid-1',
        normalizedUrl: 'blog.naver.com/post/1',
        finalStatus: 'verified',
        confidence: 0.92,
        reviewedAt: '2026-04-05T00:00:00.000Z',
        reviewFingerprint: 'fp',
        title: entries[0].title,
        snippet: entries[0].snippet,
      },
    ];

    const batch = buildReviewAuditBatch({
      entries,
      kindergartens,
      stateEntries,
      batchSize: 2,
    });

    expect(batch[0].reviewId).toBe('rev-1');
    expect(batch[0].priorityReasons).toContain('visible + low confidence');
    expect(batch[0].priorityReasons).toContain(
      'state reused without direct-name evidence'
    );
  });

  it('apply는 finalAuditStatus verified인 리뷰만 남긴다', () => {
    const regionData: ReviewsData = {
      version: '2026-04-05',
      totalCount: 2,
      kindergartenCount: 2,
      reviews: {
        'kid-1': [
          {
            id: 'rev-1',
            kindergartenId: 'kid-1',
            title: 'keep',
            url: 'https://blog.naver.com/post/1',
            source: 'naver_blog',
            sourceName: '',
            snippet: 'keep',
            date: null,
            collectedAt: '2026-04-05T00:00:00.000Z',
          },
        ],
        'kid-2': [
          {
            id: 'rev-2',
            kindergartenId: 'kid-2',
            title: 'remove',
            url: 'https://blog.naver.com/post/2',
            source: 'naver_blog',
            sourceName: '',
            snippet: 'remove',
            date: null,
            collectedAt: '2026-04-05T00:00:00.000Z',
          },
        ],
      },
    };
    const auditEntries: ReviewAuditEntry[] = [
      {
        reviewId: 'rev-1',
        kindergartenId: 'kid-1',
        kindergartenName: '행복한유치원',
        kindergartenAddress: '서울특별시 강남구 테헤란로 1',
        sidoCode: '11',
        sigunguCode: '11680',
        normalizedUrl: 'blog.naver.com/post/1',
        url: 'https://blog.naver.com/post/1',
        source: 'naver_blog',
        sourceName: '',
        title: 'keep',
        snippet: 'keep',
        date: null,
        collectedAt: '2026-04-05T00:00:00.000Z',
        currentShipped: true,
        autoStatus: 'verified',
        autoConfidence: 0.9,
        autoReasons: [],
        finalAuditStatus: 'verified',
      },
      {
        reviewId: 'rev-2',
        kindergartenId: 'kid-2',
        kindergartenName: '무지개유치원',
        kindergartenAddress: '서울특별시 강남구 테헤란로 2',
        sidoCode: '11',
        sigunguCode: '11680',
        normalizedUrl: 'blog.naver.com/post/2',
        url: 'https://blog.naver.com/post/2',
        source: 'naver_blog',
        sourceName: '',
        title: 'remove',
        snippet: 'remove',
        date: null,
        collectedAt: '2026-04-05T00:00:00.000Z',
        currentShipped: true,
        autoStatus: 'mismatch',
        autoConfidence: 0.3,
        autoReasons: [],
        finalAuditStatus: null,
      },
    ];

    const applied = applyReviewAuditToRegionData(regionData, auditEntries);

    expect(applied.nextData.totalCount).toBe(1);
    expect(applied.summary.keptVerified).toBe(1);
    expect(applied.summary.removedUnaudited).toBe(1);
  });
});

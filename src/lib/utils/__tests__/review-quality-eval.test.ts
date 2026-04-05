import { describe, expect, it } from 'vitest';
import type {
  ReviewQualityGoldEntry,
  ReviewsData,
} from '@/types/review';
import { evaluateReviewQuality } from '../../../../scripts/evals/lib/review-quality-eval';
import {
  buildCoreNameFrequencyMap,
  buildReviewCollisionResolutionMap,
  type KindergartenEntry,
  type LoadedReviewEntry,
} from '../../../../scripts/lib/review-verification-pipeline';

describe('review collision resolution', () => {
  it('global URL collision에서 직접 기관명 또는 동일 시군구 증거가 없는 매핑을 제거 대상으로 표시한다', () => {
    const kindergartens: KindergartenEntry[] = [
      {
        kindercode: 'kid-1',
        name: '비산성모유치원',
        address: '경기도 안양시 만안구 경수대로 1',
        sido_code: '41',
        sigungu_code: '41171',
      },
      {
        kindercode: 'kid-2',
        name: '아이비유치원',
        address: '경기도 안양시 만안구 장내로 2',
        sido_code: '41',
        sigungu_code: '41171',
      },
      {
        kindercode: 'kid-3',
        name: '성모유치원',
        address: '부산광역시 수영구 민락본동로 3',
        sido_code: '26',
        sigungu_code: '26500',
      },
      {
        kindercode: 'kid-4',
        name: '창의나라유치원',
        address: '대구광역시 서구 서대구로 4',
        sido_code: '27',
        sigungu_code: '27170',
      },
    ];
    const entries: LoadedReviewEntry[] = [
      {
        kindergarten: kindergartens[0],
        sidoCode: '41',
        review: {
          id: 'rev-1',
          kindergartenId: 'kid-1',
          title: '비산성모유치원 입학설명회 후기',
          url: 'https://blog.naver.com/post/1',
          source: 'naver_blog',
          sourceName: '',
          snippet: '직접 다녀온 후기입니다.',
          date: null,
          collectedAt: '2026-04-05T00:00:00.000Z',
        },
      },
      {
        kindergarten: kindergartens[1],
        sidoCode: '41',
        review: {
          id: 'rev-2',
          kindergartenId: 'kid-2',
          title: '안양 만안구 유치원 입학설명회 일정',
          url: 'https://blog.naver.com/post/1',
          source: 'naver_blog',
          sourceName: '',
          snippet: '만안구에서 유치원 설명회 다닌 기록입니다.',
          date: null,
          collectedAt: '2026-04-05T00:00:00.000Z',
        },
      },
      {
        kindergarten: kindergartens[2],
        sidoCode: '26',
        review: {
          id: 'rev-3',
          kindergartenId: 'kid-3',
          title: '유치원 입학설명회 후기',
          url: 'https://blog.naver.com/post/1',
          source: 'naver_blog',
          sourceName: '',
          snippet: '안양에서 처음학교로 접수한 기록입니다.',
          date: null,
          collectedAt: '2026-04-05T00:00:00.000Z',
        },
      },
      {
        kindergarten: kindergartens[3],
        sidoCode: '27',
        review: {
          id: 'rev-4',
          kindergartenId: 'kid-4',
          title: '유치원 비교 정리',
          url: 'https://blog.naver.com/post/1',
          source: 'naver_blog',
          sourceName: '',
          snippet: '비산성모유치원 아이비유치원 비교 정리',
          date: null,
          collectedAt: '2026-04-05T00:00:00.000Z',
        },
      },
    ];

    const resolutionMap = buildReviewCollisionResolutionMap(
      entries,
      buildCoreNameFrequencyMap(kindergartens)
    );

    expect(resolutionMap.get('rev-1')?.shouldRemove).toBe(false);
    expect(resolutionMap.get('rev-2')?.shouldRemove).toBe(false);
    expect(resolutionMap.get('rev-3')?.shouldRemove).toBe(true);
    expect(resolutionMap.get('rev-4')?.shouldRemove).toBe(true);
  });
});

describe('review quality evaluator', () => {
  it('shipped data 존재 여부로 binary F1을 계산하고 class metrics를 함께 만든다', () => {
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
    const reviewsData: ReviewsData = {
      version: '2026-04-05',
      totalCount: 1,
      kindergartenCount: 1,
      reviews: {
        'kid-1': [
          {
            id: 'rev-keep',
            kindergartenId: 'kid-1',
            title: '행복한유치원 보내보니',
            url: 'https://blog.naver.com/post/keep',
            source: 'naver_blog',
            sourceName: '',
            snippet: '행복한유치원 선생님과 급식이 만족스러웠어요.',
            date: null,
            collectedAt: '2026-04-05T00:00:00.000Z',
          },
        ],
      },
    };
    const goldEntries: ReviewQualityGoldEntry[] = [
      {
        reviewId: 'rev-keep',
        kindergartenId: 'kid-1',
        kindergartenName: '행복한유치원',
        kindergartenAddress: '서울특별시 강남구 테헤란로 1',
        sidoCode: '11',
        url: 'https://blog.naver.com/post/keep',
        source: 'naver_blog',
        title: '행복한유치원 보내보니',
        snippet: '행복한유치원 선생님과 급식이 만족스러웠어요.',
        expectedStatus: 'verified',
        reason: '고신뢰 verified',
      },
      {
        reviewId: 'rev-remove',
        kindergartenId: 'kid-2',
        kindergartenName: '무지개유치원',
        kindergartenAddress: '서울특별시 강남구 테헤란로 2',
        sidoCode: '11',
        url: 'https://blog.naver.com/post/remove',
        source: 'naver_blog',
        title: '샌드위치 단체주문 후기',
        snippet: '유치원 행사 간식 납품 업체 상담 문의',
        expectedStatus: 'advertorial',
        reason: '광고성 글',
      },
    ];

    const report = evaluateReviewQuality({
      goldEntries,
      reviewsData,
      kindergartens,
      goldPath: '/tmp/gold.jsonl',
      reviewsPath: '/tmp/reviews.json',
    });

    expect(report.binaryKeepRemove.f1).toBe(1);
    expect(report.removePrecision).toBe(1);
    expect(report.perClass.verified.correct).toBe(1);
    expect(report.perClass.advertorial.correct).toBe(1);
    expect(report.contaminationKpis.unresolvedCollisionGroups).toBe(0);
  });
});

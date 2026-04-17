import { describe, expect, it } from 'vitest';
import type { KindergartenEntry } from '../../../../scripts/lib/review-verification-pipeline';
import {
  buildQuestionSummary,
  evaluateCollectedCandidate,
  looksLikeOfficialInstitutionSource,
} from '../../../../scripts/review-autoresearch/lib/collection-policy';
import type { ReviewLink } from '@/types/review';

function createKindergarten(
  overrides: Partial<KindergartenEntry> = {}
): KindergartenEntry {
  return {
    kindercode: 'kid-1',
    name: '뒤나미스유치원',
    address: '인천광역시 중구 오작로 116',
    sido_code: '28',
    sigungu_code: '28110',
    ...overrides,
  };
}

function createReview(
  overrides: Partial<ReviewLink> = {}
): ReviewLink {
  return {
    id: 'rev-1',
    kindergartenId: 'kid-1',
    title: '뒤나미스 유치원 보내시는 분 만족도 어떠신가요?',
    url: 'https://cafe.naver.com/yeongjongdolove/983584',
    source: 'naver_cafe',
    sourceName: '영맘',
    snippet: '뒤나미스유치원 보내시는 분 만족도 어떠신가요?',
    summary:
      '질문: 둘째도 보낼 정도로 만족하는지 궁금함 / 답변: 프로그램과 선생님 만족도가 높다는 응답 다수',
    tags: ['질문글'],
    content:
      '둘째도 보낼 정도로 만족하는지 궁금합니다. 첫째 졸업시키고 둘째 보내는 분이 아주 만족한다고 답했습니다.',
    date: '2025-11-20',
    collectedAt: '2026-04-07T12:00:00.000Z',
    accessMode: 'login',
    evidenceType: 'longform_post',
    extractionMethod: 'playwright_naver_search_direct_read',
    structuredFields: {
      questionSummary: '둘째도 보낼 정도로 만족하는지 궁금함',
      answerSummary: '프로그램과 선생님 만족도가 높다는 응답 다수',
      answerEvidenceCount: 2,
    },
    approvalStatus: 'pending',
    ...overrides,
  };
}

describe('review collection policy', () => {
  it('공식 기관 source name은 reject 신호로 본다', () => {
    expect(
      looksLikeOfficialInstitutionSource('뒤나미스유치원 공식 블로그', '뒤나미스유치원')
    ).toBe(true);
  });

  it('질문/답변 증거가 있으면 질문형 카페 글을 accept 한다', () => {
    const result = evaluateCollectedCandidate({
      kindergarten: createKindergarten(),
      review: createReview(),
      bodyText:
        '뒤나미스유치원 보내시는 분 계신가요? 첫째 졸업시키고 둘째 보내는 분이 아주 만족한다고 답했습니다. 선생님과 프로그램이 좋다는 후기입니다.',
      questionEvidence: {
        questionSummary: '둘째도 보낼 정도로 만족하는지 궁금함',
        answerSummary: '프로그램과 선생님 만족도가 높다는 응답 다수',
        answerEvidenceCount: 2,
      },
    });

    expect(result.accept).toBe(true);
    expect(buildQuestionSummary({
      questionSummary: '질문',
      answerSummary: '답변',
      answerEvidenceCount: 1,
    })).toBe('질문: 질문 / 답변: 답변');
  });

  it('질문형 카페 글이라도 답변 증거가 없으면 reject 한다', () => {
    const result = evaluateCollectedCandidate({
      kindergarten: createKindergarten(),
      review: createReview({
        summary: undefined,
        structuredFields: {},
      }),
      bodyText: '뒤나미스유치원 보내시는 분 계신가요? 정보 부탁드립니다.',
      questionEvidence: null,
    });

    expect(result.accept).toBe(false);
    expect(result.reason).toContain('missing readable question/answer evidence');
  });

  it('다른 유치원만 언급되는 경우 reject 한다', () => {
    const result = evaluateCollectedCandidate({
      kindergarten: createKindergarten(),
      review: createReview({
        title: '영종유치원 만족도 어떤가요?',
        snippet: '영종유치원 후기 문의',
      }),
      bodyText: '영종유치원 만족도가 궁금합니다.',
      questionEvidence: {
        questionSummary: '영종유치원 만족도 문의',
        answerSummary: '좋다는 답변',
        answerEvidenceCount: 1,
      },
    });

    expect(result.accept).toBe(false);
    expect(result.finalStatus).toBe('mismatch');
  });
});

import { describe, it, expect } from 'vitest';
import { stripHtml, formatNaverDate, extractRegionName, calculateRelevanceScore } from '../review-utils';

describe('stripHtml', () => {
  it('should remove HTML tags', () => {
    expect(stripHtml('<b>안녕</b>하세요')).toBe('안녕하세요');
  });

  it('should remove nested HTML tags', () => {
    expect(stripHtml('<div><p><b>제목</b></p></div>')).toBe('제목');
  });

  it('should replace HTML entities with spaces', () => {
    expect(stripHtml('hello&amp;world')).toBe('hello world');
  });

  it('should trim whitespace', () => {
    expect(stripHtml('  <b>내용</b>  ')).toBe('내용');
  });

  it('should handle empty string', () => {
    expect(stripHtml('')).toBe('');
  });

  it('should handle string with no HTML', () => {
    expect(stripHtml('일반 텍스트')).toBe('일반 텍스트');
  });

  it('should handle multiple entities', () => {
    expect(stripHtml('a&lt;b&gt;c')).toBe('a b c');
  });
});

describe('formatNaverDate', () => {
  it('should format YYYYMMDD to YYYY-MM-DD', () => {
    expect(formatNaverDate('20250915')).toBe('2025-09-15');
  });

  it('should handle January', () => {
    expect(formatNaverDate('20260101')).toBe('2026-01-01');
  });

  it('should return null for undefined', () => {
    expect(formatNaverDate(undefined)).toBeNull();
  });

  it('should return null for empty string', () => {
    expect(formatNaverDate('')).toBeNull();
  });

  it('should return null for short string', () => {
    expect(formatNaverDate('2025')).toBeNull();
  });

  it('should return null for long string', () => {
    expect(formatNaverDate('202501011')).toBeNull();
  });
});

describe('extractRegionName', () => {
  it('should extract "인천 서구" from 인천광역시 서구 address', () => {
    expect(extractRegionName('인천광역시 서구 검단로 123')).toBe('인천 서구');
  });

  it('should extract "인천 계양구" from 인천광역시 계양구 address', () => {
    expect(extractRegionName('인천광역시 계양구 계양대로 456')).toBe('인천 계양구');
  });

  it('should extract "김포" from 경기도 김포시 address', () => {
    expect(extractRegionName('경기도 김포시 풍무로 789')).toBe('김포');
  });

  it('should extract "강남" from 서울특별시 강남구 address', () => {
    expect(extractRegionName('서울특별시 강남구 테헤란로 100')).toBe('서울 강남구');
  });

  it('should return empty string for short address', () => {
    expect(extractRegionName('서울')).toBe('');
  });

  it('should handle empty string', () => {
    expect(extractRegionName('')).toBe('');
  });
});

describe('calculateRelevanceScore', () => {
  it('should return positive score for review-related content', () => {
    const score = calculateRelevanceScore(
      '해솔유치원 다녀보니 솔직 후기',
      '선생님이 친절하고 급식이 좋아요. 커리큘럼도 알차요.'
    );
    expect(score).toBeGreaterThan(0);
  });

  it('should return negative score for irrelevant content', () => {
    const score = calculateRelevanceScore(
      '유치원 블라인드 시공',
      '인테리어 리모델링 업체에서 견적 받았습니다.'
    );
    expect(score).toBeLessThan(0);
  });

  it('should return 0 for neutral content', () => {
    const score = calculateRelevanceScore(
      '오늘 날씨가 좋다',
      '산책하기 좋은 날입니다.'
    );
    expect(score).toBe(0);
  });

  it('should give higher score for more review keywords', () => {
    const lowScore = calculateRelevanceScore('유치원 후기', '좋았습니다.');
    const highScore = calculateRelevanceScore(
      '유치원 후기 다녀보니 추천',
      '선생님 급식 시설 커리큘럼 모두 만족'
    );
    expect(highScore).toBeGreaterThan(lowScore);
  });

  it('should penalize ad keywords more than reward review keywords', () => {
    const score = calculateRelevanceScore(
      '유치원 후기 시공',
      '블라인드 인테리어'
    );
    // 후기(+1) vs 시공(-2) + 블라인드(-2) + 인테리어(-2) = -5
    expect(score).toBeLessThan(0);
  });
});

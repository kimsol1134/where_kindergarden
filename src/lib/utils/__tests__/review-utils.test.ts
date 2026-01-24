import { describe, it, expect } from 'vitest';
import { stripHtml, formatNaverDate } from '../review-utils';

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

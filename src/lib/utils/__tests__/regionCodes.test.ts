import { describe, it, expect } from 'vitest';
import {
  convertToEduSidoCode,
  convertSidoNameToEduCode,
  convertRegionCode,
  getSupportedAdminSidoCodes,
  getSupportedEduSidoCodes,
} from '../regionCodes';

describe('convertToEduSidoCode', () => {
  it('서울시 코드를 변환한다 (11 → 11)', () => {
    expect(convertToEduSidoCode('11')).toBe('11');
  });

  it('부산시 코드를 최신 공개코드로 유지한다 (26 → 26)', () => {
    expect(convertToEduSidoCode('26')).toBe('26');
  });

  it('경기도 코드를 최신 공개코드로 유지한다 (41 → 41)', () => {
    expect(convertToEduSidoCode('41')).toBe('41');
  });

  it('강원특별자치도 구 코드를 변환한다 (42 → 51)', () => {
    expect(convertToEduSidoCode('42')).toBe('51');
  });

  it('강원특별자치도 신 코드를 유지한다 (51 → 51)', () => {
    expect(convertToEduSidoCode('51')).toBe('51');
  });

  it('전북특별자치도 구 코드를 변환한다 (45 → 52)', () => {
    expect(convertToEduSidoCode('45')).toBe('52');
  });

  it('전북특별자치도 신 코드를 유지한다 (52 → 52)', () => {
    expect(convertToEduSidoCode('52')).toBe('52');
  });

  it('제주도 코드를 최신 공개코드로 유지한다 (50 → 50)', () => {
    expect(convertToEduSidoCode('50')).toBe('50');
  });

  it('존재하지 않는 코드는 null을 반환한다', () => {
    expect(convertToEduSidoCode('99')).toBeNull();
    expect(convertToEduSidoCode('')).toBeNull();
  });
});

describe('convertSidoNameToEduCode', () => {
  it('서울특별시를 변환한다', () => {
    expect(convertSidoNameToEduCode('서울')).toBe('11');
    expect(convertSidoNameToEduCode('서울특별시')).toBe('11');
  });

  it('강원특별자치도를 변환한다', () => {
    expect(convertSidoNameToEduCode('강원')).toBe('51');
    expect(convertSidoNameToEduCode('강원도')).toBe('51');
    expect(convertSidoNameToEduCode('강원특별자치도')).toBe('51');
  });

  it('전북특별자치도를 변환한다', () => {
    expect(convertSidoNameToEduCode('전북')).toBe('52');
    expect(convertSidoNameToEduCode('전라북도')).toBe('52');
    expect(convertSidoNameToEduCode('전북특별자치도')).toBe('52');
  });

  it('존재하지 않는 이름은 null을 반환한다', () => {
    expect(convertSidoNameToEduCode('존재하지않는도시')).toBeNull();
    expect(convertSidoNameToEduCode('')).toBeNull();
  });
});

describe('convertRegionCode', () => {
  it('시도코드로 변환에 성공하면 결과를 반환한다', () => {
    const result = convertRegionCode('42', '강원특별자치도', '원주시');

    expect(result).toEqual({
      eduSidoCode: '51',
      sigunguName: '원주시',
    });
  });

  it('시도코드 변환 실패시 시도명으로 재시도한다', () => {
    const result = convertRegionCode('99', '강원특별자치도', '원주시');

    expect(result).toEqual({
      eduSidoCode: '51',
      sigunguName: '원주시',
    });
  });

  it('시도코드와 시도명 모두 변환 실패시 null을 반환한다', () => {
    const result = convertRegionCode('99', '알수없는시도', '알수없는시군구');

    expect(result).toBeNull();
  });

  it('서울 강남구 변환', () => {
    const result = convertRegionCode('11', '서울특별시', '강남구');

    expect(result).toEqual({
      eduSidoCode: '11',
      sigunguName: '강남구',
    });
  });
});

describe('getSupportedAdminSidoCodes', () => {
  it('지원되는 모든 행정안전부 코드를 반환한다', () => {
    const codes = getSupportedAdminSidoCodes();

    expect(codes).toContain('11'); // 서울
    expect(codes).toContain('42'); // 강원 구코드
    expect(codes).toContain('51'); // 강원 신코드
    expect(codes.length).toBeGreaterThanOrEqual(17);
  });
});

describe('getSupportedEduSidoCodes', () => {
  it('지원되는 모든 교육부 코드를 반환한다', () => {
    const codes = getSupportedEduSidoCodes();

    expect(codes).toContain('11'); // 서울
    expect(codes).toContain('51'); // 강원
    expect(codes).toContain('52'); // 전북
    expect(codes).toContain('12'); // 전남광주
    // 중복 제거되어야 함 (강원 구/신코드는 모두 51)
    expect(codes.filter((c) => c === '51').length).toBe(1);
  });
});

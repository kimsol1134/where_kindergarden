import { describe, expect, it } from 'vitest';
import {
  assertRegistryJoinCoverage,
  joinDisclosureToOperatingRegistry,
  MIN_REGISTRY_JOIN_COVERAGE,
  resolveRegion,
} from '../sync-kindergartens';

describe('joinDisclosureToOperatingRegistry', () => {
  it('joins disclosure rows to the operating registry by name and address', () => {
    const result = joinDisclosureToOperatingRegistry(
      [
        { name: '햇살유치원', address: '서울특별시 종로구 사직로 1' },
        { name: '새싹유치원', address: '경기도 수원시 영통구 광교로 2' },
      ],
      [
        { id: 'id-sun', name: '햇살유치원', address: '서울특별시 종로구 사직로 1' },
        { id: 'id-sprout', name: '새싹유치원', address: '경기도 수원시 영통구 광교로 2' },
      ]
    );

    expect(result.matched.map((entry) => entry.registryRow.id)).toEqual(['id-sun', 'id-sprout']);
    expect(result.unmatched).toEqual([]);
  });

  it('omits disclosure rows that are no longer in the operating registry', () => {
    const result = joinDisclosureToOperatingRegistry(
      [
        { name: '신일유치원', address: '서울특별시 중랑구 면목로44길 55' },
        { name: '운영유치원', address: '서울특별시 중구 동호로10길 27' },
      ],
      [{ id: 'id-open', name: '운영유치원', address: '서울특별시 중구 동호로10길 27' }]
    );

    expect(result.matched).toHaveLength(1);
    expect(result.matched[0]?.registryRow.id).toBe('id-open');
    expect(result.unmatched).toEqual([
      {
        key: '신일유치원\u0000서울특별시 중랑구 면목로44길 55',
        row: { name: '신일유치원', address: '서울특별시 중랑구 면목로44길 55' },
      },
    ]);
  });

  it('does not join a closed namesake onto a different operating institution with the same name', () => {
    const result = joinDisclosureToOperatingRegistry(
      [{ name: '신일유치원', address: '서울특별시 중랑구 면목로44길 55' }],
      [{ id: 'id-anyang', name: '신일유치원', address: '경기도 안양시 동안구 달안로 153' }]
    );

    expect(result.matched).toEqual([]);
    expect(result.unmatched).toHaveLength(1);
  });

  it('rejects duplicate operating-registry keys', () => {
    expect(() =>
      joinDisclosureToOperatingRegistry(
        [{ name: '햇살유치원', address: '서울특별시 종로구 사직로 1' }],
        [
          { id: 'id-1', name: '햇살유치원', address: '서울특별시 종로구 사직로 1' },
          { id: 'id-2', name: '햇살유치원', address: '서울특별시 종로구 사직로 1' },
        ]
      )
    ).toThrow('Duplicate registry key: 햇살유치원 / 서울특별시 종로구 사직로 1');
  });
});

describe('assertRegistryJoinCoverage', () => {
  it('accepts 99% operating-registry coverage', () => {
    expect(MIN_REGISTRY_JOIN_COVERAGE).toBe(0.99);
    expect(assertRegistryJoinCoverage(99, 100)).toBe(0.99);
  });

  it('rejects coverage below 99% so a mass join failure still blocks publication', () => {
    expect(() => assertRegistryJoinCoverage(98, 100)).toThrow(
      'Operating registry join coverage below 99%: 98/100 (98.00%)'
    );
  });
});

describe('resolveRegion', () => {
  it('resolves a national university kindergarten with a blank office from the official address', () => {
    const resolved = resolveRegion(
      '강원대학교부설유치원',
      ' ',
      '강원특별자치도 원주시 남원로 150',
      undefined
    );

    expect(resolved.method).toBe('official-address');
    expect(resolved.region.sggCode).toBe('51130');
    expect(resolved.region.sidoName).toBe('강원특별자치도');
    expect(resolved.region.sggName).toBe('원주시');
  });

  it('keeps 고성군 in the sido named by the official address', () => {
    const gangwon = resolveRegion(
      '고성유치원',
      '강원특별자치도교육청',
      '강원특별자치도 고성군 간성읍 수성로 10',
      undefined
    );
    const gyeongnam = resolveRegion(
      '고성유치원',
      '',
      '경상남도 고성군 고성읍 중앙로 10',
      undefined
    );

    expect(gangwon.region.sggCode).toBe('51820');
    expect(gyeongnam.region.sggCode).toBe('48820');
  });
});

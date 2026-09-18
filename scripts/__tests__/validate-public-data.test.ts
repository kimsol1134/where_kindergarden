import { describe, expect, it } from 'vitest';
import { blockingStaleSources, parseFreshnessFilter } from '../validate-public-data';

describe('parseFreshnessFilter', () => {
  it('returns null when the workflow does not scope freshness', () => {
    expect(parseFreshnessFilter(['--write-manifest'])).toBeNull();
  });

  it('accepts the datasets a workflow owns', () => {
    expect(
      parseFreshnessFilter(['--freshness', 'kindergartens,reviews,regionCodes'])
    ).toEqual(new Set(['kindergartens', 'reviews', 'regionCodes']));
  });

  it('rejects unknown freshness sources', () => {
    expect(() => parseFreshnessFilter(['--freshness', 'kindergartens,unknown'])).toThrow(
      'Unknown freshness source: unknown'
    );
  });
});

describe('blockingStaleSources', () => {
  it('keeps every stale source when no workflow filter is set', () => {
    expect(blockingStaleSources(['kindergartens', 'vacancy'], null)).toEqual([
      'kindergartens',
      'vacancy',
    ]);
  });

  it('ignores stale datasets that another workflow owns', () => {
    expect(
      blockingStaleSources(['kindergartens', 'vacancy'], new Set(['kindergartens', 'reviews']))
    ).toEqual(['kindergartens']);
  });
});

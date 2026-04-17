/**
 * collect-asc-analytics.ts 유닛 테스트
 *
 * generateJwt, parseSalesReportCsv, normalizeDate, AscDailyMetric 스키마 검증
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import jwt from 'jsonwebtoken';

import {
  generateJwt,
  parseSalesReportCsv,
  normalizeDate,
  type AscApiConfig,
  type AscDailyMetric,
} from '../../scripts/collect-asc-analytics';

// ============================================================================
// 테스트용 ES256 키 쌍 생성 (openssl 사용)
// ============================================================================

let testPrivateKey = '';
let testPublicKey = '';
const tmpDir = os.tmpdir();

beforeAll(() => {
  try {
    // ES256 (P-256) 키 쌍 생성
    const privKeyPath = path.join(tmpDir, 'test-asc-priv.pem');
    const pubKeyPath = path.join(tmpDir, 'test-asc-pub.pem');
    execSync(`openssl ecparam -name prime256v1 -genkey -noout -out "${privKeyPath}"`, { stdio: 'pipe' });
    execSync(`openssl ec -in "${privKeyPath}" -pubout -out "${pubKeyPath}"`, { stdio: 'pipe' });
    testPrivateKey = fs.readFileSync(privKeyPath, 'utf-8');
    testPublicKey = fs.readFileSync(pubKeyPath, 'utf-8');
  } catch {
    // openssl 없는 환경 — 테스트 키 스킵
    testPrivateKey = '';
    testPublicKey = '';
  }
});

// ============================================================================
// generateJwt 테스트
// ============================================================================

describe('generateJwt', () => {
  it('should generate a valid JWT with correct header and claims', () => {
    if (!testPrivateKey) {
      // openssl 없는 환경에서는 스킵
      return;
    }

    const config: AscApiConfig = {
      keyId: 'TESTKEYID1',
      issuerId: 'test-issuer-uuid',
      privateKey: testPrivateKey,
      appId: '1234567890',
    };

    const token = generateJwt(config);
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3);

    // 헤더 검증
    const parts = token.split('.');
    const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf-8')) as {
      alg: string;
      kid: string;
      typ: string;
    };
    expect(header.alg).toBe('ES256');
    expect(header.kid).toBe('TESTKEYID1');
    expect(header.typ).toBe('JWT');

    // 페이로드 검증
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf-8')) as {
      iss: string;
      aud: string;
      exp: number;
      iat: number;
    };
    expect(payload.iss).toBe('test-issuer-uuid');
    expect(payload.aud).toBe('appstoreconnect-v1');
    expect(typeof payload.exp).toBe('number');
    expect(typeof payload.iat).toBe('number');

    // exp는 iat + 1200초 (20분)
    expect(payload.exp - payload.iat).toBe(1200);

    // 공개 키로 서명 검증
    const verified = jwt.verify(token, testPublicKey, { algorithms: ['ES256'] }) as {
      iss: string;
    };
    expect(verified.iss).toBe('test-issuer-uuid');
  });

  it('should set exp approximately 20 minutes from now', () => {
    if (!testPrivateKey) return;

    const config: AscApiConfig = {
      keyId: 'KEY1',
      issuerId: 'issuer-1',
      privateKey: testPrivateKey,
      appId: '111',
    };

    const before = Math.floor(Date.now() / 1000);
    const token = generateJwt(config);
    const after = Math.floor(Date.now() / 1000);

    const parts = token.split('.');
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf-8')) as {
      exp: number;
      iat: number;
    };

    expect(payload.iat).toBeGreaterThanOrEqual(before);
    expect(payload.iat).toBeLessThanOrEqual(after);
    // 만료 시간은 정확히 iat + 1200
    expect(payload.exp).toBe(payload.iat + 1200);
  });
});

// ============================================================================
// parseSalesReportCsv 테스트
// ============================================================================

describe('parseSalesReportCsv', () => {
  // 실제 Apple Sales Report TSV 형식 (탭 구분)
  const sampleTsv = [
    'Provider\tProvider Country\tSKU\tDeveloper\tTitle\tVersion\tProduct Type Identifier\tUnits\tDeveloper Proceeds\tBegin Date\tEnd Date\tCustomer Currency\tCountry Code\tCurrency of Proceeds\tApple Identifier\tCustomer Price\tPromo Code\tParent Identifier\tSubscription\tPeriod\tCategory\tCMB\tDevice\tSupported Platforms\tProceeds Reason\tPreserved Pricing\tClient\tOrder Type',
    'APPLE\tUS\tCOM.EXAMPLE.APP\tTest Dev\tTest App\t1.0\t1F\t5\t0\t01/01/2025\t01/01/2025\tKRW\tKR\tKRW\t1234567890\t0\t\t\t\t\t\t\t\t\t\t\t\t',
    'APPLE\tUS\tCOM.EXAMPLE.APP\tTest Dev\tTest App\t1.0\t1F\t3\t0\t01/02/2025\t01/02/2025\tKRW\tKR\tKRW\t1234567890\t0\t\t\t\t\t\t\t\t\t\t\t\t',
    'APPLE\tUS\tCOM.EXAMPLE.APP\tTest Dev\tTest App\t1.0\t1F\t0\t0\t01/03/2025\t01/03/2025\tKRW\tKR\tKRW\t9999999999\t0\t\t\t\t\t\t\t\t\t\t\t\t',
  ].join('\n');

  it('should parse TSV correctly and extract daily Units as installs', () => {
    const metrics = parseSalesReportCsv(sampleTsv, '1234567890');

    expect(Array.isArray(metrics)).toBe(true);
    // Apple ID 1234567890 행만: 5 units (01/01) + 3 units (01/02)
    expect(metrics).toHaveLength(2);

    const first = metrics[0];
    expect(first.date).toBe('2025-01-01');
    expect(first.cohort_date).toBe('2025-01-01');
    expect(first.metric_name).toBe('installs');
    expect(first.value).toBe(5);
    expect(first.source).toBe('asc_sales_report');

    const second = metrics[1];
    expect(second.date).toBe('2025-01-02');
    expect(second.value).toBe(3);
  });

  it('should return empty array for unrelated apps', () => {
    const metrics = parseSalesReportCsv(sampleTsv, '0000000000');
    // appId 0000000000 행이 없으므로 빈 배열
    expect(metrics).toHaveLength(0);
  });

  it('should return empty array for empty content', () => {
    const metrics = parseSalesReportCsv('', 'any');
    expect(metrics).toHaveLength(0);
  });

  it('should return empty array for header-only content', () => {
    const headerOnly = 'Provider\tUnits\tBegin Date\tApple Identifier';
    const metrics = parseSalesReportCsv(headerOnly, '1234567890');
    expect(metrics).toHaveLength(0);
  });

  it('should handle YYYY-MM-DD date format', () => {
    const isoDateTsv = [
      'Provider\tUnits\tBegin Date\tApple Identifier',
      'APPLE\t7\t2025-03-15\t1234567890',
    ].join('\n');

    const metrics = parseSalesReportCsv(isoDateTsv, '1234567890');
    expect(metrics).toHaveLength(1);
    expect(metrics[0].date).toBe('2025-03-15');
    expect(metrics[0].value).toBe(7);
  });
});

// ============================================================================
// AscDailyMetric 스키마 검증
// ============================================================================

describe('AscDailyMetric schema', () => {
  it('should have date as JOIN-compatible YYYY-MM-DD format', () => {
    const metric: AscDailyMetric = {
      date: '2025-01-15',
      cohort_date: '2025-01-15',
      metric_name: 'installs',
      value: 10,
      source: 'asc_sales_report',
    };

    // YYYY-MM-DD 형식 검증
    expect(/^\d{4}-\d{2}-\d{2}$/.test(metric.date)).toBe(true);
    expect(/^\d{4}-\d{2}-\d{2}$/.test(metric.cohort_date)).toBe(true);
    expect(typeof metric.value).toBe('number');
    expect(typeof metric.metric_name).toBe('string');
    expect(typeof metric.source).toBe('string');
  });

  it('should produce metrics whose dates are Mixpanel-JOIN-compatible', () => {
    // Mixpanel Export CSV의 time 필드가 YYYY-MM-DD와 매칭 가능해야 함
    const sampleTsv = [
      'Provider\tUnits\tBegin Date\tApple Identifier',
      'APPLE\t4\t03/20/2025\t9876543210',
    ].join('\n');

    const metrics = parseSalesReportCsv(sampleTsv, '9876543210');
    expect(metrics).toHaveLength(1);
    // Mixpanel 날짜 포맷과 동일한 YYYY-MM-DD
    expect(metrics[0].date).toBe('2025-03-20');
  });
});

// ============================================================================
// normalizeDate 유틸리티 테스트
// ============================================================================

describe('normalizeDate', () => {
  it('should return YYYY-MM-DD unchanged', () => {
    expect(normalizeDate('2025-01-15')).toBe('2025-01-15');
  });

  it('should convert MM/DD/YYYY to YYYY-MM-DD', () => {
    expect(normalizeDate('03/20/2025')).toBe('2025-03-20');
    expect(normalizeDate('1/5/2024')).toBe('2024-01-05');
  });

  it('should return null for invalid format', () => {
    expect(normalizeDate('invalid')).toBeNull();
    expect(normalizeDate('')).toBeNull();
    expect(normalizeDate('20250115')).toBeNull();
  });
});

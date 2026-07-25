#!/usr/bin/env node
/**
 * App Store Connect Analytics Reports API 조회.
 *
 * Sales Reports API(기존 collect-asc-analytics.ts)는 설치 수만 준다.
 * 이 스크립트는 Analytics Reports API를 써서 "어디서 왔는지"(소스, 검색/탐색/추천),
 * 기기, 지역 같은 획득 경로 세부를 가져온다.
 *
 * Analytics Reports는 3단계 비동기다:
 *   1) analyticsReportRequests 생성 (앱당 accessType별 1개만 유지됨 — 이미 있으면 재사용)
 *   2) reports → instances(일/주/월) 조회
 *   3) segments의 서명된 URL에서 gzip TSV 다운로드
 *
 * 사용법:
 *   node scripts/asc-analytics-reports.mjs --list                 # 사용 가능한 리포트 목록
 *   node scripts/asc-analytics-reports.mjs --report "App Store Discovery and Engagement" --date 2026-07-24
 *
 * 환경 변수는 .env.testflight.local 참조.
 */

import fs from 'node:fs';
import zlib from 'node:zlib';
import jwt from 'jsonwebtoken';

const APP_ID = process.env.APP_STORE_APP_ID || '6758149645';
const BASE = 'https://api.appstoreconnect.apple.com/v1';

function token() {
  const key = fs.readFileSync(process.env.APP_STORE_CONNECT_API_KEY_FILEPATH);
  return jwt.sign(
    {
      iss: process.env.APP_STORE_CONNECT_API_ISSUER_ID,
      exp: Math.floor(Date.now() / 1000) + 900,
      aud: 'appstoreconnect-v1',
    },
    key,
    {
      algorithm: 'ES256',
      header: { alg: 'ES256', kid: process.env.APP_STORE_CONNECT_API_KEY_ID, typ: 'JWT' },
    }
  );
}

async function api(path, init = {}) {
  const res = await fetch(path.startsWith('http') ? path : BASE + path, {
    ...init,
    headers: {
      Authorization: 'Bearer ' + token(),
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  let body;
  try { body = JSON.parse(text); } catch { body = text; }
  return { status: res.status, body };
}

/** 기존 요청을 찾고, 없으면 ONGOING 스냅샷 요청을 새로 만든다. */
async function ensureReportRequest() {
  const existing = await api(`/apps/${APP_ID}/analyticsReportRequests?limit=50`);
  if (existing.status === 200) {
    const usable = (existing.body.data || []).find(
      (r) => !r.attributes.stoppedDueToInactivity
    );
    if (usable) return { id: usable.id, accessType: usable.attributes.accessType, created: false };
  }

  const created = await api('/analyticsReportRequests', {
    method: 'POST',
    body: JSON.stringify({
      data: {
        type: 'analyticsReportRequests',
        attributes: { accessType: 'ONGOING' },
        relationships: { app: { data: { type: 'apps', id: APP_ID } } },
      },
    }),
  });
  if (created.status >= 400) {
    throw new Error(`요청 생성 실패 ${created.status}: ${JSON.stringify(created.body).slice(0, 300)}`);
  }
  return { id: created.body.data.id, accessType: 'ONGOING', created: true };
}

async function listReports(requestId) {
  const out = [];
  let url = `/analyticsReportRequests/${requestId}/reports?limit=200`;
  while (url) {
    const r = await api(url);
    if (r.status >= 400) throw new Error(`리포트 목록 실패 ${r.status}`);
    out.push(...(r.body.data || []));
    url = r.body.links?.next || null;
  }
  return out;
}

/** 특정 리포트의 일별 인스턴스에서 세그먼트 TSV를 받아 파싱한다. */
async function fetchInstanceRows(reportId, date) {
  const inst = await api(
    `/analyticsReports/${reportId}/instances?filter[granularity]=DAILY` +
      (date ? `&filter[processingDate]=${date}` : '') + '&limit=10'
  );
  if (inst.status >= 400 || !(inst.body.data || []).length) return null;

  const instance = inst.body.data[0];
  const segs = await api(`/analyticsReportInstances/${instance.id}/segments`);
  if (segs.status >= 400 || !(segs.body.data || []).length) return null;

  const rows = [];
  for (const s of segs.body.data) {
    const res = await fetch(s.attributes.url);
    const buf = Buffer.from(await res.arrayBuffer());
    let txt;
    try { txt = zlib.gunzipSync(buf).toString(); } catch { txt = buf.toString(); }
    const lines = txt.split('\n').filter(Boolean);
    const header = lines[0].split('\t');
    for (const line of lines.slice(1)) {
      const cells = line.split('\t');
      rows.push(Object.fromEntries(header.map((h, i) => [h, cells[i]])));
    }
  }
  return { processingDate: instance.attributes.processingDate, rows };
}

// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const flag = (n) => {
  const i = args.indexOf(n);
  return i >= 0 ? args[i + 1] : null;
};

const req = await ensureReportRequest();
console.log(`리포트 요청: ${req.id} (${req.accessType})${req.created ? ' — 새로 생성됨' : ''}`);

const reports = await listReports(req.id);
console.log(`사용 가능한 리포트: ${reports.length}개\n`);

if (args.includes('--list') || !flag('--report')) {
  const byCategory = {};
  for (const r of reports) {
    const c = r.attributes.category || 'OTHER';
    (byCategory[c] ||= []).push(r.attributes.name);
  }
  for (const [cat, names] of Object.entries(byCategory)) {
    console.log(`[${cat}]`);
    for (const n of names.sort()) console.log(`  ${n}`);
  }
  if (req.created) {
    console.log('\n※ 요청을 방금 생성했습니다. Apple이 데이터를 채우는 데 최대 며칠 걸립니다.');
  }
  process.exit(0);
}

const wanted = flag('--report').toLowerCase();
const target = reports.find((r) => r.attributes.name.toLowerCase().includes(wanted));
if (!target) {
  console.log(`"${flag('--report')}" 와 일치하는 리포트 없음`);
  process.exit(1);
}

console.log(`선택: ${target.attributes.name}\n`);
const result = await fetchInstanceRows(target.id, flag('--date'));
if (!result) {
  console.log('해당 날짜의 인스턴스/세그먼트 없음 (아직 처리 중이거나 데이터 없음)');
  process.exit(0);
}

console.log(`처리 날짜: ${result.processingDate} · ${result.rows.length}행\n`);
console.log(result.rows.slice(0, 40).map((r) => JSON.stringify(r)).join('\n'));

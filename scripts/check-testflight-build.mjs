// TestFlight 빌드 상태 조회 유틸
//
// 사용법:
//   source <(grep -v '^#' .env.testflight.local | grep -v '^$' | sed 's/^/export /')
//   node scripts/check-testflight-build.mjs
//
// 출력: 최근 5개 빌드(PROCESSING + VALID)를 버전/빌드번호/상태와 함께 표시
// 다음 빌드 번호 산정 시 참고.

import jwt from 'jsonwebtoken';
import * as fs from 'fs';

const keyPath = process.env.APP_STORE_CONNECT_API_KEY_FILEPATH;
const privateKey = fs.readFileSync(keyPath, 'utf-8');
const now = Math.floor(Date.now() / 1000);
const token = jwt.sign(
  {
    iss: process.env.APP_STORE_CONNECT_API_ISSUER_ID,
    iat: now,
    exp: now + 1200,
    aud: 'appstoreconnect-v1',
  },
  privateKey,
  {
    algorithm: 'ES256',
    header: {
      alg: 'ES256',
      kid: process.env.APP_STORE_CONNECT_API_KEY_ID,
      typ: 'JWT',
    },
  }
);

const appId = process.env.APP_STORE_APP_ID ?? '6758149645';
const url = `https://api.appstoreconnect.apple.com/v1/builds?filter%5Bapp%5D=${appId}&filter%5BprocessingState%5D=PROCESSING,VALID&sort=-uploadedDate&limit=5&include=preReleaseVersion`;

const res = await fetch(url, { headers: { Authorization: 'Bearer ' + token } });
const data = await res.json();
if (data.errors) {
  console.log('ERRORS:', JSON.stringify(data.errors, null, 2));
  process.exit(1);
}

const prereleaseMap = new Map();
(data.included ?? [])
  .filter((i) => i.type === 'preReleaseVersions')
  .forEach((i) => prereleaseMap.set(i.id, i.attributes?.version));

const builds =
  data.data?.map((b) => ({
    buildVersion: b.attributes.version,
    appVersion: prereleaseMap.get(b.relationships?.preReleaseVersion?.data?.id),
    state: b.attributes.processingState,
    uploaded: b.attributes.uploadedDate,
    expired: b.attributes.expired,
  })) ?? [];

console.log('Recent builds (most recent first):');
console.log(JSON.stringify(builds, null, 2));

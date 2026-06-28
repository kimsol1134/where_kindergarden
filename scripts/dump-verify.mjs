#!/usr/bin/env node
// 검증 실행 결과를 에이전트가 읽기 좋은 컴팩트 형태로 출력
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const sido = args[args.indexOf('--sido') + 1];
const only = args.includes('--status') ? args[args.indexOf('--status') + 1] : null; // 'inaccessible' 등
const p = path.join(ROOT, 'scripts/data-output/verify-runs', `${sido}.json`);
const d = JSON.parse(fs.readFileSync(p, 'utf8'));
console.log(`# sido ${sido} | ${d.reviews.length} reviews | summary ${JSON.stringify(d.summary)}`);
for (const r of d.reviews) {
  if (only && r.status !== only) continue;
  const isCafe = r.source === 'naver_cafe' || r.status === 'inaccessible';
  const body = isCafe ? `SNIPPET: ${(r.snippet || '').slice(0, 170)}` : `EXCERPT: ${(r.bodyExcerpt || '').slice(0, 190)}`;
  console.log(`\n${r.reviewId} [${r.status}/${r.confidence}] ${r.source} | ${r.kindergartenName}`);
  console.log(`  TITLE: ${(r.title || '').slice(0, 70)}`);
  console.log(`  ${body}`);
}

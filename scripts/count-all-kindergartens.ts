/**
 * 전국 유치원 수 확인 스크립트
 */

import 'dotenv/config';
import { SIGUNGU_CODES, type SigunguCode } from './data/sigungu-codes';

const API_BASE_URL = 'https://e-childschoolinfo.moe.go.kr/api/notice';

async function fetchBasicInfo(apiKey: string, sigungu: SigunguCode) {
  // API 호출에는 행정안전부 시도코드를 사용
  const url = `${API_BASE_URL}/basicInfo.do?key=${apiKey}&sidoCode=${sigungu.adminSidoCode}&sggCode=${sigungu.sggCode}`;
  const response = await fetch(url, { headers: { Accept: 'application/json' } });
  const data = await response.json();
  return data.kinderInfo || [];
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  const apiKey = process.env.KINDERGARTEN_API_KEY;
  if (!apiKey) {
    console.error('KINDERGARTEN_API_KEY is not set');
    process.exit(1);
  }

  console.log(`전국 시군구 수: ${SIGUNGU_CODES.length}\n`);

  const sidoResults: Record<string, { count: number; sigunguCount: number }> = {};
  let totalCount = 0;
  let processed = 0;

  const startTime = Date.now();

  for (const sigungu of SIGUNGU_CODES) {
    processed++;
    const data = await fetchBasicInfo(apiKey, sigungu);

    if (!sidoResults[sigungu.sidoName]) {
      sidoResults[sigungu.sidoName] = { count: 0, sigunguCount: 0 };
    }
    sidoResults[sigungu.sidoName].count += data.length;
    sidoResults[sigungu.sidoName].sigunguCount++;
    totalCount += data.length;

    // 진행률 표시 (10개마다)
    if (processed % 10 === 0) {
      const elapsed = (Date.now() - startTime) / 1000;
      const rate = processed / elapsed;
      const remaining = (SIGUNGU_CODES.length - processed) / rate;
      console.log(`진행: ${processed}/${SIGUNGU_CODES.length} (${Math.round(elapsed)}s elapsed, ~${Math.round(remaining)}s remaining)`);
    }

    await sleep(100); // Rate limiting
  }

  const totalTime = (Date.now() - startTime) / 1000;

  console.log('\n=== 시도별 유치원 수 ===\n');
  for (const [sido, data] of Object.entries(sidoResults)) {
    console.log(`${sido}: ${data.count}개 (${data.sigunguCount}개 시군구)`);
  }

  console.log(`\n=== 전국 유치원 총 수: ${totalCount}개 ===`);
  console.log(`소요 시간: ${Math.round(totalTime)}초`);
}

main().catch(console.error);

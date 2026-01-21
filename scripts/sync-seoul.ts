/**
 * 서울 전체 데이터 다운로드 테스트
 */

import 'dotenv/config';
import { SIGUNGU_CODES, type SigunguCode } from './data/sigungu-codes';

const API_BASE_URL = 'https://e-childschoolinfo.moe.go.kr/api/notice';

async function fetchBasicInfo(apiKey: string, sigungu: SigunguCode) {
  const url = `${API_BASE_URL}/basicInfo.do?key=${apiKey}&sidoCode=${sigungu.eduSidoCode}&sggCode=${sigungu.sggCode}`;
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

  const seoulSigungu = SIGUNGU_CODES.filter(sgg => sgg.eduSidoCode === '11');
  console.log(`서울 시군구 수: ${seoulSigungu.length}\n`);

  let totalCount = 0;
  const results: { name: string; count: number }[] = [];

  for (const sigungu of seoulSigungu) {
    const data = await fetchBasicInfo(apiKey, sigungu);
    results.push({ name: sigungu.sggName, count: data.length });
    totalCount += data.length;
    console.log(`${sigungu.sggName}: ${data.length}개`);
    await sleep(200);
  }

  console.log(`\n=== 서울 전체 유치원 수: ${totalCount}개 ===`);
}

main().catch(console.error);

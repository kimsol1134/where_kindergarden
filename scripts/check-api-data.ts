/**
 * API 데이터 구조 확인 스크립트
 * 서울(11) 데이터를 샘플로 받아서 구조를 확인합니다.
 */

import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';

const API_BASE_URL = 'https://e-childschoolinfo.moe.go.kr/api/notice';

// 필요한 엔드포인트
const ENDPOINTS = [
  'basicInfo',
  'schoolBus',
  'schoolMeal',
  'classArea',
  'afterSchoolPresent',
];

async function fetchEndpoint(endpoint: string, apiKey: string, sidoCode: string) {
  const url = `${API_BASE_URL}/${endpoint}.do?key=${apiKey}&sidoCode=${sidoCode}`;

  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${endpoint}: ${response.status}`);
  }

  return response.json();
}

async function main() {
  const apiKey = process.env.KINDERGARTEN_API_KEY;

  if (!apiKey) {
    console.error('KINDERGARTEN_API_KEY is not set');
    process.exit(1);
  }

  const sidoCode = '11'; // 서울
  const outputDir = path.join(process.cwd(), 'scripts', 'data-samples');

  // 출력 디렉토리 생성
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log(`Fetching sample data for sidoCode ${sidoCode}...\n`);

  for (const endpoint of ENDPOINTS) {
    console.log(`=== ${endpoint} ===`);

    try {
      const data = await fetchEndpoint(endpoint, apiKey, sidoCode);
      const items = data.kinderInfo || [];

      console.log(`  Total records: ${items.length}`);

      if (items.length > 0) {
        const sample = items[0];
        console.log(`  Fields: ${Object.keys(sample).join(', ')}`);
        console.log(`  Sample record:`);
        console.log(JSON.stringify(sample, null, 2));
      }

      // 파일로 저장
      const outputPath = path.join(outputDir, `${endpoint}.json`);
      fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
      console.log(`  Saved to: ${outputPath}\n`);

    } catch (error) {
      console.error(`  Error: ${error}\n`);
    }

    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  console.log('Done! Check scripts/data-samples/ for full data.');
}

main().catch(console.error);

/**
 * 수집된 후기 데이터를 정리하여 public/data/reviews.json으로 변환
 *
 * 사용법:
 *   pnpm curate:reviews                              # 가장 최근 raw 파일 사용
 *   pnpm curate:reviews -- --input reviews-raw-2025-01-20.json  # 특정 파일 지정
 */

import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// 타입 정의
// ============================================================================

interface RawReviewLink {
  kindergartenId: string;
  kindergartenName: string;
  title: string;
  url: string;
  source: 'naver_blog' | 'naver_cafe' | 'google' | 'other';
  sourceName: string;
  snippet: string;
  date: string | null;
  collectedAt: string;
}

interface ReviewLink {
  id: string;
  kindergartenId: string;
  title: string;
  url: string;
  source: 'naver_blog' | 'naver_cafe' | 'google' | 'other';
  sourceName: string;
  snippet: string;
  date: string | null;
  collectedAt: string;
}

interface ReviewsData {
  version: string;
  totalCount: number;
  kindergartenCount: number;
  reviews: Record<string, ReviewLink[]>;
}

// ============================================================================
// 메인 실행
// ============================================================================

function main() {
  const args = process.argv.slice(2);
  const inputIdx = args.indexOf('--input');

  const outputDir = path.resolve('scripts/data-output');
  let inputPath: string;

  if (inputIdx !== -1 && args[inputIdx + 1]) {
    const inputFile = args[inputIdx + 1];
    inputPath = path.resolve(outputDir, inputFile);
  } else {
    // 가장 최근 reviews-raw 파일 자동 검색
    if (!fs.existsSync(outputDir)) {
      console.error('ERROR: scripts/data-output/ 디렉토리를 찾을 수 없습니다.');
      console.error('먼저 pnpm collect:reviews를 실행하세요.');
      process.exit(1);
    }

    const rawFiles = fs
      .readdirSync(outputDir)
      .filter((f) => f.startsWith('reviews-raw-') && f.endsWith('.json'))
      .sort()
      .reverse();

    if (rawFiles.length === 0) {
      console.error('ERROR: reviews-raw-*.json 파일을 찾을 수 없습니다.');
      console.error('먼저 pnpm collect:reviews를 실행하세요.');
      process.exit(1);
    }

    inputPath = path.resolve(outputDir, rawFiles[0]);
  }
  const RAW_DATA_DIR = path.resolve('scripts/data-output');
  const PUBLIC_DATA_DIR = path.resolve('public/data/reviews');

  console.log('=== 후기 데이터 큐레이션 ===');

  // 파일 로드 로직 변경: 모든 raw 파일 읽기
  const processedData: Record<string, { total: number; reviews: Record<string, ReviewLink[]> }> = {};

  if (!fs.existsSync(RAW_DATA_DIR)) {
    console.error('ERROR: scripts/data-output/ 디렉토리를 찾을 수 없습니다.');
    console.error('먼저 pnpm collect:reviews를 실행하세요.');
    process.exit(1);
  }

  const files = fs.readdirSync(RAW_DATA_DIR).filter(f => f.startsWith('reviews-raw-') && f.endsWith('.json'));
  
  if (files.length === 0) {
    console.log('처리할 원본 데이터 파일이 없습니다.');
    return;
  }

  console.log(`발견된 파일: ${files.length}개`);

  for (const file of files) {
    const rawPath = path.join(RAW_DATA_DIR, file);
    const rawData: RawReviewLink[] = JSON.parse(fs.readFileSync(rawPath, 'utf-8'));
    
    // 파일명에서 시도 코드 추출 (reviews-raw-YYYY-MM-DD-SS.json)
    const match = file.match(/reviews-raw-\d{4}-\d{2}-\d{2}-(\d+)\.json/);
    const sido = match ? match[1] : 'unknown';

    console.log(`처리 중: ${file} (${rawData.length}건, 시도: ${sido})`);

    if (!processedData[sido]) {
      processedData[sido] = { total: 0, reviews: {} };
    }

    // 중복 제거 및 구조 변환
    for (const item of rawData) {
      const kId = item.kindergartenId;
      
      const validated: ReviewLink = {
        id: `rev-${item.url.slice(-4)}-${Math.random().toString(36).substr(2, 4)}`, // ID 생성 규칙 단순화
        kindergartenId: kId,
        title: item.title,
        url: item.url,
        source: item.source,
        sourceName: item.sourceName,
        snippet: item.snippet,
        date: item.date,
        collectedAt: new Date().toISOString(),
      };

      if (!processedData[sido].reviews[kId]) {
        processedData[sido].reviews[kId] = [];
      }
      
      // URL 중복 체크
      const exists = processedData[sido].reviews[kId].some(r => r.url === validated.url);
      if (!exists) {
        processedData[sido].reviews[kId].push(validated);
        processedData[sido].total++;
      }
    }
  }

  // 결과 저장 (시도별)
  if (!fs.existsSync(PUBLIC_DATA_DIR)) {
    fs.mkdirSync(PUBLIC_DATA_DIR, { recursive: true });
  }

  console.log('\n=== 저장 결과 ===');
  for (const [sido, data] of Object.entries(processedData)) {
    const outPath = path.join(PUBLIC_DATA_DIR, `${sido}.json`);
    
    const output: ReviewsData = {
      version: new Date().toISOString().split('T')[0],
      totalCount: data.total,
      kindergartenCount: Object.keys(data.reviews).length,
      reviews: data.reviews
    };

    fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
    console.log(`[${sido}] ${outPath}: ${data.total}건`);
  }
  console.log('');
  console.log('큐레이션 완료!');
}

main();

/**
 * 수집된 후기 데이터를 정리하여 public/data/reviews.json으로 변환
 *
 * 사용법:
 *   pnpm curate:reviews                              # 가장 최근 raw 파일 사용
 *   pnpm curate:reviews -- --input reviews-raw-2025-01-20.json  # 특정 파일 지정
 */

import * as fs from 'fs';
import * as path from 'path';
import { isSpamReview, classifyContentType } from '../src/lib/utils/review-utils';

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
  relevanceScore?: number;
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
  relevanceScore?: number;
}

interface ReviewsData {
  version: string;
  totalCount: number;
  kindergartenCount: number;
  reviews: Record<string, ReviewLink[]>;
}

interface KindergartenInfo {
  kindercode: string;
  sido_code: string;
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

  // 유치원 데이터 로드 및 맵 생성
  const kindergartensPath = path.resolve('public/data/kindergartens.json');
  if (!fs.existsSync(kindergartensPath)) {
    console.error('ERROR: public/data/kindergartens.json 파일을 찾을 수 없습니다.');
    process.exit(1);
  }

  const kindergartens: KindergartenInfo[] = JSON.parse(fs.readFileSync(kindergartensPath, 'utf-8'));
  const kindergartenSidoMap = new Map<string, string>();
  
  kindergartens.forEach(k => {
    if (k.kindercode && k.sido_code) {
      kindergartenSidoMap.set(k.kindercode, k.sido_code);
    }
  });

  console.log(`유치원 데이터 로드 완료: ${kindergartens.length}개`);

  for (const file of files) {
    const rawPath = path.join(RAW_DATA_DIR, file);
    const rawJson = JSON.parse(fs.readFileSync(rawPath, 'utf-8'));
    const rawData: RawReviewLink[] = Array.isArray(rawJson) ? rawJson : rawJson.reviews;

    if (!Array.isArray(rawData)) {
      console.log(`스킵: ${file} (지원하지 않는 형식)`);
      continue;
    }

    // 파일명에서 시도 코드 추출 (참고용)
    const match = file.match(/reviews-raw-(?:v3-)?\d{4}-\d{2}-\d{2}-?(\d+)?\.json/);
    const fileSido = match?.[1] || rawJson.sidoCode || 'unknown';

    console.log(`처리 중: ${file} (${rawData.length}건, 파일시도: ${fileSido})`);

    // 중복 제거 및 구조 변환
    for (const item of rawData) {
      const kId = item.kindergartenId;
      
      // ID 기반으로 정확한 시도 코드 찾기
      const sido = kindergartenSidoMap.get(kId) || 'unknown';

      if (!processedData[sido]) {
        processedData[sido] = { total: 0, reviews: {} };
      }
      
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
        // 품질 게이트: 스팸 + 콘텐츠유형 필터링
        const spamCheck = isSpamReview({ title: validated.title, snippet: validated.snippet });
        if (spamCheck.isSpam) continue;

        const contentType = classifyContentType(validated.title, validated.snippet);
        if (contentType === 'template') continue;

        // relevanceScore 보존
        if (item.relevanceScore !== undefined) {
          validated.relevanceScore = item.relevanceScore;
        }

        processedData[sido].reviews[kId].push(validated);
        processedData[sido].total++;
      }
    }
  }

  // 1. 결과 저장 (시도별)
  if (!fs.existsSync(PUBLIC_DATA_DIR)) {
    fs.mkdirSync(PUBLIC_DATA_DIR, { recursive: true });
  }

  // 2. 통합 데이터 생성 (frontend 호환용)
  const combinedReviews: Record<string, ReviewLink[]> = {};
  let combinedTotal = 0;
  let combinedKindergartenCount = 0;

  for (const [, data] of Object.entries(processedData)) {
    combinedTotal += data.total;
    Object.assign(combinedReviews, data.reviews);
  }
  combinedKindergartenCount = Object.keys(combinedReviews).length;

  const combinedOutput: ReviewsData = {
    version: new Date().toISOString().split('T')[0],
    totalCount: combinedTotal,
    kindergartenCount: combinedKindergartenCount,
    reviews: combinedReviews
  };

  const combinedPath = path.resolve('public/data/reviews.json');
  fs.writeFileSync(combinedPath, JSON.stringify(combinedOutput, null, 2));
  console.log(`\n[통합] ${combinedPath}: ${combinedTotal}건 (유치원 ${combinedKindergartenCount}개)`);

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

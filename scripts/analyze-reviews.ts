/**
 * 수집된 후기 데이터를 분석하여 인사이트 도출
 * 
 * 사용법:
 *   npx tsx scripts/analyze-reviews.ts
 */

import * as fs from 'fs';
import * as path from 'path';

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

function analyze() {
  const reviewsPath = path.resolve('public/data/reviews.json');
  
  if (!fs.existsSync(reviewsPath)) {
    console.error('ERROR: public/data/reviews.json 파일을 찾을 수 없습니다.');
    console.error('먼저 pnpm curate:reviews를 실행하세요.');
    process.exit(1);
  }

  const data: ReviewsData = JSON.parse(fs.readFileSync(reviewsPath, 'utf-8'));
  
  console.log('='.repeat(60));
  console.log('유치원 후기 데이터 분석 보고서');
  console.log('='.repeat(60));
  console.log(`총 후기 수: ${data.totalCount}건`);
  console.log(`유치원 수: ${data.kindergartenCount}개`);
  console.log(`데이터 버전: ${data.version}`);
  console.log('='.repeat(60));

  // 1. 소스별 분포
  console.log('\n1. 소스별 분포');
  console.log('-'.repeat(40));
  const sourceStats: Record<string, number> = {};
  
  let allReviews: ReviewLink[] = [];
  Object.values(data.reviews).forEach(list => {
    allReviews.push(...list);
    list.forEach(r => {
      sourceStats[r.source] = (sourceStats[r.source] || 0) + 1;
    });
  });

  for (const [source, count] of Object.entries(sourceStats).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${source}: ${count}건 (${((count / data.totalCount) * 100).toFixed(1)}%)`);
  }

  // 2. 후기 많은 유치원 Top 10
  console.log('\n2. 후기 많은 유치원 Top 10');
  console.log('-'.repeat(40));
  
  const kinderStats = Object.entries(data.reviews)
    .map(([kId, list]) => ({ id: kId, count: list.length }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // 유치원 이름 매핑을 위해 raw 데이터 로드 (선택적)
  // 여기서는 ID와 개수만 출력
  kinderStats.forEach((k, idx) => {
    console.log(`  ${idx + 1}. ${k.id}: ${k.count}건`);
  });

  // 3. 최근 후기 비율 (2024년 이후)
  console.log('\n3. 최근 후기 비율');
  console.log('-'.repeat(40));
  const recentReviews = allReviews.filter(r => r.date && r.date.startsWith('2024') || r.date && r.date.startsWith('2025'));
  console.log(`  2024년 이후 작성: ${recentReviews.length}건 (${((recentReviews.length / data.totalCount) * 100).toFixed(1)}%)`);

  // 4. 키워드 분석 (제목/스니펫)
  console.log('\n4. 주요 키워드 포함 빈도');
  console.log('-'.repeat(40));
  const keywords = ['추천', '좋아요', '별로', '만족', '비용', '영어', '급식'];
  
  keywords.forEach(keyword => {
    const count = allReviews.filter(r => 
      r.title.includes(keyword) || r.snippet.includes(keyword)
    ).length;
    console.log(`  "${keyword}": ${count}건`);
  });
  
  console.log('\n' + '='.repeat(60));
}

analyze();

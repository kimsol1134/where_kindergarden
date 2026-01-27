/**
 * 원주 지역 후기가 다른 지역 유치원에 잘못 매핑된 것을 수정하는 스크립트
 *
 * 문제: "원주언니" 블로거가 작성한 원주(강원도) 유치원 후기가
 * 전국의 동명 유치원(큰나무, 예그랑, 금빛, 예지 등)에 잘못 매핑됨
 *
 * 해결: title에 "원주"가 포함된 후기 중, 실제 원주 지역이 아닌 유치원에
 * 매핑된 후기를 삭제
 */

import * as fs from 'fs';
import * as path from 'path';

interface ReviewLink {
  id: string;
  kindergartenId: string;
  title: string;
  url: string;
  source: string;
  sourceName?: string;
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

// 삭제할 후기 패턴
const WONJU_PATTERNS = [
  /^원주\s/,  // "원주 "로 시작하는 제목
  /원주\s*(단구동|반곡동|태장동|무실동)/,  // 원주 지역 동이름 포함
  /원주.*유치원.*입학설명회/,  // 원주 유치원 입학설명회
];

// 원주 지역 유치원인지 확인 (강원도 시도코드 42)
// 강원도 유치원은 제외해야 함 (실제로 원주 유치원이면 맞는 매핑)
const GANGWON_SIDO_CODE = '42';

function isWonjuReview(review: ReviewLink): boolean {
  return WONJU_PATTERNS.some(pattern => pattern.test(review.title));
}

async function loadKindergartens(): Promise<Map<string, { sido_code: string; name: string; address: string }>> {
  const filePath = path.join(process.cwd(), 'public/data/kindergartens.json');
  const content = fs.readFileSync(filePath, 'utf-8');
  const data = JSON.parse(content);

  const map = new Map<string, { sido_code: string; name: string; address: string }>();
  for (const kg of data) {
    map.set(kg.kindercode, {
      sido_code: kg.sido_code,
      name: kg.name,
      address: kg.address,
    });
  }
  return map;
}

async function main() {
  const reviewsPath = path.join(process.cwd(), 'public/data/reviews.json');

  console.log('Loading reviews.json...');
  const content = fs.readFileSync(reviewsPath, 'utf-8');
  const data: ReviewsData = JSON.parse(content);

  console.log('Loading kindergartens.json...');
  const kindergartens = await loadKindergartens();

  let totalRemoved = 0;
  let totalKept = 0;
  const removedDetails: Array<{ kindergartenId: string; kindergartenName: string; reviewTitle: string }> = [];

  console.log('\nScanning for mismatched Wonju reviews...\n');

  for (const [kindergartenId, reviews] of Object.entries(data.reviews)) {
    const kg = kindergartens.get(kindergartenId);

    if (!kg) {
      console.warn(`Warning: Kindergarten ${kindergartenId} not found in kindergartens.json`);
      continue;
    }

    // 강원도(42) 유치원은 스킵 - 원주 후기가 맞을 수 있음
    if (kg.sido_code === GANGWON_SIDO_CODE) {
      continue;
    }

    // 원주 후기인데 강원도가 아닌 유치원에 매핑된 경우 삭제
    const filteredReviews = reviews.filter(review => {
      if (isWonjuReview(review)) {
        removedDetails.push({
          kindergartenId,
          kindergartenName: kg.name,
          reviewTitle: review.title,
        });
        totalRemoved++;
        return false;
      }
      totalKept++;
      return true;
    });

    if (filteredReviews.length === 0) {
      delete data.reviews[kindergartenId];
    } else {
      data.reviews[kindergartenId] = filteredReviews;
    }
  }

  // 통계 업데이트
  let newTotalCount = 0;
  let newKindergartenCount = 0;

  for (const reviews of Object.values(data.reviews)) {
    newTotalCount += reviews.length;
    newKindergartenCount++;
  }

  data.totalCount = newTotalCount;
  data.kindergartenCount = newKindergartenCount;
  data.version = new Date().toISOString().split('T')[0];

  // 결과 출력
  console.log('=== Removed Reviews ===\n');
  for (const detail of removedDetails.slice(0, 30)) {
    console.log(`- [${detail.kindergartenName}] "${detail.reviewTitle}"`);
  }
  if (removedDetails.length > 30) {
    console.log(`... and ${removedDetails.length - 30} more`);
  }

  console.log(`\n=== Summary ===`);
  console.log(`Total removed: ${totalRemoved}`);
  console.log(`Total kept: ${totalKept}`);
  console.log(`New total count: ${newTotalCount}`);
  console.log(`New kindergarten count: ${newKindergartenCount}`);

  // 백업 생성
  const backupPath = reviewsPath.replace('.json', `-backup-${Date.now()}.json`);
  fs.writeFileSync(backupPath, content);
  console.log(`\nBackup created: ${backupPath}`);

  // 저장
  fs.writeFileSync(reviewsPath, JSON.stringify(data, null, 2));
  console.log(`Updated: ${reviewsPath}`);
}

main().catch(console.error);

#!/usr/bin/env node
/**
 * 특정 지역 후기 파일 큐레이션 스크립트
 * 제거 대상 ID 목록을 기반으로 IRRELEVANT 후기 제거
 */

const fs = require('fs');
const path = require('path');

// 제거 대상 ID 목록
const REMOVE_IDS = new Set([
  // 제주(50.json)
  "rev-sgmi-6ur4", // 개인 블로그 일상
  "rev-0tey-ghoa", // 한전 뉴스
  "rev-15xu-jnav", // 놀이기구 시공 업체
  "rev-981t-yyg6", // 놀이기구 시공 업체
  "rev-ojge-iwg8", // 교구 납품 업체
  "rev-vmae-3gmi", // 수영장 후기
  "rev-2nt9-lfoz", // 제주 역사 관광
  "rev-skfp-oxis", // 관광 후기
  "rev-620i-glgk", // 맛집 후기
  "rev-77mv-qpga", // 소품샵 후기
  "rev-vlfb-v8d8", // 중국집 후기
  "rev-pdix-flzb", // 타일 복원 업체
  "rev-1uzw-c36j", // 자전거 여행
  "rev-274e-qmut", // 버블쇼 공연 업체
  "rev-2713-zox0", // 비누만들기 강사
  "rev-oi29-fedc", // 가구 납품 업체

  // 세종(36.json)
  "rev-0w5l-e6uy", // 무의도 관광
  "rev-2a88-mru5", // 간호학원 광고
  "rev-qn0l-8j9w", // 영어학원 광고
  "rev-yryv-gzbb", // 카페 후기 (진해)
  "rev-jlgo-dvf0", // 치킨 배달 업체 (시흥)
  "rev-qi2c-vtkl", // 잘못 연결 (양주)
  "rev-9577-2uq0", // 엑소 팬픽
  "rev-dvvm-trqp", // 한솔교육 에듀라운지
  "rev-nf5c-ofoy", // 잘못 연결 (인천 간석동)
  "rev-hjnr-negm", // 중고거래
  "rev-6lzb-vy8r", // 잘못 연결 (부산)
  "rev-wrmy-iu03", // 미술학원 광고
  "rev-8gxy-e51f", // 미술학원 광고
  "rev-xfe7-w9to", // 잘못 연결 (진주)
  "rev-jgte-xgzy", // 잘못 연결 (진주)
  "rev-rdhp-oveb", // 잘못 연결 (진주)
  "rev-7q99-o4r6", // 뉴스/정보 정리
  "rev-h1v7-2wkl", // 과자 후기
  "rev-4wzt-gzl3", // 교육청 보도자료
  "rev-re0a-1fr5", // 잘못 연결 (부산 사하구)
  "rev-n4gm-ryym", // 공연 (내용 불분명)
  "rev-hj0x-te6x", // 부산 여행
]);

function curateFile(filePath) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`파일: ${filePath}`);
  console.log(`${'='.repeat(60)}`);

  // 파일 읽기
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  const originalTotal = data.totalCount;
  const originalKgCount = data.kindergartenCount;

  // 제거 작업
  let removedCount = 0;
  const removedItems = [];
  const kindergartensToRemove = [];

  for (const [kgId, reviews] of Object.entries(data.reviews)) {
    const filteredReviews = [];

    for (const review of reviews) {
      if (REMOVE_IDS.has(review.id)) {
        removedCount++;
        removedItems.push({
          id: review.id,
          title: review.title,
          kindergartenId: kgId
        });
      } else {
        filteredReviews.push(review);
      }
    }

    // 남은 후기가 있으면 업데이트, 없으면 삭제 대상으로 표시
    if (filteredReviews.length > 0) {
      data.reviews[kgId] = filteredReviews;
    } else {
      kindergartensToRemove.push(kgId);
    }
  }

  // 빈 유치원 키 삭제
  for (const kgId of kindergartensToRemove) {
    delete data.reviews[kgId];
  }

  // 카운트 재계산
  const newTotal = Object.values(data.reviews).reduce((sum, reviews) => sum + reviews.length, 0);
  const newKgCount = Object.keys(data.reviews).length;

  // lastCuratedAt 업데이트
  data.lastCuratedAt = new Date().toISOString();
  data.totalCount = newTotal;
  data.kindergartenCount = newKgCount;

  // 결과 출력
  console.log(`\n제거된 후기: ${removedCount}건`);
  for (const item of removedItems) {
    console.log(`  - [${item.id}] ${item.title.substring(0, 50)}...`);
  }

  console.log(`\n제거된 유치원: ${kindergartensToRemove.length}개`);
  console.log(`정제 전: ${originalTotal}건 (${originalKgCount}개 유치원)`);
  console.log(`정제 후: ${newTotal}건 (${newKgCount}개 유치원)`);

  return {
    data,
    removedCount,
    removedItems,
    newTotal,
    newKgCount
  };
}

function main() {
  const basePath = '/Users/solkim/Dev/where_kindergarden-review-cleanup/public/data/reviews';

  const filesToCurate = [
    '50.json',  // 제주
    '36.json',  // 세종
  ];

  let totalRemoved = 0;

  for (const filename of filesToCurate) {
    const filePath = path.join(basePath, filename);

    if (!fs.existsSync(filePath)) {
      console.log(`파일 없음: ${filePath}`);
      continue;
    }

    const result = curateFile(filePath);
    totalRemoved += result.removedCount;

    // 파일 저장
    fs.writeFileSync(filePath, JSON.stringify(result.data, null, 2), 'utf8');
    console.log(`✅ 저장 완료: ${filePath}`);
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`전체 제거: ${totalRemoved}건`);
  console.log(`${'='.repeat(60)}`);
}

main();

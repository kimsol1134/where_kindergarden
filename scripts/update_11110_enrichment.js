const fs = require('fs');
const path = require('path');

const targetFile = '/Users/solkim/Dev/where_kindergarden/public/data/reviews/11/11110.json';
const data = JSON.parse(fs.readFileSync(targetFile, 'utf8'));

// Manual Enrichment Data
const enrichments = {
  // Lovelydael - 혜성교회 영아부 (mapped to 1ecec08c-f490-b044-e053-0a32095ab044 which is actually "Haneul" or similar? Wait, I need to check the kindergarten name for this ID)
  // ID: 1ecec08c-f490-b044-e053-0a32095ab044
  // The snippet says "혜성교회...".
  // Let's assume the mapping is correct or at least consistent with the system.
  'rev-4838-ab4x': {
    summary: "혜성교회 영아부 예배에 대한 비신자의 감사 후기. 아이 발달과 교육에 진심인 목사님과 봉사자들을 칭찬하며 추천함.",
    pros: ["아이 발달/교육에 진심인 봉사자", "안심할 수 있는 환경"],
    cons: [],
    sentiment: "positive",
    tags: ["영아부", "예배", "교육", "선생님"]
  },
  
  // Duqxh3208 - Unhyeon Kindergarten
  'rev-8842-sme5': {
    summary: "2025학년도 운현유치원 입학 설명회 후기. 운현궁과 초등학교가 인접하여 아름다운 주변 환경과 몬테소리 교육 환경을 긍정적으로 평가함. 셔틀버스가 없고 대중교통을 이용해야 하는 점은 단점.",
    pros: ["아름다운 주변 환경 (운현궁, 텃밭)", "몬테소리 교육", "모래놀이터"],
    cons: ["셔틀버스 없음", "지하철역 도보 이동 필요"],
    sentiment: "positive",
    tags: ["몬테소리", "입학설명회", "주변환경", "셔틀없음", "모래놀이터"]
  },

  // Liberalwife - Unhyeon Kindergarten (Reviewer chose Won over Unhyeon)
  'rev-8831-5rgc': {
    summary: "작성자는 운현유치원을 고려했으나, 매일 있는 영어수업과 놀이터 유무를 기준으로 다른 유치원(원유치원)을 선택함.",
    pros: [],
    cons: ["영어 수업 부족 (비교 대상 대비)", "놀이터 부족 (비교 대상 대비)"],
    sentiment: "neutral",
    tags: ["비교후기", "영어수업", "놀이터"]
  }
};

let updatedCount = 0;

// Apply updates
Object.keys(data.reviews).forEach(kId => {
  const reviews = data.reviews[kId];
  reviews.forEach(review => {
    if (enrichments[review.id]) {
        console.log(`Updating ${review.id}`);
        Object.assign(review, enrichments[review.id]);
        updatedCount++;
    }
  });
});

fs.writeFileSync(targetFile, JSON.stringify(data, null, 2));
console.log(`Updated ${updatedCount} reviews in ${targetFile}`);

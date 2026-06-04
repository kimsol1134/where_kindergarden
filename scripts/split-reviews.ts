/**
 * 시도별 후기 파일을 시군구 단위로 분할
 * 
 * 사용법:
 *   pnpm split:reviews -- --sido 11   # 서울 → 구별 분할
 *   pnpm split:reviews -- --sido 41   # 경기 → 시별 분할
 */

import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// 시군구 코드 → 이름 매핑
// ============================================================================

const SIGUNGU_NAMES: Record<string, string> = {
  // 서울 (11)
  '11110': '종로구', '11140': '중구', '11170': '용산구', '11200': '성동구',
  '11215': '광진구', '11230': '동대문구', '11260': '중랑구', '11290': '성북구',
  '11305': '강북구', '11320': '도봉구', '11350': '노원구', '11380': '은평구',
  '11410': '서대문구', '11440': '마포구', '11470': '양천구', '11500': '강서구',
  '11530': '구로구', '11545': '금천구', '11560': '영등포구', '11590': '동작구',
  '11620': '관악구', '11650': '서초구', '11680': '강남구', '11710': '송파구',
  '11740': '강동구',
  
  // 경기 (41)
  '41111': '수원장안', '41113': '수원권선', '41115': '수원팔달', '41117': '수원영통',
  '41131': '성남수정', '41133': '성남중원', '41135': '성남분당',
  '41150': '의정부', '41171': '안양만안', '41173': '안양동안',
  '41210': '부천', '41220': '광명', '41250': '평택',
  '41271': '동두천', '41273': '안산상록', '41281': '안산단원', '41285': '고양덕양',
  '41287': '고양일산동', '41290': '고양일산서', '41310': '과천', '41360': '구리',
  '41370': '남양주', '41390': '오산', '41410': '시흥', '41430': '군포',
  '41450': '의왕', '41461': '하남', '41463': '용인처인', '41465': '용인기흥',
  '41480': '용인수지', '41500': '파주', '41550': '이천', '41570': '안성',
  '41590': '김포', '41610': '화성', '41630': '광주', '41650': '양주',
  '41670': '포천', '41800': '연천', '41820': '가평', '41830': '양평',
};

// ============================================================================
// 타입 정의
// ============================================================================

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
  lastCuratedAt?: string;
  reviews: Record<string, ReviewLink[]>;
}

interface KindergartenEntry {
  id: string;
  kindercode: string;
  sigungu_code: string;
  sido_code: string;
}

// ============================================================================
// 메인 실행
// ============================================================================

function main() {
  const args = process.argv.slice(2);
  const sidoIdx = args.indexOf('--sido');
  
  if (sidoIdx === -1 || !args[sidoIdx + 1]) {
    console.error('ERROR: --sido 인자가 필요합니다.');
    console.error('사용법: pnpm split:reviews -- --sido 11');
    process.exit(1);
  }
  
  const sidoCode = args[sidoIdx + 1];
  const REVIEWS_DIR = path.resolve('public/data/reviews');
  const KINDERGARTENS_PATH = path.resolve('public/data/kindergartens.json');
  
  // 원본 파일 확인
  const sourceFile = path.join(REVIEWS_DIR, `${sidoCode}.json`);
  if (!fs.existsSync(sourceFile)) {
    console.error(`ERROR: ${sourceFile} 파일을 찾을 수 없습니다.`);
    process.exit(1);
  }
  
  // 유치원 데이터 로드 (sigungu_code 매핑용)
  const kindergartens: KindergartenEntry[] = JSON.parse(
    fs.readFileSync(KINDERGARTENS_PATH, 'utf-8')
  );
  
  // kindergartenId (kindercode) → sigungu_code 매핑 생성
  const idToSigungu = new Map<string, string>();
  for (const k of kindergartens) {
    if (k.sido_code === sidoCode) {
      idToSigungu.set(k.kindercode, k.sigungu_code);
    }
  }
  
  console.log(`=== 후기 파일 분할: ${sidoCode} ===`);
  console.log(`유치원 매핑: ${idToSigungu.size}개`);
  
  // 원본 데이터 로드
  const sourceData: ReviewsData = JSON.parse(fs.readFileSync(sourceFile, 'utf-8'));
  console.log(`원본 후기: ${sourceData.totalCount}건`);
  
  // 시군구별로 분할
  const splitData: Record<string, { reviews: Record<string, ReviewLink[]>; total: number }> = {};
  let unmatchedCount = 0;
  
  for (const [kindergartenId, reviews] of Object.entries(sourceData.reviews)) {
    const sigunguCode = idToSigungu.get(kindergartenId);
    
    if (!sigunguCode) {
      unmatchedCount += reviews.length;
      continue;
    }
    
    if (!splitData[sigunguCode]) {
      splitData[sigunguCode] = { reviews: {}, total: 0 };
    }
    
    splitData[sigunguCode].reviews[kindergartenId] = reviews;
    splitData[sigunguCode].total += reviews.length;
  }
  
  if (unmatchedCount > 0) {
    console.warn(`경고: ${unmatchedCount}건의 후기가 유치원 매핑 실패`);
  }
  
  // 출력 디렉토리 생성
  const outputDir = path.join(REVIEWS_DIR, sidoCode);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  for (const fileName of fs.readdirSync(outputDir)) {
    if (/^\d{5}\.json$/.test(fileName)) {
      fs.unlinkSync(path.join(outputDir, fileName));
    }
  }
  
  console.log(`\n=== 분할 결과 ===`);
  
  // 각 시군구별 파일 저장
  for (const [sigunguCode, data] of Object.entries(splitData)) {
    const sigunguName = SIGUNGU_NAMES[sigunguCode] || sigunguCode;
    const outputFile = path.join(outputDir, `${sigunguCode}.json`);
    
    const output: ReviewsData = {
      version: new Date().toISOString().split('T')[0],
      totalCount: data.total,
      kindergartenCount: Object.keys(data.reviews).length,
      reviews: data.reviews,
    };
    
    fs.writeFileSync(outputFile, JSON.stringify(output, null, 2));
    console.log(`  [${sigunguCode}] ${sigunguName}: ${data.total}건 (${Object.keys(data.reviews).length}개 유치원)`);
  }
  
  console.log(`\n총 ${Object.keys(splitData).length}개 파일 생성`);
  console.log(`출력 디렉토리: ${outputDir}`);
}

main();

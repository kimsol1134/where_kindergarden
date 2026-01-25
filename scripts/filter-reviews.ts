/**
 * 후기 데이터 자동 정제 스크립트
 * 스팸/무관 콘텐츠를 자동으로 필터링
 * 
 * 사용법:
 *   pnpm filter:reviews              # 모든 시도 파일 필터링
 *   pnpm filter:reviews -- --sido 11 # 특정 시도만 필터링
 *   pnpm filter:reviews -- --dry-run # 미리보기 (파일 수정 안함)
 */

import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// 스팸 키워드 정의 (title + snippet 검사)
// ============================================================================

const SPAM_TITLE_PATTERNS = [
  // 부동산/임장
  /임장/i,
  /모델하우스/i,
  /분양/i,
  /재건축.*단지/i,
  /뉴타운.*임장/i,
  /아파트.*매매/i,
  /벽산블루밍.*후기/i,
  /아파트.*리뷰/i,

  // 고물상/자원
  /고물상/i,
  /호성자원/i,
  
  // 미용/뷰티
  /네일/i,
  /미용(?!.*유치원)/i,
  /속눈썹/i,
  /피부관리/i,
  
  // 음식/배달
  /마사지/i,
  /꽃집/i,
  /꽃배달/i,
  /베이커리/i,
  /인테리어/i,
  /풍선.*장식/i,
  /풍선날다/i,
  /떡공방/i,
  /떡집.*추천/i,
  /백일떡/i,
  /냉면.*추천/i,
  /국밥.*추천/i,
  /순댓국/i,
  /피자.*할인/i,
  /파파존스/i,
  
  // 의료
  /치과.*후기/i,
  /한의원.*후기(?!.*유치원)/i,
  /정밀초음파/i,
  /입체초음파/i,
  /임신.*주차/i,
  
  // 학원 (유치원 아님)
  /태권도(?!.*유치원)/i,
  /음악학원/i,
  /피아노학원/i,
  /러닝센터/i,
  /해법교실/i,
  /공부방/i,
  /스마트해법/i,
  /영어학원.*후기(?!.*유치원)/i,
  /도현학원/i,
  /정일품학원/i,
  
  // 무관한 장소/활동
  /등산.*코스/i,
  /눈썰매장/i,
  /어린이회관slp/i,
  /강아지유치원/i,
  /가볼만한.*곳/i,
  /아차산.*절/i,
  /영화사.*방문/i,
  /아쿠아리움.*일상/i,
  /생태곤충원/i,
  
  // 무관한 제품/서비스
  /운동화.*추천/i,
  /휠라.*키즈/i,
  /나이키.*키즈/i,
  /음향수리/i,
  
  // 무관한 교육/프로그램
  /창의드론/i,
  /이력서/i,
  /출강/i,
  
  // 해외 유치원 (잘못 연결)
  /나트랑.*유치원/i,
  /베트남.*유치원/i,
  /해외.*유치원(?!.*후기)/i,
  
  // 콘서트/공연
  /팬텀싱어/i,
  /포레스텔라/i,
  /콘서트.*후기(?!.*유치원)/i,
  /인형극단.*업체/i,
  /인형극.*전문.*업체/i,
  /체험단.*발표/i,
  /당첨자.*발표/i,
  /가요무대/i,
  /팬카페/i,
  
  // 종교/이단
  /이단.*단체/i,
  /이단.*계열/i,
  
  // 상품 광고
  /블로퍼.*추천/i,
  /여성.*블로퍼/i,
  /여성.*블로퍼/i,
  /추천가격/i,

  // 영화/영상 (유치원 이름 '영화유치원' 주의)
  /영화.*블로그/i,
  /영화.*관람/i,
  /영화.*추천/i,
  /영화.*손익분기점/i,
  /영화.*출연/i,
  
  // 중고등학교/학원
  /중간고사.*기말고사/i,
  /수학교습소/i,
  
  // 산책/여행
  /산책.*후기(?!.*유치원)/i,
  /백세길.*산책/i,
  
  // 지역 불일치 (다른 시도 유치원 언급 - 일반 패턴)
  // 이 패턴은 문장 시작, 공백 후, 또는 괄호/대괄호 뒤에 타 지역명이 나오는 경우
  /(?:^|\s|[\[\(])대구.*유치원/i,
  /(?:^|\s|[\[\(])부산.*유치원/i,
  /(?:^|\s|[\[\(])대전.*유치원/i,
  /(?:^|\s|[\[\(])광주.*유치원(?!.*경기)/i,  // 경기 광주 제외
  /(?:^|\s|[\[\(])울산.*유치원/i,
  /(?:^|\s|[\[\(])세종.*유치원/i,
  /(?:^|\s|[\[\(])충북.*유치원/i,
  /(?:^|\s|[\[\(])충남.*유치원/i,
  /(?:^|\s|[\[\(])전북.*유치원/i,
  /(?:^|\s|[\[\(])전남.*유치원/i,
  /(?:^|\s|[\[\(])경북.*유치원/i,
  /(?:^|\s|[\[\(])경남.*유치원/i,
  /(?:^|\s|[\[\(])강원.*유치원/i,
  /(?:^|\s|[\[\(])제주.*유치원/i,
  /(?:^|\s|[\[\(])인천.*유치원/i,
];

const SPAM_SNIPPET_PATTERNS = [
  // 부동산
  /매매|전세|월세|평당|평형/i,
  /임장.*보고서/i,
  /투자.*스터디/i,
];

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

interface FilterResult {
  id: string;
  title: string;
  reason: string;
}

// ============================================================================
// 필터링 로직
// ============================================================================

function isSpam(review: ReviewLink): { isSpam: boolean; reason: string } {
  // 타이틀 검사
  for (const pattern of SPAM_TITLE_PATTERNS) {
    if (pattern.test(review.title)) {
      return { isSpam: true, reason: `타이틀 패턴: ${pattern.toString()}` };
    }
  }
  
  // Snippet 검사
  for (const pattern of SPAM_SNIPPET_PATTERNS) {
    if (pattern.test(review.snippet)) {
      return { isSpam: true, reason: `Snippet 패턴: ${pattern.toString()}` };
    }
  }
  
  return { isSpam: false, reason: '' };
}

// ============================================================================
// 메인 실행
// ============================================================================

function main() {
  const args = process.argv.slice(2);
  const sidoIdx = args.indexOf('--sido');
  const sidoCode = sidoIdx !== -1 ? args[sidoIdx + 1] : null;
  const isDryRun = args.includes('--dry-run');
  
  const REVIEWS_DIR = path.resolve('public/data/reviews');
  
  if (!fs.existsSync(REVIEWS_DIR)) {
    console.error('ERROR: public/data/reviews/ 디렉토리를 찾을 수 없습니다.');
    process.exit(1);
  }
  
  // 대상 파일 결정 (하위 디렉토리 포함)
  let files: string[] = [];
  
  if (sidoCode) {
    // 특정 시도의 메인 파일과 하위 디렉토리 파일 모두 처리
    const mainFile = `${sidoCode}.json`;
    const subDir = path.join(REVIEWS_DIR, sidoCode);
    
    if (fs.existsSync(path.join(REVIEWS_DIR, mainFile))) {
      files.push(mainFile);
    }
    
    if (fs.existsSync(subDir) && fs.statSync(subDir).isDirectory()) {
      const subFiles = fs.readdirSync(subDir).filter(f => f.endsWith('.json'));
      files.push(...subFiles.map(f => `${sidoCode}/${f}`));
    }
    
    if (files.length === 0) {
      console.error(`ERROR: ${sidoCode} 관련 파일을 찾을 수 없습니다.`);
      process.exit(1);
    }
  } else {
    // 모든 JSON 파일과 하위 디렉토리 파일 처리
    const items = fs.readdirSync(REVIEWS_DIR);
    for (const item of items) {
      const itemPath = path.join(REVIEWS_DIR, item);
      if (item.endsWith('.json')) {
        files.push(item);
      } else if (fs.statSync(itemPath).isDirectory()) {
        const subFiles = fs.readdirSync(itemPath).filter(f => f.endsWith('.json'));
        files.push(...subFiles.map(f => `${item}/${f}`));
      }
    }
  }
  
  console.log('=== 후기 데이터 자동 필터링 ===');
  console.log(`모드: ${isDryRun ? '미리보기 (dry-run)' : '실제 수정'}`);
  console.log(`대상 파일: ${files.length}개`);
  console.log('');
  
  let totalRemoved = 0;
  
  for (const file of files) {
    const filePath = path.join(REVIEWS_DIR, file);
    const data: ReviewsData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const sido = file.replace('.json', '');
    
    console.log(`\n--- 처리 중: ${file} (${data.totalCount}건) ---`);
    
    const removedItems: FilterResult[] = [];
    const newReviews: Record<string, ReviewLink[]> = {};
    let newTotal = 0;
    
    for (const [kindergartenId, reviews] of Object.entries(data.reviews)) {
      const filtered: ReviewLink[] = [];
      
      for (const review of reviews) {
        const { isSpam: spam, reason } = isSpam(review);
        
        if (spam) {
          removedItems.push({
            id: review.id,
            title: review.title.substring(0, 60),
            reason,
          });
        } else {
          filtered.push(review);
        }
      }
      
      if (filtered.length > 0) {
        newReviews[kindergartenId] = filtered;
        newTotal += filtered.length;
      }
    }
    
    console.log(`  제거 대상: ${removedItems.length}건`);
    
    if (removedItems.length > 0) {
      console.log('  --- 제거 목록 ---');
      for (const item of removedItems.slice(0, 20)) {
        console.log(`    [${item.id}] "${item.title}..."`);
        console.log(`       사유: ${item.reason}`);
      }
      if (removedItems.length > 20) {
        console.log(`    ... 외 ${removedItems.length - 20}건`);
      }
    }
    
    totalRemoved += removedItems.length;
    
    if (!isDryRun && removedItems.length > 0) {
      const newData: ReviewsData = {
        version: new Date().toISOString().split('T')[0],
        totalCount: newTotal,
        kindergartenCount: Object.keys(newReviews).length,
        lastCuratedAt: new Date().toISOString(),
        reviews: newReviews,
      };
      
      fs.writeFileSync(filePath, JSON.stringify(newData, null, 2));
      console.log(`  저장 완료: ${data.totalCount}건 → ${newTotal}건`);
    }
  }
  
  console.log('\n=== 결과 요약 ===');
  console.log(`총 제거: ${totalRemoved}건`);
  if (isDryRun) {
    console.log('(dry-run 모드: 실제 파일은 수정되지 않음)');
  }
}

main();

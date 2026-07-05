#!/usr/bin/env node
/**
 * auto-classify-reviews.mjs — verify-run의 bodyExcerpt/snippet을 16개 수작업 라벨 지역에서
 * 검증한 패턴으로 keep/remove/review 분류한다. review=애매(에이전트 직접 판독 필요).
 *
 *   node scripts/auto-classify-reviews.mjs --sido 11            # 분류 결과 출력
 *   node scripts/auto-classify-reviews.mjs --validate           # 16개 라벨 지역 정확도 측정
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const RUN_DIR = path.join(ROOT, 'scripts/data-output/verify-runs');
const DEC_DIR = path.join(ROOT, 'scripts/data-output/agent-review-decisions');

// 제거 신호 (업체/랜드마크/상품/무관 주제)
const REMOVE_PAT = [
  // 음식/식당
  '맛집', '식당', '고깃집', '횟집', '술집', '칼국수', '샤브', '쌈밥', '갈비탕', '버거', '브런치', '카페 ', '빵집', '베이커리', '디저트', '떡케이크', '찰떡', '호두과자', '쌀디저트', '두유배달',
  // 부동산/아파트
  '아파트', '분양', '모델하우스', '청약', '매물', '경매', '부동산', '오피스텔', '재건축', '입주', '시스템에어컨', '현장방문', '점등식', '조명 공동구매',
  // 뷰티/건강
  '왁싱', '네일', '속눈썹', '에스테틱', '두피문신', '미용실', '필라테스', '헬스', '요가', 'PT ', '척추', '재활운동', '바디관리', '체형관리', '타로', '사주', '작명', '신점', '심리상담', '인지치료', '바레',
  // 체육/공연 업체
  '합기도', '태권도', '주짓수', '복싱', '포토부스', '매직쇼', '버블쇼', '인형극', '레크리에이션', '샌드아트', '풍선공연', '우쿨렐레', '소담북', '마술',
  // 출강/강사/연수업체
  '출강', '원데이클래스', '교사교육', '교사연수', '학부모연수 강의', '자산관리특강', '연수강의', '라탄', '캔들', '가죽공방', '천연화장품', '천연주방세제', '비누공예', '쿠킹클래스', '도시락', '케이터링', '플리마켓',
  // 시공/상품/제휴
  '보일러', '도어락', '신발장', '커피머신', '냉난방기', '방향제', '스파트필름', 'VR댄스', '캠핑의자', '유아젓가락', '유아 수경', '대나무칫솔', '기능성티셔츠', '니트 추천', '내복', '시공', '설치 후기', '설치사례', '공동구매',
  // 여행/장소
  '여행사', '펜션', '글램핑', '캠핑장', '워터파크', '수영장', '키즈풀', '놀이터 이용', '어린이공원', '감귤체험', '딸기축제', '벚꽃', '템플스테이', '박물관', '성당', '등산', '자전거', '걷기대회', '소품샵', '과일선물',
  // 학원/교습 (유치원 아님)
  '한글학원', '영어학원', '수학학원', '미술학원', '미술교습소', '독서논술', '파닉스', '링키영어', '윤선생', '아소비', '이지매쓰', '큐미르', '코딩클럽', '리틀빗',
  // 기타 무관
  '보도자료', '이웃돕기', '후원금', '성금', '기탁', '의정활동', '학술대회', '대학원', '방송통신대', '에세이', '뉴스레터', '연예', '아시아 투어', '강아지', '반려동물', '펫', '요양',
];
// 카페 문의/거래/모집 (후기 아님)
const CAFE_NONREVIEW = ['추천해주세요', '추천 부탁', '추천부탁', '정보 부탁', '정보부탁', '알려주세요', '궁금', '문의', '어때요', '어떤가요', '괜찮을까요', '고민', '드림', '나눔', '판매', '교환', '구해요', '친구 해요', '친구해요', '오픈채팅', '도와주세요', '여쭤'];
// 유지 신호 (학부모/재원/활동)
const KEEP_PAT = ['입학설명회 후기', '설명회 후기', '재원 후기', '재원후기', '졸업 후기', '졸업후기', '다녀온 후기', '보내본 후기', '솔직 후기', '솔직후기', '재원생', '학부모 후기', '오리엔테이션', '입학상담 후기'];
// 스터디홀릭 구조화 후기
const STUDYHOLIC = ['스터디홀릭', 'studyholic', '환경 및 시설', '종합평가', '별점 :'];

function has(text, arr) { for (const w of arr) if (text.includes(w)) return w; return null; }

function classify(r) {
  const title = r.title || '';
  const body = (r.bodyExcerpt || r.snippet || '');
  const T = title + ' ' + (r.snippet || '');
  if (r.source === 'naver_place') return { d: 'keep', why: 'place visitor review' };
  const expMarker = /강추|졸업|\d ?년( 째| 동안)?|재원|다니고 있|보내고 있|보냈|우리 ?아이/.test(T);
  const cafeActivity = /후기|체험|바자회|수상|발표회|참여수업|참여 수업|운동회|졸업식|재롱|축제|일정입니다|행사/.test(title);
  if (r.source === 'naver_cafe') {
    if (has(T, STUDYHOLIC)) return { d: 'keep', why: 'studyholic structured review' };
    if (has(title, KEEP_PAT) || expMarker || cafeActivity) return { d: 'review', why: 'cafe possible 후기/경험/활동' };
    // 그 외 카페글은 맘카페 추천/문의/거래 토론글로 기본 제거 (인천서 76/89 제거 검증)
    return { d: 'remove', why: has(T, CAFE_NONREVIEW) ? 'cafe inquiry/trade' : 'cafe discussion(non-review)' };
  }
  // blog — remove 판정은 제목 기준(랜드마크/업체 신호는 제목에 있음), 본문 키워드는 오탐 유발
  if (has(T, STUDYHOLIC)) return { d: 'keep', why: 'studyholic' };
  const rmTitle = has(title, REMOVE_PAT);
  const kp = has(title, KEEP_PAT);
  if (rmTitle && !kp) return { d: 'remove', why: 'title remove-pattern: ' + rmTitle };
  if (kp && !rmTitle) return { d: 'review', why: 'review-intent title (확인필요 FN방지)' };
  return { d: 'review', why: 'ambiguous' };
}

function goldFor(sido) {
  const p = path.join(DEC_DIR, `${sido}.json`);
  if (!fs.existsSync(p)) return null;
  const m = JSON.parse(fs.readFileSync(p, 'utf8'));
  const removeSet = new Set();
  for (const [id, v] of Object.entries(m)) if (v.decision === 'remove') removeSet.add(id);
  return removeSet; // 나머지는 keep
}

const args = process.argv.slice(2);
if (args.includes('--validate')) {
  const done = ['36', '50', '31', '48', '29', '30', '46', '26', '43', '44', '27', '47', '28'];
  let TP = 0, FP = 0, FN = 0, TN = 0, REV = 0, total = 0;
  const confusion = [];
  for (const sido of done) {
    const runP = path.join(RUN_DIR, `${sido}.json`);
    const gold = goldFor(sido);
    if (!fs.existsSync(runP) || !gold) continue;
    const run = JSON.parse(fs.readFileSync(runP, 'utf8'));
    for (const r of run.reviews) {
      total++;
      const c = classify(r);
      const goldRemove = gold.has(r.reviewId);
      if (c.d === 'review') { REV++; if (goldRemove) FN += 0; continue; } // review = 보류(에이전트가 봄)
      const predRemove = c.d === 'remove';
      if (predRemove && goldRemove) TP++;
      else if (predRemove && !goldRemove) { FP++; confusion.push(`FP ${sido} ${r.reviewId} [${r.source}] ${(r.title||'').slice(0,40)} | ${c.why}`); }
      else if (!predRemove && goldRemove) { FN++; confusion.push(`FN ${sido} ${r.reviewId} [${r.source}] ${(r.title||'').slice(0,40)} | gold=remove pred=keep`); }
      else TN++;
    }
  }
  console.log(`total=${total} | auto-decided=${total - REV} review(보류)=${REV}`);
  console.log(`REMOVE precision=${(TP/(TP+FP)*100).toFixed(1)}% (TP=${TP} FP=${FP})`);
  console.log(`KEEP among auto: TN=${TN} FN(놓친 remove)=${FN}`);
  console.log(`\n--- 오분류 샘플 (최대 40) ---`);
  confusion.slice(0, 40).forEach((l) => console.log(l));
  process.exit(0);
}

const sido = args[args.indexOf('--sido') + 1];
const run = JSON.parse(fs.readFileSync(path.join(RUN_DIR, `${sido}.json`), 'utf8'));
const buckets = { keep: [], remove: [], review: [] };
for (const r of run.reviews) { const c = classify(r); buckets[c.d].push({ r, c }); }
console.log(`sido ${sido}: keep=${buckets.keep.length} remove=${buckets.remove.length} review=${buckets.review.length}`);

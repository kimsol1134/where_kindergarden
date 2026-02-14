/**
 * 리뷰 URL 검증 및 정제 스크립트
 *
 * 오프라인 검증: 중복 URL, 비유치원 도메인, 스팸 패턴, undefined ID 등
 * 온라인 검증: HTTP 상태 체크 (삭제/비공개 감지)
 *
 * 사용법:
 *   pnpm validate:reviews                          # 오프라인 분석 (전체)
 *   pnpm validate:reviews -- --sido 11             # 서울만
 *   pnpm validate:reviews -- --sido 41             # 경기만
 *   pnpm validate:reviews -- --fix                 # 자동 제거 실행
 *   pnpm validate:reviews -- --dry-run             # 미리보기
 *   pnpm validate:reviews -- --online              # HTTP 체크 포함
 *   pnpm validate:reviews -- --online --limit 100  # HTTP 100건만
 *   pnpm validate:reviews -- --report              # JSON 리포트 저장
 */

import * as fs from 'fs';
import * as path from 'path';

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
  relevanceScore?: number;
  [key: string]: unknown;
}

interface ReviewsData {
  version: string;
  totalCount: number;
  kindergartenCount: number;
  lastCuratedAt?: string;
  reviews: Record<string, ReviewLink[]>;
}

interface ValidationIssue {
  type: 'cross-duplicate' | 'intra-duplicate' | 'bad-domain' | 'undefined-id' | 'spam-pattern' | 'dead-url' | 'borderline';
  reviewId: string;
  kindergartenId: string;
  url: string;
  title: string;
  reason: string;
  file: string;
}

interface ValidationReport {
  timestamp: string;
  sido: string | null;
  files: string[];
  totalReviews: number;
  issues: ValidationIssue[];
  urlsNormalized: number;
  summary: Record<string, number>;
}

// ============================================================================
// URL 정규화
// ============================================================================

function normalizeUrl(url: string): string {
  return url
    .replace(/^https?:\/\//, '')
    .replace(/\/$/, '')
    .toLowerCase();
}

function upgradeToHttps(url: string): string {
  if (url.startsWith('http://cafe.naver.com')) {
    return url.replace('http://', 'https://');
  }
  if (url.startsWith('http://blog.naver.com')) {
    return url.replace('http://', 'https://');
  }
  return url;
}

// ============================================================================
// 비유치원 도메인 / 데이터 페이지 검출
// ============================================================================

const BLOCKED_DOMAINS = [
  'wildbike.co.kr',
  'news.naver.com',
  'news.v.daum.net',
];

const NON_REVIEW_URL_PATTERNS = [
  /tistory\.com/i, // Tistory blogs - mostly data aggregation, not parent reviews
];

const DATA_PAGE_TITLE_PATTERNS = [
  /\[DATA\]/i,
  /\[데이터\]/i,
  /유치원\s*현황\s*(정보|데이터|통계)/i,
  /어린이집\s*현황\s*(정보|데이터|통계)/i,
  /전국\s*유치원\s*(목록|리스트|현황)/i,
  /시도별\s*유치원/i,
];

function isBadDomain(url: string): string | null {
  const urlLower = url.toLowerCase();

  for (const domain of BLOCKED_DOMAINS) {
    if (urlLower.includes(domain)) {
      return `차단 도메인: ${domain}`;
    }
  }

  for (const pattern of NON_REVIEW_URL_PATTERNS) {
    if (pattern.test(url)) {
      return `비리뷰 도메인: ${pattern.source}`;
    }
  }

  return null;
}

function isDataPage(title: string): string | null {
  for (const pattern of DATA_PAGE_TITLE_PATTERNS) {
    if (pattern.test(title)) {
      return `데이터 집계 페이지: ${pattern.source}`;
    }
  }
  return null;
}

// ============================================================================
// 추가 스팸 패턴 (filter-reviews.ts에 없는 것들)
// ============================================================================

const ADDITIONAL_SPAM_PATTERNS = [
  // 일반 질문글 (후기가 아닌 질문)
  /유치원.*추천.*해주세요/i,
  /유치원.*알려주세요/i,
  /어디가\s*좋을까요/i,
  // 목록형 글 (여러 유치원 나열)
  /유치원.*정보.*공유/i,
  // 기타
  /강아지.*훈련/i,
  /반려동물.*유치원/i,
  /펫시터/i,
];

function isAdditionalSpam(review: ReviewLink): string | null {
  for (const pattern of ADDITIONAL_SPAM_PATTERNS) {
    if (pattern.test(review.title)) {
      return `추가 스팸 패턴: ${pattern.source}`;
    }
  }
  return null;
}

// ============================================================================
// 유치원명 매칭 점수 (cross-duplicate 해소용)
// ============================================================================

function scoreKindergartenMatch(review: ReviewLink, kindergartenName: string): number {
  if (!kindergartenName) return 0;

  const text = `${review.title} ${review.snippet}`.toLowerCase();
  let score = 0;

  // 전체 이름 매칭
  if (text.includes(kindergartenName.toLowerCase())) {
    score += 10;
  }

  // 접미사 제거 후 매칭
  const nameCore = kindergartenName
    .replace(/유치원$/, '')
    .replace(/어린이집$/, '')
    .replace(/병설$/, '')
    .trim();

  if (nameCore.length >= 2 && text.includes(nameCore.toLowerCase())) {
    score += 5;
  }

  // 날짜가 있으면 약간 가산 (더 신뢰할 수 있는 리뷰)
  if (review.date) {
    score += 1;
  }

  return score;
}

// ============================================================================
// 온라인 HTTP 체크
// ============================================================================

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

interface HttpCheckResult {
  status: 'alive' | 'dead' | 'borderline' | 'error';
  reason?: string;
}

async function checkUrlOnline(url: string): Promise<HttpCheckResult> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
    });

    clearTimeout(timeout);

    if (res.status === 404) return { status: 'dead', reason: '404 Not Found' };
    if (res.status >= 500) return { status: 'dead', reason: `HTTP ${res.status}` };

    const text = await res.text();

    // Naver 블로그 삭제/비공개
    if (url.includes('blog.naver.com')) {
      if (text.includes('삭제되었거나 존재하지 않는 게시글')) {
        return { status: 'dead', reason: '삭제된 게시글' };
      }
      if (text.includes('비공개로 전환') || text.includes('비공개 블로그')) {
        return { status: 'dead', reason: '비공개 전환' };
      }
    }

    // Naver 카페 삭제/비공개/미존재
    if (url.includes('cafe.naver.com')) {
      if (text.includes('삭제된 게시글') || text.includes('존재하지 않는 게시글')) {
        return { status: 'dead', reason: '삭제된 게시글' };
      }
      if (text.includes('존재하지 않는 카페')) {
        return { status: 'dead', reason: '존재하지 않는 카페' };
      }
      if (text.includes('멤버에게만 공개')) {
        return { status: 'borderline', reason: '카페 멤버 전용' };
      }
    }

    return { status: 'alive' };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes('abort')) {
      return { status: 'error', reason: '타임아웃 (10초)' };
    }
    return { status: 'error', reason: message };
  }
}

// ============================================================================
// 파일별 오프라인 검증
// ============================================================================

function validateFile(
  file: string,
  data: ReviewsData,
  kindergartenNameMap: Map<string, string>,
): { issues: ValidationIssue[]; urlsNormalized: number } {
  const issues: ValidationIssue[] = [];
  let urlsNormalized = 0;

  // 1. URL 인덱스 구축 (cross-duplicate 감지용)
  const urlIndex = new Map<string, Array<{ kindergartenId: string; review: ReviewLink }>>();

  for (const [kindergartenId, reviews] of Object.entries(data.reviews)) {
    for (const review of reviews) {
      const normalized = normalizeUrl(review.url);
      if (!urlIndex.has(normalized)) {
        urlIndex.set(normalized, []);
      }
      urlIndex.get(normalized)!.push({ kindergartenId, review });
    }
  }

  // 2. Cross-kindergarten 중복 감지
  const crossDuplicateRemovals = new Set<string>(); // "kindergartenId::reviewId"

  for (const [normalizedUrl, entries] of urlIndex) {
    // 다른 유치원에 매핑된 경우만
    const uniqueKindergartens = new Set(entries.map(e => e.kindergartenId));
    if (uniqueKindergartens.size <= 1) continue;

    // 각 엔트리에 점수 부여
    const scored = entries.map(entry => {
      const name = kindergartenNameMap.get(entry.kindergartenId) || '';
      return {
        ...entry,
        kindergartenName: name,
        score: scoreKindergartenMatch(entry.review, name),
      };
    });

    // 점수 내림차순 정렬
    scored.sort((a, b) => b.score - a.score);

    // 최고 점수 엔트리만 유지, 나머지 제거
    const bestName = scored[0].kindergartenName || scored[0].kindergartenId.substring(0, 8);
    for (let i = 1; i < scored.length; i++) {
      const key = `${scored[i].kindergartenId}::${scored[i].review.id}`;
      crossDuplicateRemovals.add(key);
      issues.push({
        type: 'cross-duplicate',
        reviewId: scored[i].review.id,
        kindergartenId: scored[i].kindergartenId,
        url: scored[i].review.url,
        title: scored[i].review.title.substring(0, 60),
        reason: `${uniqueKindergartens.size}개 유치원 공유 → ${bestName}에 유지`,
        file,
      });
    }
  }

  // 3. Intra-kindergarten 중복 + 기타 체크
  for (const [kindergartenId, reviews] of Object.entries(data.reviews)) {
    const seenUrls = new Set<string>();

    for (const review of reviews) {
      const key = `${kindergartenId}::${review.id}`;

      // 이미 cross-duplicate로 마킹된 건 스킵
      if (crossDuplicateRemovals.has(key)) continue;

      // Intra-duplicate 체크
      const normalized = normalizeUrl(review.url);
      if (seenUrls.has(normalized)) {
        issues.push({
          type: 'intra-duplicate',
          reviewId: review.id,
          kindergartenId,
          url: review.url,
          title: review.title.substring(0, 60),
          reason: '동일 유치원 내 URL 중복',
          file,
        });
        continue;
      }
      seenUrls.add(normalized);

      // undefined kindergartenId 체크
      if (kindergartenId === 'undefined') {
        issues.push({
          type: 'undefined-id',
          reviewId: review.id,
          kindergartenId,
          url: review.url,
          title: review.title.substring(0, 60),
          reason: 'kindergartenId가 "undefined"',
          file,
        });
        continue;
      }

      // 비유치원 도메인 체크
      const domainIssue = isBadDomain(review.url);
      if (domainIssue) {
        issues.push({
          type: 'bad-domain',
          reviewId: review.id,
          kindergartenId,
          url: review.url,
          title: review.title.substring(0, 60),
          reason: domainIssue,
          file,
        });
        continue;
      }

      // 데이터 집계 페이지 체크
      const dataPageIssue = isDataPage(review.title);
      if (dataPageIssue) {
        issues.push({
          type: 'bad-domain',
          reviewId: review.id,
          kindergartenId,
          url: review.url,
          title: review.title.substring(0, 60),
          reason: dataPageIssue,
          file,
        });
        continue;
      }

      // 추가 스팸 패턴 체크
      const spamIssue = isAdditionalSpam(review);
      if (spamIssue) {
        issues.push({
          type: 'spam-pattern',
          reviewId: review.id,
          kindergartenId,
          url: review.url,
          title: review.title.substring(0, 60),
          reason: spamIssue,
          file,
        });
        continue;
      }

      // URL 정규화 카운트 (http → https)
      if (review.url !== upgradeToHttps(review.url)) {
        urlsNormalized++;
      }
    }
  }

  return { issues, urlsNormalized };
}

// ============================================================================
// Fix 적용
// ============================================================================

function applyFixes(
  data: ReviewsData,
  issues: ValidationIssue[],
): ReviewsData {
  // 제거 대상 Set 구축
  const removals = new Set<string>();
  for (const issue of issues) {
    if (issue.type === 'borderline') continue; // borderline은 제거 안함
    removals.add(`${issue.kindergartenId}::${issue.reviewId}`);
  }

  const newReviews: Record<string, ReviewLink[]> = {};
  let newTotal = 0;

  for (const [kindergartenId, reviews] of Object.entries(data.reviews)) {
    const filtered: ReviewLink[] = [];

    for (const review of reviews) {
      const key = `${kindergartenId}::${review.id}`;
      if (removals.has(key)) continue;

      // URL 정규화 적용
      review.url = upgradeToHttps(review.url);
      filtered.push(review);
    }

    if (filtered.length > 0) {
      newReviews[kindergartenId] = filtered;
      newTotal += filtered.length;
    }
  }

  return {
    version: new Date().toISOString().split('T')[0],
    totalCount: newTotal,
    kindergartenCount: Object.keys(newReviews).length,
    lastCuratedAt: new Date().toISOString(),
    reviews: newReviews,
  };
}

// ============================================================================
// 메인 실행
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  const sidoIdx = args.indexOf('--sido');
  const sidoCode = sidoIdx !== -1 ? args[sidoIdx + 1] : null;
  const isFix = args.includes('--fix');
  const isDryRun = args.includes('--dry-run');
  const isOnline = args.includes('--online');
  const limitIdx = args.indexOf('--limit');
  const onlineLimit = limitIdx !== -1 ? parseInt(args[limitIdx + 1], 10) : Infinity;
  const isReport = args.includes('--report');

  const REVIEWS_DIR = path.resolve('public/data/reviews');
  const KINDERGARTENS_PATH = path.resolve('public/data/kindergartens.json');
  const OUTPUT_DIR = path.resolve('scripts/data-output');

  if (!fs.existsSync(REVIEWS_DIR)) {
    console.error('ERROR: public/data/reviews/ 디렉토리를 찾을 수 없습니다.');
    process.exit(1);
  }

  // 유치원 이름 맵 로드
  const kindergartenNameMap = new Map<string, string>();
  if (fs.existsSync(KINDERGARTENS_PATH)) {
    const kindergartens = JSON.parse(fs.readFileSync(KINDERGARTENS_PATH, 'utf-8')) as Array<{
      kindercode: string;
      name: string;
    }>;
    for (const k of kindergartens) {
      kindergartenNameMap.set(k.kindercode, k.name);
    }
    console.log(`유치원 이름 맵 로드: ${kindergartenNameMap.size}개`);
  } else {
    console.warn('WARNING: kindergartens.json 없음 — 유치원명 매칭 불가');
  }

  // 대상 파일 결정 (sido-level JSON만)
  const SKIP_FILES = ['reviews.json', 'reviews.backup.json'];
  let files: string[];

  if (sidoCode) {
    const mainFile = `${sidoCode}.json`;
    if (sidoCode === 'unknown') {
      files = ['unknown.json'];
    } else if (fs.existsSync(path.join(REVIEWS_DIR, mainFile))) {
      files = [mainFile];
    } else {
      console.error(`ERROR: ${mainFile} 파일을 찾을 수 없습니다.`);
      process.exit(1);
    }
  } else {
    files = fs.readdirSync(REVIEWS_DIR)
      .filter(f => f.endsWith('.json') && !SKIP_FILES.includes(f))
      .filter(f => {
        const filePath = path.join(REVIEWS_DIR, f);
        return fs.statSync(filePath).isFile();
      })
      .toSorted();
  }

  console.log('');
  console.log('=== 리뷰 URL 검증 ===');
  console.log(`모드: ${isFix ? '자동 수정' : isDryRun ? '미리보기 (dry-run)' : '분석만'}`);
  console.log(`대상 파일: ${files.length}개 (${files.join(', ')})`);
  if (isOnline) {
    console.log(`온라인 체크: 활성 (제한: ${onlineLimit === Infinity ? '없음' : onlineLimit}건)`);
  }
  console.log('');

  // 전체 결과 수집
  const allIssues: ValidationIssue[] = [];
  let totalReviews = 0;
  let totalUrlsNormalized = 0;

  for (const file of files) {
    const filePath = path.join(REVIEWS_DIR, file);
    const data: ReviewsData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    totalReviews += data.totalCount;

    console.log(`--- ${file} (${data.totalCount}건, ${data.kindergartenCount}개 유치원) ---`);

    const { issues, urlsNormalized } = validateFile(file, data, kindergartenNameMap);
    allIssues.push(...issues);
    totalUrlsNormalized += urlsNormalized;

    // 파일별 요약
    const typeCounts: Record<string, number> = {};
    for (const issue of issues) {
      typeCounts[issue.type] = (typeCounts[issue.type] || 0) + 1;
    }

    if (issues.length === 0) {
      console.log('  문제 없음');
    } else {
      for (const [type, count] of Object.entries(typeCounts)) {
        console.log(`  ${type}: ${count}건`);
      }
    }

    if (urlsNormalized > 0) {
      console.log(`  URL 정규화 대상: ${urlsNormalized}건 (http→https)`);
    }

    // Fix 적용
    if (isFix && !isDryRun && issues.length > 0) {
      const fileIssues = issues.filter(i => i.type !== 'borderline');
      const fixedData = applyFixes(data, fileIssues);
      fs.writeFileSync(filePath, JSON.stringify(fixedData, null, 2));
      console.log(`  수정 완료: ${data.totalCount}건 → ${fixedData.totalCount}건 (${data.totalCount - fixedData.totalCount}건 제거)`);
    }

    console.log('');
  }

  // 글로벌 cross-file 중복 검사 (--sido 미지정 시)
  if (!sidoCode && files.length > 1) {
    console.log('=== 글로벌 cross-file 중복 검사 ===');

    // 모든 파일의 현재 데이터를 다시 로드 (fix 적용 후 상태)
    const globalUrlIndex = new Map<string, Array<{
      file: string;
      kindergartenId: string;
      review: ReviewLink;
      kindergartenName: string;
    }>>();

    for (const file of files) {
      const filePath = path.join(REVIEWS_DIR, file);
      const data: ReviewsData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      for (const [kindergartenId, reviews] of Object.entries(data.reviews)) {
        const name = kindergartenNameMap.get(kindergartenId) || '';
        for (const review of reviews) {
          const normalized = normalizeUrl(review.url);
          if (!globalUrlIndex.has(normalized)) {
            globalUrlIndex.set(normalized, []);
          }
          globalUrlIndex.get(normalized)!.push({ file, kindergartenId, review, kindergartenName: name });
        }
      }
    }

    let crossFileCount = 0;
    const crossFileIssues: ValidationIssue[] = [];

    for (const [, entries] of globalUrlIndex) {
      const uniqueKindergartens = new Set(entries.map(e => e.kindergartenId));
      if (uniqueKindergartens.size <= 1) continue;

      const scored = entries.map(entry => ({
        ...entry,
        score: scoreKindergartenMatch(entry.review, entry.kindergartenName),
      }));
      scored.sort((a, b) => b.score - a.score);

      const bestName = scored[0].kindergartenName || scored[0].kindergartenId.substring(0, 8);
      for (let i = 1; i < scored.length; i++) {
        crossFileCount++;
        const issue: ValidationIssue = {
          type: 'cross-duplicate',
          reviewId: scored[i].review.id,
          kindergartenId: scored[i].kindergartenId,
          url: scored[i].review.url,
          title: scored[i].review.title.substring(0, 60),
          reason: `cross-file: ${scored[i].file} → ${bestName}(${scored[0].file})에 유지`,
          file: scored[i].file,
        };
        crossFileIssues.push(issue);
        allIssues.push(issue);
      }
    }

    console.log(`  cross-file 중복: ${crossFileCount}건`);

    if (isFix && !isDryRun && crossFileIssues.length > 0) {
      // 파일별로 그룹화하여 적용
      const issuesByFile = new Map<string, ValidationIssue[]>();
      for (const issue of crossFileIssues) {
        if (!issuesByFile.has(issue.file)) {
          issuesByFile.set(issue.file, []);
        }
        issuesByFile.get(issue.file)!.push(issue);
      }

      for (const [file, fileIssues] of issuesByFile) {
        const filePath = path.join(REVIEWS_DIR, file);
        const data: ReviewsData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        const fixedData = applyFixes(data, fileIssues);
        fs.writeFileSync(filePath, JSON.stringify(fixedData, null, 2));
        console.log(`  ${file}: ${data.totalCount}건 → ${fixedData.totalCount}건 (${fileIssues.length}건 제거)`);
      }
    }
    console.log('');
  }

  // 온라인 HTTP 체크
  if (isOnline) {
    console.log('=== 온라인 URL 체크 ===');

    // 이슈가 아닌 URL들만 체크 (이미 제거 예정인 건 제외)
    const issueUrls = new Set(allIssues.map(i => normalizeUrl(i.url)));
    const urlsToCheck: Array<{ url: string; reviewId: string; kindergartenId: string; file: string; title: string }> = [];

    for (const file of files) {
      const filePath = path.join(REVIEWS_DIR, file);
      const data: ReviewsData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

      for (const [kindergartenId, reviews] of Object.entries(data.reviews)) {
        for (const review of reviews) {
          if (issueUrls.has(normalizeUrl(review.url))) continue;
          urlsToCheck.push({
            url: upgradeToHttps(review.url),
            reviewId: review.id,
            kindergartenId,
            file,
            title: review.title.substring(0, 60),
          });
        }
      }
    }

    // 중복 URL 제거 (같은 URL은 한 번만 체크)
    const uniqueUrls = new Map<string, typeof urlsToCheck[0]>();
    for (const entry of urlsToCheck) {
      const normalized = normalizeUrl(entry.url);
      if (!uniqueUrls.has(normalized)) {
        uniqueUrls.set(normalized, entry);
      }
    }

    const checkTargets = [...uniqueUrls.values()].slice(0, onlineLimit);
    console.log(`체크 대상: ${checkTargets.length}건 (전체 고유 URL: ${uniqueUrls.size}건)`);

    let checked = 0;
    let deadCount = 0;
    let borderlineCount = 0;
    let errorCount = 0;

    for (const target of checkTargets) {
      const result = await checkUrlOnline(target.url);
      checked++;

      if (result.status === 'dead') {
        deadCount++;
        // 이 URL을 가진 모든 리뷰를 이슈로 추가
        for (const file of files) {
          const filePath = path.join(REVIEWS_DIR, file);
          const data: ReviewsData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
          for (const [kid, reviews] of Object.entries(data.reviews)) {
            for (const review of reviews) {
              if (normalizeUrl(review.url) === normalizeUrl(target.url)) {
                allIssues.push({
                  type: 'dead-url',
                  reviewId: review.id,
                  kindergartenId: kid,
                  url: review.url,
                  title: review.title.substring(0, 60),
                  reason: `HTTP: ${result.reason}`,
                  file,
                });
              }
            }
          }
        }
        console.log(`  [DEAD] ${target.url} — ${result.reason}`);
      } else if (result.status === 'borderline') {
        borderlineCount++;
        allIssues.push({
          type: 'borderline',
          reviewId: target.reviewId,
          kindergartenId: target.kindergartenId,
          url: target.url,
          title: target.title,
          reason: `HTTP: ${result.reason}`,
          file: target.file,
        });
      } else if (result.status === 'error') {
        errorCount++;
      }

      if (checked % 50 === 0) {
        console.log(`  진행: ${checked}/${checkTargets.length} (dead: ${deadCount}, borderline: ${borderlineCount})`);
      }

      await delay(300);
    }

    console.log(`\n온라인 체크 완료: ${checked}건 체크, dead: ${deadCount}, borderline: ${borderlineCount}, error: ${errorCount}`);

    // 온라인 결과로 추가 fix
    if (isFix && !isDryRun) {
      const onlineIssues = allIssues.filter(i => i.type === 'dead-url');
      if (onlineIssues.length > 0) {
        console.log(`\n온라인 검증 결과 적용 중...`);
        for (const file of files) {
          const fileIssues = onlineIssues.filter(i => i.file === file);
          if (fileIssues.length === 0) continue;

          const filePath = path.join(REVIEWS_DIR, file);
          const data: ReviewsData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
          const fixedData = applyFixes(data, fileIssues);
          fs.writeFileSync(filePath, JSON.stringify(fixedData, null, 2));
          console.log(`  ${file}: ${fileIssues.length}건 제거`);
        }
      }
    }
  }

  // 전체 요약
  const summary: Record<string, number> = {};
  for (const issue of allIssues) {
    summary[issue.type] = (summary[issue.type] || 0) + 1;
  }

  console.log('=== 전체 결과 요약 ===');
  console.log(`총 리뷰: ${totalReviews}건`);
  console.log(`발견된 문제: ${allIssues.length}건`);
  for (const [type, count] of Object.entries(summary).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${type}: ${count}건`);
  }
  if (totalUrlsNormalized > 0) {
    console.log(`URL 정규화 대상: ${totalUrlsNormalized}건`);
  }

  const removableCount = allIssues.filter(i => i.type !== 'borderline').length;
  console.log(`\n제거 가능: ${removableCount}건 (borderline ${summary['borderline'] || 0}건 제외)`);
  if (!isFix) {
    console.log('(--fix 플래그로 실제 수정 가능)');
  }

  // 제거 대상 상세 (상위 30건)
  const removable = allIssues.filter(i => i.type !== 'borderline');
  if (removable.length > 0) {
    console.log('\n--- 제거 대상 샘플 (상위 30건) ---');
    for (const issue of removable.slice(0, 30)) {
      const name = kindergartenNameMap.get(issue.kindergartenId) || issue.kindergartenId.substring(0, 12);
      console.log(`  [${issue.type}] "${issue.title}" (${name})`);
      console.log(`    사유: ${issue.reason}`);
    }
    if (removable.length > 30) {
      console.log(`  ... 외 ${removable.length - 30}건`);
    }
  }

  // 리포트 저장
  if (isReport) {
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    const reportName = sidoCode
      ? `validation-report-${sidoCode}.json`
      : 'validation-report-all.json';
    const reportPath = path.join(OUTPUT_DIR, reportName);

    const report: ValidationReport = {
      timestamp: new Date().toISOString(),
      sido: sidoCode,
      files,
      totalReviews,
      issues: allIssues,
      urlsNormalized: totalUrlsNormalized,
      summary,
    };

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n리포트 저장: ${reportPath}`);
  }
}

main().catch(err => {
  console.error('ERROR:', err);
  process.exit(1);
});

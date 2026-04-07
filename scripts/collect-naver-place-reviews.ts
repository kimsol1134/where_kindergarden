/**
 * 네이버 플레이스 리뷰 수집 스크립트
 *
 * build-naver-place-mapping.ts로 구축한 매핑을 바탕으로
 * 각 유치원의 네이버 플레이스 리뷰를 Playwright로 수집합니다.
 *
 * 사용법:
 *   pnpm collect:naver-place -- --sido 28                  # 인천
 *   pnpm collect:naver-place -- --sido 11 --test           # 서울 (처음 5개만)
 *   pnpm collect:naver-place -- --sido 11,41               # 서울+경기
 *   pnpm collect:naver-place -- --sido 28 --dry-run        # 수집만 하고 저장 안함
 */

import { chromium, type Page, type Route } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { config } from 'dotenv';
import { loadPlatformMapping } from './lib/platform-id-mapping';
import {
  ensureDirectory,
  loadKindergartens,
  parseSidoCodes,
  type KindergartenEntry,
} from './lib/review-verification-pipeline';
import type { ReviewLink, ReviewsData } from '../src/types/review';

config({ path: '.env.local' });
config();

interface NaverPlaceReview {
  text: string;
  rating: number | null;
  date: string | null;
  authorName: string;
}

function writeLine(message: string): void {
  process.stdout.write(`${message}\n`);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomDelay(minMs: number, maxMs: number): Promise<void> {
  const ms = minMs + Math.random() * (maxMs - minMs);
  return delay(ms);
}

function hasFlag(args: string[], flag: string): boolean {
  return args.includes(flag);
}

function getArgValue(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag);
  if (index === -1 || !args[index + 1]) return undefined;
  return args[index + 1];
}

function generateReviewId(placeId: string, index: number): string {
  const suffix = Math.random().toString(36).slice(2, 6);
  return `rev-np-${placeId.slice(-4)}-${index}-${suffix}`;
}

async function scrapeNaverPlaceReviews(
  page: Page,
  placeId: string,
  timeoutMs = 15000
): Promise<NaverPlaceReview[]> {
  const url = `https://m.place.naver.com/place/${placeId}/review/visitor`;

  try {
    await page.route('**/*', (route: Route) => {
      const resourceType = route.request().resourceType();
      if (['image', 'media', 'font'].includes(resourceType)) {
        void route.abort();
        return;
      }
      void route.continue();
    });

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: timeoutMs });

    // 리뷰 영역이 로드될 때까지 대기
    await page.waitForSelector('li.place_apply_pui, [class*="pui__"]', { timeout: 5000 }).catch(() => {});

    const reviews = await page.evaluate(() => {
      const results: Array<{
        text: string;
        rating: number | null;
        date: string | null;
        authorName: string;
      }> = [];

      // 네이버 플레이스 모바일 리뷰: li.place_apply_pui 또는 pui__ 접두사 클래스의 li
      const reviewElements = document.querySelectorAll(
        'li.place_apply_pui, li[class*="EjjAW"]'
      );

      for (const element of reviewElements) {
        const innerText = element.innerText?.trim() ?? '';
        // 리뷰 아이템에는 '****' (익명 처리된 닉네임)이 포함됨
        if (!innerText.includes('****') && innerText.length < 20) continue;

        // 전체 텍스트에서 구조 파싱
        const lines = innerText.split('\n').map((l: string) => l.trim()).filter(Boolean);

        // 작성자: '****' 포함된 첫 줄
        const authorLine = lines.find((l: string) => l.includes('****')) ?? '';
        const authorName = authorLine.split('\n')[0].trim();

        // 별점: "별점\nN.N\n점" 패턴
        let rating: number | null = null;
        const ratingIdx = lines.indexOf('별점');
        if (ratingIdx !== -1 && lines[ratingIdx + 1]) {
          const ratingMatch = lines[ratingIdx + 1].match(/(\d+(?:\.\d+)?)/);
          if (ratingMatch) {
            rating = Number.parseFloat(ratingMatch[1]);
          }
        }

        // 방문일: "방문일\nYY.M.DD.요일" 또는 "YYYY년 M월 D일"
        let date: string | null = null;
        const visitIdx = lines.indexOf('방문일');
        if (visitIdx !== -1) {
          // "21.3.11.목" → "2021-03-11" 또는 "2021년 3월 11일" 형태
          for (let offset = 1; offset <= 2; offset++) {
            const dateLine = lines[visitIdx + offset] ?? '';
            // "YY.M.DD.요일" 패턴
            const shortMatch = dateLine.match(/(\d{2})\.(\d{1,2})\.(\d{1,2})/);
            if (shortMatch) {
              const [, yy, mm, dd] = shortMatch;
              const year = Number(yy) > 50 ? `19${yy}` : `20${yy}`;
              date = `${year}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
              break;
            }
            // "YYYY년 M월 D일" 패턴
            const longMatch = dateLine.match(/(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/);
            if (longMatch) {
              const [, year, month, day] = longMatch;
              date = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
              break;
            }
          }
        }

        // 리뷰 텍스트: 별점/방문일/작성자 등 메타데이터를 제외한 실제 리뷰 내용
        // 메타데이터 키워드들 이후의 텍스트를 리뷰로 간주
        const skipKeywords = ['별점', '점', '반응 남기기', '방문일', '번째 방문', '인증 수단', '영수증', '리뷰', '사진', '팔로우'];
        const textParts = lines.filter((l: string) => {
          if (l.includes('****')) return false;
          if (skipKeywords.some((k) => l === k)) return false;
          if (/^\d+(\.\d+)?$/.test(l)) return false;
          if (/^\d{2}\.\d{1,2}\.\d{1,2}/.test(l)) return false;
          if (/^\d{4}년/.test(l)) return false;
          return l.length > 2;
        });
        const text = textParts.join(' ').trim();

        // 텍스트가 너무 짧으면 리뷰가 아닐 수 있음 — 별점만이라도 유효함
        if (text.length < 5 && rating === null) continue;

        results.push({
          text: text || `별점 ${rating ?? ''}점`,
          rating,
          date,
          authorName,
        });
      }

      return results;
    });

    return reviews;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    writeLine(`  [ERROR] ${placeId}: ${message}`);
    return [];
  }
}

function persistCollectedReviews(
  collectedReviews: Map<string, ReviewLink[]>,
  targets: Array<{ kindercode: string; placeId: string; kindergarten: KindergartenEntry }>,
  sidos: string[]
): number {
  let totalAdded = 0;
  for (const sidoCode of sidos) {
    const sidoReviewPath = path.resolve(`public/data/reviews/${sidoCode}.json`);
    let sidoData: ReviewsData;

    if (fs.existsSync(sidoReviewPath)) {
      sidoData = JSON.parse(fs.readFileSync(sidoReviewPath, 'utf-8'));
    } else {
      sidoData = {
        version: new Date().toISOString().split('T')[0],
        totalCount: 0,
        kindergartenCount: 0,
        reviews: {},
      };
    }

    const sidoKindergartens = targets.filter(
      (t) => t.kindergarten.sido_code === sidoCode
    );

    let addedCount = 0;
    for (const target of sidoKindergartens) {
      const newReviews = collectedReviews.get(target.kindercode);
      if (!newReviews || newReviews.length === 0) continue;

      const existing = sidoData.reviews[target.kindercode] ?? [];
      const existingUrls = new Set(existing.map((r) => r.url));
      const uniqueNew = newReviews.filter((r) => !existingUrls.has(r.url));

      if (uniqueNew.length > 0) {
        sidoData.reviews[target.kindercode] = [...existing, ...uniqueNew];
        addedCount += uniqueNew.length;
      }
    }

    if (addedCount > 0) {
      sidoData.version = new Date().toISOString().split('T')[0];
      sidoData.totalCount = Object.values(sidoData.reviews).reduce(
        (sum, reviews) => sum + reviews.length,
        0
      );
      sidoData.kindergartenCount = Object.keys(sidoData.reviews).length;
      ensureDirectory(path.dirname(sidoReviewPath));
      fs.writeFileSync(sidoReviewPath, JSON.stringify(sidoData, null, 2));
      totalAdded += addedCount;
    }
  }
  return totalAdded;
}

function buildReviewLink(
  kindergartenId: string,
  placeId: string,
  review: NaverPlaceReview,
  index: number
): ReviewLink {
  const title = review.text.length > 50
    ? `${review.text.slice(0, 50)}...`
    : review.text;

  return {
    id: generateReviewId(placeId, index),
    kindergartenId,
    title,
    url: `https://m.place.naver.com/place/${placeId}/review/visitor`,
    source: 'naver_place',
    sourceName: 'naver_place',
    snippet: review.text.slice(0, 200),
    date: review.date,
    collectedAt: new Date().toISOString(),
  };
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const sidos = parseSidoCodes(getArgValue(args, '--sido'), ['28']);
  const testMode = hasFlag(args, '--test');
  const dryRun = hasFlag(args, '--dry-run');
  const slow = hasFlag(args, '--slow');
  const skipExisting = hasFlag(args, '--skip-existing');
  const limitArg = getArgValue(args, '--limit');
  const offsetArg = getArgValue(args, '--offset');
  const limit = limitArg ? Number.parseInt(limitArg, 10) : 0;
  const offset = offsetArg ? Number.parseInt(offsetArg, 10) : 0;

  // 보수적 모드 (IP 차단 회피용)
  const BATCH_SIZE = slow ? 1 : 3;
  const TIMEOUT_MS = slow ? 25000 : 15000;
  const MIN_DELAY = slow ? 5000 : 2000;
  const MAX_DELAY = slow ? 10000 : 5000;

  const mapping = loadPlatformMapping('naver_place');
  if (mapping.size === 0) {
    writeLine('[ERROR] 네이버 플레이스 매핑 없음. 먼저 build-naver-place-mapping을 실행하세요.');
    process.exit(1);
  }

  const kindergartens = loadKindergartens() as Array<KindergartenEntry & { lat: number | null; lng: number | null }>;
  const kindergartenMap = new Map(kindergartens.map((k) => [k.kindercode, k]));

  // 이미 수집된 유치원 ID 집합 (skip-existing 용)
  const existingKindergartenIds = new Set<string>();
  if (skipExisting) {
    for (const sidoCode of sidos) {
      const sidoReviewPath = path.resolve(`public/data/reviews/${sidoCode}.json`);
      if (!fs.existsSync(sidoReviewPath)) continue;
      const sidoData: ReviewsData = JSON.parse(fs.readFileSync(sidoReviewPath, 'utf-8'));
      for (const [kgId, reviews] of Object.entries(sidoData.reviews)) {
        if (reviews.some((r) => r.source === 'naver_place')) {
          existingKindergartenIds.add(kgId);
        }
      }
    }
    writeLine(`기존 수집 유치원: ${existingKindergartenIds.size}개 (스킵)`);
  }

  // 대상 시도에 해당하는 매핑된 유치원 필터링
  const targets: Array<{ kindercode: string; placeId: string; kindergarten: KindergartenEntry }> = [];
  for (const [kindercode, placeId] of mapping) {
    const kindergarten = kindergartenMap.get(kindercode);
    if (!kindergarten) continue;
    if (!sidos.includes(kindergarten.sido_code)) continue;
    if (skipExisting && existingKindergartenIds.has(kindercode)) continue;
    targets.push({ kindercode, placeId, kindergarten });
  }

  if (testMode) {
    targets.splice(5);
  }

  // offset / limit 적용
  if (offset > 0 || limit > 0) {
    const end = limit > 0 ? offset + limit : targets.length;
    targets.splice(0, offset);
    targets.splice(limit > 0 ? limit : targets.length);
    writeLine(`범위: offset ${offset}, limit ${limit || '전체'} → ${targets.length}개`);
  }

  writeLine(`대상: ${targets.length}개 유치원 (시도: ${sidos.join(',')})`);

  if (targets.length === 0) {
    writeLine('수집 대상 없음');
    return;
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    viewport: { width: 390, height: 844 },
  });

  const collectedReviews: Map<string, ReviewLink[]> = new Map();
  let totalCollected = 0;
  let placesWithReviews = 0;
  let consecutiveErrors = 0;

  for (let i = 0; i < targets.length; i += BATCH_SIZE) {
    const batch = targets.slice(i, i + BATCH_SIZE);

    if ((i + 1) % 10 === 0 || i === 0) {
      writeLine(
        `[${i + 1}/${targets.length}] 수집 중... (리뷰: ${totalCollected}, 유치원: ${placesWithReviews})`
      );
    }

    const batchResults = await Promise.all(
      batch.map(async (target) => {
        const page = await context.newPage();
        const reviews = await scrapeNaverPlaceReviews(page, target.placeId, TIMEOUT_MS);
        await page.close();
        return { target, reviews };
      })
    );

    // 연속 에러 감지: 모두 실패한 배치가 연달아 발생하면 백오프
    const batchHasResult = batchResults.some((r) => r.reviews.length > 0);
    if (!batchHasResult && batch.length > 0) {
      consecutiveErrors++;
      if (consecutiveErrors >= 5) {
        writeLine(`  [WARN] 연속 ${consecutiveErrors}배치 실패 — 60초 백오프`);
        await delay(60000);
        consecutiveErrors = 0;
      }
    } else {
      consecutiveErrors = 0;
    }

    for (const { target, reviews } of batchResults) {
      if (reviews.length === 0) continue;

      placesWithReviews++;
      const reviewLinks = reviews.map((review, index) =>
        buildReviewLink(target.kindercode, target.placeId, review, index)
      );

      const existing = collectedReviews.get(target.kindercode) ?? [];
      collectedReviews.set(target.kindercode, [...existing, ...reviewLinks]);
      totalCollected += reviewLinks.length;

      if (testMode) {
        writeLine(`  [${target.kindergarten.name}] ${reviews.length}건 수집`);
      }
    }

    // 50배치마다 증분 저장 (IP 차단 등으로 중단되어도 데이터 보존)
    if (!dryRun && (i / BATCH_SIZE + 1) % 50 === 0 && collectedReviews.size > 0) {
      const saved = persistCollectedReviews(collectedReviews, targets, sidos);
      if (saved > 0) {
        writeLine(`  [SAVE] 증분 저장: ${saved}건 (누적 ${totalCollected}건)`);
      }
      collectedReviews.clear();
    }

    await randomDelay(MIN_DELAY, MAX_DELAY);
  }

  await browser.close();

  writeLine(`\n수집 완료: ${totalCollected}건 (${placesWithReviews}개 유치원)`);

  if (dryRun) {
    writeLine('[DRY-RUN] 저장하지 않음');
    return;
  }

  if (collectedReviews.size === 0) {
    writeLine('남은 미저장 리뷰 없음');
    return;
  }

  const finalSaved = persistCollectedReviews(collectedReviews, targets, sidos);
  writeLine(`최종 저장: ${finalSaved}건`);
}

main().catch((error) => {
  process.stderr.write(
    `[FATAL] ${error instanceof Error ? error.message : String(error)}\n`
  );
  process.exit(1);
});

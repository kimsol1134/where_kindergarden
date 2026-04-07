/**
 * 별별선생 리뷰 수집 스크립트
 *
 * build-starteacher-mapping.ts로 구축한 매핑을 바탕으로
 * 별별선생의 개별 기관 페이지에서 리뷰를 수집합니다.
 *
 * 사용법:
 *   pnpm collect:starteacher -- --sido 28                  # 인천
 *   pnpm collect:starteacher -- --sido 11 --test           # 서울 (5개만)
 *   pnpm collect:starteacher -- --sido 28 --dry-run        # 수집만 하고 저장 안함
 */

import { chromium, type Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { loadPlatformMapping } from './lib/platform-id-mapping';
import {
  ensureDirectory,
  loadKindergartens,
  parseSidoCodes,
  type KindergartenEntry,
} from './lib/review-verification-pipeline';
import type { ReviewLink, ReviewsData } from '../src/types/review';

interface StarteacherReview {
  text: string;
  rating: number | null;
  date: string | null;
  authorName: string;
  tags: string[];
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

function generateReviewId(institutionId: string, index: number): string {
  const suffix = Math.random().toString(36).slice(2, 6);
  return `rev-st-${institutionId.slice(-4)}-${index}-${suffix}`;
}

async function scrapeStarteacherReviews(
  page: Page,
  institutionId: string
): Promise<StarteacherReview[]> {
  const url = `https://www.starteacher.co.kr/kindergarten/institutes/${institutionId}`;

  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });

    // __NEXT_DATA__에서 리뷰 데���터 추출
    const reviews = await page.evaluate(() => {
      const results: Array<{
        text: string;
        rating: number | null;
        date: string | null;
        authorName: string;
        tags: string[];
      }> = [];

      // 방법 1: __NEXT_DATA__에서 추출
      const nextDataEl = document.querySelector('script#__NEXT_DATA__');
      if (nextDataEl) {
        try {
          const data = JSON.parse(nextDataEl.textContent ?? '');
          const pageProps = data.props?.pageProps ?? {};

          // 리뷰 데이터 키 탐색
          const possibleKeys = ['reviews', 'comments', 'ratings', 'feedbacks'];
          for (const key of possibleKeys) {
            const value = pageProps[key];
            if (Array.isArray(value)) {
              for (const item of value) {
                if (typeof item === 'object' && item !== null) {
                  const record = item as Record<string, unknown>;
                  const text = String(
                    record.content ?? record.text ?? record.body ?? record.comment ?? ''
                  );
                  if (text.length < 5) continue;

                  results.push({
                    text,
                    rating: typeof record.rating === 'number' ? record.rating : null,
                    date: typeof record.created_at === 'string'
                      ? record.created_at.split('T')[0]
                      : typeof record.date === 'string'
                        ? record.date.split('T')[0]
                        : null,
                    authorName: String(record.author ?? record.nickname ?? record.user_name ?? ''),
                    tags: Array.isArray(record.tags)
                      ? record.tags.map(String)
                      : [],
                  });
                }
              }
              break;
            }
          }
        } catch {
          // JSON 파싱 실패 무시
        }
      }

      // 방법 2: __NEXT_DATA__에 없으면 DOM에서 추출
      if (results.length === 0) {
        const reviewElements = document.querySelectorAll(
          '[class*="review"] li, [class*="comment"] li, [class*="feedback"] article'
        );

        for (const element of reviewElements) {
          const textEl =
            element.querySelector('[class*="content"]') ??
            element.querySelector('[class*="text"]') ??
            element.querySelector('p');
          const text = textEl?.textContent?.trim() ?? '';
          if (text.length < 5) continue;

          let rating: number | null = null;
          const ratingEl = element.querySelector('[class*="rating"], [class*="star"]');
          if (ratingEl) {
            const ratingMatch = (ratingEl.textContent ?? '').match(/(\d+(?:\.\d+)?)/);
            if (ratingMatch) rating = Number.parseFloat(ratingMatch[1]);
          }

          let date: string | null = null;
          const dateEl = element.querySelector('[class*="date"], time');
          if (dateEl) {
            const dateMatch = (dateEl.textContent ?? '').match(/(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})/);
            if (dateMatch) {
              const [, year, month, day] = dateMatch;
              date = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
            }
          }

          const authorEl = element.querySelector('[class*="name"], [class*="author"]');
          const authorName = authorEl?.textContent?.trim() ?? '';

          results.push({ text, rating, date, authorName, tags: [] });
        }
      }

      return results;
    });

    return reviews;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    writeLine(`  [ERROR] ${institutionId}: ${message}`);
    return [];
  }
}

function buildReviewLink(
  kindergartenId: string,
  institutionId: string,
  review: StarteacherReview,
  index: number
): ReviewLink {
  const title =
    review.text.length > 50
      ? `${review.text.slice(0, 50)}...`
      : review.text;

  return {
    id: generateReviewId(institutionId, index),
    kindergartenId,
    title,
    url: `https://www.starteacher.co.kr/kindergarten/institutes/${institutionId}`,
    source: 'starteacher',
    sourceName: 'starteacher',
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

  const mapping = loadPlatformMapping('starteacher');
  if (mapping.size === 0) {
    writeLine('[ERROR] 별별선생 매핑 없음. 먼저 build-starteacher-mapping을 실행하세요.');
    process.exit(1);
  }

  const kindergartens = loadKindergartens();
  const kindergartenMap = new Map(kindergartens.map((k) => [k.kindercode, k]));

  const targets: Array<{ kindercode: string; institutionId: string; kindergarten: KindergartenEntry }> = [];
  for (const [kindercode, institutionId] of mapping) {
    const kindergarten = kindergartenMap.get(kindercode);
    if (!kindergarten) continue;
    if (!sidos.includes(kindergarten.sido_code)) continue;
    targets.push({ kindercode, institutionId, kindergarten });
  }

  if (testMode) {
    targets.splice(5);
  }

  writeLine(`대상: ${targets.length}개 유치원 (시도: ${sidos.join(',')})`);

  if (targets.length === 0) {
    writeLine('수집 대상 없음');
    return;
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();

  const collectedReviews: Map<string, ReviewLink[]> = new Map();
  let totalCollected = 0;
  let placesWithReviews = 0;

  const BATCH_SIZE = 3;

  for (let i = 0; i < targets.length; i += BATCH_SIZE) {
    const batch = targets.slice(i, i + BATCH_SIZE);

    if ((i + 1) % 30 === 0 || i === 0) {
      writeLine(
        `[${i + 1}/${targets.length}] 수집 중... (리뷰: ${totalCollected}, 유치원: ${placesWithReviews})`
      );
    }

    const batchResults = await Promise.all(
      batch.map(async (target) => {
        const page = await context.newPage();
        const reviews = await scrapeStarteacherReviews(page, target.institutionId);
        await page.close();
        return { target, reviews };
      })
    );

    for (const { target, reviews } of batchResults) {
      if (reviews.length === 0) continue;

      placesWithReviews++;
      const reviewLinks = reviews.map((review, index) =>
        buildReviewLink(target.kindercode, target.institutionId, review, index)
      );

      const existing = collectedReviews.get(target.kindercode) ?? [];
      collectedReviews.set(target.kindercode, [...existing, ...reviewLinks]);
      totalCollected += reviewLinks.length;

      if (testMode) {
        writeLine(`  [${target.kindergarten.name}] ${reviews.length}건 수집`);
      }
    }

    await randomDelay(1000, 2000);
  }

  await browser.close();

  writeLine(`\n수집 완료: ${totalCollected}건 (${placesWithReviews}개 유치원)`);

  if (dryRun) {
    writeLine('[DRY-RUN] 저장하지 않음');
    return;
  }

  if (totalCollected === 0) {
    writeLine('수집된 리뷰 없음');
    return;
  }

  // 기�� 리뷰 파일에 병합
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
      writeLine(`${sidoCode}.json: ${addedCount}건 추가 (총 ${sidoData.totalCount}건)`);
    }
  }
}

main().catch((error) => {
  process.stderr.write(
    `[FATAL] ${error instanceof Error ? error.message : String(error)}\n`
  );
  process.exit(1);
});

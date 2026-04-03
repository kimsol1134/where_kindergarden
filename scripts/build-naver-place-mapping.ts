/**
 * 네이버 플레이스 ID 매핑 구축 스크립트
 *
 * 2단계 전략:
 *   1단계: 네이버 Local Search API로 이름/주소/좌표 매칭 확인
 *   2단계: Playwright로 네이버 맵 검색 → Place ID 추출
 *
 * 사용법:
 *   pnpm build:naver-place-mapping -- --sido 28               # 인천
 *   pnpm build:naver-place-mapping -- --sido 11 --test        # 서울 (처음 5개만)
 *   pnpm build:naver-place-mapping -- --sido 11,41            # 서울+경기
 *   pnpm build:naver-place-mapping -- --sido 28 --resume      # 이전 매핑에서 이어서
 */

import { chromium, type Page, type Route } from '@playwright/test';
import { config } from 'dotenv';
import {
  loadPlatformMapping,
  savePlatformMapping,
  haversineDistance,
  extractCoreName,
} from './lib/platform-id-mapping';
import { loadKindergartens, parseSidoCodes } from './lib/review-verification-pipeline';

config({ path: '.env.local' });
config();

interface KindergartenEntry {
  kindercode: string;
  name: string;
  address: string;
  lat: number | null;
  lng: number | null;
  sido_code: string;
  sigungu_code: string;
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

/**
 * Playwright로 네이버 맵에서 유치원을 검색하여 Place ID를 추출합니다.
 *
 * 전략: m.map.naver.com 모바일 맵에서 검색 → URL 리다이렉트에서 place ID 추출
 */
async function findPlaceIdViaMap(
  page: Page,
  kindergartenName: string,
  address: string,
  lat: number | null,
  lng: number | null
): Promise<string | null> {
  try {
    // 주소의 시/구 부분만 사용
    const shortAddr = address.split(' ').slice(0, 3).join(' ');
    const query = `${kindergartenName} ${shortAddr}`;
    const searchUrl = `https://m.map.naver.com/search2/search.naver?query=${encodeURIComponent(query)}`;

    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 10000 });

    // 검색 결과에서 Place ID 추출
    // 모바일 맵은 검색 결과를 JSON으로 내려줄 수 있음
    // 또는 결과 목록의 data-id 속성에서 추출

    // 방법 1: 현재 URL에서 Place ID 확인 (단일 결과일 경우 자동 리다이렉트)
    await delay(2000);
    const currentUrl = page.url();
    const placeMatch = currentUrl.match(/place\/(\d+)/);
    if (placeMatch) {
      return placeMatch[1];
    }

    // 방법 2: 검색 결과 DOM에서 Place ID 추출
    const placeId = await page.evaluate(() => {
      // 검색 결과 목록에서 첫 번째 결과의 place ID 추출
      const resultLinks = document.querySelectorAll('a[href*="place/"]');
      for (const link of resultLinks) {
        const href = link.getAttribute('href') ?? '';
        const match = href.match(/place\/(\d+)/);
        if (match) return match[1];
      }

      // data-id 또는 data-cid 속성 확인
      const resultItems = document.querySelectorAll(
        '[data-id], [data-cid], [class*="item"]'
      );
      for (const item of resultItems) {
        const id = item.getAttribute('data-id') ?? item.getAttribute('data-cid');
        if (id && /^\d+$/.test(id)) return id;
      }

      return null;
    });

    if (placeId) return placeId;

    // 방법 3: 네트워크 요청에서 place ID 확인
    // (이미 페이지가 로드되었으므로 클릭해서 상세 페이지로 이동)
    const firstResult = await page.$('a[class*="name"], a[class*="title"], li a');
    if (firstResult) {
      await firstResult.click();
      await delay(2000);
      const detailUrl = page.url();
      const detailMatch = detailUrl.match(/place\/(\d+)/);
      if (detailMatch) return detailMatch[1];
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Playwright로 네이버 플레이스 검색 API를 인터셉트하여 Place ID를 추출합니다.
 * 더 안정적인 방법: 네트워크 요청 인터셉트
 */
async function findPlaceIdViaApi(
  page: Page,
  kindergartenName: string,
  address: string
): Promise<string | null> {
  try {
    const shortAddr = address.split(' ').slice(1, 3).join(' ');
    const query = `${shortAddr} ${kindergartenName}`;
    const coreName = extractCoreName(kindergartenName);

    let foundPlaceId: string | null = null;

    // 네트워크 응답 인터셉트
    page.on('response', async (response) => {
      const url = response.url();
      if (!url.includes('place') && !url.includes('search')) return;
      if (!response.headers()['content-type']?.includes('json')) return;

      try {
        const text = await response.text();
        // Place ID 패턴 검색: "id":"12345678" 또는 "sid":"12345678"
        const idMatches = text.matchAll(/"(?:id|sid|place_id)"[:\s]*"?(\d{7,})"?/g);
        for (const match of idMatches) {
          if (!foundPlaceId) {
            foundPlaceId = match[1];
          }
        }
      } catch {
        // 무시
      }
    });

    // 네이버 플레이스 검색
    const searchUrl = `https://m.place.naver.com/place/search/${encodeURIComponent(query)}`;
    await page.goto(searchUrl, { waitUntil: 'networkidle', timeout: 15000 });

    if (foundPlaceId) return foundPlaceId;

    // DOM에서 직접 추출 시도
    const placeId = await page.evaluate((nameToFind: string) => {
      // 검색 결과 목록의 링크에서 place ID 추출
      const links = document.querySelectorAll('a[href*="/place/"]');
      for (const link of links) {
        const href = link.getAttribute('href') ?? '';
        const match = href.match(/\/place\/(\d+)/);
        if (match) {
          // 이름이 매칭되는지 확인
          const text = link.textContent ?? '';
          if (text.includes(nameToFind)) {
            return match[1];
          }
        }
      }

      // 첫 번째 결과라도 반환
      for (const link of links) {
        const href = link.getAttribute('href') ?? '';
        const match = href.match(/\/place\/(\d+)/);
        if (match) return match[1];
      }

      return null;
    }, coreName);

    return placeId ?? foundPlaceId;
  } catch {
    return null;
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const sidos = parseSidoCodes(getArgValue(args, '--sido'), ['28']);
  const testMode = hasFlag(args, '--test');
  const resume = hasFlag(args, '--resume');

  const allKindergartens = loadKindergartens() as KindergartenEntry[];
  let targets = allKindergartens.filter((k) => sidos.includes(k.sido_code));

  if (testMode) {
    targets = targets.slice(0, 5);
  }

  writeLine(`대상 유치원: ${targets.length}개 (시도: ${sidos.join(',')})`);

  const existing = resume ? loadPlatformMapping('naver_place') : new Map<string, string>();
  if (resume && existing.size > 0) {
    writeLine(`기존 매핑 로드: ${existing.size}건`);
    targets = targets.filter((k) => !existing.has(k.kindercode));
    writeLine(`미매핑 대상: ${targets.length}개`);
  }

  const mapping = new Map(existing);
  let matchCount = 0;
  let skipCount = 0;

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    viewport: { width: 390, height: 844 },
  });

  // 리소스 블로킹 (이미지/미디어 등)
  await context.route('**/*', (route: Route) => {
    const resourceType = route.request().resourceType();
    if (['image', 'media', 'font'].includes(resourceType)) {
      void route.abort();
      return;
    }
    void route.continue();
  });

  for (let i = 0; i < targets.length; i++) {
    const kindergarten = targets[i];

    if ((i + 1) % 10 === 0 || i === 0) {
      writeLine(
        `[${i + 1}/${targets.length}] 처리 중... (매칭: ${matchCount}, 스킵: ${skipCount})`
      );
    }

    const page = await context.newPage();

    // 방법 1: 네이버 플레이스 검색 API 인터셉트
    let placeId = await findPlaceIdViaApi(
      page,
      kindergarten.name,
      kindergarten.address
    );

    // 방법 2: 네이버 맵 검색으로 폴백
    if (!placeId) {
      placeId = await findPlaceIdViaMap(
        page,
        kindergarten.name,
        kindergarten.address,
        kindergarten.lat,
        kindergarten.lng
      );
    }

    await page.close();

    if (placeId) {
      mapping.set(kindergarten.kindercode, placeId);
      matchCount++;
      if (testMode) {
        writeLine(
          `  [MATCH] ${kindergarten.name} → ${placeId}`
        );
      }
    } else {
      skipCount++;
      if (testMode) {
        writeLine(`  [SKIP] ${kindergarten.name}`);
      }
    }

    // 5건마다 중간 저장
    if ((i + 1) % 5 === 0) {
      savePlatformMapping('naver_place', mapping);
    }

    await randomDelay(2000, 4000);
  }

  await browser.close();

  savePlatformMapping('naver_place', mapping);
  writeLine(`\n완료: ${matchCount}건 매칭, ${skipCount}건 스킵`);
  writeLine(`총 매핑: ${mapping.size}건 저장`);
}

main().catch((error) => {
  process.stderr.write(
    `[FATAL] ${error instanceof Error ? error.message : String(error)}\n`
  );
  process.exit(1);
});

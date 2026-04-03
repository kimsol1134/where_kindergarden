/**
 * 별별선생 API 엔드포인트 탐색 스크립트 (1회성 탐색 도구)
 *
 * Playwright로 starteacher.co.kr에 접속하여 네트워크 요청을 인터셉트하고
 * API 엔드포인트 패턴을 발견합니다.
 *
 * 사용법:
 *   pnpm tsx scripts/discover-starteacher-api.ts
 *   pnpm tsx scripts/discover-starteacher-api.ts --pages 3
 */

import { chromium } from '@playwright/test';

function writeLine(message: string): void {
  process.stdout.write(`${message}\n`);
}

function parseInteger(args: string[], flag: string, defaultValue: number): number {
  const index = args.indexOf(flag);
  if (index === -1 || !args[index + 1]) return defaultValue;
  const parsed = Number.parseInt(args[index + 1], 10);
  return Number.isNaN(parsed) ? defaultValue : parsed;
}

interface DiscoveredEndpoint {
  url: string;
  method: string;
  status: number;
  contentType: string;
  responseSample: string;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const maxPages = parseInteger(args, '--pages', 3);

  writeLine('=== 별별선생 API 탐색 시작 ===');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const discoveredEndpoints: DiscoveredEndpoint[] = [];
  const seenUrls = new Set<string>();

  // 네트워크 응답 인터셉트
  page.on('response', async (response) => {
    const url = response.url();
    const contentType = response.headers()['content-type'] ?? '';

    // API 응답만 관심
    if (
      !contentType.includes('json') &&
      !url.includes('/api/') &&
      !url.includes('/_next/data/')
    ) {
      return;
    }

    // 중복 제거
    const urlKey = url.split('?')[0];
    if (seenUrls.has(urlKey)) return;
    seenUrls.add(urlKey);

    try {
      const body = await response.text();
      const sample = body.slice(0, 500);

      discoveredEndpoints.push({
        url,
        method: response.request().method(),
        status: response.status(),
        contentType,
        responseSample: sample,
      });

      writeLine(`\n[API] ${response.request().method()} ${url}`);
      writeLine(`  Status: ${response.status()}`);
      writeLine(`  Content-Type: ${contentType}`);
      writeLine(`  Sample: ${sample.slice(0, 200)}...`);
    } catch {
      // 응답 읽기 실패 무시
    }
  });

  // 1. 메인 페이지 접속
  writeLine('\n--- 1. 메인 페이지 ---');
  await page.goto('https://www.starteacher.co.kr/kindergarten', {
    waitUntil: 'networkidle',
    timeout: 30000,
  });

  // __NEXT_DATA__ 파싱 시도
  const nextData = await page.evaluate(() => {
    const el = document.querySelector('script#__NEXT_DATA__');
    if (!el) return null;
    try {
      const data = JSON.parse(el.textContent ?? '');
      return {
        buildId: data.buildId,
        propsKeys: Object.keys(data.props?.pageProps ?? {}),
        sampleData: JSON.stringify(data.props?.pageProps ?? {}).slice(0, 500),
      };
    } catch {
      return null;
    }
  });

  if (nextData) {
    writeLine('\n[__NEXT_DATA__]');
    writeLine(`  buildId: ${nextData.buildId}`);
    writeLine(`  pageProps keys: ${nextData.propsKeys.join(', ')}`);
    writeLine(`  sample: ${nextData.sampleData}`);
  }

  // 2. 기관 목록 페이지
  writeLine('\n--- 2. 기관 목록 페이지 ---');
  await page.goto('https://www.starteacher.co.kr/kindergarten/institutes', {
    waitUntil: 'networkidle',
    timeout: 30000,
  });

  const listNextData = await page.evaluate(() => {
    const el = document.querySelector('script#__NEXT_DATA__');
    if (!el) return null;
    try {
      const data = JSON.parse(el.textContent ?? '');
      return {
        buildId: data.buildId,
        propsKeys: Object.keys(data.props?.pageProps ?? {}),
        sampleData: JSON.stringify(data.props?.pageProps ?? {}).slice(0, 1000),
      };
    } catch {
      return null;
    }
  });

  if (listNextData) {
    writeLine('\n[기관 목록 __NEXT_DATA__]');
    writeLine(`  buildId: ${listNextData.buildId}`);
    writeLine(`  pageProps keys: ${listNextData.propsKeys.join(', ')}`);
    writeLine(`  sample: ${listNextData.sampleData}`);
  }

  // 3. 페이지네이션 탐색
  writeLine('\n--- 3. 페이지네이션 탐색 ---');
  for (let pageNum = 2; pageNum <= maxPages; pageNum++) {
    writeLine(`\n  [Page ${pageNum}]`);
    const nextPageBtn = await page.$(`a[href*="page=${pageNum}"], button:has-text("${pageNum}")`);
    if (nextPageBtn) {
      await nextPageBtn.click();
      await page.waitForTimeout(2000);
    } else {
      const nextUrl = `https://www.starteacher.co.kr/kindergarten/institutes?page=${pageNum}`;
      await page.goto(nextUrl, { waitUntil: 'networkidle', timeout: 15000 });
    }
  }

  // 4. 개별 기관 페이지 탐색
  writeLine('\n--- 4. 개별 기관 페이지 탐색 ---');
  const firstInstitute = await page.$('a[href*="/kindergarten/institutes/"]');
  if (firstInstitute) {
    const href = await firstInstitute.getAttribute('href');
    if (href) {
      const instituteUrl = href.startsWith('http')
        ? href
        : `https://www.starteacher.co.kr${href}`;
      writeLine(`  개별 기관 URL: ${instituteUrl}`);
      await page.goto(instituteUrl, { waitUntil: 'networkidle', timeout: 15000 });

      const detailNextData = await page.evaluate(() => {
        const el = document.querySelector('script#__NEXT_DATA__');
        if (!el) return null;
        try {
          const data = JSON.parse(el.textContent ?? '');
          return {
            propsKeys: Object.keys(data.props?.pageProps ?? {}),
            sampleData: JSON.stringify(data.props?.pageProps ?? {}).slice(0, 1000),
          };
        } catch {
          return null;
        }
      });

      if (detailNextData) {
        writeLine(`  pageProps keys: ${detailNextData.propsKeys.join(', ')}`);
        writeLine(`  sample: ${detailNextData.sampleData}`);
      }
    }
  }

  await browser.close();

  // 결과 요약
  writeLine('\n=== 탐색 결과 요약 ===');
  writeLine(`발견된 API 엔드포인트: ${discoveredEndpoints.length}개`);
  for (const endpoint of discoveredEndpoints) {
    writeLine(`  ${endpoint.method} ${endpoint.url}`);
  }
}

main().catch((error) => {
  process.stderr.write(
    `[FATAL] ${error instanceof Error ? error.message : String(error)}\n`
  );
  process.exit(1);
});

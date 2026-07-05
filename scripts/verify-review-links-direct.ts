import { chromium, type Page, type Route } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { extractReadableTextFromHtml } from '../src/lib/utils/review-html';

interface ReviewLink {
  id: string;
  kindergartenId: string;
  title: string;
  url: string;
  source: string;
  sourceName: string;
  snippet: string;
  date: string | null;
  collectedAt: string;
}

interface ReviewsData {
  totalCount: number;
  kindergartenCount: number;
  reviews: Record<string, ReviewLink[]>;
}

interface KindergartenEntry {
  kindercode: string;
  name: string;
  address: string;
  sido_code: string;
  sigungu_code: string;
}

interface DirectVerificationResult {
  reviewId: string;
  kindergartenId: string;
  kindergartenName: string;
  sidoCode: string;
  sigunguCode: string;
  source: string;
  url: string;
  title: string;
  snippet: string;
  status: 'verified' | 'mismatch' | 'inaccessible' | 'uncertain';
  confidence: number;
  reasons: string[];
  fetchedAt: string;
  finalUrl?: string;
  textLength: number;
  bodyExcerpt: string;
  error?: string;
}

const REVIEW_CONTEXT_PATTERNS = [
  /후기|리뷰|솔직|다녀|보내|재원|졸업|입학|설명회|상담|추천|장점|단점/,
  /선생님|원장님|교사|급식|간식|통학|버스|차량|원비|방과후|특성화/,
  /커리큘럼|프로그램|활동|수업|놀이|시설|환경|등원|하원|적응/,
];

const FIRSTHAND_SCHOOL_CONTEXT_PATTERNS = [
  /학부모|엄마|아빠|맘|부모|자녀|우리\s*아이|우리아이|아이가|아이를/,
  /보내|보냈|다녀|다녔|재원|졸업|등원|하원|입학설명회|설명회|상담|원서|추첨/,
  /선생님|원장님|담임|급식|간식|통학|셔틀|방과후|원비|원복|친구|반\s/,
];

const INACCESSIBLE_PATTERNS = [
  /로그인해주세요|다시 한번 비밀번호 확인|카페에 가입|회원만 가입|회원만.*볼 수/,
  /네이버\s*:\s*로그인|로그인 상태 유지|아이디 또는 전화번호/,
  /멤버목록 비공개|본문을 볼 수 없습니다|접근이 제한|삭제되었거나/,
  /서비스 이용이 제한되었습니다|과도한 접근 요청/,
];

const NEGATIVE_TOPIC_PATTERNS = [
  /강아지\s*유치원|반려견|애견|펫\s*호텔|키즈카페|키즈\s*카페/,
  /미용실|네일|속눈썹|피부관리|치과|한의원|병원|건강검진/,
  /태권도|합기도|주짓수|도장|피아노학원|영어학원|수학교습소|농구교실|축구클럽/,
  /샌드위치|단체주문|다과박스|커피차|푸드트럭|베이커리/,
  /시공|청소|인테리어|블라인드|전자교탁|포토존|인형극단|에어바운스/,
  /임장|모델하우스|분양|입주|사전점검|오피스텔|재건축|공동구매/,
  /원예수업|꽃꽂이|꽃케익|출강|강의|업체|체험단|리뷰이벤트/,
];

const INSTITUTION_OR_VENDOR_PATTERNS = [
  /원아\s*모집|모집\s*안내|입학\s*안내|교육계획|가정통신문/,
  /유치원을\s*소개|소개합니다|문의전화|교육상담|홈페이지/,
  /공식\s*블로그|활동\s*소식|우리\s*유치원은|유치원입니다/,
  /찾아가는|방문체험|진행하고\s*왔습니다|진행했습니다|수업했습니다/,
];

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[^\p{L}\p{N}]/gu, '');
}

function buildCoreName(kindergartenName: string): string {
  return kindergartenName
    .replace(/(?:초등학교병설)?유치원$/, '')
    .replace(/어린이집$/, '')
    .replace(/병설$/, '')
    .trim();
}

function buildInstitutionNameVariants(kindergartenName: string): string[] {
  const coreName = buildCoreName(kindergartenName);
  const variants = new Set([kindergartenName, coreName]);
  for (const value of [kindergartenName, coreName]) {
    variants.add(value.replace(/^(서울|인천|경기|경기도)/, ''));
  }
  return Array.from(variants)
    .map((value) => normalizeText(value))
    .filter((value) => value.length >= 3);
}

function buildExcerpt(text: string, maxLength = 600): string {
  return text.replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function textMatchesAny(text: string, patterns: readonly RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text));
}

function buildNameContextWindows(
  bodyText: string,
  normalizedBody: string,
  normalizedNameVariants: readonly string[]
): string[] {
  const windows: string[] = [];
  const compactBody = bodyText.replace(/\s+/g, ' ');

  for (const variant of normalizedNameVariants) {
    const index = normalizedBody.indexOf(variant);
    if (index === -1) {
      continue;
    }

    // Normalized and original offsets are not identical, but this gives a stable
    // local window without accepting unrelated body-wide "후기" mentions.
    const approximateStart = Math.max(0, index - 220);
    windows.push(compactBody.slice(approximateStart, approximateStart + 520));
  }

  return windows;
}

function sanitizeStringForJson(value: string): string {
  let sanitized = '';
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        sanitized += value[index] + value[index + 1];
        index += 1;
      }
      continue;
    }
    if (code >= 0xdc00 && code <= 0xdfff) {
      continue;
    }
    sanitized += value[index];
  }
  return sanitized;
}

function sanitizeJsonValue(value: unknown): unknown {
  if (typeof value === 'string') {
    return sanitizeStringForJson(value);
  }
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeJsonValue(item));
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, sanitizeJsonValue(entry)])
    );
  }
  return value;
}

function parseSidos(value: string | undefined): Set<string> | null {
  if (!value) {
    return null;
  }
  return new Set(
    value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
  );
}

function getArgValue(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag);
  return index === -1 ? undefined : args[index + 1];
}

function getIntegerArg(args: string[], flag: string, fallback: number): number {
  const value = getArgValue(args, flag);
  if (!value) {
    return fallback;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

async function extractPageText(page: Page, url: string): Promise<{
  finalUrl: string;
  text: string;
}> {
  await page.route('**/*', (route: Route) => {
    const resourceType = route.request().resourceType();
    if (['image', 'media', 'font', 'stylesheet'].includes(resourceType)) {
      void route.abort();
      return;
    }
    void route.continue();
  });

  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(700);
  const browserTitle = await page.title().catch(() => '');

  const frameElement = await page.$('iframe#mainFrame');
  if (frameElement) {
    const frame = await frameElement.contentFrame();
    if (frame) {
      await frame.waitForSelector('body', { timeout: 5000 }).catch(() => {});
      const html = await frame.content();
      return {
        finalUrl: page.url(),
        text: [browserTitle, extractReadableTextFromHtml(html)]
          .filter((segment) => segment.trim().length > 0)
          .join(' '),
      };
    }
  }

  return {
    finalUrl: page.url(),
    text: [browserTitle, extractReadableTextFromHtml(await page.content())]
      .filter((segment) => segment.trim().length > 0)
      .join(' '),
  };
}

function assessDirectMatch(
  review: ReviewLink,
  kindergarten: KindergartenEntry,
  bodyText: string
): Pick<DirectVerificationResult, 'status' | 'confidence' | 'reasons'> {
  const normalizedBody = normalizeText(bodyText);
  const nameVariants = buildInstitutionNameVariants(kindergarten.name);
  const fullName = normalizeText(kindergarten.name);
  const hasFullName = fullName.length >= 3 && normalizedBody.includes(fullName);
  const hasCoreName = nameVariants.some((variant) => normalizedBody.includes(variant));
  const combinedText = [review.title, review.snippet, bodyText].join(' ');
  const earlyText = [review.title, review.snippet, bodyText.slice(0, 1200)].join(' ');
  const hasReviewContext = REVIEW_CONTEXT_PATTERNS.some((pattern) =>
    pattern.test(combinedText)
  );
  const hasFirsthandSchoolContext = textMatchesAny(
    combinedText,
    FIRSTHAND_SCHOOL_CONTEXT_PATTERNS
  );
  const nameContextWindows = buildNameContextWindows(bodyText, normalizedBody, [
    fullName,
    ...nameVariants,
  ]);
  const hasNameNearFirsthandSchoolContext = nameContextWindows.some((windowText) =>
    textMatchesAny(windowText, FIRSTHAND_SCHOOL_CONTEXT_PATTERNS)
  );
  const hasNegativeTopic = NEGATIVE_TOPIC_PATTERNS.some((pattern) =>
    pattern.test(earlyText)
  );
  const hasInstitutionOrVendorVoice = INSTITUTION_OR_VENDOR_PATTERNS.some((pattern) =>
    pattern.test(earlyText)
  );
  const inaccessible = INACCESSIBLE_PATTERNS.some((pattern) =>
    pattern.test(bodyText)
  );

  if (bodyText.trim().length < 80 || inaccessible) {
    return {
      status: 'inaccessible',
      confidence: 0.2,
      reasons: ['본문 접근이 제한되었거나 추출 텍스트가 부족함'],
    };
  }

  if (hasNegativeTopic && !hasNameNearFirsthandSchoolContext) {
    return {
      status: 'mismatch',
      confidence: 0.92,
      reasons: ['다른 업종/주제의 글이며 대상 유치원명 주변에서 재원/학부모 후기 맥락을 확인하지 못함'],
    };
  }

  if (hasInstitutionOrVendorVoice && !hasNameNearFirsthandSchoolContext) {
    return {
      status: 'mismatch',
      confidence: 0.88,
      reasons: ['기관 공식/업체 홍보성 문맥이며 대상 유치원에 대한 실제 이용자 후기 맥락이 약함'],
    };
  }

  if (hasFullName && hasReviewContext && hasNameNearFirsthandSchoolContext) {
    return {
      status: 'verified',
      confidence: 0.9,
      reasons: ['본문에서 대상 유치원 정식명과 이름 주변의 재원/학부모 후기 맥락을 확인함'],
    };
  }

  if (hasCoreName && hasReviewContext && hasNameNearFirsthandSchoolContext) {
    return {
      status: 'verified',
      confidence: 0.76,
      reasons: ['본문에서 대상 유치원 핵심명과 이름 주변의 재원/학부모 후기 맥락을 확인함'],
    };
  }

  if (!hasFullName && !hasCoreName) {
    return {
      status: 'mismatch',
      confidence: 0.78,
      reasons: ['본문에서 대상 유치원명 또는 핵심명을 확인하지 못함'],
    };
  }

  return {
    status: 'uncertain',
    confidence: 0.45,
    reasons: [
      hasFirsthandSchoolContext
        ? '기관명은 확인되나 대상 이름 주변의 실제 재원/학부모 후기 맥락이 약해 보류'
        : '기관명은 일부 확인되나 실제 재원/학부모 후기 문맥이 약해 보류',
    ],
  };
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const targetSidos = parseSidos(getArgValue(args, '--sido'));
  const limit = getIntegerArg(args, '--limit', 0);
  const offset = getIntegerArg(args, '--offset', 0);
  const idsFile = getArgValue(args, '--ids-file');
  const concurrency = Math.max(1, getIntegerArg(args, '--concurrency', 4));
  const outputPath =
    getArgValue(args, '--output') ??
    path.resolve(
      'scripts/data-output',
      `review-direct-link-verification-${new Date().toISOString().slice(0, 10)}.json`
    );

  const reviewsData = JSON.parse(
    fs.readFileSync('public/data/reviews.json', 'utf8')
  ) as ReviewsData;
  const kindergartens = JSON.parse(
    fs.readFileSync('public/data/kindergartens.json', 'utf8')
  ) as KindergartenEntry[];
  const kindergartenMap = new Map(
    kindergartens.map((kindergarten) => [kindergarten.kindercode, kindergarten])
  );
  const targetIds = idsFile
    ? new Set(
        fs
          .readFileSync(idsFile, 'utf8')
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter(Boolean)
      )
    : null;

  const allTargets = Object.entries(reviewsData.reviews)
    .flatMap(([kindergartenId, reviews]) => {
      const kindergarten = kindergartenMap.get(kindergartenId);
      if (!kindergarten) {
        return [];
      }
      if (targetSidos && !targetSidos.has(kindergarten.sido_code)) {
        return [];
      }
      const targetReviews = targetIds
        ? reviews.filter((review) => targetIds.has(review.id))
        : reviews;
      return targetReviews.map((review) => ({ review, kindergarten }));
    })
    .slice(offset, limit > 0 ? offset + limit : undefined);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
  });
  const results: DirectVerificationResult[] = [];

  for (let index = 0; index < allTargets.length; index += concurrency) {
    const batch = allTargets.slice(index, index + concurrency);
    const batchResults = await Promise.all(
      batch.map(async ({ review, kindergarten }) => {
        const page = await context.newPage();
        try {
          const pageText = await extractPageText(page, review.url);
          const assessment = assessDirectMatch(review, kindergarten, pageText.text);
          return {
            reviewId: review.id,
            kindergartenId: review.kindergartenId,
            kindergartenName: kindergarten.name,
            sidoCode: kindergarten.sido_code,
            sigunguCode: kindergarten.sigungu_code,
            source: review.source,
            url: review.url,
            title: review.title,
            snippet: review.snippet,
            ...assessment,
            fetchedAt: new Date().toISOString(),
            finalUrl: pageText.finalUrl,
            textLength: pageText.text.length,
            bodyExcerpt: buildExcerpt(pageText.text),
          } satisfies DirectVerificationResult;
        } catch (error: unknown) {
          return {
            reviewId: review.id,
            kindergartenId: review.kindergartenId,
            kindergartenName: kindergarten.name,
            sidoCode: kindergarten.sido_code,
            sigunguCode: kindergarten.sigungu_code,
            source: review.source,
            url: review.url,
            title: review.title,
            snippet: review.snippet,
            status: 'inaccessible',
            confidence: 0.1,
            reasons: ['페이지 직접 접근 실패'],
            fetchedAt: new Date().toISOString(),
            textLength: 0,
            bodyExcerpt: '',
            error: error instanceof Error ? error.message : String(error),
          } satisfies DirectVerificationResult;
        } finally {
          await page.close().catch(() => {});
        }
      })
    );

    results.push(...batchResults);
    process.stdout.write(
      `[direct] ${Math.min(index + batch.length, allTargets.length)}/${allTargets.length}\n`
    );
  }

  await browser.close();

  const summary = results.reduce<Record<string, number>>((accumulator, result) => {
    accumulator[result.status] = (accumulator[result.status] ?? 0) + 1;
    return accumulator;
  }, {});

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(
    outputPath,
    JSON.stringify(
      sanitizeJsonValue({
        generatedAt: new Date().toISOString(),
        targetSidos: targetSidos ? Array.from(targetSidos) : 'all',
        offset,
        limit,
        totalCount: results.length,
        summary,
        reviews: results,
      }),
      null,
      2
    )
  );

  process.stdout.write(`output: ${outputPath}\n`);
  process.stdout.write(`summary: ${JSON.stringify(summary)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exit(1);
});

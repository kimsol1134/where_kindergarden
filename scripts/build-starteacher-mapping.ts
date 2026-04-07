/**
 * 별별선생 기관 매핑 구축 스크립트
 *
 * starteacher.co.kr의 기관 목록을 수집하고
 * kindergartens.json과 이름+주소+좌표로 매핑합니다.
 *
 * 사용법:
 *   pnpm tsx scripts/build-starteacher-mapping.ts -- --sido 28         # 인천
 *   pnpm tsx scripts/build-starteacher-mapping.ts -- --sido 11 --test  # 서울 (5개만)
 *
 * 참고: discover-starteacher-api.ts로 발견한 엔드포인트 정보가 필요합니다.
 *       엔드포인트가 변경되면 STARTEACHER_* 상수를 업데이트하세요.
 */

import { chromium } from '@playwright/test';
import {
  loadPlatformMapping,
  savePlatformMapping,
  findBestMatch,
  type MatchCandidate,
} from './lib/platform-id-mapping';
import {
  loadKindergartens,
  parseSidoCodes,
  type KindergartenEntry,
} from './lib/review-verification-pipeline';

interface StarteacherInstitution {
  id: number;
  name_ko: string;
  type: string;
  attribute?: {
    address?: string;
    geo_latitude?: number;
    geo_longitude?: number;
  };
  region?: {
    full_name?: string;
  };
}

function writeLine(message: string): void {
  process.stdout.write(`${message}\n`);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
 * __NEXT_DATA__에서 기관 목록을 추출합니다.
 * discover-starteacher-api.ts로 발견한 패턴을 기반으로 합니다.
 */
async function fetchStarteacherInstitutions(
  maxPages: number
): Promise<StarteacherInstitution[]> {
  writeLine('별별선생 기관 목록 수집 중...');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  const allInstitutions: StarteacherInstitution[] = [];

  try {
    for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
      const url = `https://www.starteacher.co.kr/kindergarten/institutes?page=${pageNum}`;
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

      const institutions = await page.evaluate(() => {
        const el = document.querySelector('script#__NEXT_DATA__');
        if (!el) return [];

        try {
          const data = JSON.parse(el.textContent ?? '');
          const pageProps = data.props?.pageProps ?? {};

          // 기관 목록은 pageProps 내 institutes, items, data 등의 키에 있을 수 있음
          const possibleKeys = [
            'institutes',
            'items',
            'data',
            'results',
            'list',
            'institutions',
          ];

          for (const key of possibleKeys) {
            const value = pageProps[key];
            if (Array.isArray(value) && value.length > 0) {
              return value;
            }

            // 중첩된 경우: { items: [...], total: N }
            if (value && typeof value === 'object' && 'items' in value) {
              const inner = (value as Record<string, unknown>).items;
              if (Array.isArray(inner)) return inner;
            }
            if (value && typeof value === 'object' && 'data' in value) {
              const inner = (value as Record<string, unknown>).data;
              if (Array.isArray(inner)) return inner;
            }
          }

          // fallback: pageProps 자체에 배열이 있는지 확인
          for (const value of Object.values(pageProps)) {
            if (Array.isArray(value) && value.length > 0) {
              const first = value[0];
              if (
                first &&
                typeof first === 'object' &&
                ('name_ko' in first || 'name' in first)
              ) {
                return value;
              }
            }
          }

          return [];
        } catch {
          return [];
        }
      });

      if (institutions.length === 0) {
        writeLine(`  Page ${pageNum}: 기관 없음 — 수집 종료`);
        break;
      }

      allInstitutions.push(
        ...institutions.map((inst: Record<string, unknown>) => ({
          id: typeof inst.id === 'number' ? inst.id : 0,
          name_ko: String(inst.name_ko ?? inst.name ?? ''),
          type: String(inst.type ?? ''),
          attribute: inst.attribute as StarteacherInstitution['attribute'],
          region: inst.region as StarteacherInstitution['region'],
        }))
      );

      writeLine(`  Page ${pageNum}: ${institutions.length}개 수집 (누계: ${allInstitutions.length})`);
      await delay(1500);
    }
  } finally {
    await browser.close();
  }

  return allInstitutions;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const sidos = parseSidoCodes(getArgValue(args, '--sido'), ['28']);
  const testMode = hasFlag(args, '--test');
  const resume = hasFlag(args, '--resume');
  const maxPages = testMode ? 3 : 5000;

  const kindergartens = loadKindergartens() as Array<
    KindergartenEntry & { lat: number | null; lng: number | null }
  >;
  const targetKindergartens = kindergartens.filter((k) =>
    sidos.includes(k.sido_code)
  );

  if (testMode) {
    targetKindergartens.splice(5);
  }

  writeLine(`대상 유치원: ${targetKindergartens.length}개 (시도: ${sidos.join(',')})`);

  const existing = resume ? loadPlatformMapping('starteacher') : new Map<string, string>();
  if (resume && existing.size > 0) {
    writeLine(`기존 매핑 로드: ${existing.size}건`);
  }

  // 별별선생 기관 수집
  const institutions = await fetchStarteacherInstitutions(maxPages);
  writeLine(`별별선생 기관 수집 완료: ${institutions.length}개`);

  if (institutions.length === 0) {
    writeLine('[WARN] 기관을 수집하지 못했습니다. discover-starteacher-api.ts를 먼저 실행하여 API 구조를 확인하세요.');
    return;
  }

  // 유치원 타입만 필터링
  const kindergartenInstitutions = institutions.filter(
    (inst) =>
      inst.type === 'kindergarten' ||
      inst.name_ko.includes('유치원') ||
      inst.name_ko.includes('어린이집')
  );
  writeLine(`유치원/어린이집 필터: ${kindergartenInstitutions.length}개`);

  // MatchCandidate로 변환
  const candidates: MatchCandidate[] = kindergartenInstitutions.map((inst) => ({
    id: String(inst.id),
    name: inst.name_ko,
    address: inst.attribute?.address ?? inst.region?.full_name ?? '',
    lat: inst.attribute?.geo_latitude,
    lng: inst.attribute?.geo_longitude,
  }));

  // 매핑 실행
  const mapping = new Map(existing);
  let matchCount = 0;
  let skipCount = 0;

  for (const kindergarten of targetKindergartens) {
    if (mapping.has(kindergarten.kindercode)) {
      continue;
    }

    const match = findBestMatch(
      kindergarten.name,
      kindergarten.address,
      kindergarten.lat ?? null,
      kindergarten.lng ?? null,
      candidates,
      500
    );

    if (match) {
      mapping.set(kindergarten.kindercode, match.candidateId);
      matchCount++;
      if (testMode) {
        writeLine(
          `  [MATCH] ${kindergarten.name} → ${match.candidateId} (${match.confidence.toFixed(2)}, ${match.reason})`
        );
      }
    } else {
      skipCount++;
    }
  }

  savePlatformMapping('starteacher', mapping);
  writeLine(`\n완료: ${matchCount}건 매칭, ${skipCount}건 스킵`);
  writeLine(`총 매핑: ${mapping.size}건 저장`);
}

main().catch((error) => {
  process.stderr.write(
    `[FATAL] ${error instanceof Error ? error.message : String(error)}\n`
  );
  process.exit(1);
});

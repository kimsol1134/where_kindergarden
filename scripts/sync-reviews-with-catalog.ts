/**
 * 후기 데이터를 최신 유치원 공시 카탈로그와 다시 결합한다.
 *
 * - 현재 기관의 sido/sigungu 코드로 후기 샤드를 재배치한다.
 * - 현재 카탈로그에 없는 기관 후기는 공개 데이터에서 제외하고 감사 스냅샷에 보관한다.
 * - 통합/시도/시군구 파일을 한 번에 생성해 서로 다른 버전이 섞이지 않게 한다.
 *
 * 사용법:
 *   pnpm sync:reviews-catalog
 *   pnpm sync:reviews-catalog -- --dry-run
 */

import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ReviewLink, ReviewsData } from '../src/types/review';
import { normalizeReviewUrl } from '../src/lib/utils/review-verification';

interface KindergartenCatalogEntry {
  kindercode: string;
  name: string;
  address: string;
  sido_code: string;
  sigungu_code: string;
}

interface ReviewCatalogMetadata {
  schemaVersion: 1;
  status: 'complete';
  version: string;
  generatedAt: string;
  catalogSourceVersion: string;
  catalogCount: number;
  sourceFileCount: number;
  sourceReviewCount: number;
  publishedReviewCount: number;
  coveredKindergartenCount: number;
  coverageRate: number;
  excludedOrphanReviewCount: number;
  excludedOrphanKindergartenCount: number;
  duplicateReviewCount: number;
  retiredReviewCount: number;
  retiredKindergartenCount: number;
  newlyRetiredReviewCount: number;
  restoredReviewCount: number;
  sidoCount: number;
  sigunguCount: number;
  checksumSha256: string;
}

interface RetiredReviewsData {
  schemaVersion: 1;
  updatedAt: string;
  totalCount: number;
  kindergartenCount: number;
  reviews: Record<string, ReviewLink[]>;
}

const ROOT = process.cwd();
const PUBLIC_DATA_DIR = path.join(ROOT, 'public', 'data');
const REVIEWS_DIR = path.join(PUBLIC_DATA_DIR, 'reviews');
const KINDERGARTENS_PATH = path.join(PUBLIC_DATA_DIR, 'kindergartens.json');
const KINDERGARTENS_META_PATH = path.join(PUBLIC_DATA_DIR, 'kindergartens.meta.json');
const COMBINED_PATH = path.join(PUBLIC_DATA_DIR, 'reviews.json');
const META_PATH = path.join(PUBLIC_DATA_DIR, 'reviews.meta.json');
const OUTPUT_DIR = path.join(ROOT, 'scripts', 'data-output');
const RETIRED_REVIEWS_PATH = path.join(ROOT, 'scripts', 'data', 'retired-reviews.json');

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function atomicWriteJson(filePath: string, value: unknown): void {
  const directory = path.dirname(filePath);
  fs.mkdirSync(directory, { recursive: true });
  const temporaryPath = path.join(
    directory,
    `.${path.basename(filePath)}.${process.pid}.${Date.now()}.tmp`
  );
  fs.writeFileSync(temporaryPath, JSON.stringify(value, null, 2));
  fs.renameSync(temporaryPath, filePath);
}

function assertReviewsPath(targetPath: string): void {
  const resolved = path.resolve(targetPath);
  const root = `${path.resolve(REVIEWS_DIR)}${path.sep}`;
  if (!resolved.startsWith(root)) {
    throw new Error(`Refusing to remove path outside review shards: ${resolved}`);
  }
}

function reviewKey(review: ReviewLink): string {
  if (review.source === 'naver_place' || review.source === 'starteacher') {
    return `id:${review.id}`;
  }
  return `url:${normalizeReviewUrl(review.url)}`;
}

function makeDataset(version: string, reviews: Record<string, ReviewLink[]>): ReviewsData {
  return {
    version,
    totalCount: Object.values(reviews).reduce((sum, items) => sum + items.length, 0),
    kindergartenCount: Object.keys(reviews).length,
    reviews,
  };
}

function sortedReviewsRecord(
  buckets: Map<string, ReviewLink[]>
): Record<string, ReviewLink[]> {
  return Object.fromEntries(
    Array.from(buckets.entries())
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([kindercode, reviews]) => [
        kindercode,
        reviews.toSorted(
          (left, right) =>
            (right.date ?? right.collectedAt).localeCompare(left.date ?? left.collectedAt) ||
            left.id.localeCompare(right.id)
        ),
      ])
  );
}

export function addReviews(
  buckets: Map<string, ReviewLink[]>,
  keysByKindergarten: Map<string, Set<string>>,
  kindercode: string,
  reviews: ReviewLink[]
): { added: number; duplicates: number } {
  const bucket = buckets.get(kindercode) ?? [];
  const keys = keysByKindergarten.get(kindercode) ?? new Set<string>();
  let added = 0;
  let duplicates = 0;
  for (const review of reviews) {
    const key = reviewKey(review);
    if (keys.has(key)) {
      duplicates += 1;
      continue;
    }
    keys.add(key);
    bucket.push({ ...review, kindergartenId: kindercode });
    added += 1;
  }
  buckets.set(kindercode, bucket);
  keysByKindergarten.set(kindercode, keys);
  return { added, duplicates };
}

export function restoreRetiredReviews(
  activeBuckets: Map<string, ReviewLink[]>,
  activeKeys: Map<string, Set<string>>,
  retiredBuckets: Map<string, ReviewLink[]>,
  retiredKeys: Map<string, Set<string>>,
  currentKindergartenIDs: ReadonlySet<string>
): number {
  let restoredReviewCount = 0;
  for (const [kindercode, reviews] of Array.from(retiredBuckets.entries())) {
    if (!currentKindergartenIDs.has(kindercode)) continue;
    restoredReviewCount += addReviews(
      activeBuckets,
      activeKeys,
      kindercode,
      reviews
    ).added;
    retiredBuckets.delete(kindercode);
    retiredKeys.delete(kindercode);
  }
  return restoredReviewCount;
}

function makeRetiredDataset(
  updatedAt: string,
  reviews: Record<string, ReviewLink[]>
): RetiredReviewsData {
  return {
    schemaVersion: 1,
    updatedAt,
    totalCount: Object.values(reviews).reduce((sum, items) => sum + items.length, 0),
    kindergartenCount: Object.keys(reviews).length,
    reviews,
  };
}

function optionalArgument(flag: string): string | null {
  const index = process.argv.indexOf(flag);
  if (index === -1) return null;
  const value = process.argv[index + 1];
  if (!value || value.startsWith('--')) {
    throw new Error(`${flag} requires a file path`);
  }
  return path.resolve(ROOT, value);
}

function main(): void {
  const dryRun = process.argv.includes('--dry-run');
  const retiredSeedPath = optionalArgument('--seed-retired-from');
  const generatedAt = new Date().toISOString();
  const version = generatedAt.slice(0, 10);
  const kindergartens = readJson<KindergartenCatalogEntry[]>(KINDERGARTENS_PATH);
  const kindergartenByID = new Map(kindergartens.map((item) => [item.kindercode, item]));
  const kindergartenIDs = new Set(kindergartenByID.keys());
  const kindergartenMeta = fs.existsSync(KINDERGARTENS_META_PATH)
    ? readJson<{ sourceVersion?: string }>(KINDERGARTENS_META_PATH)
    : {};

  const sourceFiles = fs
    .readdirSync(REVIEWS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isFile() && (/^\d{2}\.json$/.test(entry.name) || entry.name === 'unknown.json'))
    .map((entry) => entry.name)
    .toSorted();
  if (sourceFiles.length === 0) {
    throw new Error('No review region files found');
  }

  const activeBuckets = new Map<string, ReviewLink[]>();
  const activeKeys = new Map<string, Set<string>>();
  const retiredBuckets = new Map<string, ReviewLink[]>();
  const retiredKeys = new Map<string, Set<string>>();
  let sourceReviewCount = 0;
  let duplicateReviewCount = 0;
  let newlyRetiredReviewCount = 0;
  let restoredReviewCount = 0;
  const newlyRetiredKindergartens = new Set<string>();

  const retiredSources = [
    ...(fs.existsSync(RETIRED_REVIEWS_PATH) ? [RETIRED_REVIEWS_PATH] : []),
    ...(retiredSeedPath ? [retiredSeedPath] : []),
  ];
  for (const sourcePath of retiredSources) {
    if (!fs.existsSync(sourcePath)) {
      throw new Error(`Retired review source not found: ${sourcePath}`);
    }
    const retired = readJson<Pick<RetiredReviewsData, 'reviews'>>(sourcePath);
    for (const [kindercode, reviews] of Object.entries(retired.reviews)) {
      addReviews(retiredBuckets, retiredKeys, kindercode, reviews);
    }
  }

  for (const fileName of sourceFiles) {
    const dataset = readJson<ReviewsData>(path.join(REVIEWS_DIR, fileName));
    for (const [kindercode, reviews] of Object.entries(dataset.reviews)) {
      sourceReviewCount += reviews.length;
      const kindergarten = kindergartenByID.get(kindercode);
      if (!kindergarten) {
        const result = addReviews(
          retiredBuckets,
          retiredKeys,
          kindercode,
          reviews
        );
        newlyRetiredReviewCount += result.added;
        duplicateReviewCount += result.duplicates;
        if (result.added > 0) newlyRetiredKindergartens.add(kindercode);
        continue;
      }

      duplicateReviewCount += addReviews(
        activeBuckets,
        activeKeys,
        kindercode,
        reviews
      ).duplicates;
    }
  }

  // A temporarily absent institution can reappear in a later official
  // disclosure. Restore its reviews automatically instead of leaving two
  // competing copies in the active and retired datasets.
  restoredReviewCount = restoreRetiredReviews(
    activeBuckets,
    activeKeys,
    retiredBuckets,
    retiredKeys,
    kindergartenIDs
  );

  const combinedReviews = sortedReviewsRecord(activeBuckets);
  const combined = makeDataset(version, combinedReviews);
  if (combined.totalCount < 5_000) {
    throw new Error(`Unexpected review count after catalog join: ${combined.totalCount}`);
  }

  const bySido = new Map<string, Map<string, ReviewLink[]>>();
  const bySigungu = new Map<string, Map<string, ReviewLink[]>>();
  for (const [kindercode, reviews] of Object.entries(combinedReviews)) {
    const kindergarten = kindergartenByID.get(kindercode)!;
    const sidoBucket = bySido.get(kindergarten.sido_code) ?? new Map<string, ReviewLink[]>();
    sidoBucket.set(kindercode, reviews);
    bySido.set(kindergarten.sido_code, sidoBucket);

    const sigunguKey = `${kindergarten.sido_code}/${kindergarten.sigungu_code}`;
    const sigunguBucket = bySigungu.get(sigunguKey) ?? new Map<string, ReviewLink[]>();
    sigunguBucket.set(kindercode, reviews);
    bySigungu.set(sigunguKey, sigunguBucket);
  }

  const checksum = crypto
    .createHash('sha256')
    .update(JSON.stringify(combinedReviews))
    .digest('hex');
  const retiredReviews = sortedReviewsRecord(retiredBuckets);
  const retired = makeRetiredDataset(generatedAt, retiredReviews);
  const metadata: ReviewCatalogMetadata = {
    schemaVersion: 1,
    status: 'complete',
    version,
    generatedAt,
    catalogSourceVersion: kindergartenMeta.sourceVersion ?? 'unknown',
    catalogCount: kindergartens.length,
    sourceFileCount: sourceFiles.length,
    sourceReviewCount,
    publishedReviewCount: combined.totalCount,
    coveredKindergartenCount: combined.kindergartenCount,
    coverageRate: combined.kindergartenCount / kindergartens.length,
    excludedOrphanReviewCount: newlyRetiredReviewCount,
    excludedOrphanKindergartenCount: newlyRetiredKindergartens.size,
    duplicateReviewCount,
    retiredReviewCount: retired.totalCount,
    retiredKindergartenCount: retired.kindergartenCount,
    newlyRetiredReviewCount,
    restoredReviewCount,
    sidoCount: bySido.size,
    sigunguCount: bySigungu.size,
    checksumSha256: checksum,
  };

  process.stdout.write(
    `Review catalog join: ${combined.totalCount}/${sourceReviewCount} reviews, ` +
      `${combined.kindergartenCount}/${kindergartens.length} kindergartens, ` +
      `newly-retired=${newlyRetiredReviewCount}, retired=${retired.totalCount}, ` +
      `restored=${restoredReviewCount}, duplicates=${duplicateReviewCount}\n`
  );
  if (dryRun) {
    process.stdout.write('Dry-run complete; no files were written\n');
    return;
  }

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  if (newlyRetiredReviewCount > 0) {
    atomicWriteJson(
      path.join(OUTPUT_DIR, `reviews-orphaned-${generatedAt.replace(/[:.]/g, '-')}.json`),
      {
        generatedAt,
        catalogSourceVersion: metadata.catalogSourceVersion,
        totalCount: retired.totalCount,
        kindergartenCount: retired.kindergartenCount,
        reviews: retiredReviews,
      }
    );
  }
  atomicWriteJson(RETIRED_REVIEWS_PATH, retired);

  // 기존 생성 샤드를 명시적으로 비운 뒤 현재 코드표 기준 파일만 다시 쓴다.
  for (const entry of fs.readdirSync(REVIEWS_DIR, { withFileTypes: true })) {
    if (!/^\d{2}(\.json)?$/.test(entry.name) && entry.name !== 'unknown.json') {
      continue;
    }
    const targetPath = path.join(REVIEWS_DIR, entry.name);
    assertReviewsPath(targetPath);
    if (entry.isDirectory()) {
      fs.rmSync(targetPath, { recursive: true });
    } else if (entry.isFile()) {
      fs.unlinkSync(targetPath);
    }
  }

  for (const [sidoCode, buckets] of bySido.entries()) {
    atomicWriteJson(
      path.join(REVIEWS_DIR, `${sidoCode}.json`),
      makeDataset(version, sortedReviewsRecord(buckets))
    );
  }
  for (const [key, buckets] of bySigungu.entries()) {
    const [sidoCode, sigunguCode] = key.split('/');
    atomicWriteJson(
      path.join(REVIEWS_DIR, sidoCode, `${sigunguCode}.json`),
      makeDataset(version, sortedReviewsRecord(buckets))
    );
  }

  atomicWriteJson(COMBINED_PATH, combined);
  atomicWriteJson(META_PATH, metadata);
  process.stdout.write(`Published review shards and metadata atomically per file (version=${version})\n`);
}

const isMainModule =
  process.argv[1] !== undefined && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMainModule) main();

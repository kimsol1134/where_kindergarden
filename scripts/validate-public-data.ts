/**
 * 공개 데이터 세트의 구조, 교차 참조, 최신성 SLA를 한 번에 검증한다.
 *
 * 사용법:
 *   pnpm validate:data
 *   pnpm validate:data -- --write-manifest
 *   pnpm validate:data -- --allow-stale   # 구조만 검증
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { createHash } from 'node:crypto';
import { SIGUNGU_CODES } from './data/sigungu-codes';
import type { ReviewLink, ReviewsData } from '../src/types/review';
import type { VacancyDataset } from '../src/types/vacancy';

interface KindergartenEntry {
  kindercode: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  type: 'public' | 'private';
  sido_code: string;
  sigungu_code: string;
  capacity: number;
  current_count: number;
  has_bus: boolean;
  bus_count: number;
  has_after_school: boolean;
  area_per_child: number;
  has_playground: boolean;
  classroom_area: number;
  indoor_playground_area: number;
  outdoor_playground_area: number;
  teacher_count: number;
  senior_teacher_count: number;
  cctv_count: number;
}

interface KindergartenMetadata {
  status: string;
  source: string;
  sourceVersion: string;
  sourceLabel: string;
  collectedAt: string;
  totalCount: number;
  registryCount: number;
  registryJoinCoverage: number;
  componentCoverage: Record<string, number>;
  regionCodeCount: number;
  regionResolution: Record<string, number>;
  coordinateResolution: Record<string, number>;
  checksumSha256: string;
}

interface ReviewMetadata {
  status: string;
  version: string;
  generatedAt: string;
  catalogSourceVersion: string;
  catalogCount: number;
  sourceReviewCount: number;
  publishedReviewCount: number;
  coveredKindergartenCount: number;
  coverageRate: number;
  excludedOrphanReviewCount: number;
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
  schemaVersion: number;
  updatedAt: string;
  totalCount: number;
  kindergartenCount: number;
  reviews: Record<string, ReviewLink[]>;
}

interface RegionMetadata {
  status: string;
  source: string;
  checkedAt: string;
  totalCount: number;
  sidoCount: number;
  checksumSha256: string;
}

interface VacancyQuality {
  status: string;
  startedAt: string;
  completedAt: string;
  regionsRequested: number;
  regionsSucceeded: number;
  regionsFailed: number;
  listCompleteness: number;
  detailRequested: number;
  detailSucceeded: number;
  detailFailed: number;
  detailCoverage: number;
  failures: Array<{
    stage: 'list' | 'detail';
    key: string;
    message: string;
  }>;
}

interface VacancyDatasetWithQuality extends VacancyDataset {
  quality?: VacancyQuality;
}

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, 'public', 'data');
const RETIRED_REVIEWS_PATH = path.join(ROOT, 'scripts', 'data', 'retired-reviews.json');
const MAX_AGE_HOURS = {
  kindergartens: 14 * 24,
  // This measures reconciliation against the current official catalog. Review
  // discovery has a separate, non-blocking target because removals require
  // human curation and must not stop official catalog publication.
  reviews: 14 * 24,
  vacancy: 72,
  regionCodes: 14 * 24,
} as const;
const REVIEW_CONTENT_TARGET_AGE_HOURS = 30 * 24;

function readJson<T>(fileName: string): T {
  return JSON.parse(fs.readFileSync(path.join(DATA_DIR, fileName), 'utf8')) as T;
}

function readDataText(fileName: string): string {
  return fs.readFileSync(path.join(DATA_DIR, fileName), 'utf8');
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function parseTimestamp(value: string): number {
  // Older collection jobs emitted timezone-less timestamps in Korea local time.
  // Normalize those explicitly so local and GitHub UTC runs agree.
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? `${value}T00:00:00+09:00`
    : /(?:Z|[+-]\d{2}:\d{2})$/i.test(value)
      ? value
      : `${value}+09:00`;
  const timestamp = Date.parse(normalized);
  assert(Number.isFinite(timestamp), `Invalid timestamp: ${value}`);
  return timestamp;
}

function ageHours(value: string, now: Date): number {
  const timestamp = parseTimestamp(value);
  const age = (now.getTime() - timestamp) / 3_600_000;
  assert(age >= -1, `Timestamp is unexpectedly in the future: ${value}`);
  return age;
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function sortedNames(values: Iterable<string>): string[] {
  return Array.from(values).toSorted();
}

function assertSameNames(actual: Iterable<string>, expected: Iterable<string>, label: string): void {
  const actualNames = sortedNames(actual);
  const expectedNames = sortedNames(expected);
  assert(
    JSON.stringify(actualNames) === JSON.stringify(expectedNames),
    `${label} mismatch: actual=${actualNames.join(',')} expected=${expectedNames.join(',')}`
  );
}

function assertDatasetEqual(
  actual: ReviewsData,
  expectedReviews: Record<string, ReviewLink[]>,
  version: string,
  label: string
): void {
  const expectedCount = Object.values(expectedReviews).reduce((sum, items) => sum + items.length, 0);
  assert(actual.version === version, `${label} version mismatch`);
  assert(actual.totalCount === expectedCount, `${label} totalCount mismatch`);
  assert(actual.kindergartenCount === Object.keys(expectedReviews).length, `${label} kindergartenCount mismatch`);
  assert(JSON.stringify(actual.reviews) === JSON.stringify(expectedReviews), `${label} content mismatch`);
}

function atomicWriteJson(filePath: string, value: unknown): void {
  const temporaryPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(temporaryPath, JSON.stringify(value, null, 2));
  fs.renameSync(temporaryPath, filePath);
}

function validWebURL(review: ReviewLink): boolean {
  try {
    const url = new URL(review.url);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function main(): void {
  const now = new Date();
  const allowStale = process.argv.includes('--allow-stale');
  const writeManifest = process.argv.includes('--write-manifest');

  const kindergartens = readJson<KindergartenEntry[]>('kindergartens.json');
  const kindergartenMeta = readJson<KindergartenMetadata>('kindergartens.meta.json');
  const reviews = readJson<ReviewsData>('reviews.json');
  const reviewMeta = readJson<ReviewMetadata>('reviews.meta.json');
  assert(fs.existsSync(RETIRED_REVIEWS_PATH), 'Retired review archive is missing');
  const retiredReviews = JSON.parse(
    fs.readFileSync(RETIRED_REVIEWS_PATH, 'utf8')
  ) as RetiredReviewsData;
  const regionMeta = readJson<RegionMetadata>('region-codes.meta.json');
  const vacancy = readJson<VacancyDatasetWithQuality>('vacancy.json');

  const forbiddenPublicArtifacts = [
    'reviews.backup.json',
    'manual_collection_targets_incheon.csv',
  ].filter((fileName) => fs.existsSync(path.join(DATA_DIR, fileName)));
  assert(
    forbiddenPublicArtifacts.length === 0,
    `Internal/stale artifacts must not be deployed from public/data: ${forbiddenPublicArtifacts.join(', ')}`
  );

  assert(kindergartenMeta.status === 'complete', 'Kindergarten catalog is not complete');
  assert(kindergartens.length === kindergartenMeta.totalCount, 'Kindergarten count metadata mismatch');
  assert(kindergartenMeta.registryCount >= kindergartens.length, 'Kindergarten registry count is incomplete');
  assert(kindergartenMeta.registryJoinCoverage >= 0.999, 'Registry join coverage is below 99.9%');
  assert(kindergartenMeta.regionCodeCount === SIGUNGU_CODES.length, 'Kindergarten region-code count mismatch');
  assert(
    Object.values(kindergartenMeta.regionResolution).reduce((sum, count) => sum + count, 0) ===
      kindergartens.length,
    'Kindergarten region-resolution totals mismatch'
  );
  assert(
    Object.values(kindergartenMeta.coordinateResolution).reduce((sum, count) => sum + count, 0) ===
      kindergartens.length,
    'Kindergarten coordinate-resolution totals mismatch'
  );
  assert(
    sha256(readDataText('kindergartens.json')) === kindergartenMeta.checksumSha256,
    'Kindergarten catalog checksum mismatch'
  );
  for (const [component, coverage] of Object.entries(kindergartenMeta.componentCoverage)) {
    assert(coverage >= 0.99, `Kindergarten component coverage is below 99%: ${component}`);
  }

  const kindergartenIDs = new Set(kindergartens.map((item) => item.kindercode));
  assert(kindergartenIDs.size === kindergartens.length, 'Duplicate kindergarten IDs found');
  const kindergartenByID = new Map(kindergartens.map((item) => [item.kindercode, item]));
  const officialRegionKeys = new Set(
    SIGUNGU_CODES.map((region) => `${region.adminSidoCode}/${region.sggCode}`)
  );
  const nonNegativeKindergartenFields = [
    'capacity',
    'current_count',
    'bus_count',
    'area_per_child',
    'classroom_area',
    'indoor_playground_area',
    'outdoor_playground_area',
    'teacher_count',
    'senior_teacher_count',
    'cctv_count',
  ];
  for (const kindergarten of kindergartens) {
    assert(kindergarten.name.length > 0 && kindergarten.address.length > 0, `Missing name/address: ${kindergarten.kindercode}`);
    assert(kindergarten.type === 'public' || kindergarten.type === 'private', `Invalid type: ${kindergarten.kindercode}`);
    assert(Number.isFinite(kindergarten.lat) && Number.isFinite(kindergarten.lng), `Missing coordinates: ${kindergarten.kindercode}`);
    assert(kindergarten.lat >= 32 && kindergarten.lat <= 39.5, `Invalid latitude: ${kindergarten.kindercode}`);
    assert(kindergarten.lng >= 124 && kindergarten.lng <= 132, `Invalid longitude: ${kindergarten.kindercode}`);
    const record = kindergarten as unknown as Record<string, unknown>;
    for (const field of nonNegativeKindergartenFields) {
      const value = record[field];
      assert(
        typeof value === 'number' && Number.isFinite(value) && value >= 0,
        `Invalid non-negative kindergarten field: ${kindergarten.kindercode}/${field}`
      );
    }
    assert(typeof kindergarten.has_bus === 'boolean', `Invalid has_bus: ${kindergarten.kindercode}`);
    assert(typeof kindergarten.has_after_school === 'boolean', `Invalid has_after_school: ${kindergarten.kindercode}`);
    assert(typeof kindergarten.has_playground === 'boolean', `Invalid has_playground: ${kindergarten.kindercode}`);
    assert(
      officialRegionKeys.has(`${kindergarten.sido_code}/${kindergarten.sigungu_code}`),
      `Unknown current region code: ${kindergarten.kindercode} ${kindergarten.sido_code}/${kindergarten.sigungu_code}`
    );
  }

  const reviewEntries = Object.entries(reviews.reviews);
  const calculatedReviewCount = reviewEntries.reduce((sum, [, items]) => sum + items.length, 0);
  assert(calculatedReviewCount === reviews.totalCount, 'Combined review totalCount mismatch');
  assert(reviewEntries.length === reviews.kindergartenCount, 'Combined review kindergartenCount mismatch');
  assert(reviewMeta.status === 'complete', 'Review catalog reconciliation is not complete');
  assert(reviewMeta.catalogSourceVersion === kindergartenMeta.sourceVersion, 'Review/catalog source version mismatch');
  assert(reviewMeta.catalogCount === kindergartens.length, 'Review metadata catalog count mismatch');
  assert(reviewMeta.publishedReviewCount === reviews.totalCount, 'Review metadata count mismatch');
  assert(reviewMeta.coveredKindergartenCount === reviews.kindergartenCount, 'Review coverage count mismatch');
  assert(
    Math.abs(reviewMeta.coverageRate - reviews.kindergartenCount / kindergartens.length) < 1e-12,
    'Review coverage rate mismatch'
  );
  assert(
    reviewMeta.publishedReviewCount +
      reviewMeta.excludedOrphanReviewCount +
      reviewMeta.duplicateReviewCount ===
      reviewMeta.sourceReviewCount + reviewMeta.restoredReviewCount,
    'Review reconciliation accounting mismatch'
  );
  assert(
    reviewMeta.excludedOrphanReviewCount === reviewMeta.newlyRetiredReviewCount,
    'Review newly-retired metadata mismatch'
  );
  assert(
    sha256(JSON.stringify(reviews.reviews)) === reviewMeta.checksumSha256,
    'Review dataset checksum mismatch'
  );

  const reviewIDs = new Set<string>();
  const expectedSidoReviews = new Map<string, Record<string, ReviewLink[]>>();
  const expectedSigunguReviews = new Map<string, Record<string, ReviewLink[]>>();
  for (const [kindercode, items] of reviewEntries) {
    const kindergarten = kindergartenByID.get(kindercode);
    assert(kindergarten, `Review references a non-current kindergarten: ${kindercode}`);
    const sidoBucket = expectedSidoReviews.get(kindergarten.sido_code) ?? {};
    sidoBucket[kindercode] = items;
    expectedSidoReviews.set(kindergarten.sido_code, sidoBucket);
    const sigunguKey = `${kindergarten.sido_code}/${kindergarten.sigungu_code}`;
    const sigunguBucket = expectedSigunguReviews.get(sigunguKey) ?? {};
    sigunguBucket[kindercode] = items;
    expectedSigunguReviews.set(sigunguKey, sigunguBucket);

    for (const review of items) {
      assert(review.id.length > 0, `Review has no ID: ${kindercode}`);
      assert(!reviewIDs.has(review.id), `Duplicate global review ID: ${review.id}`);
      reviewIDs.add(review.id);
      assert(review.kindergartenId === kindercode, `Review kindergartenId mismatch: ${review.id}`);
      assert(review.title.trim().length > 0, `Review has no title: ${review.id}`);
      assert(validWebURL(review), `Review has an invalid URL: ${review.id}`);
      assert(ageHours(review.collectedAt, now) >= 0, `Review collectedAt is in the future: ${review.id}`);
    }
  }

  const retiredEntries = Object.entries(retiredReviews.reviews);
  const calculatedRetiredCount = retiredEntries.reduce((sum, [, items]) => sum + items.length, 0);
  assert(retiredReviews.schemaVersion === 1, 'Unsupported retired-review schema');
  assert(calculatedRetiredCount === retiredReviews.totalCount, 'Retired review totalCount mismatch');
  assert(retiredEntries.length === retiredReviews.kindergartenCount, 'Retired kindergartenCount mismatch');
  assert(reviewMeta.retiredReviewCount === retiredReviews.totalCount, 'Retired review metadata count mismatch');
  assert(
    reviewMeta.retiredKindergartenCount === retiredReviews.kindergartenCount,
    'Retired kindergarten metadata count mismatch'
  );
  assert(ageHours(retiredReviews.updatedAt, now) >= 0, 'Retired review archive timestamp is in the future');
  for (const [kindercode, items] of retiredEntries) {
    assert(!kindergartenByID.has(kindercode), `Retired reviews reference a current kindergarten: ${kindercode}`);
    for (const review of items) {
      assert(review.id.length > 0, `Retired review has no ID: ${kindercode}`);
      assert(!reviewIDs.has(review.id), `Review ID exists in active and retired data: ${review.id}`);
      reviewIDs.add(review.id);
      assert(review.kindergartenId === kindercode, `Retired review kindergartenId mismatch: ${review.id}`);
      assert(review.title.trim().length > 0, `Retired review has no title: ${review.id}`);
      assert(validWebURL(review), `Retired review has an invalid URL: ${review.id}`);
      assert(ageHours(review.collectedAt, now) >= 0, `Retired review collectedAt is in the future: ${review.id}`);
    }
  }

  const reviewsDirectory = path.join(DATA_DIR, 'reviews');
  const reviewDirectoryEntries = fs.readdirSync(reviewsDirectory, { withFileTypes: true });
  const topLevelShardFiles = reviewDirectoryEntries
    .filter((entry) => entry.isFile() && /^\d{2}\.json$/.test(entry.name))
    .map((entry) => entry.name);
  const topLevelShardDirectories = reviewDirectoryEntries
    .filter((entry) => entry.isDirectory() && /^\d{2}$/.test(entry.name))
    .map((entry) => entry.name);
  const unexpectedShardEntries = reviewDirectoryEntries.filter(
    (entry) =>
      !entry.name.startsWith('.') &&
      !(entry.isFile() && /^\d{2}\.json$/.test(entry.name)) &&
      !(entry.isDirectory() && /^\d{2}$/.test(entry.name))
  );
  assert(
    unexpectedShardEntries.length === 0,
    `Unexpected review shard entries: ${unexpectedShardEntries.map((entry) => entry.name).join(', ')}`
  );
  assertSameNames(
    topLevelShardFiles,
    Array.from(expectedSidoReviews.keys(), (sidoCode) => `${sidoCode}.json`),
    'Review sido shard files'
  );
  assertSameNames(
    topLevelShardDirectories,
    expectedSidoReviews.keys(),
    'Review sido shard directories'
  );

  let sidoShardReviewCount = 0;
  for (const [sidoCode, expectedReviews] of expectedSidoReviews) {
    const fileName = `${sidoCode}.json`;
    const shard = JSON.parse(fs.readFileSync(path.join(reviewsDirectory, fileName), 'utf8')) as ReviewsData;
    assertDatasetEqual(shard, expectedReviews, reviews.version, `Review sido shard ${fileName}`);
    sidoShardReviewCount += shard.totalCount;

    const expectedFiles = Array.from(expectedSigunguReviews.keys())
      .filter((key) => key.startsWith(`${sidoCode}/`))
      .map((key) => `${key.split('/')[1]}.json`);
    const directoryPath = path.join(reviewsDirectory, sidoCode);
    const actualEntries = fs.readdirSync(directoryPath, { withFileTypes: true });
    assert(
      actualEntries.every((entry) => entry.isFile() && /^\d{5}\.json$/.test(entry.name)),
      `Unexpected review sigungu shard entry in ${sidoCode}`
    );
    assertSameNames(
      actualEntries.map((entry) => entry.name),
      expectedFiles,
      `Review sigungu shard files ${sidoCode}`
    );
  }
  assert(sidoShardReviewCount === reviews.totalCount, 'Review sido shard totals do not match combined reviews');

  let sigunguShardReviewCount = 0;
  for (const [key, expectedReviews] of expectedSigunguReviews) {
    const [sidoCode, sigunguCode] = key.split('/');
    const shard = JSON.parse(
      fs.readFileSync(path.join(reviewsDirectory, sidoCode, `${sigunguCode}.json`), 'utf8')
    ) as ReviewsData;
    assertDatasetEqual(
      shard,
      expectedReviews,
      reviews.version,
      `Review sigungu shard ${sidoCode}/${sigunguCode}.json`
    );
    sigunguShardReviewCount += shard.totalCount;
  }
  assert(
    sigunguShardReviewCount === reviews.totalCount,
    'Review sigungu shard totals do not match combined reviews'
  );
  assert(reviewMeta.sidoCount === expectedSidoReviews.size, 'Review metadata sido count mismatch');
  assert(reviewMeta.sigunguCount === expectedSigunguReviews.size, 'Review metadata sigungu count mismatch');

  assert(regionMeta.status === 'complete', 'Region-code metadata is not complete');
  assert(regionMeta.totalCount === SIGUNGU_CODES.length, 'Region-code count mismatch');
  assert(
    regionMeta.sidoCount === new Set(SIGUNGU_CODES.map((region) => region.adminSidoCode)).size,
    'Region-code sido count mismatch'
  );
  assert(
    sha256(fs.readFileSync(path.join(ROOT, 'scripts', 'data', 'sigungu-codes.ts'), 'utf8')) ===
      regionMeta.checksumSha256,
    'Region-code module checksum mismatch'
  );

  const quality = vacancy.quality;
  assert(quality, 'Vacancy quality metadata is missing');
  assert(quality.status === 'complete', 'Vacancy collection is partial');
  assert(quality.regionsRequested === SIGUNGU_CODES.length, 'Vacancy requested-region count mismatch');
  assert(quality.regionsSucceeded === quality.regionsRequested, 'Vacancy succeeded-region count mismatch');
  assert(quality.regionsFailed === 0, 'Vacancy collection has failed regions');
  assert(quality.listCompleteness === 1, 'Vacancy region coverage is incomplete');
  assert(
    quality.detailSucceeded + quality.detailFailed === quality.detailRequested,
    'Vacancy detail accounting mismatch'
  );
  assert(
    Math.abs(
      quality.detailCoverage -
        (quality.detailRequested === 0 ? 1 : quality.detailSucceeded / quality.detailRequested)
    ) < 1e-12,
    'Vacancy detail coverage calculation mismatch'
  );
  assert(quality.detailCoverage >= 0.98, 'Vacancy detail coverage is below 98%');
  assert(vacancy.totalCount === Object.keys(vacancy.items).length, 'Vacancy item count mismatch');
  assert(vacancy.aidYear === String(now.getFullYear()), 'Vacancy school year is not current');
  const vacancyIDs = Object.keys(vacancy.items);
  const calculatedPositiveCount = Object.values(vacancy.items).filter(
    (item) => item.vacancyCount > 0
  ).length;
  assert(vacancy.positiveCount === calculatedPositiveCount, 'Vacancy positiveCount mismatch');
  assert(quality.detailRequested === vacancy.positiveCount, 'Vacancy positive/detail request count mismatch');
  for (const [kindercode, item] of Object.entries(vacancy.items)) {
    assert(item.kindercode === kindercode, `Vacancy item key mismatch: ${kindercode}`);
    assert(item.aidYear === vacancy.aidYear, `Vacancy item school-year mismatch: ${kindercode}`);
    assert(item.name.trim().length > 0 && item.address.trim().length > 0, `Vacancy item missing name/address: ${kindercode}`);
    assert(
      Number.isInteger(item.vacancyCount) && item.vacancyCount >= 0,
      `Invalid vacancy count: ${kindercode}`
    );
    assert(Array.isArray(item.detail), `Invalid vacancy detail rows: ${kindercode}`);
    const detailTotal = item.detail.reduce((sum, row) => {
      assert(
        Number.isInteger(row.vacancyCount) && row.vacancyCount >= 0,
        `Invalid vacancy detail count: ${kindercode}`
      );
      return sum + row.vacancyCount;
    }, 0);
    if (item.detail.length > 0) {
      assert(detailTotal === item.vacancyCount, `Vacancy detail total mismatch: ${kindercode}`);
    }
    if (item.updatedAt) {
      assert(ageHours(item.updatedAt, now) >= 0, `Vacancy updatedAt is in the future: ${kindercode}`);
    }
  }
  const matchedVacancyCount = vacancyIDs.filter((kindercode) => kindergartenIDs.has(kindercode)).length;
  const vacancyCatalogMatchRate = vacancyIDs.length === 0 ? 0 : matchedVacancyCount / vacancyIDs.length;
  assert(vacancyCatalogMatchRate >= 0.95, 'Vacancy/catalog ID match is below 95%');

  const reviewCollectedDates = reviewEntries.flatMap(([, items]) =>
    items.map((review) => review.collectedAt).filter(Boolean)
  );
  const contentLatestCollectedAt =
    reviewCollectedDates.toSorted((left, right) => parseTimestamp(left) - parseTimestamp(right)).at(-1) ??
    null;
  const reviewContentAgeHours = ageHours(contentLatestCollectedAt ?? reviewMeta.generatedAt, now);
  const ages = {
    kindergartens: ageHours(kindergartenMeta.collectedAt, now),
    reviews: ageHours(reviewMeta.generatedAt, now),
    vacancy: ageHours(quality.completedAt, now),
    regionCodes: ageHours(regionMeta.checkedAt, now),
  };
  const staleSources = Object.entries(ages)
    .filter(([source, age]) => age > MAX_AGE_HOURS[source as keyof typeof MAX_AGE_HOURS])
    .map(([source]) => source);
  if (!allowStale) {
    assert(staleSources.length === 0, `Stale public data sources: ${staleSources.join(', ')}`);
  }
  const attentionSources =
    reviewContentAgeHours > REVIEW_CONTENT_TARGET_AGE_HOURS ? ['reviewContent'] : [];

  const manifest = {
    schemaVersion: 1,
    generatedAt: now.toISOString(),
    overallStatus:
      staleSources.length > 0 ? 'stale' : attentionSources.length > 0 ? 'attention' : 'current',
    staleSources,
    attentionSources,
    sources: {
      kindergartens: {
        status: kindergartenMeta.status,
        sourceVersion: kindergartenMeta.sourceVersion,
        sourceLabel: kindergartenMeta.sourceLabel,
        checkedAt: kindergartenMeta.collectedAt,
        maxAgeHours: MAX_AGE_HOURS.kindergartens,
        totalCount: kindergartens.length,
        registryJoinCoverage: kindergartenMeta.registryJoinCoverage,
      },
      reviews: {
        status: reviewMeta.status,
        buildVersion: reviews.version,
        catalogReconciledAt: reviewMeta.generatedAt,
        catalogMaxAgeHours: MAX_AGE_HOURS.reviews,
        contentLatestCollectedAt,
        contentTargetAgeHours: REVIEW_CONTENT_TARGET_AGE_HOURS,
        contentAgeHours: reviewContentAgeHours,
        contentStatus:
          reviewContentAgeHours <= REVIEW_CONTENT_TARGET_AGE_HOURS ? 'within_target' : 'needs_discovery',
        totalCount: reviews.totalCount,
        kindergartenCount: reviews.kindergartenCount,
        catalogCoverage: reviewMeta.coverageRate,
        excludedOrphanReviewCount: reviewMeta.excludedOrphanReviewCount,
        duplicateReviewCount: reviewMeta.duplicateReviewCount,
        retiredReviewCount: reviewMeta.retiredReviewCount,
        retiredKindergartenCount: reviewMeta.retiredKindergartenCount,
        newlyRetiredReviewCount: reviewMeta.newlyRetiredReviewCount,
        restoredReviewCount: reviewMeta.restoredReviewCount,
      },
      vacancy: {
        status: quality.status,
        sourceVersion: vacancy.version,
        checkedAt: quality.completedAt,
        maxAgeHours: MAX_AGE_HOURS.vacancy,
        totalCount: vacancy.totalCount,
        positiveCount: vacancy.positiveCount,
        regionCoverage: quality.listCompleteness,
        detailCoverage: quality.detailCoverage,
        catalogMatchRate: vacancyCatalogMatchRate,
      },
      regionCodes: {
        status: regionMeta.status,
        checkedAt: regionMeta.checkedAt,
        maxAgeHours: MAX_AGE_HOURS.regionCodes,
        totalCount: regionMeta.totalCount,
        source: regionMeta.source,
      },
    },
  };

  if (writeManifest) {
    atomicWriteJson(path.join(DATA_DIR, 'freshness.json'), manifest);
  }
  process.stdout.write(`${JSON.stringify(manifest, null, 2)}\n`);
  process.stdout.write('Public data validation passed\n');
}

main();

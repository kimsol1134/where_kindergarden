import * as fs from 'fs';
import * as path from 'path';
import type { ReviewQualityGoldEntry, ReviewsData } from '../../src/types/review';
import {
  analyzeReviewEvidence,
  classifyReviewWithoutBody,
} from '../../src/lib/utils/review-verification';
import {
  buildCoreNameFrequencyMap,
  buildReviewCollisionResolutionMap,
  loadKindergartens,
  loadTargetReviewEntries,
  readJsonFile,
} from '../lib/review-verification-pipeline';

const TARGET_COUNTS = {
  verified: 160,
  mismatch: 120,
  advertorial: 120,
  generic_info: 80,
} as const;

function pickRoundRobin(
  entries: ReviewQualityGoldEntry[],
  count: number
): ReviewQualityGoldEntry[] {
  const buckets = new Map<string, ReviewQualityGoldEntry[]>();

  for (const entry of entries) {
    const bucket = buckets.get(entry.sidoCode) ?? [];
    bucket.push(entry);
    buckets.set(entry.sidoCode, bucket);
  }

  for (const bucket of buckets.values()) {
    bucket.sort(
      (left, right) =>
        left.reviewId.localeCompare(right.reviewId) ||
        left.kindergartenId.localeCompare(right.kindergartenId)
    );
  }

  const selected: ReviewQualityGoldEntry[] = [];
  const orderedSidos = Array.from(buckets.keys()).sort();

  while (selected.length < count) {
    let advanced = false;
    for (const sidoCode of orderedSidos) {
      const bucket = buckets.get(sidoCode) ?? [];
      const next = bucket.shift();
      if (!next) {
        continue;
      }
      selected.push(next);
      advanced = true;
      if (selected.length === count) {
        break;
      }
    }

    if (!advanced) {
      break;
    }
  }

  if (selected.length < count) {
    throw new Error(`Not enough candidates: requested ${count}, got ${selected.length}`);
  }

  return selected;
}

function main(): void {
  const reviewsPath = path.resolve('public/data/reviews.json');
  const outputPath = path.resolve('scripts/evals/review-quality-gold-v1.jsonl');
  const reviewsData = readJsonFile<ReviewsData>(reviewsPath);
  const kindergartens = loadKindergartens();
  const kindergartenMap = new Map(
    kindergartens.map((kindergarten) => [
      kindergarten.kindercode,
      kindergarten,
    ])
  );
  const coreNameFrequencies = buildCoreNameFrequencyMap(kindergartens);
  const activeSidos = Array.from(
    new Set(
      Object.keys(reviewsData.reviews)
        .map((kindergartenId) => kindergartenMap.get(kindergartenId)?.sido_code)
        .filter((sidoCode): sidoCode is string => Boolean(sidoCode))
    )
  ).sort();
  const loadedEntries = loadTargetReviewEntries(
    activeSidos,
    kindergartens
  );
  const collisionResolutions = buildReviewCollisionResolutionMap(
    loadedEntries,
    coreNameFrequencies
  );
  const usedKeys = new Set<string>();
  const candidates: Record<
    keyof typeof TARGET_COUNTS,
    ReviewQualityGoldEntry[]
  > = {
    verified: [],
    mismatch: [],
    advertorial: [],
    generic_info: [],
  };

  for (const entry of loadedEntries) {
    const kindergarten = entry.kindergarten;
    const collision = collisionResolutions.get(entry.review.id) ?? null;
    const context = {
      kindergartenId: kindergarten.kindercode,
      kindergartenName: kindergarten.name,
      kindergartenAddress: kindergarten.address,
      sidoCode: kindergarten.sido_code,
      sigunguCode: kindergarten.sigungu_code,
      coreNameFrequency:
        coreNameFrequencies.get(
          kindergarten.name
            .replace(/(?:유치원|어린이집)$/u, '')
            .replace(/병설$/u, '')
            .trim()
        ) ?? 1,
    };
    const analysis = analyzeReviewEvidence(entry.review, context);
    const classification = classifyReviewWithoutBody(entry.review, context);
    const key = `${entry.review.kindergartenId}::${entry.review.id}`;
    const baseEntry: ReviewQualityGoldEntry = {
      reviewId: entry.review.id,
      kindergartenId: entry.review.kindergartenId,
      kindergartenName: kindergarten.name,
      kindergartenAddress: kindergarten.address,
      sidoCode: kindergarten.sido_code,
      url: entry.review.url,
      source: entry.review.source,
      sourceName: entry.review.sourceName,
      title: entry.review.title,
      snippet: entry.review.snippet,
      summary: entry.review.summary,
      expectedStatus: 'verified',
      reason: '',
    };

    if (collision?.shouldRemove) {
      candidates.mismatch.push({
        ...baseEntry,
        expectedStatus: 'mismatch',
        reason: collision.reason,
      });
      continue;
    }

    if (classification.finalStatus === 'mismatch') {
      candidates.mismatch.push({
        ...baseEntry,
        expectedStatus: 'mismatch',
        reason: classification.reasons[0] ?? '타기관/타지역 mismatch 패턴',
      });
      continue;
    }

    if (classification.finalStatus === 'advertorial') {
      candidates.advertorial.push({
        ...baseEntry,
        expectedStatus: 'advertorial',
        reason: classification.reasons[0] ?? '광고/상업성 패턴',
      });
      continue;
    }

    if (classification.finalStatus === 'generic_info') {
      candidates.generic_info.push({
        ...baseEntry,
        expectedStatus: 'generic_info',
        reason: classification.reasons[0] ?? '일반 정보/질문/리스트 패턴',
      });
      continue;
    }

    if (
      classification.finalStatus === 'verified' &&
      analysis.hasDirectInstitutionEvidence &&
      analysis.signals.otherInstitutionMentions.length === 0
    ) {
      candidates.verified.push({
        ...baseEntry,
        expectedStatus: 'verified',
        reason: classification.reasons[0] ?? '직접 기관명과 후기 신호가 함께 확인됨',
      });
    }
  }

  const selected = [
    ...pickRoundRobin(candidates.verified, TARGET_COUNTS.verified),
    ...pickRoundRobin(candidates.mismatch, TARGET_COUNTS.mismatch),
    ...pickRoundRobin(candidates.advertorial, TARGET_COUNTS.advertorial),
    ...pickRoundRobin(candidates.generic_info, TARGET_COUNTS.generic_info),
  ].filter((entry) => {
    const key = `${entry.kindergartenId}::${entry.reviewId}`;
    if (usedKeys.has(key)) {
      return false;
    }
    usedKeys.add(key);
    return true;
  });

  const lines = selected
    .sort(
      (left, right) =>
        left.expectedStatus.localeCompare(right.expectedStatus) ||
        left.sidoCode.localeCompare(right.sidoCode) ||
        left.reviewId.localeCompare(right.reviewId)
    )
    .map((entry) => JSON.stringify(entry));

  fs.writeFileSync(outputPath, `${lines.join('\n')}\n`);
  process.stdout.write(
    `gold set written: ${outputPath} (${selected.length} entries)\n`
  );
}

main();

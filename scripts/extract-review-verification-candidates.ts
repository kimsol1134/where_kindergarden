import * as path from 'path';
import type {
  ReviewVerificationCandidate,
  ReviewVerificationRecord,
} from '../src/types/review';
import { assessReviewMetadata } from '../src/lib/utils/review-verification';
import {
  buildCoreNameFrequencyMap,
  buildSidoTag,
  loadKindergartens,
  loadTargetReviewEntries,
  parseSidoCodes,
  summarizeRecords,
  writeJsonFile,
} from './lib/review-verification-pipeline';

interface BodyCheckItem extends ReviewVerificationCandidate {
  source: string;
  sidoCode: string;
}

function writeLine(message: string): void {
  process.stdout.write(`${message}\n`);
}

function main(): void {
  const args = process.argv.slice(2);
  const sidoIndex = args.indexOf('--sido');
  const outputIndex = args.indexOf('--output-dir');

  const sidos = parseSidoCodes(
    sidoIndex !== -1 ? args[sidoIndex + 1] : undefined,
    ['11', '41']
  );
  const outputDir =
    outputIndex !== -1
      ? path.resolve(args[outputIndex + 1])
      : path.resolve('scripts/data-output');
  const kindergartens = loadKindergartens();
  const coreNameFrequencies = buildCoreNameFrequencyMap(kindergartens);
  const entries = loadTargetReviewEntries(sidos, kindergartens);
  const tag = buildSidoTag(sidos);

  const records: ReviewVerificationRecord[] = entries.map(
    ({ review, kindergarten, sidoCode }) => {
      const metadata = assessReviewMetadata(review, {
        kindergartenId: kindergarten.kindercode,
        kindergartenName: kindergarten.name,
        kindergartenAddress: kindergarten.address,
        sidoCode,
        sigunguCode: kindergarten.sigungu_code,
        coreNameFrequency: coreNameFrequencies.get(
          kindergarten.name.replace(/(?:유치원|어린이집)$/, '').replace(/병설$/, '').trim()
        ) ?? 1,
      });

      return {
        reviewId: review.id,
        kindergartenId: kindergarten.kindercode,
        kindergartenName: kindergarten.name,
        kindergartenAddress: kindergarten.address,
        sidoCode,
        sigunguCode: kindergarten.sigungu_code,
        url: review.url,
        title: review.title,
        snippet: review.snippet,
        source: review.source,
        sourceName: review.sourceName,
        date: review.date,
        collectedAt: review.collectedAt,
        accessMode: review.accessMode,
        evidenceType: review.evidenceType,
        extractionMethod: review.extractionMethod,
        evidenceChecksum: review.evidenceChecksum,
        rating: review.rating,
        structuredFields: review.structuredFields,
        evidence: review.evidence,
        approvalStatus: review.approvalStatus,
        approvedAt: review.approvedAt,
        approvedBy: review.approvedBy,
        metadata,
      };
    }
  );

  const candidates: ReviewVerificationCandidate[] = records
    .filter((record) => record.metadata.decision === 'needs_body_check')
    .map((record) => ({
      reviewId: record.reviewId,
      kindergartenId: record.kindergartenId,
      kindergartenName: record.kindergartenName,
      url: record.url,
      title: record.title,
      snippet: record.snippet,
      whyFlagged: record.metadata.whyFlagged,
    }));

  const bodyCheckItems: BodyCheckItem[] = records
    .filter((record) => record.metadata.decision === 'needs_body_check')
    .map((record) => ({
      reviewId: record.reviewId,
      kindergartenId: record.kindergartenId,
      kindergartenName: record.kindergartenName,
      url: record.url,
      title: record.title,
      snippet: record.snippet,
      whyFlagged: record.metadata.whyFlagged,
      source: record.source,
      sidoCode: record.sidoCode,
    }));

  const metadataPath = path.join(
    outputDir,
    `review-verification-metadata-${tag}.json`
  );
  const candidatesPath = path.join(
    outputDir,
    `review-verification-candidates-${tag}.json`
  );
  const bodyCheckPath = path.join(outputDir, `review-body-check-${tag}.json`);

  writeJsonFile(metadataPath, {
    generatedAt: new Date().toISOString(),
    targetSidos: sidos,
    totalCount: records.length,
    summary: summarizeRecords(records),
    reviews: records,
  });

  writeJsonFile(candidatesPath, {
    generatedAt: new Date().toISOString(),
    targetSidos: sidos,
    totalCount: candidates.length,
    candidates,
  });

  writeJsonFile(bodyCheckPath, {
    generatedAt: new Date().toISOString(),
    targetSidos: sidos,
    totalCount: bodyCheckItems.length,
    items: bodyCheckItems,
  });

  writeLine(`metadata: ${metadataPath}`);
  writeLine(`candidates: ${candidatesPath}`);
  writeLine(`body-check: ${bodyCheckPath}`);
  writeLine(`total reviews: ${records.length}`);
  writeLine(`needs body check: ${bodyCheckItems.length}`);
}

main();

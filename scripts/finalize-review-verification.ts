import * as path from 'path';
import type {
  LlmReviewValidationDecision,
  ReviewVerificationBodyResult,
  ReviewVerificationRecord,
  ReviewVerificationStatus,
} from '../src/types/review';
import { buildTextExcerpt } from '../src/lib/utils/review-html';
import {
  assessReviewBody,
  assessReviewFallback,
  resolveUncertainWithLlm,
  summarizeVerificationStatuses,
} from '../src/lib/utils/review-verification';
import {
  buildSidoTag,
  readJsonFile,
  writeJsonFile,
} from './lib/review-verification-pipeline';

interface MetadataFile {
  reviews: ReviewVerificationRecord[];
}

interface BodyScrapeFile {
  items: ReviewVerificationBodyResultItem[];
}

interface ReviewVerificationBodyResultItem extends ReviewVerificationBodyResult {
  reviewId: string;
  kindergartenId: string;
  kindergartenName: string;
  url: string;
}

interface LlmDecisionFile {
  decisions?: LlmReviewValidationDecision[];
}

function writeLine(message: string): void {
  process.stdout.write(`${message}\n`);
}

function normalizeLlmDecisions(filePath: string): LlmReviewValidationDecision[] {
  const raw = readJsonFile<LlmDecisionFile | LlmReviewValidationDecision[]>(filePath);
  if (Array.isArray(raw)) {
    return raw;
  }

  return raw.decisions ?? [];
}

function main(): void {
  const args = process.argv.slice(2);
  const metadataIndex = args.indexOf('--metadata');
  if (metadataIndex === -1 || !args[metadataIndex + 1]) {
    throw new Error('--metadata 인자가 필요합니다.');
  }

  const bodyIndex = args.indexOf('--body');
  const llmIndex = args.indexOf('--llm');
  const outputIndex = args.indexOf('--output-dir');
  const thresholdIndex = args.indexOf('--llm-threshold');

  const metadataPath = path.resolve(args[metadataIndex + 1]);
  const bodyPath = bodyIndex !== -1 ? path.resolve(args[bodyIndex + 1]) : null;
  const llmPath = llmIndex !== -1 ? path.resolve(args[llmIndex + 1]) : null;
  const outputDir =
    outputIndex !== -1
      ? path.resolve(args[outputIndex + 1])
      : path.resolve('scripts/data-output');
  const llmThreshold =
    thresholdIndex !== -1 && args[thresholdIndex + 1]
      ? Number.parseFloat(args[thresholdIndex + 1])
      : 0.8;

  const metadataFile = readJsonFile<MetadataFile>(metadataPath);
  const bodyFile = bodyPath ? readJsonFile<BodyScrapeFile>(bodyPath) : null;
  const bodyMap = new Map<string, ReviewVerificationBodyResultItem>(
    (bodyFile?.items ?? []).map((item) => [item.reviewId, item])
  );
  const llmMap = new Map<string, LlmReviewValidationDecision>(
    (llmPath ? normalizeLlmDecisions(llmPath) : []).map((item) => [
      item.reviewId,
      item,
    ])
  );

  const finalizedRecords: ReviewVerificationRecord[] = metadataFile.reviews.map(
    (record) => {
      const bodyResult = bodyMap.get(record.reviewId);
      let finalStatus: ReviewVerificationStatus;
      let finalConfidence: number;
      let finalReasons: string[];

      if (record.metadata.decision === 'verified') {
        finalStatus = 'verified';
        finalConfidence = record.metadata.confidence;
        finalReasons = record.metadata.reasons;
      } else if (record.metadata.decision === 'reject') {
        finalStatus = record.metadata.preliminaryStatus;
        finalConfidence = record.metadata.confidence;
        finalReasons = record.metadata.reasons;
      } else if (bodyResult && bodyResult.status === 'success') {
        const bodyAssessment = assessReviewBody(
          {
            title: record.title,
            snippet: record.snippet,
            bodyText: bodyResult.bodyText,
          },
          {
            kindergartenId: record.kindergartenId,
            kindergartenName: record.kindergartenName,
            kindergartenAddress: record.kindergartenAddress,
            sidoCode: record.sidoCode,
            sigunguCode: record.sigunguCode,
            coreNameFrequency: record.metadata.signals.genericCoreName ? 2 : 1,
          }
        );

        finalStatus = bodyAssessment.finalStatus;
        finalConfidence = bodyAssessment.confidence;
        finalReasons = bodyAssessment.reasons;

        if (finalStatus === 'uncertain') {
          const fallbackAssessment = assessReviewFallback(
            {
              title: record.title,
              snippet: record.snippet,
            },
            {
              kindergartenId: record.kindergartenId,
              kindergartenName: record.kindergartenName,
              kindergartenAddress: record.kindergartenAddress,
              sidoCode: record.sidoCode,
              sigunguCode: record.sigunguCode,
              coreNameFrequency: record.metadata.signals.genericCoreName ? 2 : 1,
            }
          );

          if (fallbackAssessment.finalStatus !== 'uncertain') {
            finalStatus = fallbackAssessment.finalStatus;
            finalConfidence = fallbackAssessment.confidence;
            finalReasons = fallbackAssessment.reasons;
          }
        }
      } else {
        finalStatus = 'uncertain';
        finalConfidence = 0.3;
        finalReasons = bodyResult?.error
          ? [`본문 스크래핑 실패: ${bodyResult.error}`]
          : ['본문 스크래핑 결과가 없어 자동 판정 보류'];
      }

      const llmDecision = llmMap.get(record.reviewId);
      if (llmDecision) {
        const resolvedStatus = resolveUncertainWithLlm(
          finalStatus,
          llmDecision.verdict,
          llmDecision.confidence,
          llmThreshold
        );
        if (resolvedStatus !== finalStatus) {
          finalStatus = resolvedStatus;
          finalConfidence = llmDecision.confidence;
          finalReasons = [
            ...(finalReasons.length > 0 ? finalReasons : []),
            `LLM 검토 반영: ${llmDecision.reason}`,
          ];
        }
      }

      return {
        ...record,
        bodyResult,
        finalStatus,
        finalConfidence,
        finalReasons,
      };
    }
  );

  const tag = buildSidoTag(
    Array.from(new Set(finalizedRecords.map((record) => record.sidoCode)))
  );
  const resultsPath = path.join(
    outputDir,
    `review-verification-results-${tag}.json`
  );
  const uncertainRecords = finalizedRecords.filter(
    (record) => record.finalStatus === 'uncertain'
  );
  const uncertainPath = path.join(
    outputDir,
    `review-verification-uncertain-${tag}.json`
  );
  const llmQueuePath = path.join(
    outputDir,
    `review-verification-llm-queue-${tag}.json`
  );

  writeJsonFile(resultsPath, {
    generatedAt: new Date().toISOString(),
    metadataPath,
    bodyPath,
    llmPath,
    totalCount: finalizedRecords.length,
    summary: summarizeVerificationStatuses(
      finalizedRecords.map((record) => record.finalStatus ?? 'uncertain')
    ),
    reviews: finalizedRecords,
  });

  writeJsonFile(uncertainPath, {
    generatedAt: new Date().toISOString(),
    totalCount: uncertainRecords.length,
    reviews: uncertainRecords,
  });

  writeJsonFile(llmQueuePath, {
    generatedAt: new Date().toISOString(),
    totalCount: uncertainRecords.length,
    items: uncertainRecords.map((record) => ({
      reviewId: record.reviewId,
      kindergartenId: record.kindergartenId,
      kindergartenName: record.kindergartenName,
      kindergartenAddress: record.kindergartenAddress,
      sidoCode: record.sidoCode,
      url: record.url,
      title: record.title,
      snippet: record.snippet,
      whyFlagged: record.metadata.whyFlagged,
      autoReasons: record.finalReasons,
      bodyExcerpt: buildTextExcerpt(record.bodyResult?.bodyText ?? '', 1200),
    })),
  });

  writeLine(`results: ${resultsPath}`);
  writeLine(`uncertain: ${uncertainPath}`);
  writeLine(`llm-queue: ${llmQueuePath}`);
  writeLine(`uncertain count: ${uncertainRecords.length}`);
}

main();

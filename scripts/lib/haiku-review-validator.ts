import Anthropic from '@anthropic-ai/sdk';
import type {
  LlmReviewValidationDecision,
  ReviewVerificationStatus,
} from '../../src/types/review';

export interface HaikuValidationInput {
  reviewId: string;
  kindergartenName: string;
  kindergartenAddress: string;
  sidoCode: string;
  title: string;
  snippet: string;
  bodyExcerpt: string;
  whyFlagged: string[];
  autoReasons: string[];
}

interface HaikuValidatorOptions {
  batchSize?: number;
  delayMs?: number;
  maxCalls?: number;
}

const SYSTEM_PROMPT = `당신은 유치원/어린이집 후기 검증 전문가입니다.
자동 검증 파이프라인에서 uncertain으로 남은 리뷰 링크들을 최종 판정합니다.
보수적으로 판단하세요. 확신이 낮으면 uncertain으로 두세요.`;

const USER_PROMPT_TEMPLATE = `아래 JSON은 유치원 후기 자동 검증 파이프라인에서 uncertain으로 남은 링크들입니다.
각 항목에 대해 아래 3개만 판단해주세요.

1. verdict: verified | mismatch | advertorial | generic_info | uncertain
2. reason: 1~2문장
3. confidence: 0~1 숫자

판정 기준:
- verified: 해당 유치원이 실제 주제이고, 경험담/설명회/재원/교육과정/급식/버스/교사/원비 등 실질 정보가 있음
- mismatch: 다른 유치원/어린이집이 실제 주제이거나 잘못 연결됨
- advertorial: 업체 홍보, 학원 광고, 행사대행, 부동산, 맛집/시장/일반 상업성 글
- generic_info: 정책 안내, 지원금, 질문글, 일반 정보글, 리스트형 모음
- uncertain: 확정 근거 부족

반드시 아래 JSON만 반환해주세요:
{
  "decisions": [
    {
      "reviewId": "rev-XXXX",
      "verdict": "verified",
      "confidence": 0.91,
      "reason": "해당 유치원 설명회 경험과 급식/교사 정보가 본문에 직접 나옵니다."
    }
  ]
}

보수적으로 판단해주세요. 확신이 낮으면 uncertain으로 두세요.

---

검증 대상:
`;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function writeLine(message: string): void {
  process.stdout.write(`${message}\n`);
}

function buildBatchPayload(inputs: HaikuValidationInput[]): string {
  const items = inputs.map((input) => ({
    reviewId: input.reviewId,
    kindergartenName: input.kindergartenName,
    kindergartenAddress: input.kindergartenAddress,
    title: input.title,
    snippet: input.snippet,
    bodyExcerpt: input.bodyExcerpt.slice(0, 1200),
    whyFlagged: input.whyFlagged,
    autoReasons: input.autoReasons,
  }));
  return JSON.stringify(items, null, 2);
}

const VALID_VERDICTS: ReadonlySet<string> = new Set<string>([
  'verified',
  'mismatch',
  'advertorial',
  'generic_info',
  'uncertain',
]);

function parseHaikuResponse(
  responseText: string
): LlmReviewValidationDecision[] {
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    writeLine('  [WARN] Haiku 응답에서 JSON을 찾을 수 없음');
    return [];
  }

  const parsed: { decisions?: unknown[] } = JSON.parse(jsonMatch[0]);
  if (!Array.isArray(parsed.decisions)) {
    writeLine('  [WARN] Haiku 응답에 decisions 배열 없음');
    return [];
  }

  const results: LlmReviewValidationDecision[] = [];
  for (const item of parsed.decisions) {
    if (
      typeof item !== 'object' ||
      item === null ||
      !('reviewId' in item) ||
      !('verdict' in item)
    ) {
      continue;
    }

    const record = item as Record<string, unknown>;
    const verdict = String(record.verdict);
    if (!VALID_VERDICTS.has(verdict)) {
      continue;
    }

    results.push({
      reviewId: String(record.reviewId),
      verdict: verdict as ReviewVerificationStatus,
      confidence: typeof record.confidence === 'number' ? record.confidence : 0.5,
      reason: typeof record.reason === 'string' ? record.reason : '',
    });
  }

  return results;
}

export async function validateReviewsWithHaiku(
  inputs: HaikuValidationInput[],
  options: HaikuValidatorOptions = {}
): Promise<LlmReviewValidationDecision[]> {
  const { batchSize = 12, delayMs = 500, maxCalls = 0 } = options;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    writeLine('[ERROR] ANTHROPIC_API_KEY 환경변수가 설정되지 않았습니다.');
    return [];
  }

  if (inputs.length === 0) {
    writeLine('[INFO] Haiku 검증 대상 없음');
    return [];
  }

  const client = new Anthropic({ apiKey });
  const allDecisions: LlmReviewValidationDecision[] = [];
  const batches: HaikuValidationInput[][] = [];

  for (let i = 0; i < inputs.length; i += batchSize) {
    batches.push(inputs.slice(i, i + batchSize));
  }

  const totalBatches = maxCalls > 0 ? Math.min(batches.length, maxCalls) : batches.length;
  writeLine(
    `[Haiku] ${inputs.length}건을 ${totalBatches}개 배치로 처리 (배치당 ${batchSize}건)`
  );

  for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
    const batch = batches[batchIndex];
    const payload = buildBatchPayload(batch);

    writeLine(
      `  [${batchIndex + 1}/${totalBatches}] ${batch.length}건 전송 중...`
    );

    try {
      const response = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: USER_PROMPT_TEMPLATE + payload,
          },
        ],
      });

      const textContent = response.content.find((block) => block.type === 'text');
      if (!textContent || textContent.type !== 'text') {
        writeLine('  [WARN] 텍스트 응답 없음');
        continue;
      }

      const decisions = parseHaikuResponse(textContent.text);
      allDecisions.push(...decisions);
      writeLine(
        `  [${batchIndex + 1}/${totalBatches}] ${decisions.length}건 판정 완료`
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      writeLine(`  [ERROR] Haiku API 호출 실패: ${message}`);
    }

    if (batchIndex < totalBatches - 1) {
      await delay(delayMs);
    }
  }

  writeLine(
    `[Haiku] 완료: ${allDecisions.length}/${inputs.length}건 판정`
  );

  return allDecisions;
}

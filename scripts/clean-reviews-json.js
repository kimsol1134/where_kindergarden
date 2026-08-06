/* eslint-disable @typescript-eslint/no-require-imports -- legacy CommonJS entry point */
const fs = require('node:fs');
const path = require('node:path');

// Legacy compatibility entry point. This script is intentionally read-only:
// review relevance removals require a human-approved curation workflow, and
// changing only reviews.json would desynchronize the regional shards.
const root = process.cwd();
const sourcePath = path.join(root, 'public', 'data', 'reviews.json');
const outputDirectory = path.join(root, 'scripts', 'data-output');
const blacklistKeywords = [
  '탄핵',
  '윤석열',
  '정치',
  '대통령',
  '시위',
  '광화문',
  '집회',
  '파업',
  '비트코인',
  '주식',
  '카지노',
  '도박',
];

if (!fs.existsSync(sourcePath)) {
  process.stderr.write(`Missing review data: ${sourcePath}\n`);
  process.exit(1);
}

const dataset = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
if (
  typeof dataset !== 'object' ||
  dataset === null ||
  typeof dataset.reviews !== 'object' ||
  dataset.reviews === null
) {
  process.stderr.write('Unexpected reviews.json shape; refusing to inspect it.\n');
  process.exit(1);
}

const candidates = [];
for (const [kindergartenId, reviews] of Object.entries(dataset.reviews)) {
  if (!Array.isArray(reviews)) continue;
  for (const review of reviews) {
    const searchableText = [review.title, review.snippet, review.summary, review.content]
      .filter((value) => typeof value === 'string')
      .join(' ');
    const matchedKeywords = blacklistKeywords.filter((keyword) => searchableText.includes(keyword));
    if (matchedKeywords.length === 0) continue;
    candidates.push({
      kindergartenId,
      reviewId: review.id,
      url: review.url,
      title: review.title,
      matchedKeywords,
    });
  }
}

fs.mkdirSync(outputDirectory, { recursive: true });
const generatedAt = new Date().toISOString();
const outputPath = path.join(
  outputDirectory,
  `review-cleanup-candidates-${generatedAt.replace(/[:.]/g, '-')}.json`
);
fs.writeFileSync(
  outputPath,
  JSON.stringify(
    {
      generatedAt,
      sourcePath: path.relative(root, sourcePath),
      candidateCount: candidates.length,
      note: '후보만 생성했습니다. 공개 후기 제거는 review curation 승인 절차로 수행하세요.',
      candidates,
    },
    null,
    2
  )
);

process.stdout.write(`Review cleanup candidates: ${candidates.length}\n`);
process.stdout.write(`Wrote read-only candidate report: ${outputPath}\n`);

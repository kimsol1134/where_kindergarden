import * as fs from 'fs';
import * as path from 'path';

interface ReviewLink {
  id: string;
  url: string;
  source: string;
  content?: string;
}

interface ReviewsData {
  reviews: Record<string, ReviewLink[]>;
}

async function main() {
  const args = process.argv.slice(2);
  const sidoCode = args[0] || '11'; // Default to Seoul
  const limit = args[1] ? parseInt(args[1], 10) : 5; // Default to 5 for safety

  const filePath = path.resolve(`public/data/reviews/${sidoCode}.json`);
  
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }

  const data: ReviewsData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  const targets: { id: string; url: string; kindercode: string }[] = [];

  for (const [kindercode, reviews] of Object.entries(data.reviews)) {
    for (const review of reviews) {
      // Only target Naver Blog (public) to avoid login issues
      if (
        review.source === 'naver_blog' &&
        !review.content
      ) {
        targets.push({
          id: review.id,
          url: review.url,
          kindercode,
        });
      }
    }
  }

  // Randomize to avoid hitting same blog sequence if organized by date
  const selected = targets
    .sort(() => 0.5 - Math.random())
    .slice(0, limit);

  const outputDir = path.resolve('scripts/temp');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, 'target_urls.json');
  fs.writeFileSync(outputPath, JSON.stringify(selected, null, 2));

  console.log(`Extracted ${selected.length} URLs to ${outputPath}`);
  selected.forEach(t => console.log(`- ${t.url}`));
}

main();

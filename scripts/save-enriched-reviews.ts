import * as fs from 'fs';
import * as path from 'path';

interface ScrapedReview {
  id: string;
  url: string;
  content: string;
}

interface ReviewLink {
  id: string;
  url: string;
  content?: string;
  [key: string]: any;
}

interface ReviewsData {
  reviews: Record<string, ReviewLink[]>;
  [key: string]: any;
}

async function main() {
  const args = process.argv.slice(2);
  const sidoCode = args[0] || '11';
  
  const inputPath = path.resolve('scripts/temp/scraped_content.json');
  const reviewsPath = path.resolve(`public/data/reviews/${sidoCode}.json`);

  if (!fs.existsSync(inputPath)) {
    console.error(`Input file not found: ${inputPath}`);
    process.exit(1);
  }

  if (!fs.existsSync(reviewsPath)) {
    console.error(`Reviews file not found: ${reviewsPath}`);
    process.exit(1);
  }

  const scrapedData: ScrapedReview[] = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));
  const reviewsData: ReviewsData = JSON.parse(fs.readFileSync(reviewsPath, 'utf-8'));

  let updateCount = 0;
  const scrapedMap = new Map(scrapedData.map(item => [item.url, item.content]));

  for (const reviews of Object.values(reviewsData.reviews)) {
    for (const review of reviews) {
      if (scrapedMap.has(review.url)) {
        const content = scrapedMap.get(review.url);
        // Only update if content is valid and not an error message
        if (content && !content.includes('LOGIN_REQUIRED') && !content.includes('BLOCKED')) {
          review.content = content;
          updateCount++;
        }
      }
    }
  }

  fs.writeFileSync(reviewsPath, JSON.stringify(reviewsData, null, 2));
  console.log(`Updated ${updateCount} reviews in ${reviewsPath}`);
}

main();

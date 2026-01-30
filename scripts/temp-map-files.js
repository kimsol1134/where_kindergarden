const fs = require('fs');
const path = require('path');

const targetFile = '/Users/solkim/Dev/where_kindergarden/public/data/reviews/11/11110.json';
const scrapedDir = '/Users/solkim/Dev/where_kindergarden/scripts/data-output/reviews-content-raw/11';

const data = JSON.parse(fs.readFileSync(targetFile, 'utf-8'));
const mappings = [];

Object.values(data.reviews).flat().forEach(review => {
  const filename = Buffer.from(review.url).toString('base64').slice(0, 50) + '.html';
  const fullPath = path.join(scrapedDir, filename);
  
  if (fs.existsSync(fullPath)) {
    mappings.push({
      id: review.id,
      url: review.url,
      path: fullPath
    });
  }
});

console.log(JSON.stringify(mappings, null, 2));

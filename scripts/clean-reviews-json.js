const fs = require('fs');
const path = require('path');

const targetFile = '/Users/solkim/Dev/where_kindergarden/public/data/reviews.json';
const backupFile = '/Users/solkim/Dev/where_kindergarden/public/data/reviews.backup.json';

if (!fs.existsSync(targetFile)) {
  console.log('No reviews.json found.');
  process.exit(0);
}

// Backup first
fs.copyFileSync(targetFile, backupFile);

const data = JSON.parse(fs.readFileSync(targetFile, 'utf8'));
const BLACKLIST_KEYWORDS = ['탄핵', '윤석열', '정치', '대통령', '시위', '광화문', '집회', '파업', '비트코인', '주식', '카지노', '도박'];

console.log(`Original count: ${data.length || Object.keys(data).length}`);

let cleanedData;
if (Array.isArray(data)) {
  cleanedData = data.filter(item => {
    const text = JSON.stringify(item);
    return !BLACKLIST_KEYWORDS.some(k => text.includes(k));
  });
} else {
  // If it's an object mapping
  cleanedData = {};
  for (const [key, value] of Object.entries(data)) {
    const text = JSON.stringify(value);
    if (!BLACKLIST_KEYWORDS.some(k => text.includes(k))) {
      cleanedData[key] = value;
    }
  }
}

console.log(`Cleaned count: ${cleanedData.length || Object.keys(cleanedData).length}`);

fs.writeFileSync(targetFile, JSON.stringify(cleanedData, null, 2));
console.log('Cleaned reviews.json saved.');

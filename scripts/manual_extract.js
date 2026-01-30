const fs = require('fs');
const path = require('path');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;

const files = [
  "/Users/solkim/Dev/where_kindergarden/scripts/data-output/reviews-content-raw/11/aHR0cDovL2NhZmUubmF2ZXIuY29tL2Zrc2dtbC8yMDI3MjU=.html",
  "/Users/solkim/Dev/where_kindergarden/scripts/data-output/reviews-content-raw/11/aHR0cDovL2NhZmUubmF2ZXIuY29tL2Zrc2dtbC80ODQwNA==.html",
  "/Users/solkim/Dev/where_kindergarden/scripts/data-output/reviews-content-raw/11/aHR0cHM6Ly9ibG9nLm5hdmVyLmNvbS9sb3ZlbHlkYWVsLzIyMz.html",
  "/Users/solkim/Dev/where_kindergarden/scripts/data-output/reviews-content-raw/11/aHR0cHM6Ly9ibG9nLm5hdmVyLmNvbS9saWJlcmFsd2lmZS8yMj.html",
  "/Users/solkim/Dev/where_kindergarden/scripts/data-output/reviews-content-raw/11/aHR0cHM6Ly9ibG9nLm5hdmVyLmNvbS9kdXF4aDMyMDgvMjIzNj.html"
];

function extract(content) {
  const dom = new JSDOM(content);
  const doc = dom.window.document;
  
  // Try finding specific containers
  let container = doc.querySelector('.se-main-container');
  if (!container) container = doc.querySelector('#postViewArea');
  if (!container) container = doc.querySelector('.ArticleContentBox');
  if (!container) container = doc.querySelector('#tbody'); // Cafe old

  if (container) {
    return container.textContent.replace(/\s+/g, ' ').trim();
  }

  // Fallback: finding sequences of paragraphs
  const paragraphs = Array.from(doc.querySelectorAll('.se-text-paragraph, p'));
  const text = paragraphs.map(p => p.textContent.trim()).filter(t => t.length > 0).join(' ');
  
  if (text.length > 50) return text.replace(/\s+/g, ' ').trim();

  return "NO_CONTENT_FOUND";
}

files.forEach(f => {
  if (fs.existsSync(f)) {
    console.log(`\n=== FILE: ${path.basename(f)} ===`);
    try {
        const content = fs.readFileSync(f, 'utf8');
        const extracted = extract(content);
        console.log("LENGTH: " + extracted.length);
        console.log(extracted.substring(0, 3000)); 
    } catch (e) {
        console.log("Error parsing: " + e.message);
    }
  } else {
    console.log(`File not found: ${f}`);
  }
});

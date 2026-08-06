
import * as fs from 'fs';
import * as path from 'path';

interface KindergartenTarget {
  kindercode: string;
  name: string;
  address: string;
  sido_code: string;
}

const kindergartensPath = path.resolve('public/data/kindergartens.json');
const kindergartens = JSON.parse(
  fs.readFileSync(kindergartensPath, 'utf-8')
) as KindergartenTarget[];
const incheon = kindergartens.filter((kindergarten) => kindergarten.sido_code === '28');

const csv = incheon
  .map(
    (kindergarten) =>
      `"${kindergarten.name}","${kindergarten.kindercode}","${kindergarten.address}"`
  )
  .join('\n');
const header = 'Name,ID,Address\n';

const outputDirectory = path.resolve('scripts/data-output');
fs.mkdirSync(outputDirectory, { recursive: true });
const outputPath = path.join(outputDirectory, 'manual-collection-targets-incheon.csv');
fs.writeFileSync(outputPath, header + csv);
console.log(`Exported ${incheon.length} kindergartens to ${outputPath}`);

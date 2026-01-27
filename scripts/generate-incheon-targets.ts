
import * as fs from 'fs';
import * as path from 'path';

const kindergartensPath = path.resolve('public/data/kindergartens.json');
const kindergartens = JSON.parse(fs.readFileSync(kindergartensPath, 'utf-8'));
const incheon = kindergartens.filter((k: any) => k.sido_code === '28');

const csv = incheon.map((k: any) => `"${k.name}","${k.kindercode}","${k.address}"`).join('\n');
const header = 'Name,ID,Address\n';

const outputPath = path.resolve('public/data/manual_collection_targets_incheon.csv');
fs.writeFileSync(outputPath, header + csv);
console.log(`Exported ${incheon.length} kindergartens to ${outputPath}`);

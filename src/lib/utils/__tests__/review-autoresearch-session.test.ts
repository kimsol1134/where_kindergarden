import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  restoreAssets,
  snapshotAssets,
  type SnapshotAsset,
} from '../../../../scripts/review-autoresearch/lib/session-snapshot';

describe('review autoresearch session snapshot', () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    while (tempDirs.length > 0) {
      const directory = tempDirs.pop();
      if (directory && fs.existsSync(directory)) {
        fs.rmSync(directory, { recursive: true, force: true });
      }
    }
  });

  it('snapshot 후 restore 하면 working dataset이 원복된다', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'review-autoresearch-'));
    tempDirs.push(root);

    const workingFile = path.join(root, 'working/public/data/reviews.json');
    const snapshotDir = path.join(root, 'snapshots/best');
    fs.mkdirSync(path.dirname(workingFile), { recursive: true });
    fs.writeFileSync(workingFile, JSON.stringify({ version: 'baseline', totalCount: 1 }));

    const assets: SnapshotAsset[] = [
      {
        sourcePath: workingFile,
        relativePath: 'working/public/data/reviews.json',
      },
    ];

    snapshotAssets(snapshotDir, assets);
    fs.writeFileSync(workingFile, JSON.stringify({ version: 'discarded', totalCount: 9 }));

    restoreAssets(snapshotDir, assets);

    expect(JSON.parse(fs.readFileSync(workingFile, 'utf-8'))).toMatchObject({
      version: 'baseline',
      totalCount: 1,
    });
  });
});

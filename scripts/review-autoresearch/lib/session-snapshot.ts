import * as fs from 'fs';
import * as path from 'path';

export interface SnapshotAsset {
  sourcePath: string;
  relativePath: string;
}

export function ensureDirectory(directoryPath: string): void {
  if (!fs.existsSync(directoryPath)) {
    fs.mkdirSync(directoryPath, { recursive: true });
  }
}

export function snapshotAssets(
  targetDir: string,
  assets: readonly SnapshotAsset[]
): void {
  ensureDirectory(targetDir);

  for (const asset of assets) {
    const destinationPath = path.join(targetDir, asset.relativePath);
    ensureDirectory(path.dirname(destinationPath));
    if (!fs.existsSync(asset.sourcePath)) {
      continue;
    }
    fs.copyFileSync(asset.sourcePath, destinationPath);
  }
}

export function restoreAssets(
  sourceDir: string,
  assets: readonly SnapshotAsset[]
): void {
  for (const asset of assets) {
    const sourcePath = path.join(sourceDir, asset.relativePath);
    if (!fs.existsSync(sourcePath)) {
      continue;
    }
    ensureDirectory(path.dirname(asset.sourcePath));
    fs.copyFileSync(sourcePath, asset.sourcePath);
  }
}

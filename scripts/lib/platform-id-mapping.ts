import * as fs from 'fs';
import * as path from 'path';
import { ensureDirectory } from './review-verification-pipeline';

export type PlatformName = 'naver_place' | 'starteacher';

interface PlatformIdMappingFile {
  updatedAt: string;
  totalCount: number;
  mapping: Record<string, string>;
}

const DATA_OUTPUT_DIR = path.resolve('scripts/data-output');

function buildMappingPath(platform: PlatformName): string {
  return path.join(DATA_OUTPUT_DIR, `platform-id-mapping-${platform}.json`);
}

export function loadPlatformMapping(platform: PlatformName): Map<string, string> {
  const filePath = buildMappingPath(platform);
  if (!fs.existsSync(filePath)) {
    return new Map();
  }
  const file: PlatformIdMappingFile = JSON.parse(
    fs.readFileSync(filePath, 'utf-8')
  );
  return new Map(Object.entries(file.mapping));
}

export function savePlatformMapping(
  platform: PlatformName,
  mapping: Map<string, string>
): void {
  ensureDirectory(DATA_OUTPUT_DIR);
  const file: PlatformIdMappingFile = {
    updatedAt: new Date().toISOString(),
    totalCount: mapping.size,
    mapping: Object.fromEntries(mapping),
  };
  fs.writeFileSync(buildMappingPath(platform), JSON.stringify(file, null, 2));
}

/**
 * Haversine distance between two lat/lng points in meters.
 */
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Extract a core name from a kindergarten name for fuzzy matching.
 * Strips common suffixes like 유치원, 어린이집, etc.
 */
export function extractCoreName(name: string): string {
  return name
    .replace(/\s*(유치원|어린이집|유아원|보육원|키즈|아카데미)\s*$/g, '')
    .trim();
}

export interface MatchCandidate {
  id: string;
  name: string;
  address: string;
  lat?: number;
  lng?: number;
}

export interface MatchResult {
  candidateId: string;
  confidence: number;
  reason: string;
}

/**
 * Find the best matching candidate for a kindergarten.
 * Returns null if no confident match is found.
 */
export function findBestMatch(
  kindergartenName: string,
  kindergartenAddress: string,
  kindergartenLat: number | null,
  kindergartenLng: number | null,
  candidates: MatchCandidate[],
  maxDistanceMeters = 500
): MatchResult | null {
  const coreName = extractCoreName(kindergartenName);
  let bestMatch: MatchResult | null = null;

  for (const candidate of candidates) {
    const candidateCore = extractCoreName(candidate.name);
    let confidence = 0;
    const reasons: string[] = [];

    // Name matching
    if (candidate.name === kindergartenName) {
      confidence += 0.5;
      reasons.push('exact name');
    } else if (candidateCore === coreName) {
      confidence += 0.4;
      reasons.push('core name match');
    } else if (
      candidate.name.includes(coreName) ||
      kindergartenName.includes(candidateCore)
    ) {
      confidence += 0.25;
      reasons.push('partial name');
    } else {
      continue;
    }

    // Address matching
    const addressParts = kindergartenAddress.split(' ').slice(0, 3);
    const matchedParts = addressParts.filter((part) =>
      candidate.address.includes(part)
    );
    if (matchedParts.length >= 2) {
      confidence += 0.3;
      reasons.push('address match');
    } else if (matchedParts.length === 1) {
      confidence += 0.1;
      reasons.push('partial address');
    }

    // Geographic distance
    if (
      kindergartenLat != null &&
      kindergartenLng != null &&
      candidate.lat != null &&
      candidate.lng != null
    ) {
      const distance = haversineDistance(
        kindergartenLat,
        kindergartenLng,
        candidate.lat,
        candidate.lng
      );
      if (distance < 100) {
        confidence += 0.3;
        reasons.push(`${Math.round(distance)}m`);
      } else if (distance < maxDistanceMeters) {
        confidence += 0.15;
        reasons.push(`${Math.round(distance)}m`);
      } else {
        confidence -= 0.3;
        reasons.push(`too far: ${Math.round(distance)}m`);
      }
    }

    if (confidence > (bestMatch?.confidence ?? 0)) {
      bestMatch = {
        candidateId: candidate.id,
        confidence,
        reason: reasons.join(', '),
      };
    }
  }

  if (bestMatch && bestMatch.confidence >= 0.5) {
    return bestMatch;
  }

  return null;
}

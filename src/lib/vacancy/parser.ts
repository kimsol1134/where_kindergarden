import type { VacancyDetailRow, VacancySummary } from '../../types/vacancy';

interface ParsedVacancyListPage {
  items: VacancySummary[];
  totalPages: number;
  totalCount: number;
}

const COMMON_ENTITY_MAP: Record<string, string> = {
  '&nbsp;': ' ',
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
};

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&nbsp;|&amp;|&lt;|&gt;|&quot;|&#39;/g, (entity) => COMMON_ENTITY_MAP[entity] ?? entity)
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCharCode(parseInt(code, 16)));
}

function stripTags(value: string): string {
  return decodeHtmlEntities(value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
}

function parseNullableText(value: string | undefined): string | null {
  if (!value) return null;
  const text = stripTags(value);
  return text.length > 0 ? text : null;
}

function parseInteger(value: string | undefined): number {
  if (!value) return 0;
  const normalized = stripTags(value).replace(/,/g, '');
  const match = normalized.match(/-?\d+/);
  return match ? Number(match[0]) : 0;
}

function extractCells(rowHtml: string): string[] {
  return Array.from(rowHtml.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi), (match) => match[1]);
}

export function parseVacancyListPage(html: string, aidYear: string): ParsedVacancyListPage {
  const totalCount = Number(html.match(/유치원 조회결과 - 총\s*([0-9,]+)건/u)?.[1].replace(/,/g, '') ?? 0);
  const totalPages = Math.max(
    1,
    ...Array.from(html.matchAll(/fn_search\((\d+)\)/g), (match) => Number(match[1]))
  );

  const tbodyMatch = html.match(/<tbody[^>]*id=["']dsMainTbody["'][^>]*>([\s\S]*?)<\/tbody>/i);
  if (!tbodyMatch) {
    return { items: [], totalPages, totalCount };
  }

  const items: VacancySummary[] = [];

  for (const rowMatch of tbodyMatch[1].matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const rowHtml = rowMatch[1];
    const cells = extractCells(rowHtml);

    if (cells.length < 7) {
      continue;
    }

    const ittIdMatch = rowHtml.match(/ittId=([^&'"]+)/i);
    if (!ittIdMatch) {
      continue;
    }

    const detailCodeMatch = rowHtml.match(
      /fn_vacancyDetail\('([^']+)','([^']+)','([^']+)'\)/i
    );

    items.push({
      kindercode: ittIdMatch[1],
      aidYear,
      vacancyCount: parseInteger(cells[4]),
      updatedAt: parseNullableText(cells[6]),
      preschCd: detailCodeMatch?.[1] ?? null,
      upperEduOfficeCd: detailCodeMatch?.[2] ?? null,
      eduOfficeCd: detailCodeMatch?.[3] ?? null,
      foundType: parseNullableText(cells[1]),
      name: stripTags(cells[0]),
      address: stripTags(cells[2]),
      phone: parseNullableText(cells[5]),
      detail: [],
    });
  }

  return { items, totalPages, totalCount };
}

export function parseVacancyDetailPage(html: string): VacancyDetailRow[] {
  const tableMatch = html.match(/<table\b[^>]*class=["'][^"']*ed_tbst[^"']*["'][^>]*>([\s\S]*?)<\/table>/i);
  if (!tableMatch) {
    return [];
  }

  const rows: VacancyDetailRow[] = [];

  for (const rowMatch of tableMatch[1].matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const cells = extractCells(rowMatch[1]);
    if (cells.length !== 4) {
      continue;
    }

    const rowNo = parseInteger(cells[0]);
    if (rowNo === 0) {
      continue;
    }

    rows.push({
      rowNo,
      age: stripTags(cells[1]),
      course: stripTags(cells[2]),
      vacancyCount: parseInteger(cells[3]),
    });
  }

  return rows;
}

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");

const EVENTS_IN = resolve(repoRoot, "docs/mixpanel-lexicon-events.csv");
const PROPS_IN = resolve(repoRoot, "docs/mixpanel-lexicon-properties.csv");
const OUT_DIR = resolve(repoRoot, "scripts/data-output");
const OUT_FILE = resolve(OUT_DIR, "mixpanel-lexicon-import.csv");

const HEADERS = [
  "Entity Type",
  "Entity Name",
  "Entity Display Name",
  "Entity Description",
  "Event Volume",
  "Event Query Volume",
  "Event Tags",
  "Event Hidden",
  "Event Dropped",
  "Event First Queried By",
  "Event First Queried",
  "Event Last Queried By",
  "Event Last Queried",
  "Property Name",
  "Property Display Name",
  "Property Description",
  "Property Volume",
  "Property Query Volume",
  "Property Type",
  "Property Example Values",
  "Property Hidden",
  "Property Dropped",
  "Property Required",
  "Property Sensitive",
] as const;

const SUPER_PROPS = [
  "app_version",
  "build_number",
  "days_since_install",
  "device_model",
  "is_testflight",
  "locale",
  "os_version",
  "session_id",
] as const;

const EVENT_PROPERTIES: Record<string, readonly string[]> = {
  "App Launched": [],
  "Search Executed": [
    "radius",
    "result_count",
    "has_results",
    "query_length",
    "search_query",
    "query_type",
    "sigungu_code",
  ],
  "Empty State Shown": [
    "radius",
    "result_count",
    "has_results",
    "query_length",
    "search_query",
    "query_type",
    "sigungu_code",
  ],
  "Result Tapped": ["kindercode"],
  "Detail Opened": ["kindercode", "kindergarten_type"],
  "Favorite Added": ["kindercode"],
  "Favorite Removed": ["kindercode"],
  "Comparison Added": ["kindercode"],
  "Comparison Removed": ["kindercode"],
  "Compare Viewed": ["compare_count"],
  "Compare Shared": ["compare_count", "method"],
  "Filter Applied": ["radius", "sort"],
  "Tab Changed": ["from_tab", "to_tab"],
};

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      continue;
    }
    if (ch === ",") {
      row.push(field);
      field = "";
      continue;
    }
    if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      continue;
    }
    if (ch === "\r") {
      continue;
    }
    field += ch;
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

function escapeCell(value: string): string {
  if (value === "") return "";
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function rowsToMap(rows: string[][]): Record<string, string>[] {
  const [header, ...data] = rows;
  return data.map((row) => {
    const entry: Record<string, string> = {};
    header.forEach((key, idx) => {
      entry[key.trim()] = (row[idx] ?? "").trim();
    });
    return entry;
  });
}

function blankCols(count: number): string[] {
  return new Array(count).fill("");
}

function buildEventRow(record: Record<string, string>): string[] {
  return [
    "event",
    record.event_name,
    record.display_name,
    record.description,
    "", "", record.category ?? "", "False", "False",
    "", "", "", "",
    ...blankCols(11),
  ];
}

function buildPropertyRow(record: Record<string, string>): string[] {
  const type = (record.type ?? "string").toLowerCase();
  const safeType = ["string", "number", "boolean"].includes(type) ? type : "string";
  return [
    ...blankCols(13),
    record.property_name,
    record.display_name,
    record.description,
    "", "",
    safeType,
    record.example ?? "",
    "False", "False", "False", "False",
  ];
}

function run() {
  mkdirSync(OUT_DIR, { recursive: true });

  const events = rowsToMap(parseCsv(readFileSync(EVENTS_IN, "utf-8")));
  const propsList = rowsToMap(parseCsv(readFileSync(PROPS_IN, "utf-8")));
  const propsByName = new Map(propsList.map((p) => [p.property_name, p]));

  const missingMap = new Set<string>();
  for (const evName of Object.keys(EVENT_PROPERTIES)) {
    if (!events.some((e) => e.event_name === evName)) {
      missingMap.add(evName);
    }
  }
  if (missingMap.size > 0) {
    throw new Error(
      `EVENT_PROPERTIES references unknown events: ${[...missingMap].join(", ")}`,
    );
  }

  const lines: string[] = [HEADERS.join(",")];

  for (const event of events) {
    const evName = event.event_name;
    lines.push(buildEventRow(event).map(escapeCell).join(","));

    const attached = [
      ...SUPER_PROPS,
      ...(EVENT_PROPERTIES[evName] ?? []),
    ];
    for (const propName of attached) {
      const prop = propsByName.get(propName);
      if (!prop) {
        throw new Error(
          `property ${propName} referenced by event ${evName} not found in properties CSV`,
        );
      }
      lines.push(buildPropertyRow(prop).map(escapeCell).join(","));
    }
  }

  writeFileSync(OUT_FILE, lines.join("\n") + "\n", "utf-8");

  console.log(`wrote ${lines.length - 1} rows -> ${OUT_FILE}`);
  console.log(`  events: ${events.length}`);
  console.log(`  property rows (including duplicates per event): ${lines.length - 1 - events.length}`);
  console.log("");
  console.log("Upload via Mixpanel → Lexicon → Events → Import Schema → CSV.");
  console.log("Mixpanel overwrites existing metadata for matching event/property names.");
}

run();

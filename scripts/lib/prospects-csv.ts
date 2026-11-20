import fs from "fs";
import path from "path";

export const DEFAULT_PROSPECTS_CSV =
  process.env.PROSPECTS_CSV ||
  "/workspace/shopify-competitor-tracker/gtm/starter-prospects.csv";

export const COMPETITOR_COLUMNS = [
  "competitor_1_url",
  "competitor_2_url",
  "competitor_3_url",
] as const;

export type CsvRow = Record<string, string>;

export function parseCsv(text: string): CsvRow[] {
  const src = text.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < src.length; i++) {
    const ch = src[i]!;
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field);
      field = "";
      if (row.some((cell) => cell.length > 0)) rows.push(row);
      row = [];
    } else if (ch !== "\r") {
      field += ch;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    if (row.some((cell) => cell.length > 0)) rows.push(row);
  }
  if (rows.length === 0) return [];
  const headers = rows[0]!.map((h) => h.trim());
  return rows.slice(1).map((cells) => {
    const obj: CsvRow = {};
    for (let i = 0; i < headers.length; i++) {
      obj[headers[i]!] = (cells[i] || "").trim();
    }
    return obj;
  });
}

export function loadProspectCsv(csvPath = DEFAULT_PROSPECTS_CSV): CsvRow[] {
  const resolved = path.resolve(csvPath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`Prospect CSV not found at ${resolved}`);
  }
  return parseCsv(fs.readFileSync(resolved, "utf8"));
}

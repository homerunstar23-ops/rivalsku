import path from "path";
import { getStoreByDomain, listStores } from "../src/lib/db";
import { addStore, normalizeDomain } from "../src/lib/monitor";
import {
  COMPETITOR_COLUMNS,
  DEFAULT_PROSPECTS_CSV,
  loadProspectCsv,
} from "./lib/prospects-csv";

async function main() {
  const csvPath = path.resolve(process.argv[2] || DEFAULT_PROSPECTS_CSV);
  const rows = loadProspectCsv(csvPath);
  console.log(
    `[RivalSKU] Importing unique competitor stores from ${csvPath} (${rows.length} prospect row(s))`,
  );

  let imported = 0;
  let skippedExisting = 0;
  let skippedDuplicateInFile = 0;
  let skippedEmpty = 0;
  const seen = new Set<string>();

  for (const row of rows) {
    const vertical = row.vertical?.trim() || null;
    for (const col of COMPETITOR_COLUMNS) {
      const raw = row[col]?.trim();
      if (!raw) {
        skippedEmpty += 1;
        continue;
      }
      let domain: string;
      try {
        domain = normalizeDomain(raw);
      } catch (err) {
        console.warn(
          `  Skipping invalid URL "${raw}": ${err instanceof Error ? err.message : err}`,
        );
        continue;
      }
      if (seen.has(domain)) {
        skippedDuplicateInFile += 1;
        console.log(`  skip (duplicate in CSV): ${domain}`);
        continue;
      }
      seen.add(domain);
      const existing = getStoreByDomain(domain);
      if (existing) {
        skippedExisting += 1;
        console.log(
          `  skip (already in stores): ${domain}  [#${existing.id} ${existing.status}]`,
        );
        continue;
      }
      const store = await addStore(raw, vertical || undefined);
      imported += 1;
      console.log(
        `  imported #${store.id} ${store.domain}${vertical ? `  [${vertical}]` : ""}`,
      );
    }
  }

  const all = listStores();
  console.log("[RivalSKU] Import complete.");
  console.log(`  unique competitor domains in CSV: ${seen.size}`);
  console.log(`  newly imported: ${imported}`);
  console.log(`  skipped (already in stores): ${skippedExisting}`);
  console.log(`  skipped (duplicate in CSV): ${skippedDuplicateInFile}`);
  console.log(`  empty competitor slots: ${skippedEmpty}`);
  console.log(`  stores table now has: ${all.length} row(s)`);
}

main().catch((err) => {
  console.error("[RivalSKU] import-prospects failed:", err);
  process.exit(1);
});

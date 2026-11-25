import fs from "fs";
import path from "path";
import { getBrandDirectory } from "../src/lib/adapters";
import { fetchShopifyBatch } from "../src/lib/adapters/shopify";
import type { NormalizedDeal } from "../src/lib/adapters/types";

async function main() {
  const dir = getBrandDirectory();
  const shopify = dir.filter((b) => b.source === "shopify");
  console.log(
    `Scanning ${shopify.length} live Shopify brands (total directory: ${dir.length})...`,
  );

  const rawDeals = await fetchShopifyBatch(shopify, {
    concurrency: 24,
    timeoutMs: 5000,
    maxProducts: 100,
  });

  // Cap per brand to keep snapshot sleek and diverse across brands:
  // keep top 12 biggest drops + up to 4 new launches + up to 4 back-in-stock per brand
  const byBrand = new Map<string, NormalizedDeal[]>();
  for (const d of rawDeals) {
    const arr = byBrand.get(d.brandDomain) || [];
    arr.push(d);
    byBrand.set(d.brandDomain, arr);
  }

  const curated: NormalizedDeal[] = [];
  for (const [, list] of byBrand.entries()) {
    const picked = new Set<string>();
    const seenTitles = new Set<string>();
    const uniqueList = list.filter((d) => {
      const k = d.title.toLowerCase().trim();
      if (seenTitles.has(k)) return false;
      seenTitles.add(k);
      return true;
    });
    const drops = uniqueList
      .filter((d) => d.sectionTags.includes("biggest_drop"))
      .sort((a, b) => b.discountPct - a.discountPct || b.savingsDollars - a.savingsDollars)
      .slice(0, 12);
    for (const d of drops) {
      picked.add(d.id);
      curated.push(d);
    }

    const launches = uniqueList
      .filter((d) => !picked.has(d.id) && d.sectionTags.includes("new_launch"))
      .slice(0, 3);
    for (const d of launches) {
      picked.add(d.id);
      curated.push(d);
    }

    const restocks = uniqueList
      .filter((d) => !picked.has(d.id) && d.sectionTags.includes("back_in_stock"))
      .slice(0, 3);
    for (const d of restocks) {
      picked.add(d.id);
      curated.push(d);
    }
  }

  // Sort globally by discountPct desc
  curated.sort(
    (a, b) =>
      b.discountPct - a.discountPct || b.savingsDollars - a.savingsDollars,
  );

  const outPath = path.resolve(
    process.cwd(),
    "src",
    "data",
    "deals-snapshot.json",
  );
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  const payload = {
    generatedAt: new Date().toISOString(),
    liveBrandsChecked: shopify.length,
    brandsWithDeals: byBrand.size,
    totalDeals: curated.length,
    deals: curated,
  };
  fs.writeFileSync(outPath, JSON.stringify(payload));

  const sizeMb = (fs.statSync(outPath).size / (1024 * 1024)).toFixed(2);
  console.log(
    `Wrote ${curated.length} real curated items across ${byBrand.size} brands (${sizeMb} MB) to ${outPath}`,
  );
  console.log(
    "Section counts:",
    {
      biggest_drop: curated.filter((d) => d.sectionTags.includes("biggest_drop")).length,
      just_went_on_sale: curated.filter((d) => d.sectionTags.includes("just_went_on_sale")).length,
      back_in_stock: curated.filter((d) => d.sectionTags.includes("back_in_stock")).length,
      new_launch: curated.filter((d) => d.sectionTags.includes("new_launch")).length,
    },
  );
  console.log(
    "Top 8 drops:",
    curated
      .filter((d) => d.sectionTags.includes("biggest_drop"))
      .slice(0, 8)
      .map((d) => `${d.brandName}: ${d.title} (${d.discountPct}% off, $${d.wasPrice} -> $${d.nowPrice})`),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

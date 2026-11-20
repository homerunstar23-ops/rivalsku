import { getStoreByDomain, listStores } from "../src/lib/db";
import { addStore, scanStore } from "../src/lib/monitor";

const SEED_STORES = [
  { url: "allbirds.com", vertical: "footwear" },
  { url: "tentree.com", vertical: "apparel" },
  { url: "colourpop.com", vertical: "beauty" },
];

async function main() {
  console.log("[RivalSKU] Seeding demo competitors and running live scans…");
  for (const seed of SEED_STORES) {
    const existing = getStoreByDomain(seed.url.replace(/^www\./, ""));
    const store = existing || (await addStore(seed.url, seed.vertical));
    console.log(`  Scanning ${store.domain}…`);
    const result = await scanStore(store.id, { dispatch: false });
    const s = result.store;
    if (result.unsupported) {
      console.log(`    Unsupported / protected storefront`);
    } else {
      console.log(
        `    ${s.name}: ${s.product_count} products, ${s.active_sale_count} on sale, ${s.out_of_stock_count} out of stock, promo=${s.promo_banner ? JSON.stringify(s.promo_banner) : "none"}`,
      );
    }
  }
  console.log("[RivalSKU] Seed complete.");
  for (const s of listStores()) {
    console.log(
      `  #${s.id} ${s.domain} status=${s.status} products=${s.product_count} sales=${s.active_sale_count} oos=${s.out_of_stock_count}`,
    );
  }
}

main().catch((err) => {
  console.error("[RivalSKU] seed failed:", err);
  process.exit(1);
});

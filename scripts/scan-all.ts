import { listStores } from "../src/lib/db";
import { scanAllStores } from "../src/lib/monitor";

async function main() {
  const before = listStores();
  console.log(
    `[RivalSKU] Starting scan of ${before.filter((s) => s.status === "active" || s.status === "error").length} store(s) at ${new Date().toISOString()}`,
  );
  const results = await scanAllStores();
  for (const result of results) {
    const s = result.store;
    if (result.unsupported) {
      console.log(
        `  - ${s.domain}: Unsupported / protected storefront (status=${s.status})`,
      );
    } else if (result.message && result.eventsInserted === 0 && s.status === "error") {
      console.log(`  - ${s.domain}: ERROR ${result.message}`);
    } else {
      console.log(
        `  - ${s.name} (${s.domain}): ${s.product_count} products, ${s.active_sale_count} on sale, ${s.out_of_stock_count} OOS, ${result.eventsInserted} new events${result.firstScan ? " [baseline]" : ""}`,
      );
    }
  }
  console.log(`[RivalSKU] Scan complete. ${results.length} store(s) processed.`);
}

main().catch((err) => {
  console.error("[RivalSKU] scan-all failed:", err);
  process.exit(1);
});

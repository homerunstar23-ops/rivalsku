import { runDealScout } from "../src/dealscout/run";

async function main() {
  if (process.argv.includes("--live")) {
    console.error("[DealScout] Live buying is not implemented. DealScout only recommends; every purchase needs Cory's approval.");
  }
  const r = await runDealScout();
  for (const s of r.sources) console.log(`  - ${s.id}: ${s.error ? "ERROR " + s.error : s.note}${s.items !== undefined ? ` (${s.items})` : ""}`);
  const pass = r.candidates.filter((c) => c.filter.pass).length;
  const prom = r.ebay.filter((f) => f.verdict === "promising").length;
  console.log(`[DealScout] Paper run #${r.runId}: ${r.candidates.length} Amazon candidates (${pass} pass), ${r.ebay.length} eBay flags (${prom} promising).`);
  console.log(`[DealScout] Report: ${r.reportPath}`);
}

main().catch((e) => {
  console.error("[DealScout] failed:", e);
  process.exit(1);
});

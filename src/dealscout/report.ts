import { evaluateDeal } from "./fees";
import type { RunResult } from "./run";

const usd = (n: number) => `$${n.toFixed(2)}`;
const pct = (n: number) => `${(n * 100).toFixed(0)}%`;

export function renderReport(r: RunResult): string {
  const et = r.startedAt.toLocaleString("en-US", { timeZone: "America/New_York", dateStyle: "full", timeStyle: "short" });
  const L: string[] = [];
  L.push(`# DealScout morning report — ${et} ET`);
  L.push("");
  L.push(`Mode: **PAPER** (recommendations only; nothing is bought). Resale certificate: ${r.hasResaleCertificate ? "yes (no sales tax)" : "no (7% FL tax added to buy cost)"}.`);
  L.push("");
  L.push("## Sources");
  L.push("| Source | Status | Items |");
  L.push("|---|---|---|");
  for (const s of r.sources) L.push(`| ${s.label} | ${s.error ? `error: ${s.error}` : s.note} | ${s.items ?? "–"} |`);
  L.push("");

  L.push("## Amazon FBA buy list");
  const pass = r.candidates.filter((c) => c.filter.pass);
  if (!r.sources.find((s) => s.id === "keepa")?.enabled) {
    L.push("No Amazon candidates today: the Keepa API key is not set, so retailer items cannot be matched to Amazon prices, sales rank or fees. " +
      (r.retailOffersFound ? `${r.retailOffersFound} retailer markdowns were found and are waiting on Keepa.` : "No retailer source is enabled either (Best Buy / Walmart keys not set)."));
  } else if (!pass.length) {
    L.push(`${r.candidates.length} matched items were evaluated; none passed every filter today.`);
  } else {
    L.push("| Item | Buy at | Buy price | Max buy | Amazon | Profit | ROI | Sales/mo | Qty cap | Still to verify |");
    L.push("|---|---|---|---|---|---|---|---|---|---|");
    for (const c of pass.slice(0, 25)) {
      L.push(`| ${c.match.title.slice(0, 60)} ([${c.match.asin}](https://www.amazon.com/dp/${c.match.asin})) | [${c.offer.retailer}](${c.offer.retailerUrl ?? ""}) | ${usd(c.offer.buyPrice)} | ${usd(c.deal.maxBuyFor30Roi)} | ${usd(c.match.amazonPrice)} | ${usd(c.deal.profit)} | ${pct(c.deal.roi)} | ${c.match.estMonthlySales ?? "?"} | ${c.qtyCap} | ${c.filter.unknowns.join("; ") || "–"} |`);
    }
  }
  const nearMiss = r.candidates.filter((c) => !c.filter.pass).slice(0, 10);
  if (nearMiss.length) {
    L.push("");
    L.push("Near misses:");
    for (const c of nearMiss) L.push(`- ${c.match.title.slice(0, 60)}: ${c.filter.reasons.join("; ")}`);
  }
  L.push("");

  // Fee engine self-check on the research Page's worked example.
  const ex = evaluateDeal({ buyPrice: 18, amazonPrice: 34.99, category: "toys", dims: { lengthIn: 10, widthIn: 6, heightIn: 1.5, weightLb: 0.75 }, date: r.startedAt, hasResaleCertificate: r.hasResaleCertificate });
  L.push("## Fee engine check (worked example: $18 toy → $34.99 on Amazon, 12 oz, 10×6×1.5 in)");
  L.push(`Today's rules (${ex.fulfillment?.peak ? "holiday peak card" : "non-peak card"}, ${r.startedAt.getMonth() >= 9 ? "Q4 storage" : "base storage"}): referral ${usd(ex.lines.referral)}, fulfillment ${usd(ex.lines.fulfillment)}, storage ${usd(ex.lines.storage)}, tax ${usd(ex.lines.salesTax)} → profit **${usd(ex.profit)}**, ROI **${pct(ex.roi)}**, max buy price for 30% ROI **${usd(ex.maxBuyFor30Roi)}**.`);
  L.push("");

  L.push("## eBay channel: DTC markdowns from RivalSKU");
  const promising = r.ebay.filter((f) => f.verdict === "promising");
  const marginal = r.ebay.filter((f) => f.verdict === "marginal");
  L.push(`${r.ebay.length} in-stock products at 35%+ off were checked. **${promising.length} promising**, ${marginal.length} marginal. ` +
    `Promising = the eBay price needed for max(30% ROI, $8 profit) after eBay's 13.6% + $0.40 and an estimated shipping label is at or below an assumed resale value (55% of retail for apparel/footwear, 50% home, 45% beauty, 35% wellness). ` +
    `Sold comps: ${r.ebayProbeStatus === 200 ? "eBay sold search reachable this run, but not parsed in v1" : `eBay's sold search returned HTTP ${r.ebayProbeStatus || "timeout"} to a scripted request`}, so every row needs a manual sold-comps check via its link before buying.`);
  L.push("");
  if (promising.length) {
    L.push("| Brand | Product | Sale | Retail | Off | Need on eBay | Assumed resale | Comps |");
    L.push("|---|---|---|---|---|---|---|---|");
    for (const f of promising.slice(0, 20)) {
      L.push(`| ${f.brand} | [${f.productTitle.slice(0, 50)}${f.variantTitle ? ` (${f.variantTitle.slice(0, 25)})` : ""}](${f.productUrl}) | ${usd(f.salePrice)} | ${usd(f.fullPrice)} | ${f.discountPct}% | ${usd(f.breakevenEbayPrice)} | ${usd(f.assumedResale)} | ${f.compPrice ? `active median ${usd(f.compPrice)}; ` : ""}[sold comps](${f.compLink}) |`);
    }
    L.push("");
    const byBrand = new Map<string, number>();
    for (const f of promising) byBrand.set(f.brand, (byBrand.get(f.brand) ?? 0) + 1);
    L.push("Promising by brand: " + [...byBrand.entries()].sort((a, b) => b[1] - a[1]).map(([b, n]) => `${b} ${n}`).join(", ") + ".");
    L.push("");
  }
  L.push("Note: Allbirds and Coyuchi publish authorized-reseller policies; one-off resale of genuine items on eBay is common, but keep volumes small and never use brand images.");
  L.push("");
  L.push("## To turn on live Amazon sourcing");
  L.push("- `KEEPA_API_KEY` (Keepa API Starter, €49/mo) — required for any Amazon candidate.");
  L.push("- `BESTBUY_API_KEY` (free, developer.bestbuy.com).");
  L.push("- `WALMART_CONSUMER_ID`, `WALMART_PRIVATE_KEY`, `WALMART_KEY_VERSION` (+ optional `WALMART_PUBLISHER_ID`) from walmart.io / Impact.");
  L.push("- Optional: `EBAY_CLIENT_ID`, `EBAY_CLIENT_SECRET` (eBay developer account) for active-listing price proxies.");
  L.push("- `DEALSCOUT_RESALE_CERT=1` once the Florida Annual Resale Certificate is in hand.");
  L.push("");
  L.push(`Run #${r.runId}. Every buy still needs Cory's explicit approval and Pay tap.`);
  return L.join("\n") + "\n";
}

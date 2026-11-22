import fs from "fs";
import path from "path";
import { evaluateDeal, type DealResult } from "./fees";
import { applyFilters, DEFAULT_FILTERS, type FilterOutcome } from "./filters";
import { getDealScoutDb } from "./db";
import type { AmazonMatch, RetailOffer, SourceStatus } from "./sources/types";
import { keepaStatus, keepaByCodes, keepaReverseSourcing } from "./sources/keepa";
import { bestBuyStatus, bestBuyMarkdowns, bestBuyByUpcs } from "./sources/bestbuy";
import { walmartStatus, walmartSearch, walmartByUpcs } from "./sources/walmart";
import { ebayStatus, findEbayCandidates, addActiveListingProxy, probeKeylessSoldSearch, type EbayFlag } from "./sources/ebay-channel";
import { renderReport } from "./report";

export type Candidate = {
  offer: RetailOffer;
  match: AmazonMatch;
  deal: DealResult;
  filter: FilterOutcome;
  qtyCap: number;
};

export type RunResult = {
  runId: number;
  startedAt: Date;
  mode: "paper";
  hasResaleCertificate: boolean;
  sources: SourceStatus[];
  retailOffersFound: number;
  candidates: Candidate[];
  ebay: EbayFlag[];
  ebayProbeStatus: number;
  reportPath: string;
};

const WALMART_QUERIES = ["clearance toys", "clearance kitchen", "rollback lego", "clearance board games", "clearance pet supplies"];

export async function runDealScout(opts: { outDir?: string; date?: Date } = {}): Promise<RunResult> {
  const startedAt = opts.date ?? new Date();
  const hasResaleCertificate = process.env.DEALSCOUT_RESALE_CERT === "1";
  const db = getDealScoutDb();
  const sources = [keepaStatus(), bestBuyStatus(), walmartStatus(), ebayStatus()];
  const runId = Number(
    db.prepare("INSERT INTO ds_runs (started_at, mode, sources_json) VALUES (?, 'paper', ?)").run(startedAt.toISOString(), JSON.stringify(sources))
      .lastInsertRowid,
  );
  const S = (id: string) => sources.find((s) => s.id === id)!;

  // 1. Forward sourcing: retailer markdowns.
  const offers: RetailOffer[] = [];
  if (S("bestbuy").enabled) {
    try {
      const items = await bestBuyMarkdowns();
      offers.push(...items);
      S("bestbuy").items = items.length;
    } catch (e) { S("bestbuy").error = String(e); }
  }
  if (S("walmart").enabled) {
    try {
      const items = await walmartSearch(WALMART_QUERIES);
      offers.push(...items);
      S("walmart").items = items.length;
    } catch (e) { S("walmart").error = String(e); }
  }

  // 2. Match to Amazon (Keepa), plus reverse sourcing.
  const pairs: { offer: RetailOffer; match: AmazonMatch }[] = [];
  if (S("keepa").enabled) {
    try {
      const upcs = [...new Set(offers.map((o) => o.upc).filter((u): u is string => !!u))];
      const matches = upcs.length ? await keepaByCodes(upcs) : [];
      for (const o of offers) {
        const m = matches.find((x) => o.upc && x.upcs.some((u) => u.replace(/^0+/, "") === o.upc!.replace(/^0+/, "")));
        if (m) pairs.push({ offer: o, match: m });
      }
      const reverse = await keepaReverseSourcing(150);
      S("keepa").items = matches.length + reverse.length;
      const rUpcs = [...new Set(reverse.flatMap((m) => m.upcs))];
      const rOffers: RetailOffer[] = [];
      if (S("bestbuy").enabled) rOffers.push(...(await bestBuyByUpcs(rUpcs).catch(() => [])));
      if (S("walmart").enabled) rOffers.push(...(await walmartByUpcs(rUpcs.slice(0, 150)).catch(() => [])));
      for (const o of rOffers) {
        const m = reverse.find((x) => o.upc && x.upcs.some((u) => u.replace(/^0+/, "") === o.upc!.replace(/^0+/, "")));
        if (m) pairs.push({ offer: { ...o, source: `${o.source}+keepa-reverse` }, match: m });
      }
    } catch (e) { S("keepa").error = String(e); }
  }

  // 3. Fee engine + filters.
  const candidates: Candidate[] = [];
  for (const { offer, match } of pairs) {
    if (!match.dims) continue;
    const deal = evaluateDeal(
      { buyPrice: offer.buyPrice, amazonPrice: match.amazonPrice, category: match.category, dims: match.dims, date: startedAt, hasResaleCertificate },
    );
    const filter = applyFilters(deal, match, DEFAULT_FILTERS);
    const perSeller = (match.estMonthlySales ?? 0) / ((match.fbaOfferCount ?? 0) + 1);
    const qtyCap = Math.max(1, Math.min(10, Math.floor(perSeller)));
    candidates.push({ offer, match, deal, filter, qtyCap });
  }
  candidates.sort((a, b) => Number(b.filter.pass) - Number(a.filter.pass) || b.deal.roi - a.deal.roi);

  const insC = db.prepare(`INSERT INTO ds_amazon_candidates (run_id, source, retailer, retailer_url, upc, asin, title, brand, buy_price, amazon_price,
      profit, roi, max_buy_price, est_monthly_sales, passes, reasons_json, unknowns_json, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
  for (const c of candidates) {
    insC.run(runId, c.offer.source, c.offer.retailer, c.offer.retailerUrl ?? null, c.offer.upc ?? null, c.match.asin, c.match.title, c.match.brand ?? null,
      c.offer.buyPrice, c.match.amazonPrice, c.deal.profit, c.deal.roi, c.deal.maxBuyFor30Roi, c.match.estMonthlySales ?? null,
      c.filter.pass ? 1 : 0, JSON.stringify(c.filter.reasons), JSON.stringify(c.filter.unknowns), startedAt.toISOString());
  }

  // 4. eBay channel from RivalSKU data.
  const ebayProbeStatus = await probeKeylessSoldSearch();
  const ebay = findEbayCandidates({ taxPct: hasResaleCertificate ? 0 : 0.07 });
  try { await addActiveListingProxy(ebay.filter((f) => f.verdict === "promising")); } catch (e) { S("ebay").error = String(e); }
  S("ebay").items = ebay.length;
  const insE = db.prepare(`INSERT INTO ds_ebay_flags (run_id, store_domain, brand, product_title, variant_title, product_url, sale_price, full_price,
      discount_pct, breakeven_ebay_price, breakeven_ratio, verdict, comp_status, comp_price, comp_link, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
  for (const f of ebay) {
    insE.run(runId, f.storeDomain, f.brand, f.productTitle, f.variantTitle, f.productUrl, f.salePrice, f.fullPrice, f.discountPct,
      f.breakevenEbayPrice, f.breakevenRatio, f.verdict, f.compStatus, f.compPrice ?? null, f.compLink, startedAt.toISOString());
  }

  // 5. Report.
  const outDir = opts.outDir ?? path.resolve(process.cwd(), "reports", "dealscout");
  fs.mkdirSync(outDir, { recursive: true });
  const stamp = startedAt.toLocaleDateString("en-CA", { timeZone: "America/New_York" });
  const reportPath = path.join(outDir, `${stamp}.md`);
  const result: RunResult = {
    runId, startedAt, mode: "paper", hasResaleCertificate, sources, retailOffersFound: offers.length,
    candidates, ebay, ebayProbeStatus, reportPath,
  };
  fs.writeFileSync(reportPath, renderReport(result));
  fs.writeFileSync(reportPath.replace(/\.md$/, ".json"), JSON.stringify({ ...result, candidates: candidates.slice(0, 100), ebay: ebay.slice(0, 100) }, null, 2));
  db.prepare("UPDATE ds_runs SET finished_at = ?, summary_json = ?, report_path = ? WHERE id = ?").run(
    new Date().toISOString(),
    JSON.stringify({ offers: offers.length, candidates: candidates.length, passing: candidates.filter((c) => c.filter.pass).length, ebay: ebay.length, ebayPromising: ebay.filter((f) => f.verdict === "promising").length }),
    reportPath, runId,
  );
  return result;
}

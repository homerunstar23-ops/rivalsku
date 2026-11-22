import type { DealResult } from "./fees";

export type AmazonListingSignals = {
  asin: string;
  title: string;
  brand?: string;
  amazonPrice: number; // current Buy Box / new price used for the sale estimate
  avgPrice90?: number;
  estMonthlySales?: number;
  amazonOnListing?: boolean; // Amazon itself in stock as a seller
  fbaOfferCount?: number;
  hazmat?: boolean;
  gated?: boolean; // from SP-API restriction check once Cory has a seller account
};

export type FilterConfig = {
  minRoi: number;
  minProfit: number;
  minMonthlySales: number;
  maxPriceDeviation90: number; // current vs 90-day average, fractional
  maxFbaOffers: number;
  blockedBrands: string[];
};

export const DEFAULT_FILTERS: FilterConfig = {
  minRoi: 0.3,
  minProfit: 4,
  minMonthlySales: 30,
  maxPriceDeviation90: 0.15,
  maxFbaOffers: 15,
  // Cautious starter list: DTC brands that sell on Amazon themselves or publish
  // authorized-reseller policies, plus big brands commonly gated for new sellers.
  // The SP-API restriction check (once Cory has a seller account) is the real gate.
  blockedBrands: [
    "allbirds", "coyuchi", "brooklinen", "nike", "apple", "the north face",
    "under armour", "adidas", "yeti", "hydro flask", "dyson", "bose", "ugg",
  ],
};

export type FilterOutcome = { pass: boolean; reasons: string[]; unknowns: string[] };

export function applyFilters(
  deal: DealResult,
  sig: AmazonListingSignals,
  cfg: FilterConfig = DEFAULT_FILTERS,
): FilterOutcome {
  const reasons: string[] = [];
  const unknowns: string[] = [];
  if (!deal.ok) reasons.push(deal.reason ?? "fee model unavailable");
  if (deal.roi < cfg.minRoi) reasons.push(`ROI ${(deal.roi * 100).toFixed(0)}% < ${cfg.minRoi * 100}%`);
  if (deal.profit < cfg.minProfit) reasons.push(`profit $${deal.profit.toFixed(2)} < $${cfg.minProfit}`);

  if (sig.estMonthlySales === undefined) unknowns.push("monthly sales unknown");
  else if (sig.estMonthlySales < cfg.minMonthlySales)
    reasons.push(`~${sig.estMonthlySales} sales/mo < ${cfg.minMonthlySales}`);

  if (sig.avgPrice90 === undefined || sig.avgPrice90 <= 0) unknowns.push("90-day price unknown");
  else {
    const dev = (sig.amazonPrice - sig.avgPrice90) / sig.avgPrice90;
    if (Math.abs(dev) > cfg.maxPriceDeviation90)
      reasons.push(`price ${dev > 0 ? "above" : "below"} 90-day avg by ${(Math.abs(dev) * 100).toFixed(0)}%`);
  }

  if (sig.amazonOnListing === undefined) unknowns.push("Amazon-on-listing unknown");
  else if (sig.amazonOnListing) reasons.push("Amazon sells it");

  if (sig.fbaOfferCount === undefined) unknowns.push("FBA offer count unknown");
  else if (sig.fbaOfferCount > cfg.maxFbaOffers) reasons.push(`${sig.fbaOfferCount} offers > ${cfg.maxFbaOffers}`);

  if (sig.hazmat) reasons.push("hazmat");
  if (sig.gated) reasons.push("gated for this seller account");
  else if (sig.gated === undefined) unknowns.push("gating not checked (needs SP-API)");

  const brand = (sig.brand ?? "").toLowerCase().trim();
  if (brand && cfg.blockedBrands.some((b) => brand === b || brand.startsWith(b + " ")))
    reasons.push(`blocked brand: ${sig.brand}`);

  return { pass: reasons.length === 0, reasons, unknowns };
}

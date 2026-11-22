/**
 * eBay channel: DTC markdowns from RivalSKU's Shopify scans that may resell on eBay.
 *
 * Data: latest product_snapshots rows in the RivalSKU DB (no new network calls).
 * Comps: eBay's sold-listings page blocks scripted requests (HTTP 403 from the box,
 * tested Nov 22, 2026), and sold data through eBay's API (Marketplace Insights) is a
 * restricted program. So each flag carries a prefilled sold-listings link for a manual
 * check. If EBAY_CLIENT_ID / EBAY_CLIENT_SECRET are set, the Browse API adds the median
 * price of active new listings as a rough proxy (asking prices, not sales).
 */
import { getDb } from "../../lib/db";
import type { SourceStatus } from "./types";

export const EBAY_FEE_PCT = 0.136; // most categories, on the total sale amount
export const EBAY_PER_ORDER = 0.4; // orders over $10

/** Assumed resale value as a share of full retail for new-with-tags DTC goods. Assumption, verify with sold comps. */
export const ASSUMED_RESALE_RATIO: Record<string, number> = {
  apparel: 0.55,
  footwear: 0.55,
  "home goods": 0.5,
  "beauty/skincare": 0.45,
  beauty: 0.45,
  wellness: 0.35,
};

/** Estimated USPS Ground Advantage label cost by vertical (estimate). */
const SHIP_EST: Record<string, number> = {
  apparel: 6,
  footwear: 11,
  "home goods": 13,
  "beauty/skincare": 6,
  beauty: 6,
  wellness: 8,
};

// Excluded: non-US storefronts (prices not in USD) and bulky furniture that cannot ship cheaply.
const EXCLUDED_DOMAINS = new Set([
  "pigletinbed.com",
  "organicbasics.com",
  "burrow.com",
  "albanypark.com",
  "insideweather.com",
]);

export type EbayFlag = {
  storeDomain: string;
  brand: string;
  productTitle: string;
  variantTitle: string | null;
  productUrl: string;
  salePrice: number;
  fullPrice: number;
  discountPct: number;
  shipEst: number;
  breakevenEbayPrice: number;
  assumedResale: number;
  breakevenRatio: number; // breakeven / full retail
  verdict: "promising" | "marginal" | "skip";
  compStatus: "manual_check_needed" | "active_listings_proxy";
  compPrice?: number;
  compLink: string;
};

export function ebayStatus(): SourceStatus {
  const api = !!(process.env.EBAY_CLIENT_ID && process.env.EBAY_CLIENT_SECRET);
  return {
    id: "ebay",
    label: "eBay channel (RivalSKU Shopify markdowns)",
    enabled: true,
    note: api
      ? "runs on RivalSKU data; Browse API active-listing proxy on"
      : "runs on RivalSKU data; sold comps need a manual check (eBay blocks scripted sold searches; EBAY_CLIENT_ID/SECRET not set)",
  };
}

/** eBay price needed to clear max(30% ROI, $8) after eBay fees and the shipping label. */
export function ebayBreakeven(cost: number, shipEst: number, taxPct = 0.07, cashbackPct = 0.02): number {
  const invested = cost * (1 + taxPct);
  const target = Math.max(0.3 * invested, 8);
  const p = (invested - cost * cashbackPct + EBAY_PER_ORDER + shipEst + target) / (1 - EBAY_FEE_PCT);
  return Math.round(p * 100) / 100;
}

export function soldCompsLink(brand: string, title: string): string {
  const q = `${brand} ${title}`.replace(/[^\w\s&'-]/g, " ").replace(/\s+/g, " ").trim();
  return `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(q)}&LH_Sold=1&LH_Complete=1&LH_ItemCondition=1000`;
}

type SnapRow = {
  domain: string;
  name: string;
  vertical: string | null;
  product_id: string;
  title: string;
  variant_title: string | null;
  price: number;
  compare_at_price: number;
  product_url: string;
};

export function findEbayCandidates(opts: { minDiscount?: number; minPrice?: number; maxPrice?: number; limit?: number; taxPct?: number } = {}): EbayFlag[] {
  const minDiscount = opts.minDiscount ?? 0.35;
  const rows = getDb()
    .prepare(
      `SELECT s.domain, s.name, s.vertical, p.product_id, p.title, p.variant_title, p.price, p.compare_at_price, p.product_url
         FROM product_snapshots p JOIN stores s ON s.id = p.store_id
        WHERE p.available = 1 AND p.compare_at_price IS NOT NULL AND p.compare_at_price > p.price
          AND p.price >= ? AND p.price <= ? AND s.status = 'active'`,
    )
    .all(opts.minPrice ?? 15, opts.maxPrice ?? 400) as SnapRow[];

  // Best-discount variant per product.
  const best = new Map<string, SnapRow>();
  for (const r of rows) {
    if (EXCLUDED_DOMAINS.has(r.domain)) continue;
    // Subscriptions, plans and gift cards carry inflated "value" prices and are not resellable goods.
    if (/\b(plan|subscription|subscribe|gift card|membership|refill|sample)\b/i.test(r.title)) continue;
    const disc = 1 - r.price / r.compare_at_price;
    if (disc < minDiscount) continue;
    const key = `${r.domain}:${r.product_id}`;
    const prev = best.get(key);
    if (!prev || r.price / r.compare_at_price < prev.price / prev.compare_at_price) best.set(key, r);
  }

  const flags: EbayFlag[] = [];
  for (const r of best.values()) {
    const v = (r.vertical ?? "apparel").toLowerCase();
    const ship = SHIP_EST[v] ?? 8;
    const ratio = ASSUMED_RESALE_RATIO[v] ?? 0.45;
    const brand = cleanBrand(r.name, r.domain);
    const be = ebayBreakeven(r.price, ship, opts.taxPct ?? 0.07);
    const assumedResale = Math.round(r.compare_at_price * ratio * 100) / 100;
    const verdict = be <= assumedResale ? "promising" : be <= assumedResale * 1.15 ? "marginal" : "skip";
    flags.push({
      storeDomain: r.domain,
      brand,
      productTitle: r.title,
      variantTitle: r.variant_title,
      productUrl: r.product_url,
      salePrice: r.price,
      fullPrice: r.compare_at_price,
      discountPct: Math.round((1 - r.price / r.compare_at_price) * 1000) / 10,
      shipEst: ship,
      breakevenEbayPrice: be,
      assumedResale,
      breakevenRatio: Math.round((be / r.compare_at_price) * 1000) / 1000,
      verdict,
      compStatus: "manual_check_needed",
      compLink: soldCompsLink(brand, r.title),
    });
  }
  flags.sort((a, b) => a.breakevenRatio - b.breakevenRatio);
  return flags.slice(0, opts.limit ?? 5000);
}

function cleanBrand(name: string, domain: string): string {
  if (domain === "cutsclothing.com") return "Cuts";
  return name.split("|")[0].replace(/\b(US|EU|UK)\b/g, "").replace(/®/g, "").trim();
}

/** Optional: median asking price of active NEW listings via eBay Browse API (proxy only). */
export async function addActiveListingProxy(flags: EbayFlag[], max = 25): Promise<void> {
  const id = process.env.EBAY_CLIENT_ID, secret = process.env.EBAY_CLIENT_SECRET;
  if (!id || !secret) return;
  const tokRes = await fetch("https://api.ebay.com/identity/v1/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,
    },
    body: "grant_type=client_credentials&scope=https%3A%2F%2Fapi.ebay.com%2Foauth%2Fapi_scope",
  });
  if (!tokRes.ok) throw new Error(`eBay OAuth HTTP ${tokRes.status}`);
  const token = ((await tokRes.json()) as { access_token: string }).access_token;
  for (const f of flags.slice(0, max)) {
    const q = encodeURIComponent(`${f.brand} ${f.productTitle}`);
    const res = await fetch(
      `https://api.ebay.com/buy/browse/v1/item_summary/search?q=${q}&filter=conditionIds:%7B1000%7D&limit=50`,
      { headers: { Authorization: `Bearer ${token}`, "X-EBAY-C-MARKETPLACE-ID": "EBAY_US" } },
    );
    if (!res.ok) continue;
    const data = (await res.json()) as { itemSummaries?: { price?: { value: string } }[] };
    const prices = (data.itemSummaries ?? []).map((i) => Number(i.price?.value)).filter((n) => n > 0).sort((a, b) => a - b);
    if (prices.length >= 3) {
      f.compPrice = prices[Math.floor(prices.length / 2)];
      f.compStatus = "active_listings_proxy";
    }
  }
}

/** One keyless probe of eBay's sold search, to record whether it is reachable this run. */
export async function probeKeylessSoldSearch(): Promise<number> {
  try {
    const res = await fetch("https://www.ebay.com/sch/i.html?_nkw=allbirds&LH_Sold=1&LH_Complete=1", {
      headers: { "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36" },
      signal: AbortSignal.timeout(15000),
    });
    return res.status;
  } catch {
    return 0;
  }
}

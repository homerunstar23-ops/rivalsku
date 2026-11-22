/**
 * Keepa API adapter (https://keepa.com/api-docs/). Needs KEEPA_API_KEY.
 * Starter plan: €49/month, 20 tokens per minute. Product request = 1 token,
 * Product Finder = 10 + 1 per 100 ASINs.
 */
import type { ReferralCategory } from "../fees";
import type { AmazonMatch, SourceStatus } from "./types";

const BASE = "https://api.keepa.com";

export function keepaKey(): string | undefined {
  return process.env.KEEPA_API_KEY?.trim() || undefined;
}

export function keepaStatus(): SourceStatus {
  const enabled = !!keepaKey();
  return {
    id: "keepa",
    label: "Keepa API (Amazon prices, sales rank, UPC match, reverse sourcing)",
    enabled,
    note: enabled ? "key found" : "skipped: KEEPA_API_KEY not set",
  };
}

const ROOT_CATEGORY_MAP: [RegExp, ReferralCategory][] = [
  [/toys/i, "toys"],
  [/kitchen/i, "kitchen"],
  [/home|bedding|furniture/i, "home"],
  [/sports|outdoors/i, "sports"],
  [/pet/i, "pets"],
  [/office/i, "office"],
  [/tools|home improvement/i, "tools"],
  [/garden|patio|lawn/i, "garden"],
  [/beauty|personal care/i, "beauty"],
  [/health|household/i, "health"],
  [/baby/i, "baby"],
  [/grocery|gourmet/i, "grocery"],
  [/cell phones|accessories/i, "electronics_accessories"],
  [/computers/i, "computers"],
  [/electronics/i, "electronics"],
  [/clothing|shoes|jewelry/i, "clothing"],
  [/automotive/i, "automotive"],
  [/luggage/i, "luggage"],
];

export function mapKeepaCategory(name?: string): ReferralCategory {
  if (!name) return "other";
  for (const [re, cat] of ROOT_CATEGORY_MAP) if (re.test(name)) return cat;
  return "other";
}

type KeepaProduct = {
  asin: string;
  title?: string;
  brand?: string;
  upcList?: string[] | null;
  eanList?: string[] | null;
  packageLength?: number; // mm
  packageWidth?: number;
  packageHeight?: number;
  packageWeight?: number; // g
  categoryTree?: { catId: number; name: string }[] | null;
  hazardousMaterials?: unknown[] | null;
  monthlySold?: number;
  availabilityAmazon?: number; // -1 no Amazon offer, 0 in stock, other = OOS/preorder states
  stats?: {
    current?: number[];
    avg90?: number[];
    buyBoxPrice?: number;
    salesRankDrops30?: number;
    offerCountFBA?: number;
  } | null;
};

const IDX_AMAZON = 0;
const IDX_NEW = 1;
const IDX_COUNT_NEW = 11;
const IDX_BUY_BOX = 18;

const cents = (v?: number) => (v !== undefined && v > 0 ? v / 100 : undefined);

/** Convert one Keepa product into the fields DealScout needs. Exported for tests. */
export function parseKeepaProduct(p: KeepaProduct): AmazonMatch | null {
  const cur = p.stats?.current ?? [];
  const avg = p.stats?.avg90 ?? [];
  const price = cents(p.stats?.buyBoxPrice) ?? cents(cur[IDX_BUY_BOX]) ?? cents(cur[IDX_NEW]) ?? cents(cur[IDX_AMAZON]);
  if (!price) return null;
  const avg90 = cents(avg[IDX_BUY_BOX]) ?? cents(avg[IDX_NEW]);
  const mm = (v?: number) => (v && v > 0 ? v / 25.4 : undefined);
  const L = mm(p.packageLength), W = mm(p.packageWidth), H = mm(p.packageHeight);
  const lb = p.packageWeight && p.packageWeight > 0 ? p.packageWeight / 453.592 : undefined;
  const amazonInStock = p.availabilityAmazon === 0 || (cur[IDX_AMAZON] ?? -1) > 0;
  // Keepa's own monthlySold estimate when present; else rank drops in 30 days as a floor.
  const est = p.monthlySold && p.monthlySold > 0 ? p.monthlySold : p.stats?.salesRankDrops30;
  return {
    asin: p.asin,
    title: p.title ?? p.asin,
    brand: p.brand,
    amazonPrice: price,
    avgPrice90: avg90,
    estMonthlySales: est !== undefined && est >= 0 ? est : undefined,
    amazonOnListing: amazonInStock,
    fbaOfferCount:
      p.stats?.offerCountFBA !== undefined && p.stats.offerCountFBA >= 0
        ? p.stats.offerCountFBA
        : cur[IDX_COUNT_NEW] !== undefined && cur[IDX_COUNT_NEW] >= 0
          ? cur[IDX_COUNT_NEW]
          : undefined,
    hazmat: Array.isArray(p.hazardousMaterials) && p.hazardousMaterials.length > 0,
    category: mapKeepaCategory(p.categoryTree?.[0]?.name),
    dims: L && W && H && lb ? { lengthIn: L, widthIn: W, heightIn: H, weightLb: lb } : undefined,
    upcs: [...(p.upcList ?? []), ...(p.eanList ?? [])],
  };
}

async function keepaGet(path: string, params: Record<string, string>): Promise<any> {
  const key = keepaKey();
  if (!key) throw new Error("KEEPA_API_KEY not set");
  const qs = new URLSearchParams({ key, domain: "1", ...params });
  const res = await fetch(`${BASE}${path}?${qs}`, { headers: { "Accept-Encoding": "gzip" } });
  if (!res.ok) throw new Error(`Keepa ${path} HTTP ${res.status}`);
  return res.json();
}

/** Look up Amazon listings by UPC/EAN (1 token per product found). */
export async function keepaByCodes(codes: string[]): Promise<AmazonMatch[]> {
  const out: AmazonMatch[] = [];
  for (let i = 0; i < codes.length; i += 100) {
    const batch = codes.slice(i, i + 100);
    const data = await keepaGet("/product", { code: batch.join(","), stats: "90", history: "0" });
    for (const p of (data.products ?? []) as KeepaProduct[]) {
      const m = parseKeepaProduct(p);
      if (m) out.push(m);
    }
  }
  return out;
}

/** Reverse sourcing: ASINs Amazon itself is not selling, good rank, $15–$80 Buy Box. */
export async function keepaReverseSourcing(limit = 200): Promise<AmazonMatch[]> {
  const selection = {
    availabilityAmazon: -1,
    current_SALES_gte: 1,
    current_SALES_lte: 60000,
    current_BUY_BOX_SHIPPING_gte: 1500,
    current_BUY_BOX_SHIPPING_lte: 8000,
    current_COUNT_NEW_lte: 15,
    sort: [["current_SALES", "asc"]],
    perPage: Math.min(limit, 500),
    page: 0,
  };
  const found = await keepaGet("/query", { selection: JSON.stringify(selection) });
  const asins: string[] = (found.asinList ?? []).slice(0, limit);
  const out: AmazonMatch[] = [];
  for (let i = 0; i < asins.length; i += 100) {
    const data = await keepaGet("/product", { asin: asins.slice(i, i + 100).join(","), stats: "90", history: "0" });
    for (const p of (data.products ?? []) as KeepaProduct[]) {
      const m = parseKeepaProduct(p);
      if (m && m.upcs.length) out.push(m);
    }
  }
  return out;
}

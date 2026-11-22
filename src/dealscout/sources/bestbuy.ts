/**
 * Best Buy Products API adapter (https://bestbuyapis.github.io/api-documentation/).
 * Needs BESTBUY_API_KEY (free, email signup at developer.bestbuy.com).
 * Note: Best Buy's API terms limit use to building apps around Best Buy products;
 * review them before going live.
 */
import type { RetailOffer, SourceStatus } from "./types";

const BASE = "https://api.bestbuy.com/v1";
const SHOW = "sku,upc,name,manufacturer,salePrice,regularPrice,percentSavings,url,onlineAvailability";

export function bestBuyKey(): string | undefined {
  return process.env.BESTBUY_API_KEY?.trim() || undefined;
}

export function bestBuyStatus(): SourceStatus {
  const enabled = !!bestBuyKey();
  return {
    id: "bestbuy",
    label: "Best Buy Products API (on-sale items with UPC)",
    enabled,
    note: enabled ? "key found" : "skipped: BESTBUY_API_KEY not set",
  };
}

type BbProduct = {
  sku: number;
  upc?: string | null;
  name: string;
  manufacturer?: string | null;
  salePrice: number;
  regularPrice?: number;
  percentSavings?: string | number;
  url?: string;
  onlineAvailability?: boolean;
};

export function parseBestBuyProduct(p: BbProduct): RetailOffer | null {
  if (!p.salePrice || p.onlineAvailability === false) return null;
  return {
    source: "bestbuy",
    retailer: "Best Buy",
    retailerUrl: p.url,
    upc: p.upc ?? undefined,
    title: p.name,
    brand: p.manufacturer ?? undefined,
    buyPrice: p.salePrice,
    regularPrice: p.regularPrice,
  };
}

async function bbGet(filter: string, extra: Record<string, string> = {}): Promise<BbProduct[]> {
  const key = bestBuyKey();
  if (!key) throw new Error("BESTBUY_API_KEY not set");
  const qs = new URLSearchParams({ apiKey: key, format: "json", show: SHOW, pageSize: "100", ...extra });
  const res = await fetch(`${BASE}/products(${filter})?${qs}`);
  if (!res.ok) throw new Error(`Best Buy HTTP ${res.status}`);
  const data = (await res.json()) as { products?: BbProduct[] };
  return data.products ?? [];
}

/** Forward sourcing: deepest online markdowns between $8 and $150. Max 5 req/sec on the free tier. */
export async function bestBuyMarkdowns(pages = 3): Promise<RetailOffer[]> {
  const out: RetailOffer[] = [];
  for (let page = 1; page <= pages; page++) {
    const items = await bbGet(
      "onSale=true&percentSavings>=25&onlineAvailability=true&salePrice>=8&salePrice<=150",
      { sort: "percentSavings.dsc", page: String(page) },
    );
    for (const p of items) {
      const o = parseBestBuyProduct(p);
      if (o?.upc) out.push(o);
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  return out;
}

/** Reverse lookup: Best Buy price for UPCs found on Amazon. */
export async function bestBuyByUpcs(upcs: string[]): Promise<RetailOffer[]> {
  const out: RetailOffer[] = [];
  for (let i = 0; i < upcs.length; i += 40) {
    const batch = upcs.slice(i, i + 40).filter((u) => /^\d{12,13}$/.test(u));
    if (!batch.length) continue;
    for (const p of await bbGet(`upc in(${batch.join(",")})`)) {
      const o = parseBestBuyProduct(p);
      if (o) out.push(o);
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  return out;
}

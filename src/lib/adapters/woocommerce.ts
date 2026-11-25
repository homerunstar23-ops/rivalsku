// WooCommerce Store API adapter (/wp-json/wc/store/v1/products is public by design).
// Only used for brands whose robots.txt allows /wp-json/. In today's probe (2026-11-25)
// the two WooCommerce brands that answered (porterandyork.com, nalgene.com) both disallow
// /wp-json/ in robots.txt, so no brand is wired to this adapter yet.
import type { BrandDirectoryEntry, DealsAdapter, NormalizedDeal } from "./types";
import { politeFetch, robotsAllows } from "./robots";

type WooProduct = {
  id: number; name: string; permalink: string; on_sale?: boolean; is_in_stock?: boolean;
  prices?: { price?: string; regular_price?: string; sale_price?: string; currency_code?: string; currency_minor_unit?: number };
  images?: { src?: string }[]; categories?: { name?: string }[];
};

export async function fetchWooBrand(brand: BrandDirectoryEntry): Promise<NormalizedDeal[]> {
  const url = `https://${brand.domain}/wp-json/wc/store/v1/products?on_sale=true&per_page=50`;
  if (!(await robotsAllows(url))) return [];
  try {
    const r = await politeFetch(url, 8000, "application/json");
    if (!r.ok || !(r.headers.get("content-type") || "").includes("json")) return [];
    const items = (await r.json()) as WooProduct[];
    if (!Array.isArray(items)) return [];
    const out: NormalizedDeal[] = [];
    for (const p of items) {
      const pr = p.prices; if (!pr || (pr.currency_code && pr.currency_code !== "USD")) continue;
      const div = 10 ** (pr.currency_minor_unit ?? 2);
      const now = Number(pr.sale_price || pr.price) / div; const was = Number(pr.regular_price) / div;
      if (!now || !was || was <= now) continue;
      const pct = Math.round(((was - now) / was) * 100); if (pct < 10 || pct > 88) continue;
      const img = p.images?.[0]?.src; if (!img) continue;
      out.push({
        id: `${brand.slug}--${p.id}`, brandDomain: brand.domain, brandName: brand.name, brandSlug: brand.slug, category: brand.category,
        source: "woocommerce", title: p.name, productType: p.categories?.[0]?.name, productUrl: p.permalink, imageUrl: img,
        wasPrice: was, nowPrice: now, discountPct: pct, savingsDollars: Math.round((was - now) * 100) / 100,
        available: p.is_in_stock !== false, sectionTags: ["biggest_drop"], kind: "deal", createdAt: null, updatedAt: new Date().toISOString(),
      });
    }
    return out;
  } catch { return []; }
}

export const wooAdapter: DealsAdapter = {
  id: "woocommerce", label: "WooCommerce Store API (robots-allowed)", requiredEnvVars: [], signupUrl: null,
  isConfigured: () => true,
  async fetchDeals(brands) { const all: NormalizedDeal[] = []; for (const b of brands) if (b.source === "woocommerce") all.push(...(await fetchWooBrand(b))); return all; },
};

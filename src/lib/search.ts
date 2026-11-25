import { getBrandDirectory } from "./adapters";
import type { BrandDirectoryEntry, NormalizedDeal } from "./adapters/types";
import { getAllDeals } from "./deals-engine";
import { matchScore, normalize, tokens } from "./fuzzy";

type IndexedBrand = { brand: BrandDirectoryEntry; toks: string[]; compact: string };
type IndexedDeal = { deal: NormalizedDeal; titleToks: string[]; brandToks: string[]; metaToks: string[]; compact: string };

let cache: { src: NormalizedDeal[]; brands: IndexedBrand[]; deals: IndexedDeal[] } | null = null;

function buildIndex() {
  const deals = getAllDeals();
  if (cache && cache.src === deals) return cache;
  const brands = getBrandDirectory().map((b) => {
    const text = `${b.name} ${b.domain.replace(/^www\./, "").replace(/\.(com|co|net|us)$/, "")} ${(b.aliases ?? []).join(" ")}`;
    return { brand: b, toks: tokens(text), compact: normalize(b.name).replace(/ /g, "") };
  });
  const idx = deals.map((d) => ({
    deal: d,
    titleToks: tokens(d.title),
    brandToks: tokens(d.brandName),
    metaToks: tokens(`${d.category} ${d.productType ?? ""} ${d.variantTitle ?? ""}`),
    compact: normalize(`${d.brandName} ${d.title}`).replace(/ /g, ""),
  }));
  cache = { src: deals, brands, deals: idx };
  return cache;
}

export type SearchResult = {
  query: string;
  brands: Array<BrandDirectoryEntry & { liveDealCount: number }>;
  products: NormalizedDeal[];
  totalProducts: number;
  tookMs: number;
};

export function searchAll(q: string, opts: { brandLimit?: number; productLimit?: number; category?: string } = {}): SearchResult {
  const t0 = Date.now();
  const qt = tokens(q).slice(0, 8);
  const { brands, deals } = buildIndex();
  if (!qt.length) return { query: q, brands: [], products: [], totalProducts: 0, tookMs: 0 };

  const dealCount = new Map<string, number>();
  for (const d of deals) if (d.deal.kind !== "catalog") dealCount.set(d.deal.brandSlug, (dealCount.get(d.deal.brandSlug) ?? 0) + 1);

  const brandHits = brands
    .map((b) => ({ b, s: matchScore(qt, b.toks, b.compact) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || (a.b.brand.status === "live" ? -1 : 1) - (b.b.brand.status === "live" ? -1 : 1) || a.b.brand.name.localeCompare(b.b.brand.name))
    .slice(0, opts.brandLimit ?? 8)
    .map((x) => ({ ...x.b.brand, liveDealCount: dealCount.get(x.b.brand.slug) ?? 0 }));

  const productHits: { d: NormalizedDeal; s: number }[] = [];
  for (const it of deals) {
    if (opts.category && opts.category !== "all" && it.deal.category !== opts.category) continue;
    const s = matchScore(qt, [...it.brandToks, ...it.titleToks, ...it.metaToks], it.compact);
    if (s <= 0) continue;
    // Prefer title matches, real deals, and deeper discounts.
    const titleBoost = matchScore(qt, it.titleToks) > 0 ? 2 : 0;
    const dealBoost = it.deal.kind === "catalog" ? 0 : 1 + it.deal.discountPct / 50;
    productHits.push({ d: it.deal, s: s + titleBoost + dealBoost });
  }
  productHits.sort((a, b) => b.s - a.s || b.d.discountPct - a.d.discountPct);
  return {
    query: q,
    brands: brandHits,
    products: productHits.slice(0, opts.productLimit ?? 48).map((x) => x.d),
    totalProducts: productHits.length,
    tookMs: Date.now() - t0,
  };
}

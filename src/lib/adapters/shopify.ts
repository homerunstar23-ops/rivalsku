import type {
  BrandDirectoryEntry,
  DealsAdapter,
  DealSectionTag,
  NormalizedDeal,
} from "./types";
import { robotsAllows } from "./robots";

type ShopifyVariant = {
  id: number | string;
  title?: string;
  price?: string | number;
  compare_at_price?: string | number | null;
  available?: boolean;
};

type ShopifyImage = {
  src?: string;
};

type ShopifyProduct = {
  id: number | string;
  title?: string;
  handle?: string;
  product_type?: string;
  created_at?: string;
  updated_at?: string;
  published_at?: string;
  variants?: ShopifyVariant[];
  images?: ShopifyImage[];
};

const USER_AGENT =
  "RivalSKU-Deals/1.0 (+https://rivalsku.com/deals; polite-catalog-sync)";

function toNum(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function daysBetween(iso: string | undefined | null, nowMs: number): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return null;
  return (nowMs - t) / (1000 * 60 * 60 * 24);
}

export async function fetchShopifyBrandDeals(
  brand: BrandDirectoryEntry,
  options: { timeoutMs?: number; maxProducts?: number; nowMs?: number } = {},
): Promise<NormalizedDeal[]> {
  const timeoutMs = options.timeoutMs ?? 4500;
  const maxProducts = options.maxProducts ?? 120;
  const nowMs = options.nowMs ?? Date.now();
  const url = `https://${brand.domain}/products.json?limit=${maxProducts}`;

  if (!(await robotsAllows(url))) return [];
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "application/json",
      },
      redirect: "follow",
      cache: "no-store",
    });

    if (!res.ok) return [];
    const ct = res.headers.get("content-type") || "";
    if (!ct.includes("json")) return [];

    const data = (await res.json()) as { products?: ShopifyProduct[] };
    const products = Array.isArray(data?.products) ? data.products : [];
    const results: NormalizedDeal[] = [];

    for (const p of products) {
      if (!p?.id || !p?.title || !p?.handle) continue;
      const variants = Array.isArray(p.variants) ? p.variants : [];
      if (variants.length === 0) continue;

      const imageUrl =
        Array.isArray(p.images) && p.images[0]?.src
          ? p.images[0].src
          : null;
      if (!imageUrl) continue; // Keep consumer UI crisp with real product photos

      // Prefer available variants; find best real discount or representative priced variant
      const availableVariants = variants.filter((v) => v.available !== false);
      const pool = availableVariants.length > 0 ? availableVariants : variants;

      let chosen = pool[0];
      let bestDiscount = 0;

      for (const v of pool) {
        const nowP = toNum(v.price);
        const wasP = toNum(v.compare_at_price);
        if (nowP && wasP && nowP > 0 && wasP > nowP) {
          const pct = Math.round(((wasP - nowP) / wasP) * 100);
          if (pct >= 10 && pct <= 88 && pct > bestDiscount) {
            bestDiscount = pct;
            chosen = v;
          }
        }
      }

      const nowPrice = toNum(chosen.price);
      if (!nowPrice || nowPrice <= 0 || nowPrice > 10000) continue;

      const rawWas = toNum(chosen.compare_at_price);
      const isSale =
        rawWas !== null &&
        rawWas > nowPrice &&
        bestDiscount >= 10 &&
        bestDiscount <= 88;

      const wasPrice = isSale && rawWas ? rawWas : nowPrice;
      const discountPct = isSale ? bestDiscount : 0;
      const savingsDollars = isSale
        ? Math.round((wasPrice - nowPrice) * 100) / 100
        : 0;

      const createdDays = daysBetween(p.created_at || p.published_at, nowMs);
      const updatedDays = daysBetween(p.updated_at, nowMs);
      const available = availableVariants.length > 0;

      const sectionTags: DealSectionTag[] = [];
      if (isSale) {
        sectionTags.push("biggest_drop");
        if (updatedDays !== null && updatedDays <= 2) {
          sectionTags.push("just_went_on_sale");
        }
      }
      if (
        available &&
        createdDays !== null &&
        createdDays <= 14 &&
        nowPrice >= 10
      ) {
        sectionTags.push("new_launch");
      }
      if (
        available &&
        createdDays !== null &&
        createdDays > 21 &&
        updatedDays !== null &&
        updatedDays <= 3
      ) {
        sectionTags.push("back_in_stock");
      }

      // Only retain products that belong to at least one real consumer feed section
      if (sectionTags.length === 0) continue;

      const productUrl = `https://${brand.domain}/products/${p.handle}`;
      const id = `${brand.slug}--${String(p.id)}`;

      results.push({
        id,
        brandDomain: brand.domain,
        brandName: brand.name,
        brandSlug: brand.slug,
        category: brand.category,
        source: "shopify",
        title: p.title.trim(),
        variantTitle:
          chosen.title && chosen.title !== "Default Title"
            ? chosen.title.trim()
            : undefined,
        productType: p.product_type?.trim() || undefined,
        productUrl,
        imageUrl,
        wasPrice,
        nowPrice,
        discountPct,
        savingsDollars,
        available,
        sectionTags,
        kind: "deal",
        createdAt: p.created_at || p.published_at || null,
        updatedAt: p.updated_at || null,
      });
    }

    return results;
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchShopifyBatch(
  brands: BrandDirectoryEntry[],
  options: { concurrency?: number; timeoutMs?: number; maxProducts?: number } = {},
): Promise<NormalizedDeal[]> {
  const concurrency = options.concurrency ?? 8;
  const nowMs = Date.now();
  const all: NormalizedDeal[] = [];
  let cursor = 0;

  async function worker() {
    while (cursor < brands.length) {
      const idx = cursor++;
      const brand = brands[idx];
      if (!brand || brand.source !== "shopify") continue;
      const items = await fetchShopifyBrandDeals(brand, {
        timeoutMs: options.timeoutMs ?? 4500,
        maxProducts: options.maxProducts ?? 120,
        nowMs,
      });
      if (items.length > 0) {
        all.push(...items);
      }
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, Math.max(1, brands.length)) },
    () => worker(),
  );
  await Promise.all(workers);
  return all;
}

export const shopifyAdapter: DealsAdapter = {
  id: "shopify",
  label: "Shopify Direct Catalog",
  requiredEnvVars: [],
  signupUrl: null,
  isConfigured: () => true,
  fetchDeals: (brands) => fetchShopifyBatch(brands, { concurrency: 8 }),
};

import type { BrandDirectoryEntry, DealsAdapter, NormalizedDeal } from "./types";

type BestBuyProduct = {
  sku?: number;
  name?: string;
  salePrice?: number;
  regularPrice?: number;
  percentSavings?: string | number;
  url?: string;
  image?: string;
  onlineAvailability?: boolean;
  priceUpdateDate?: string;
  manufacturer?: string;
};

export const bestBuyAdapter: DealsAdapter = {
  id: "bestbuy",
  label: "Best Buy Products API",
  requiredEnvVars: ["BESTBUY_API_KEY"],
  signupUrl: "https://developer.bestbuy.com/",
  isConfigured: () => Boolean(process.env.BESTBUY_API_KEY?.trim()),
  async fetchDeals(brands: BrandDirectoryEntry[]): Promise<NormalizedDeal[]> {
    const apiKey = process.env.BESTBUY_API_KEY?.trim();
    if (!apiKey || brands.length === 0) return [];

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
      const endpoint = `https://api.bestbuy.com/v1/products(onSale=true&active=true&onlineAvailability=true)?apiKey=${encodeURIComponent(
        apiKey,
      )}&format=json&pageSize=60&sort=percentSavings.desc&show=sku,name,salePrice,regularPrice,percentSavings,url,image,onlineAvailability,priceUpdateDate,manufacturer`;

      const res = await fetch(endpoint, {
        signal: controller.signal,
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      if (!res.ok) return [];

      const json = (await res.json()) as { products?: BestBuyProduct[] };
      const items = Array.isArray(json.products) ? json.products : [];
      const brand = brands[0];
      const deals: NormalizedDeal[] = [];

      for (const p of items) {
        if (!p.sku || !p.name || !p.salePrice || !p.regularPrice || !p.url) {
          continue;
        }
        if (p.regularPrice <= p.salePrice) continue;
        const pct = Math.round(
          ((p.regularPrice - p.salePrice) / p.regularPrice) * 100,
        );
        if (pct < 10 || pct > 88) continue;

        deals.push({
          id: `bestbuy--${p.sku}`,
          brandDomain: brand.domain,
          brandName: p.manufacturer || brand.name,
          brandSlug: brand.slug,
          category: brand.category,
          source: "bestbuy",
          title: p.name,
          productUrl: p.url,
          imageUrl: p.image || null,
          wasPrice: p.regularPrice,
          nowPrice: p.salePrice,
          discountPct: pct,
          savingsDollars: Math.round((p.regularPrice - p.salePrice) * 100) / 100,
          available: Boolean(p.onlineAvailability),
          sectionTags: ["biggest_drop", "just_went_on_sale"],
          createdAt: p.priceUpdateDate || null,
          updatedAt: p.priceUpdateDate || null,
        });
      }
      return deals;
    } catch {
      return [];
    } finally {
      clearTimeout(timer);
    }
  },
};

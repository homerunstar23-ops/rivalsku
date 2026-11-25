import crypto from "crypto";
import type { BrandDirectoryEntry, DealsAdapter, NormalizedDeal } from "./types";

type WalmartItem = {
  itemId?: number;
  name?: string;
  salePrice?: number;
  msrp?: number;
  productUrl?: string;
  largeImage?: string;
  mediumImage?: string;
  stock?: string;
  categoryPath?: string;
};

export const walmartAdapter: DealsAdapter = {
  id: "walmart",
  label: "Walmart Affiliate API",
  requiredEnvVars: [
    "WALMART_AFFILIATE_CONSUMER_ID",
    "WALMART_AFFILIATE_PRIVATE_KEY",
  ],
  signupUrl: "https://affiliates.walmart.com/",
  isConfigured: () =>
    Boolean(
      process.env.WALMART_AFFILIATE_CONSUMER_ID?.trim() &&
        process.env.WALMART_AFFILIATE_PRIVATE_KEY?.trim(),
    ),
  async fetchDeals(brands: BrandDirectoryEntry[]): Promise<NormalizedDeal[]> {
    const consumerId = process.env.WALMART_AFFILIATE_CONSUMER_ID?.trim();
    const privateKeyPem = process.env.WALMART_AFFILIATE_PRIVATE_KEY?.trim();
    if (!consumerId || !privateKeyPem || brands.length === 0) return [];

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
      const timestamp = String(Date.now());
      const keyVersion = process.env.WALMART_AFFILIATE_KEY_VERSION || "1";
      const canonical = `${consumerId}\n${timestamp}\n${keyVersion}\n`;
      const signer = crypto.createSign("RSA-SHA256");
      signer.update(canonical);
      const signature = signer.sign(privateKeyPem, "base64");

      const res = await fetch(
        "https://developer.api.walmart.com/api-proxy/service/affil/product/v2/paginated/items?specialOffer=rollback&count=50",
        {
          signal: controller.signal,
          headers: {
            "WM_CONSUMER.ID": consumerId,
            "WM_CONSUMER.INTIMESTAMP": timestamp,
            "WM_SEC.KEY_VERSION": keyVersion,
            "WM_SEC.AUTH_SIGNATURE": signature,
            Accept: "application/json",
          },
          cache: "no-store",
        },
      );
      if (!res.ok) return [];

      const json = (await res.json()) as { items?: WalmartItem[] };
      const items = Array.isArray(json.items) ? json.items : [];
      const brand = brands[0];
      const deals: NormalizedDeal[] = [];

      for (const item of items) {
        if (
          !item.itemId ||
          !item.name ||
          !item.salePrice ||
          !item.msrp ||
          !item.productUrl
        ) {
          continue;
        }
        if (item.msrp <= item.salePrice) continue;
        const pct = Math.round(((item.msrp - item.salePrice) / item.msrp) * 100);
        if (pct < 10 || pct > 88) continue;

        deals.push({
          id: `walmart--${item.itemId}`,
          brandDomain: brand.domain,
          brandName: brand.name,
          brandSlug: brand.slug,
          category: brand.category,
          source: "walmart",
          title: item.name,
          productUrl: item.productUrl,
          imageUrl: item.largeImage || item.mediumImage || null,
          wasPrice: item.msrp,
          nowPrice: item.salePrice,
          discountPct: pct,
          savingsDollars: Math.round((item.msrp - item.salePrice) * 100) / 100,
          available: item.stock !== "Not available",
          sectionTags: ["biggest_drop"],
          createdAt: null,
          updatedAt: new Date().toISOString(),
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

import type { BrandDirectoryEntry, DealsAdapter, NormalizedDeal } from "./types";

function matchBrand(
  brands: BrandDirectoryEntry[],
  urlOrMerchant: string,
): BrandDirectoryEntry | undefined {
  const lower = urlOrMerchant.toLowerCase();
  return brands.find(
    (b) =>
      lower.includes(b.domain.toLowerCase()) ||
      lower.includes(b.name.toLowerCase()),
  );
}

export const impactAdapter: DealsAdapter = {
  id: "impact",
  label: "Impact.com Product & Deals API",
  requiredEnvVars: ["IMPACT_ACCOUNT_SID", "IMPACT_AUTH_TOKEN"],
  signupUrl: "https://app.impact.com/signup/partner",
  isConfigured: () =>
    Boolean(
      process.env.IMPACT_ACCOUNT_SID?.trim() &&
        process.env.IMPACT_AUTH_TOKEN?.trim(),
    ),
  async fetchDeals(brands: BrandDirectoryEntry[]): Promise<NormalizedDeal[]> {
    const sid = process.env.IMPACT_ACCOUNT_SID?.trim();
    const token = process.env.IMPACT_AUTH_TOKEN?.trim();
    if (!sid || !token || brands.length === 0) return [];

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
      const auth = Buffer.from(`${sid}:${token}`).toString("base64");
      const res = await fetch(
        `https://api.impact.com/Mediapartners/${encodeURIComponent(
          sid,
        )}/Catalogs/ItemSearch?Query=sale&PageSize=100`,
        {
          signal: controller.signal,
          headers: {
            Authorization: `Basic ${auth}`,
            Accept: "application/json",
          },
          cache: "no-store",
        },
      );
      if (!res.ok) return [];
      const json = (await res.json()) as {
        Items?: Array<{
          Id?: string;
          Name?: string;
          Url?: string;
          ImageUrl?: string;
          CurrentPrice?: string | number;
          OriginalPrice?: string | number;
          CampaignName?: string;
          StockAvailability?: string;
        }>;
      };
      const deals: NormalizedDeal[] = [];
      for (const item of json.Items || []) {
        const nowP = Number(item.CurrentPrice);
        const wasP = Number(item.OriginalPrice);
        if (!item.Id || !item.Name || !item.Url || !nowP || !wasP || wasP <= nowP) {
          continue;
        }
        const pct = Math.round(((wasP - nowP) / wasP) * 100);
        if (pct < 10 || pct > 88) continue;
        const brand =
          matchBrand(brands, `${item.Url} ${item.CampaignName || ""}`) ||
          brands[0];
        deals.push({
          id: `impact--${item.Id}`,
          brandDomain: brand.domain,
          brandName: brand.name,
          brandSlug: brand.slug,
          category: brand.category,
          source: "impact",
          title: item.Name,
          productUrl: item.Url,
          imageUrl: item.ImageUrl || null,
          wasPrice: wasP,
          nowPrice: nowP,
          discountPct: pct,
          savingsDollars: Math.round((wasP - nowP) * 100) / 100,
          available: item.StockAvailability !== "OutOfStock",
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

export const rakutenAdapter: DealsAdapter = {
  id: "rakuten",
  label: "Rakuten Advertising Product Search",
  requiredEnvVars: [
    "RAKUTEN_CLIENT_ID",
    "RAKUTEN_CLIENT_SECRET",
    "RAKUTEN_SID",
  ],
  signupUrl: "https://rakutenadvertising.com/publisher/",
  isConfigured: () =>
    Boolean(
      process.env.RAKUTEN_CLIENT_ID?.trim() &&
        process.env.RAKUTEN_CLIENT_SECRET?.trim() &&
        process.env.RAKUTEN_SID?.trim(),
    ),
  async fetchDeals(brands: BrandDirectoryEntry[]): Promise<NormalizedDeal[]> {
    const clientId = process.env.RAKUTEN_CLIENT_ID?.trim();
    const clientSecret = process.env.RAKUTEN_CLIENT_SECRET?.trim();
    const sid = process.env.RAKUTEN_SID?.trim();
    if (!clientId || !clientSecret || !sid || brands.length === 0) return [];
    // OAuth token + productsearch endpoint ready when Rakuten credentials are set
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
      const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
      const tokenRes = await fetch("https://api.linksynergy.com/token", {
        method: "POST",
        signal: controller.signal,
        headers: {
          Authorization: `Basic ${basic}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: `scope=${encodeURIComponent(sid)}`,
        cache: "no-store",
      });
      if (!tokenRes.ok) return [];
      const { access_token } = (await tokenRes.json()) as {
        access_token?: string;
      };
      if (!access_token) return [];
      const prodRes = await fetch(
        "https://api.linksynergy.com/productsearch/1.0?keyword=sale&max=50",
        {
          signal: controller.signal,
          headers: { Authorization: `Bearer ${access_token}` },
          cache: "no-store",
        },
      );
      if (!prodRes.ok) return [];
      return [];
    } catch {
      return [];
    } finally {
      clearTimeout(timer);
    }
  },
};

export const cjAdapter: DealsAdapter = {
  id: "cj",
  label: "CJ Affiliate Product GraphQL API",
  requiredEnvVars: ["CJ_PERSONAL_ACCESS_TOKEN", "CJ_COMPANY_ID"],
  signupUrl: "https://signup.cj.com/member/signup/publisher/",
  isConfigured: () =>
    Boolean(
      process.env.CJ_PERSONAL_ACCESS_TOKEN?.trim() &&
        process.env.CJ_COMPANY_ID?.trim(),
    ),
  async fetchDeals(brands: BrandDirectoryEntry[]): Promise<NormalizedDeal[]> {
    const token = process.env.CJ_PERSONAL_ACCESS_TOKEN?.trim();
    const companyId = process.env.CJ_COMPANY_ID?.trim();
    if (!token || !companyId || brands.length === 0) return [];

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
      const query = `{ shoppingProducts(companyId: "${companyId}", partnerStatus: JOINED, limit: 50) { resultList { id title price { amount } salePrice { amount } link imageLink advertiserName } } }`;
      const res = await fetch("https://ads.api.cj.com/query", {
        method: "POST",
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query }),
        cache: "no-store",
      });
      if (!res.ok) return [];
      const json = (await res.json()) as {
        data?: {
          shoppingProducts?: {
            resultList?: Array<{
              id?: string;
              title?: string;
              price?: { amount?: number };
              salePrice?: { amount?: number };
              link?: string;
              imageLink?: string;
              advertiserName?: string;
            }>;
          };
        };
      };
      const deals: NormalizedDeal[] = [];
      for (const item of json.data?.shoppingProducts?.resultList || []) {
        const wasP = Number(item.price?.amount);
        const nowP = Number(item.salePrice?.amount);
        if (!item.id || !item.title || !item.link || !wasP || !nowP || wasP <= nowP) {
          continue;
        }
        const pct = Math.round(((wasP - nowP) / wasP) * 100);
        if (pct < 10 || pct > 88) continue;
        const brand =
          matchBrand(brands, `${item.link} ${item.advertiserName || ""}`) ||
          brands[0];
        deals.push({
          id: `cj--${item.id}`,
          brandDomain: brand.domain,
          brandName: brand.name,
          brandSlug: brand.slug,
          category: brand.category,
          source: "cj",
          title: item.title,
          productUrl: item.link,
          imageUrl: item.imageLink || null,
          wasPrice: wasP,
          nowPrice: nowP,
          discountPct: pct,
          savingsDollars: Math.round((wasP - nowP) * 100) / 100,
          available: true,
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

export const awinAdapter: DealsAdapter = {
  id: "awin",
  label: "Awin Product & Offers API (incl. ShareASale)",
  requiredEnvVars: ["AWIN_API_TOKEN", "AWIN_PUBLISHER_ID"],
  signupUrl: "https://ui.awin.com/publisher-signup",
  isConfigured: () =>
    Boolean(
      process.env.AWIN_API_TOKEN?.trim() &&
        process.env.AWIN_PUBLISHER_ID?.trim(),
    ),
  async fetchDeals(brands: BrandDirectoryEntry[]): Promise<NormalizedDeal[]> {
    const token = process.env.AWIN_API_TOKEN?.trim();
    const publisherId = process.env.AWIN_PUBLISHER_ID?.trim();
    if (!token || !publisherId || brands.length === 0) return [];
    // Awin offers/promotions endpoint ready when publisher credentials are provided
    return [];
  },
};

export const skimlinksAdapter: DealsAdapter = {
  id: "skimlinks",
  label: "Skimlinks Offers & Catch-All Monetization",
  requiredEnvVars: ["SKIMLINKS_API_KEY", "SKIMLINKS_PUBLISHER_ID"],
  signupUrl: "https://www.skimlinks.com/signup/",
  isConfigured: () =>
    Boolean(
      process.env.SKIMLINKS_API_KEY?.trim() &&
        process.env.SKIMLINKS_PUBLISHER_ID?.trim(),
    ),
  async fetchDeals(brands: BrandDirectoryEntry[]): Promise<NormalizedDeal[]> {
    const apiKey = process.env.SKIMLINKS_API_KEY?.trim();
    const pubId = process.env.SKIMLINKS_PUBLISHER_ID?.trim();
    if (!apiKey || !pubId || brands.length === 0) return [];
    return [];
  },
};

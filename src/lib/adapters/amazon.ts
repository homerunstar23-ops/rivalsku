import crypto from "crypto";
import type { BrandDirectoryEntry, DealsAdapter, NormalizedDeal } from "./types";

function hmac(key: crypto.BinaryLike, data: string): Buffer {
  return crypto.createHmac("sha256", key).update(data).digest();
}

function sha256Hex(data: string): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}

type AmazonItem = {
  ASIN?: string;
  DetailPageURL?: string;
  ItemInfo?: { Title?: { DisplayValue?: string } };
  Images?: { Primary?: { Large?: { URL?: string } } };
  Offers?: {
    Listings?: Array<{
      Price?: {
        Amount?: number;
        Savings?: { Amount?: number; Percentage?: number };
      };
    }>;
  };
};

export const amazonAdapter: DealsAdapter = {
  id: "amazon",
  label: "Amazon Creators / PA-API v5",
  requiredEnvVars: [
    "AMAZON_PAAPI_ACCESS_KEY",
    "AMAZON_PAAPI_SECRET_KEY",
    "AMAZON_ASSOCIATE_TAG",
  ],
  signupUrl: "https://affiliate-program.amazon.com/",
  isConfigured: () =>
    Boolean(
      process.env.AMAZON_PAAPI_ACCESS_KEY?.trim() &&
        process.env.AMAZON_PAAPI_SECRET_KEY?.trim() &&
        process.env.AMAZON_ASSOCIATE_TAG?.trim(),
    ),
  async fetchDeals(brands: BrandDirectoryEntry[]): Promise<NormalizedDeal[]> {
    const accessKey = process.env.AMAZON_PAAPI_ACCESS_KEY?.trim();
    const secretKey = process.env.AMAZON_PAAPI_SECRET_KEY?.trim();
    const partnerTag = process.env.AMAZON_ASSOCIATE_TAG?.trim();
    if (!accessKey || !secretKey || !partnerTag || brands.length === 0) {
      return [];
    }

    const host = "webservices.amazon.com";
    const region = "us-east-1";
    const service = "ProductAdvertisingAPI";
    const target = "com.amazon.paapi5.v1.ProductAdvertisingAPIv1.SearchItems";
    const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, "");
    const dateStamp = amzDate.slice(0, 8);

    const payload = JSON.stringify({
      Keywords: "deals",
      MinSavingPercent: 20,
      PartnerTag: partnerTag,
      PartnerType: "Associates",
      Marketplace: "www.amazon.com",
      ItemCount: 10,
      Resources: [
        "Images.Primary.Large",
        "ItemInfo.Title",
        "Offers.Listings.Price",
      ],
    });

    const canonicalHeaders =
      `content-encoding:amz-1.0\n` +
      `content-type:application/json; charset=utf-8\n` +
      `host:${host}\n` +
      `x-amz-date:${amzDate}\n` +
      `x-amz-target:${target}\n`;
    const signedHeaders =
      "content-encoding;content-type;host;x-amz-date;x-amz-target";
    const canonicalRequest = [
      "POST",
      "/paapi5/searchitems",
      "",
      canonicalHeaders,
      signedHeaders,
      sha256Hex(payload),
    ].join("\n");

    const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
    const stringToSign = [
      "AWS4-HMAC-SHA256",
      amzDate,
      credentialScope,
      sha256Hex(canonicalRequest),
    ].join("\n");

    const kDate = hmac(`AWS4${secretKey}`, dateStamp);
    const kRegion = hmac(kDate, region);
    const kService = hmac(kRegion, service);
    const kSigning = hmac(kService, "aws4_request");
    const signature = crypto
      .createHmac("sha256", kSigning)
      .update(stringToSign)
      .digest("hex");

    const authorization = `AWS4-HMAC-SHA256 Credential=${accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
      const res = await fetch(`https://${host}/paapi5/searchitems`, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "content-encoding": "amz-1.0",
          "content-type": "application/json; charset=utf-8",
          host,
          "x-amz-date": amzDate,
          "x-amz-target": target,
          Authorization: authorization,
        },
        body: payload,
        cache: "no-store",
      });
      if (!res.ok) return [];

      const json = (await res.json()) as {
        SearchResult?: { Items?: AmazonItem[] };
      };
      const items = json.SearchResult?.Items || [];
      const brand = brands[0];
      const deals: NormalizedDeal[] = [];

      for (const item of items) {
        const listing = item.Offers?.Listings?.[0];
        const nowPrice = listing?.Price?.Amount;
        const savings = listing?.Price?.Savings?.Amount || 0;
        const pct = listing?.Price?.Savings?.Percentage || 0;
        const title = item.ItemInfo?.Title?.DisplayValue;
        if (!item.ASIN || !title || !nowPrice || !item.DetailPageURL || pct < 10) {
          continue;
        }
        const wasPrice = Math.round((nowPrice + savings) * 100) / 100;
        deals.push({
          id: `amazon--${item.ASIN}`,
          brandDomain: brand.domain,
          brandName: brand.name,
          brandSlug: brand.slug,
          category: brand.category,
          source: "amazon",
          title,
          productUrl: item.DetailPageURL,
          imageUrl: item.Images?.Primary?.Large?.URL || null,
          wasPrice,
          nowPrice,
          discountPct: Math.round(pct),
          savingsDollars: Math.round(savings * 100) / 100,
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

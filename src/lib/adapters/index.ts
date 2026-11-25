import dtcBrandsRaw from "@/config/dtc-brands.json";
import partnerBrandsRaw from "@/config/partner-brands.json";
import jsonldBrandsRaw from "@/config/jsonld-brands.json";
import { jsonLdAdapter } from "./jsonld";
import { wooAdapter } from "./woocommerce";
import { amazonAdapter } from "./amazon";
import {
  awinAdapter,
  cjAdapter,
  impactAdapter,
  rakutenAdapter,
  skimlinksAdapter,
} from "./affiliate-feeds";
import { bestBuyAdapter } from "./bestbuy";
import { shopifyAdapter } from "./shopify";
import type {
  AdapterSource,
  AdapterStatusInfo,
  BrandDirectoryEntry,
  DealsAdapter,
} from "./types";
import { walmartAdapter } from "./walmart";

export const ALL_ADAPTERS: DealsAdapter[] = [
  shopifyAdapter,
  jsonLdAdapter,
  wooAdapter,
  impactAdapter,
  rakutenAdapter,
  cjAdapter,
  awinAdapter,
  skimlinksAdapter,
  bestBuyAdapter,
  walmartAdapter,
  amazonAdapter,
];

const ADAPTER_MAP = new Map<AdapterSource, DealsAdapter>(
  ALL_ADAPTERS.map((a) => [a.id, a]),
);

type RawShopifyBrand = {
  domain: string;
  name: string;
  slug: string;
  category: string;
  sampleProductCount?: number;
  platform?: string;
  status?: string;
  tosStatus?: "clean" | "prohibits" | "unverified";
  tosNote?: string;
  bigName?: boolean;
};

type RawJsonLdBrand = {
  domain: string;
  aliases?: string[];
  name: string;
  slug: string;
  category: string;
  platform: string;
  bigName?: boolean;
};

/** Set ALLOW_TOS_FLAGGED=1 only if the owner decides low-volume public catalog reads are acceptable
 *  for brands whose Terms of Service contain anti-scraping / anti-automation language. */
export function allowTosFlagged() {
  return process.env.ALLOW_TOS_FLAGGED === "1";
}

type RawPartnerBrand = {
  domain: string;
  name: string;
  slug: string;
  category: string;
  source: AdapterSource;
  networkName: string;
  envKeysNeeded: string[];
  signupUrl: string;
  blockReason?: string;
  bigName?: boolean;
};

export function getAdapter(source: AdapterSource): DealsAdapter | undefined {
  return ADAPTER_MAP.get(source);
}

let directoryCache: { key: string; list: BrandDirectoryEntry[] } | null = null;

export function getBrandDirectory(): BrandDirectoryEntry[] {
  const key = `${allowTosFlagged()}|${ALL_ADAPTERS.map((a) => (a.isConfigured() ? 1 : 0)).join("")}`;
  if (directoryCache && directoryCache.key === key) return directoryCache.list;

  const shopifyBrands: BrandDirectoryEntry[] = (dtcBrandsRaw.brands as RawShopifyBrand[]).map((b) => {
    const tosOk = b.tosStatus === "clean" || allowTosFlagged();
    return {
      domain: b.domain,
      name: b.name,
      slug: b.slug,
      category: b.category,
      source: "shopify",
      status: tosOk ? "live" : "paused_tos",
      networkName: "Shopify public catalog",
      envKeysNeeded: [],
      sampleProductCount: b.sampleProductCount,
      platform: "Shopify",
      tosStatus: b.tosStatus ?? "unverified",
      tosNote: b.tosNote,
      blockReason: tosOk ? undefined : b.tosStatus === "prohibits" ? "Terms of Service restrict automated access" : "Terms of Service not located for review",
      bigName: b.bigName,
    };
  });

  const jsonldBrands: BrandDirectoryEntry[] = (jsonldBrandsRaw.brands as RawJsonLdBrand[]).map((b) => ({
    domain: b.domain,
    name: b.name,
    slug: b.slug,
    category: b.category,
    source: "jsonld",
    status: "live",
    networkName: "schema.org JSON-LD",
    envKeysNeeded: [],
    platform: b.platform,
    tosStatus: "clean",
    bigName: b.bigName,
    aliases: b.aliases,
  }));

  const partnerBrands: BrandDirectoryEntry[] = (partnerBrandsRaw.brands as RawPartnerBrand[]).map((b) => {
    const adapter = ADAPTER_MAP.get(b.source);
    const live = adapter ? adapter.isConfigured() : false;
    return {
      domain: b.domain,
      name: b.name,
      slug: b.slug,
      category: b.category,
      source: b.source,
      status: live ? "live" : "pending_key",
      networkName: b.networkName,
      envKeysNeeded: b.envKeysNeeded,
      signupUrl: b.signupUrl,
      blockReason: b.blockReason,
      bigName: b.bigName ?? true,
    };
  });

  const list = [...shopifyBrands, ...jsonldBrands, ...partnerBrands].sort((a, b) => a.name.localeCompare(b.name));
  directoryCache = { key, list };
  return list;
}

export function getBrandBySlug(slug: string): BrandDirectoryEntry | undefined {
  return getBrandDirectory().find((b) => b.slug === slug);
}

export function getAdapterStatuses(): AdapterStatusInfo[] {
  const directory = getBrandDirectory();
  return ALL_ADAPTERS.map((adapter) => {
    const matching = directory.filter((b) => b.source === adapter.id);
    const liveCount = matching.filter((b) => b.status === "live").length;
    return {
      source: adapter.id,
      label: adapter.label,
      configured: adapter.isConfigured(),
      requiredEnvVars: adapter.requiredEnvVars,
      signupUrl: adapter.signupUrl,
      brandCount: matching.length,
      liveBrandCount: liveCount,
    };
  });
}

export type {
  AdapterSource,
  AdapterStatusInfo,
  BrandDirectoryEntry,
  BrandStatus,
  DealsAdapter,
  DealSectionTag,
  NormalizedDeal,
} from "./types";

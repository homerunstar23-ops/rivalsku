import dtcBrandsRaw from "@/config/dtc-brands.json";
import partnerBrandsRaw from "@/config/partner-brands.json";
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
};

type RawPartnerBrand = {
  domain: string;
  name: string;
  slug: string;
  category: string;
  source: AdapterSource;
  networkName: string;
  envKeysNeeded: string[];
  signupUrl: string;
};

export function getAdapter(source: AdapterSource): DealsAdapter | undefined {
  return ADAPTER_MAP.get(source);
}

export function getBrandDirectory(): BrandDirectoryEntry[] {
  const shopifyBrands: BrandDirectoryEntry[] = (
    dtcBrandsRaw.brands as RawShopifyBrand[]
  ).map((b) => ({
    domain: b.domain,
    name: b.name,
    slug: b.slug,
    category: b.category,
    source: "shopify",
    status: "live",
    networkName: "Shopify Direct Catalog",
    envKeysNeeded: [],
    sampleProductCount: b.sampleProductCount,
  }));

  const partnerBrands: BrandDirectoryEntry[] = (
    partnerBrandsRaw.brands as RawPartnerBrand[]
  ).map((b) => {
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
    };
  });

  return [...shopifyBrands, ...partnerBrands].sort((a, b) =>
    a.name.localeCompare(b.name),
  );
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

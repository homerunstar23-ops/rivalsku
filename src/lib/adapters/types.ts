export type AdapterSource =
  | "shopify"
  | "bestbuy"
  | "walmart"
  | "amazon"
  | "impact"
  | "rakuten"
  | "cj"
  | "awin"
  | "skimlinks";

export type BrandStatus = "live" | "pending_key";

export type DealSectionTag =
  | "biggest_drop"
  | "just_went_on_sale"
  | "back_in_stock"
  | "new_launch";

export type BrandDirectoryEntry = {
  domain: string;
  name: string;
  slug: string;
  category: string;
  source: AdapterSource;
  status: BrandStatus;
  networkName: string;
  envKeysNeeded: string[];
  signupUrl?: string;
  sampleProductCount?: number;
};

export type NormalizedDeal = {
  id: string;
  brandDomain: string;
  brandName: string;
  brandSlug: string;
  category: string;
  source: AdapterSource;
  title: string;
  variantTitle?: string;
  productType?: string;
  productUrl: string;
  imageUrl: string | null;
  wasPrice: number;
  nowPrice: number;
  discountPct: number;
  savingsDollars: number;
  available: boolean;
  sectionTags: DealSectionTag[];
  createdAt: string | null;
  updatedAt: string | null;
};

export type AdapterStatusInfo = {
  source: AdapterSource;
  label: string;
  configured: boolean;
  requiredEnvVars: string[];
  signupUrl: string | null;
  brandCount: number;
  liveBrandCount: number;
};

export interface DealsAdapter {
  id: AdapterSource;
  label: string;
  requiredEnvVars: string[];
  signupUrl: string | null;
  isConfigured(): boolean;
  fetchDeals(brands: BrandDirectoryEntry[]): Promise<NormalizedDeal[]>;
}

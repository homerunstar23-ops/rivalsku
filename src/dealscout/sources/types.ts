import type { Dimensions, ReferralCategory } from "../fees";
import type { AmazonListingSignals } from "../filters";

/** A discounted item found at a retailer, before it is matched to Amazon. */
export type RetailOffer = {
  source: string; // adapter id, e.g. "bestbuy"
  retailer: string; // "Best Buy"
  retailerUrl?: string;
  upc?: string;
  title: string;
  brand?: string;
  buyPrice: number;
  regularPrice?: number;
};

/** Amazon-side facts for one ASIN, enough to run the fee engine and filters. */
export type AmazonMatch = AmazonListingSignals & {
  category: ReferralCategory;
  dims?: Dimensions;
  upcs: string[];
};

export type SourceStatus = {
  id: string;
  label: string;
  enabled: boolean;
  note: string;
  items?: number;
  error?: string;
};

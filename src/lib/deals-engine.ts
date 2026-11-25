import fs from "fs";
import path from "path";
import {
  ALL_ADAPTERS,
  getAdapterStatuses,
  getBrandDirectory,
} from "./adapters";
import { fetchShopifyBatch } from "./adapters/shopify";
import { fetchJsonLdBrand } from "./adapters/jsonld";
import type {
  AdapterStatusInfo,
  BrandDirectoryEntry,
  DealSectionTag,
  NormalizedDeal,
} from "./adapters/types";

export type DealsSnapshotFile = {
  generatedAt: string;
  liveBrandsChecked: number;
  brandsWithDeals: number;
  totalDeals: number;
  deals: NormalizedDeal[];
};

export type DealQueryOptions = {
  category?: string;
  brand?: string;
  minDiscount?: number;
  minPrice?: number;
  maxPrice?: number;
  sort?: "discount" | "savings" | "newest";
  section?: "all" | DealSectionTag;
  q?: string;
  limit?: number;
};

type EngineState = {
  dealsById: Map<string, NormalizedDeal>;
  dealsList: NormalizedDeal[];
  brandLastRefreshed: Map<string, number>;
  lastTickAt: number;
  lastUpdatedAt: string;
  isRefreshing: boolean;
  initialized: boolean;
};

const globalKey = "__rivalskuDealsEngineState_v1";

function getState(): EngineState {
  const g = globalThis as unknown as Record<string, EngineState | undefined>;
  if (!g[globalKey]) {
    g[globalKey] = {
      dealsById: new Map(),
      dealsList: [],
      brandLastRefreshed: new Map(),
      lastTickAt: 0,
      lastUpdatedAt: new Date(0).toISOString(),
      isRefreshing: false,
      initialized: false,
    };
  }
  return g[globalKey]!;
}

function hydrateFromSnapshot(state: EngineState) {
  if (state.initialized) return;
  state.initialized = true;
  try {
    const snapPath = path.resolve(
      process.cwd(),
      "src",
      "data",
      "deals-snapshot.json",
    );
    if (!fs.existsSync(snapPath)) return;
    const raw = fs.readFileSync(snapPath, "utf8");
    const parsed = JSON.parse(raw) as DealsSnapshotFile;
    const liveDomains = new Set(
      getBrandDirectory()
        .filter((b) => b.status === "live")
        .map((b) => b.domain),
    );
    const deals = (Array.isArray(parsed.deals) ? parsed.deals : []).filter((d) =>
      liveDomains.has(d.brandDomain),
    );
    const ts = Date.parse(parsed.generatedAt) || Date.now();

    state.dealsById.clear();
    for (const d of deals) {
      state.dealsById.set(d.id, d);
      state.brandLastRefreshed.set(d.brandDomain, ts);
    }
    state.dealsList = Array.from(state.dealsById.values());
    state.lastUpdatedAt = parsed.generatedAt || new Date().toISOString();
    state.lastTickAt = ts;
  } catch {
    // Graceful fallback if snapshot missing
  }
}

const STAGGER_INTERVAL_MS = 20 * 60 * 1000; // Refresh a batch at most every 20 mins
const BRAND_TTL_MS = 12 * 60 * 60 * 1000; // Consider a store stale after 12 hours
const BATCH_SIZE = 28; // Polite 28 stores per background tick

export async function runStaggeredRefresh(force = false): Promise<{
  refreshedBrands: number;
  newTotalDeals: number;
}> {
  const state = getState();
  hydrateFromSnapshot(state);

  if (state.isRefreshing) {
    return { refreshedBrands: 0, newTotalDeals: state.dealsList.length };
  }

  const now = Date.now();
  if (!force && now - state.lastTickAt < STAGGER_INTERVAL_MS) {
    return { refreshedBrands: 0, newTotalDeals: state.dealsList.length };
  }

  state.isRefreshing = true;
  state.lastTickAt = now;

  try {
    const directory = getBrandDirectory();
    const shopifyBrands = directory.filter(
      (b) => b.source === "shopify" && b.status === "live",
    );

    // Pick stalest Shopify brands first
    const staleSorted = [...shopifyBrands].sort((a, b) => {
      const ta = state.brandLastRefreshed.get(a.domain) ?? 0;
      const tb = state.brandLastRefreshed.get(b.domain) ?? 0;
      return ta - tb;
    });

    const batch = force
      ? staleSorted.slice(0, BATCH_SIZE)
      : staleSorted
          .filter(
            (b) =>
              now - (state.brandLastRefreshed.get(b.domain) ?? 0) >
              BRAND_TTL_MS,
          )
          .slice(0, BATCH_SIZE);

    let refreshedCount = 0;

    if (batch.length > 0) {
      const freshDeals = await fetchShopifyBatch(batch, {
        concurrency: 6,
        timeoutMs: 4500,
        maxProducts: 120,
      });

      const batchDomains = new Set(batch.map((b) => b.domain));
      // Remove stale deals for refreshed brands, then insert fresh ones
      for (const [id, deal] of state.dealsById.entries()) {
        if (batchDomains.has(deal.brandDomain)) {
          state.dealsById.delete(id);
        }
      }
      for (const d of freshDeals) {
        state.dealsById.set(d.id, d);
      }
      for (const b of batch) {
        state.brandLastRefreshed.set(b.domain, Date.now());
      }
      refreshedCount += batch.length;
    }

    // JSON-LD storefronts: one stalest brand per tick (capped pages, delayed requests).
    const jsonldBrands = directory
      .filter((b) => b.source === "jsonld" && b.status === "live")
      .sort(
        (a, b) =>
          (state.brandLastRefreshed.get(a.domain) ?? 0) -
          (state.brandLastRefreshed.get(b.domain) ?? 0),
      );
    const jb = jsonldBrands[0];
    if (jb && now - (state.brandLastRefreshed.get(jb.domain) ?? 0) > BRAND_TTL_MS) {
      const prevPrices = new Map<string, number>();
      for (const d of state.dealsById.values()) {
        if (d.brandDomain === jb.domain) prevPrices.set(d.id, d.nowPrice);
      }
      const items = await fetchJsonLdBrand(jb, { prevPrices });
      for (const d of items) state.dealsById.set(d.id, d);
      state.brandLastRefreshed.set(jb.domain, Date.now());
      refreshedCount += 1;
    }

    // Keyed partner / official API adapters (skip gracefully when keys are missing).
    for (const adapter of ALL_ADAPTERS) {
      if (["shopify", "jsonld", "woocommerce"].includes(adapter.id) || !adapter.isConfigured()) continue;
      const matching = directory.filter((b) => b.source === adapter.id);
      if (matching.length === 0) continue;
      const adapterDeals = await adapter.fetchDeals(matching);
      if (adapterDeals.length > 0) {
        for (const [id, deal] of state.dealsById.entries()) {
          if (deal.source === adapter.id) state.dealsById.delete(id);
        }
        for (const d of adapterDeals) state.dealsById.set(d.id, d);
      }
    }

    state.dealsList = Array.from(state.dealsById.values());
    state.lastUpdatedAt = new Date().toISOString();
    return {
      refreshedBrands: refreshedCount,
      newTotalDeals: state.dealsList.length,
    };
  } finally {
    state.isRefreshing = false;
  }
}

function maybeKickBackgroundRefresh() {
  const state = getState();
  hydrateFromSnapshot(state);
  const now = Date.now();
  if (!state.isRefreshing && now - state.lastTickAt >= STAGGER_INTERVAL_MS) {
    // Fire-and-forget polite background refresh; never blocks page render
    void runStaggeredRefresh(false);
  }
}

export function getAllDeals(): NormalizedDeal[] {
  const state = getState();
  hydrateFromSnapshot(state);
  maybeKickBackgroundRefresh();
  return state.dealsList;
}

export function getDealById(id: string): NormalizedDeal | undefined {
  const state = getState();
  hydrateFromSnapshot(state);
  return state.dealsById.get(id);
}

export function queryDeals(opts: DealQueryOptions = {}): NormalizedDeal[] {
  const all = getAllDeals();
  const qLower = opts.q?.trim().toLowerCase() || "";
  const category =
    opts.category && opts.category !== "all" ? opts.category : null;
  const brand = opts.brand && opts.brand !== "all" ? opts.brand : null;
  const section =
    opts.section && opts.section !== "all" ? opts.section : null;
  const minDiscount = opts.minDiscount ?? 0;
  const minPrice = opts.minPrice ?? 0;
  const maxPrice = opts.maxPrice ?? Number.POSITIVE_INFINITY;

  const filtered = all.filter((d) => {
    if (category && d.category !== category) return false;
    if (brand && d.brandSlug !== brand && d.brandDomain !== brand) return false;
    if (section && !d.sectionTags.includes(section)) return false;
    if (minDiscount > 0 && d.discountPct < minDiscount) return false;
    if (d.nowPrice < minPrice || d.nowPrice > maxPrice) return false;
    if (qLower) {
      const hay =
        `${d.title} ${d.brandName} ${d.category} ${d.productType || ""}`.toLowerCase();
      if (!hay.includes(qLower)) return false;
    }
    return true;
  });

  const sort = opts.sort || "discount";
  filtered.sort((a, b) => {
    if (sort === "savings") {
      return b.savingsDollars - a.savingsDollars || b.discountPct - a.discountPct;
    }
    if (sort === "newest") {
      const ta = Date.parse(a.updatedAt || a.createdAt || "") || 0;
      const tb = Date.parse(b.updatedAt || b.createdAt || "") || 0;
      return tb - ta || b.discountPct - a.discountPct;
    }
    return b.discountPct - a.discountPct || b.savingsDollars - a.savingsDollars;
  });

  if (opts.limit && opts.limit > 0) {
    return filtered.slice(0, opts.limit);
  }
  return filtered;
}

export function getDealsStats(): {
  totalDeals: number;
  biggestDropsCount: number;
  justOnSaleCount: number;
  backInStockCount: number;
  newLaunchCount: number;
  totalDirectoryBrands: number;
  liveBrandsCount: number;
  pendingBrandsCount: number;
  brandsWithActiveDeals: number;
  lastUpdatedAt: string;
  categories: string[];
  adapters: AdapterStatusInfo[];
  pausedTosCount: number;
  nonShopifyLiveCount: number;
  bigNameLiveCount: number;
  catalogItemCount: number;
} {
  const all = getAllDeals();
  const directory = getBrandDirectory();
  const liveBrands = directory.filter((b) => b.status === "live");
  const pendingBrands = directory.filter((b) => b.status !== "live");
  const activeBrandDomains = new Set(all.map((d) => d.brandDomain));
  const categories = Array.from(
    new Set(directory.map((b) => b.category)),
  ).sort();

  const state = getState();
  return {
    totalDeals: all.filter((d) => d.kind !== "catalog").length,
    biggestDropsCount: all.filter((d) =>
      d.sectionTags.includes("biggest_drop"),
    ).length,
    justOnSaleCount: all.filter((d) =>
      d.sectionTags.includes("just_went_on_sale"),
    ).length,
    backInStockCount: all.filter((d) =>
      d.sectionTags.includes("back_in_stock"),
    ).length,
    newLaunchCount: all.filter((d) => d.sectionTags.includes("new_launch"))
      .length,
    totalDirectoryBrands: directory.length,
    liveBrandsCount: liveBrands.length,
    pendingBrandsCount: pendingBrands.length,
    brandsWithActiveDeals: activeBrandDomains.size,
    lastUpdatedAt: state.lastUpdatedAt,
    categories,
    adapters: getAdapterStatuses(),
    pausedTosCount: directory.filter((b) => b.status === "paused_tos").length,
    nonShopifyLiveCount: liveBrands.filter((b) => b.source !== "shopify").length,
    bigNameLiveCount: liveBrands.filter((b) => b.bigName).length,
    catalogItemCount: all.filter((d) => d.kind === "catalog").length,
  };
}

export function getBrandDeals(brand: BrandDirectoryEntry): NormalizedDeal[] {
  return queryDeals({ brand: brand.slug, sort: "discount" });
}

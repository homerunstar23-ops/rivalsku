import {
  getDb,
  getStore,
  getStoreByDomain,
  nowIso,
  type EventType,
  type ProductSnapshot,
  type Store,
} from "./db";
import { dispatchAlerts } from "./alerts";

export const USER_AGENT =
  "RivalSKU/1.0 (competitor change monitor; hello@rivalsku.com)";
const TIMEOUT_MS = 15000;
const PAGE_SIZE = 100;
const MAX_PRODUCTS = 250;
const PROTECTED_STATUSES = new Set([403, 404, 429]);

export class UnsupportedStorefrontError extends Error {
  domain: string;
  status: number;

  constructor(domain: string, status: number) {
    super("Unsupported / protected storefront");
    this.name = "UnsupportedStorefrontError";
    this.domain = domain;
    this.status = status;
  }
}

export type ShopifyVariant = {
  id: number | string;
  title?: string;
  sku?: string | null;
  price?: string | number | null;
  compare_at_price?: string | number | null;
  available?: boolean;
  updated_at?: string;
};

export type ShopifyProduct = {
  id: number | string;
  title: string;
  handle?: string;
  variants?: ShopifyVariant[];
  updated_at?: string;
};

export type LiveVariant = {
  product_id: string;
  variant_id: string;
  title: string;
  variant_title: string;
  sku: string | null;
  price: number;
  compare_at_price: number | null;
  available: boolean;
  product_url: string;
  updated_at: string | null;
};

export type QuickScanResult = {
  ok: true;
  domain: string;
  name: string;
  promoBanner: string | null;
  productCount: number;
  variantCount: number;
  activeSaleCount: number;
  outOfStockCount: number;
  sampleProducts: Array<{
    title: string;
    variantTitle: string;
    sku: string | null;
    price: number;
    compareAtPrice: number | null;
    available: boolean;
    productUrl: string;
    onSale: boolean;
  }>;
};

export type QuickScanFailure = {
  ok: false;
  unsupported: boolean;
  message: string;
  domain?: string;
  status?: number;
};

export type ScanResult = {
  store: Store;
  eventsInserted: number;
  firstScan: boolean;
  unsupported: boolean;
  message?: string;
};

function parsePrice(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n =
    typeof value === "number"
      ? value
      : parseFloat(String(value).replace(/[^0-9.-]/g, ""));
  if (!Number.isFinite(n)) return null;
  return n;
}

export function normalizeDomain(input: string): string {
  const raw = input.trim();
  if (!raw) {
    throw new Error("Please enter a store URL.");
  }
  let candidate = raw;
  if (!/^https?:\/\//i.test(candidate)) {
    candidate = `https://${candidate}`;
  }
  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    throw new Error("That doesn’t look like a valid store URL.");
  }
  const host = url.hostname.replace(/^www\./i, "").toLowerCase();
  if (!host || !host.includes(".")) {
    throw new Error("That doesn’t look like a valid store URL.");
  }
  return host;
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
): Promise<Response> {
  const headers = new Headers(init.headers);
  if (!headers.has("User-Agent")) headers.set("User-Agent", USER_AGENT);
  if (!headers.has("Accept")) {
    headers.set(
      "Accept",
      "application/json, text/html;q=0.9, */*;q=0.8",
    );
  }
  return fetch(url, {
    ...init,
    headers,
    redirect: "follow",
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cache: "no-store",
  });
}

function stripTags(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, n) => {
      const code = Number(n);
      return Number.isFinite(code) ? String.fromCharCode(code) : " ";
    })
    .replace(/\s+/g, " ")
    .trim();
}

function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&nbsp;/gi, " ")
    .trim();
}

function extractMeta(
  html: string,
  property: string,
): string | null {
  const patterns = [
    new RegExp(
      `<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)["'][^>]*>`,
      "i",
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${property}["'][^>]*>`,
      "i",
    ),
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m?.[1]) return decodeEntities(m[1]);
  }
  return null;
}

export function extractTitleAndBanner(html: string): {
  name: string | null;
  promoBanner: string | null;
} {
  const ogSite = extractMeta(html, "og:site_name");
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  let name = ogSite || (titleMatch ? decodeEntities(titleMatch[1]) : null);
  if (name) {
    name = name
      .replace(/\s*[|\-–—•·].*$/, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  const chunk = html.slice(0, 180_000);
  const blockRe =
    /<(div|p|span|section|a|marquee)[^>]*(class|id)=["'][^"']*(announcement|promo-bar|utility-bar|header-bar|marketing-bar|site-banner|promo_banner|announcement-bar)[^"']*["'][^>]*>([\s\S]*?)<\/\1>/gi;
  let promoBanner: string | null = null;
  let match: RegExpExecArray | null;
  while ((match = blockRe.exec(chunk))) {
    const text = stripTags(match[4] || "");
    if (text && text.length >= 4 && text.length <= 240) {
      promoBanner = text;
      break;
    }
  }

  if (!promoBanner) {
    const shopifySection = chunk.match(
      /id=["']shopify-section-[^"']*announcement[^"']*["'][^>]*>([\s\S]{0,2500}?)<\/div>/i,
    );
    if (shopifySection?.[1]) {
      const text = stripTags(shopifySection[1]);
      if (text && text.length >= 4 && text.length <= 240) promoBanner = text;
    }
  }

  return { name: name || null, promoBanner };
}

async function fetchHomepage(
  domain: string,
  preferredHost?: string,
): Promise<{ name: string | null; promoBanner: string | null }> {
  const hosts = [preferredHost, domain, `www.${domain}`].filter(
    (h, i, arr): h is string => Boolean(h) && arr.indexOf(h) === i,
  );
  for (const host of hosts) {
    try {
      const res = await fetchWithTimeout(`https://${host}/`, {
        headers: { Accept: "text/html,application/xhtml+xml" },
      });
      if (!res.ok) continue;
      const html = await res.text();
      return extractTitleAndBanner(html);
    } catch {
      continue;
    }
  }
  return { name: null, promoBanner: null };
}

async function fetchProductsJson(
  domain: string,
): Promise<{ products: ShopifyProduct[]; usedHost: string }> {
  const hosts = [domain, `www.${domain}`];
  let lastStatus = 0;
  let sawProtected = false;

  for (const host of hosts) {
    const products: ShopifyProduct[] = [];
    let page = 1;
    let hostWorked = false;

    while (products.length < MAX_PRODUCTS) {
      const url = `https://${host}/products.json?limit=${PAGE_SIZE}&page=${page}`;
      let res: Response;
      try {
        res = await fetchWithTimeout(url, {
          headers: { Accept: "application/json" },
        });
      } catch (err) {
        if (page === 1) break;
        throw err;
      }

      lastStatus = res.status;
      if (PROTECTED_STATUSES.has(res.status)) {
        sawProtected = true;
        break;
      }
      if (!res.ok) {
        if (page === 1) break;
        throw new Error(
          `Failed to fetch catalog from ${domain} (HTTP ${res.status}).`,
        );
      }

      const text = await res.text();
      let data: { products?: ShopifyProduct[] };
      try {
        data = JSON.parse(text) as { products?: ShopifyProduct[] };
      } catch {
        sawProtected = true;
        break;
      }

      const batch = Array.isArray(data.products) ? data.products : [];
      hostWorked = true;
      if (batch.length === 0) break;
      products.push(...batch);
      if (batch.length < PAGE_SIZE) break;
      page += 1;
    }

    if (hostWorked) {
      return { products: products.slice(0, MAX_PRODUCTS), usedHost: host };
    }
  }

  if (sawProtected || PROTECTED_STATUSES.has(lastStatus)) {
    throw new UnsupportedStorefrontError(domain, lastStatus || 403);
  }
  throw new Error(
    `Could not read a public Shopify catalog at ${domain}${
      lastStatus ? ` (HTTP ${lastStatus})` : ""
    }.`,
  );
}

export function flattenCatalog(
  products: ShopifyProduct[],
  domain: string,
): LiveVariant[] {
  const origin = `https://${domain}`;
  const variants: LiveVariant[] = [];

  for (const product of products) {
    const handle = product.handle || "";
    const productUrl = handle
      ? `${origin}/products/${handle}`
      : `${origin}/products/${product.id}`;
    for (const variant of product.variants || []) {
      const price = parsePrice(variant.price);
      // Skip $0.00 / missing placeholder products and variants.
      if (price === null || price <= 0) continue;
      const compare = parsePrice(variant.compare_at_price);
      const variantTitle =
        variant.title && variant.title !== "Default Title"
          ? variant.title
          : "";
      variants.push({
        product_id: String(product.id),
        variant_id: String(variant.id),
        title: product.title,
        variant_title: variantTitle,
        sku: variant.sku ? String(variant.sku) : null,
        price,
        compare_at_price:
          compare !== null && compare > 0 ? compare : null,
        available: variant.available !== false,
        product_url: productUrl,
        updated_at: variant.updated_at || product.updated_at || null,
      });
    }
  }
  return variants;
}

function onSale(price: number, compare: number | null): boolean {
  return compare !== null && compare > price;
}

export function summarizeVariants(variants: LiveVariant[]) {
  const productIds = new Set(variants.map((v) => v.product_id));
  const saleProducts = new Set(
    variants.filter((v) => onSale(v.price, v.compare_at_price)).map((v) => v.product_id),
  );
  const oos = variants.filter((v) => !v.available).length;
  return {
    productCount: productIds.size,
    variantCount: variants.length,
    activeSaleCount: saleProducts.size,
    outOfStockCount: oos,
  };
}

export async function liveCatalog(inputUrl: string): Promise<{
  domain: string;
  name: string;
  promoBanner: string | null;
  variants: LiveVariant[];
  usedHost: string;
}> {
  const domain = normalizeDomain(inputUrl);
  const [{ products, usedHost }, homepage] = await Promise.all([
    fetchProductsJson(domain),
    fetchHomepage(domain),
  ]);
  const variants = flattenCatalog(products, domain);
  const name =
    homepage.name ||
    domain.split(".")[0]!.replace(/-/g, " ").replace(/\b\w/g, (c) =>
      c.toUpperCase(),
    );
  return {
    domain,
    name,
    promoBanner: homepage.promoBanner,
    variants,
    usedHost,
  };
}

export async function quickScan(
  inputUrl: string,
): Promise<QuickScanResult | QuickScanFailure> {
  try {
    const live = await liveCatalog(inputUrl);
    const stats = summarizeVariants(live.variants);
    const sampleSource = [
      ...live.variants.filter((v) => onSale(v.price, v.compare_at_price)),
      ...live.variants.filter((v) => !v.available),
      ...live.variants,
    ];
    const seen = new Set<string>();
    const sampleProducts = [];
    for (const v of sampleSource) {
      if (seen.has(v.product_id)) continue;
      seen.add(v.product_id);
      sampleProducts.push({
        title: v.title,
        variantTitle: v.variant_title,
        sku: v.sku,
        price: v.price,
        compareAtPrice: v.compare_at_price,
        available: v.available,
        productUrl: v.product_url,
        onSale: onSale(v.price, v.compare_at_price),
      });
      if (sampleProducts.length >= 6) break;
    }
    return {
      ok: true,
      domain: live.domain,
      name: live.name,
      promoBanner: live.promoBanner,
      ...stats,
      sampleProducts,
    };
  } catch (err) {
    if (err instanceof UnsupportedStorefrontError) {
      return {
        ok: false,
        unsupported: true,
        message: "Unsupported / protected storefront",
        domain: err.domain,
        status: err.status,
      };
    }
    const message =
      err instanceof Error
        ? err.message
        : "Could not scan that storefront.";
    return { ok: false, unsupported: false, message };
  }
}

type PendingEvent = {
  event_type: EventType;
  product_title: string | null;
  variant_title: string | null;
  old_value: string | null;
  new_value: string | null;
  pct_change: number | null;
  product_url: string | null;
};

function money(n: number): string {
  return n.toFixed(2);
}

function diffVariants(
  previous: Map<string, ProductSnapshot>,
  previousProductIds: Set<string>,
  live: LiveVariant[],
  firstScan: boolean,
): PendingEvent[] {
  const events: PendingEvent[] = [];
  if (firstScan) return events;

  const seenNewProducts = new Set<string>();

  for (const v of live) {
    const prev = previous.get(v.variant_id);
    if (!prev) {
      if (
        !previousProductIds.has(v.product_id) &&
        !seenNewProducts.has(v.product_id)
      ) {
        seenNewProducts.add(v.product_id);
        events.push({
          event_type: "NEW_PRODUCT",
          product_title: v.title,
          variant_title: v.variant_title || null,
          old_value: null,
          new_value: money(v.price),
          pct_change: null,
          product_url: v.product_url,
        });
      }
      continue;
    }

    if (prev.price !== v.price) {
      const pct =
        prev.price > 0 ? ((v.price - prev.price) / prev.price) * 100 : null;
      events.push({
        event_type: v.price < prev.price ? "PRICE_DROP" : "PRICE_INCREASE",
        product_title: v.title,
        variant_title: v.variant_title || null,
        old_value: money(prev.price),
        new_value: money(v.price),
        pct_change: pct !== null ? Math.round(pct * 10) / 10 : null,
        product_url: v.product_url,
      });
    }

    const wasSale = onSale(prev.price, prev.compare_at_price);
    const isSale = onSale(v.price, v.compare_at_price);
    if (!wasSale && isSale) {
      events.push({
        event_type: "SALE_STARTED",
        product_title: v.title,
        variant_title: v.variant_title || null,
        old_value: prev.compare_at_price
          ? money(prev.compare_at_price)
          : money(prev.price),
        new_value: `${money(v.price)} (was ${money(v.compare_at_price!)})`,
        pct_change:
          v.compare_at_price && v.compare_at_price > 0
            ? Math.round(
                ((v.price - v.compare_at_price) / v.compare_at_price) * 1000,
              ) / 10
            : null,
        product_url: v.product_url,
      });
    } else if (wasSale && !isSale) {
      events.push({
        event_type: "SALE_ENDED",
        product_title: v.title,
        variant_title: v.variant_title || null,
        old_value: prev.compare_at_price
          ? money(prev.compare_at_price)
          : null,
        new_value: money(v.price),
        pct_change: null,
        product_url: v.product_url,
      });
    }

    if (prev.available === 1 && !v.available) {
      events.push({
        event_type: "OUT_OF_STOCK",
        product_title: v.title,
        variant_title: v.variant_title || null,
        old_value: "In stock",
        new_value: "Out of stock",
        pct_change: null,
        product_url: v.product_url,
      });
    } else if (prev.available === 0 && v.available) {
      events.push({
        event_type: "BACK_IN_STOCK",
        product_title: v.title,
        variant_title: v.variant_title || null,
        old_value: "Out of stock",
        new_value: "In stock",
        pct_change: null,
        product_url: v.product_url,
      });
    }
  }

  return events;
}

export async function addStore(
  inputUrl: string,
  vertical?: string,
): Promise<Store> {
  const domain = normalizeDomain(inputUrl);
  const existing = getStoreByDomain(domain);
  if (existing) return existing;
  const db = getDb();
  const createdAt = nowIso();
  const info = db
    .prepare(
      `INSERT INTO stores (domain, name, vertical, status, last_scanned_at, product_count, active_sale_count, out_of_stock_count, promo_banner, created_at)
       VALUES (?, ?, ?, 'active', NULL, 0, 0, 0, NULL, ?)`,
    )
    .run(domain, domain, vertical || null, createdAt);
  return getStore(Number(info.lastInsertRowid))!;
}

export async function scanStore(
  storeId: number,
  options: { dispatch?: boolean } = {},
): Promise<ScanResult> {
  const store = getStore(storeId);
  if (!store) throw new Error("Store not found.");
  const db = getDb();
  const scannedAt = nowIso();
  const firstScan = !store.last_scanned_at;

  try {
    const live = await liveCatalog(store.domain);
    const stats = summarizeVariants(live.variants);

    const previousRows = db
      .prepare(
        `SELECT * FROM product_snapshots
         WHERE store_id = ?
         AND id IN (
           SELECT MAX(id) FROM product_snapshots WHERE store_id = ? GROUP BY variant_id
         )`,
      )
      .all(store.id, store.id) as ProductSnapshot[];
    const previous = new Map(previousRows.map((row) => [row.variant_id, row]));
    const previousProductIds = new Set(previousRows.map((r) => r.product_id));

    const pending = diffVariants(
      previous,
      previousProductIds,
      live.variants,
      firstScan,
    );

    if (
      !firstScan &&
      (store.promo_banner || live.promoBanner) &&
      (store.promo_banner || "") !== (live.promoBanner || "")
    ) {
      pending.push({
        event_type: "PROMO_BANNER_CHANGED",
        product_title: null,
        variant_title: null,
        old_value: store.promo_banner,
        new_value: live.promoBanner,
        pct_change: null,
        product_url: `https://${store.domain}/`,
      });
    }

    const insertSnapshot = db.prepare(
      `INSERT INTO product_snapshots (
         store_id, product_id, variant_id, title, variant_title, sku,
         price, compare_at_price, available, product_url, updated_at, scanned_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    const insertEvent = db.prepare(
      `INSERT INTO change_events (
         store_id, event_type, product_title, variant_title, old_value,
         new_value, pct_change, product_url, detected_at, alerted
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
    );
    const deleteOld = db.prepare(
      `DELETE FROM product_snapshots WHERE store_id = ? AND scanned_at != ?`,
    );

    const tx = db.transaction(() => {
      for (const v of live.variants) {
        insertSnapshot.run(
          store.id,
          v.product_id,
          v.variant_id,
          v.title,
          v.variant_title || null,
          v.sku,
          v.price,
          v.compare_at_price,
          v.available ? 1 : 0,
          v.product_url,
          v.updated_at,
          scannedAt,
        );
      }
      deleteOld.run(store.id, scannedAt);
      for (const ev of pending) {
        insertEvent.run(
          store.id,
          ev.event_type,
          ev.product_title,
          ev.variant_title,
          ev.old_value,
          ev.new_value,
          ev.pct_change,
          ev.product_url,
          scannedAt,
        );
      }
      db.prepare(
        `UPDATE stores
         SET name = ?, status = 'active', last_scanned_at = ?,
             product_count = ?, active_sale_count = ?, out_of_stock_count = ?,
             promo_banner = ?
         WHERE id = ?`,
      ).run(
        live.name || store.name,
        scannedAt,
        stats.productCount,
        stats.activeSaleCount,
        stats.outOfStockCount,
        live.promoBanner,
        store.id,
      );
    });
    tx();

    const eventIds = (
      db
        .prepare(
          `SELECT id FROM change_events WHERE store_id = ? AND detected_at = ?`,
        )
        .all(store.id, scannedAt) as { id: number }[]
    ).map((r) => r.id);

    if (options.dispatch !== false && eventIds.length > 0) {
      await dispatchAlerts(eventIds);
    }

    return {
      store: getStore(store.id)!,
      eventsInserted: pending.length,
      firstScan,
      unsupported: false,
    };
  } catch (err) {
    if (err instanceof UnsupportedStorefrontError) {
      db.prepare(
        `UPDATE stores SET status = 'unsupported', last_scanned_at = ? WHERE id = ?`,
      ).run(scannedAt, store.id);
      return {
        store: getStore(store.id)!,
        eventsInserted: 0,
        firstScan,
        unsupported: true,
        message: "Unsupported / protected storefront",
      };
    }
    db.prepare(
      `UPDATE stores SET status = 'error', last_scanned_at = ? WHERE id = ?`,
    ).run(scannedAt, store.id);
    throw err;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Scan every active/error store with polite throttling.
 * Defaults: 2 concurrent workers, 500ms pause after each store
 * (override with SCAN_CONCURRENCY and SCAN_DELAY_MS).
 */
export async function scanAllStores(): Promise<ScanResult[]> {
  const stores = getDb()
    .prepare(
      `SELECT * FROM stores WHERE status IN ('active', 'error') ORDER BY id ASC`,
    )
    .all() as Store[];

  const delayMs = Number.parseInt(process.env.SCAN_DELAY_MS ?? "500", 10);
  const concurrency = Math.max(
    1,
    Math.min(5, Number.parseInt(process.env.SCAN_CONCURRENCY ?? "2", 10) || 2),
  );
  const pause = Number.isFinite(delayMs) && delayMs > 0 ? delayMs : 0;

  const results: ScanResult[] = new Array(stores.length);
  let cursor = 0;

  async function scanOne(store: Store): Promise<ScanResult> {
    try {
      return await scanStore(store.id, { dispatch: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Scan failed.";
      console.error(`[RivalSKU] scan failed for ${store.domain}: ${message}`);
      return {
        store: getStore(store.id)!,
        eventsInserted: 0,
        firstScan: !store.last_scanned_at,
        unsupported: false,
        message,
      };
    }
  }

  async function worker() {
    while (true) {
      const index = cursor++;
      if (index >= stores.length) return;
      results[index] = await scanOne(stores[index]!);
      if (pause > 0 && cursor < stores.length) await sleep(pause);
    }
  }

  const workers = Math.min(concurrency, stores.length);
  if (workers > 0) {
    await Promise.all(Array.from({ length: workers }, () => worker()));
  }
  return results;
}

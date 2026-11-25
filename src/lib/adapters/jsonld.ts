// schema.org Product/Offer JSON-LD adapter for non-Shopify storefronts
// (Salesforce Commerce Cloud, custom stacks, THG, etc.).
// Rules: robots.txt must allow every URL fetched; brand ToS reviewed (see config);
// capped pages per brand per run; sequential requests with a delay; USD only.
import type { BrandDirectoryEntry, DealsAdapter, DealSectionTag, NormalizedDeal } from "./types";
import { gunzipSync } from "zlib";
import { getRobots, isPathAllowed, politeFetch } from "./robots";

async function readXml(r: Response): Promise<string> {
  const buf = Buffer.from(await r.arrayBuffer());
  if (buf[0] === 0x1f && buf[1] === 0x8b) {
    try { return gunzipSync(buf).toString("utf8"); } catch { return ""; }
  }
  return buf.toString("utf8");
}

const US_HINT = /\/us\/|en[_-]us|\/en-us\b|_us\b|-us\./i;
const FOREIGN_HINT = /\/(ca|de|fr|uk|gb|au|jp|es|it|nl|mx|br|kr|cn)\/|[a-z]{2}[_-](?!us)[A-Z]{2}\.xml|sitemap-[a-z]{2}_[A-Z]{2}/;
function preferUs(list: string[]) {
  const us = list.filter((u) => US_HINT.test(u));
  if (us.length) return us;
  const neutral = list.filter((u) => !FOREIGN_HINT.test(u));
  return neutral.length ? neutral : list;
}

const MAX_PAGES_PER_BRAND = Number(process.env.JSONLD_MAX_PAGES || 24);
const DELAY_MS = Number(process.env.JSONLD_DELAY_MS || 1500);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const sitemapCache = new Map<string, { urls: string[]; at: number }>();

function locs(xml: string) {
  return [...xml.matchAll(/<loc>\s*(?:<!\[CDATA\[)?([^<\]\s]+)/g)].map((m) => m[1].trim());
}

const PRODUCT_URL = /\/(p|product|products|prd|item|shop)\/|\/browse\/product|\.html?$|[?&]pid=|\/\d{5,}/i;
const SALE_HINT = /sale|clearance|outlet|markdown|deal|discount/i;

async function discoverProductUrls(host: string): Promise<string[]> {
  const hit = sitemapCache.get(host);
  if (hit && Date.now() - hit.at < 24 * 3600 * 1000) return hit.urls;
  const rules = await getRobots(host);
  if (rules.blocked) return [];
  let queue = rules.sitemaps.length ? preferUs(rules.sitemaps).slice(0, 6) : [`https://${host}/sitemap.xml`];
  const found: string[] = [];
  for (let depth = 0; depth < 3 && queue.length && found.length < 4000; depth++) {
    const next: string[] = [];
    for (const sm of queue.slice(0, 6)) {
      try {
        const u = new URL(sm);
        if (!isPathAllowed(rules, u.pathname)) continue;
        const r = await politeFetch(sm, 10000, "application/xml,text/xml");
        if (!r.ok) continue;
        const xml = await readXml(r);
        const L = locs(xml);
        if (/<sitemapindex/i.test(xml)) {
          const pool = preferUs(L);
          const prod = pool.filter((x) => /product|pdp|item/i.test(x));
          next.push(...(prod.length ? prod : pool).slice(0, 4));
        } else {
          const isProductMap = /product|pdp|item/i.test(sm);
          found.push(...L.filter((x) => isProductMap || PRODUCT_URL.test(x)));
        }
        await sleep(300);
      } catch {
        /* skip */
      }
    }
    queue = next;
  }
  const strict = found.filter((x) => PRODUCT_URL.test(x));
  const pool = strict.length >= 20 ? strict : found;
  const allowed = [...new Set(pool)].filter((x) => {
    try { const u = new URL(x); return u.host.endsWith(host.replace(/^www\./, "")) && isPathAllowed(rules, u.pathname + u.search); } catch { return false; }
  });
  sitemapCache.set(host, { urls: allowed, at: Date.now() });
  return allowed;
}

type Json = Record<string, unknown>;
function asArr<T>(v: T | T[] | undefined | null): T[] { return v == null ? [] : Array.isArray(v) ? v : [v]; }
function num(v: unknown): number | null {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v.replace(/[^0-9.]/g, "")) : NaN;
  return Number.isFinite(n) && n > 0 ? n : null;
}
function decode(s: string) {
  return s.replace(/&amp;/g, "&").replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d))).trim();
}

export function extractJsonLdProducts(html: string): Json[] {
  const out: Json[] = [];
  for (const m of html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const walk = (n: unknown) => {
        if (!n || typeof n !== "object") return;
        if (Array.isArray(n)) return n.forEach(walk);
        const o = n as Json;
        const t = asArr(o["@type"] as string | string[]);
        if (t.includes("Product") || t.includes("ProductGroup")) out.push(o);
        if (o["@graph"]) walk(o["@graph"]);
      };
      walk(JSON.parse(m[1].trim()));
    } catch {
      /* malformed block */
    }
  }
  return out;
}

export function productToDeal(p: Json, brand: BrandDirectoryEntry, pageUrl: string, prevPrices?: Map<string, number>): NormalizedDeal | null {
  const variants = asArr(p.hasVariant as Json[]);
  const offerNodes = [...asArr(p.offers as Json | Json[]), ...variants.flatMap((v) => asArr(v.offers as Json | Json[]))];
  let nowPrice: number | null = null; let listPrice: number | null = null; let currency = "USD"; let available = false;
  for (const o of offerNodes) {
    const sub = asArr((o.offers as Json[]) ?? o);
    for (const off of sub) {
      const pr = num(off.price) ?? num(off.lowPrice);
      if ((off.priceCurrency as string) && off.priceCurrency !== "USD") { currency = String(off.priceCurrency); continue; }
      if (pr && (nowPrice === null || pr < nowPrice)) nowPrice = pr;
      if (/InStock|LimitedAvailability|OnlineOnly/i.test(String(off.availability ?? ""))) available = true;
      for (const ps of asArr(off.priceSpecification as Json | Json[])) {
        if (/StrikethroughPrice|ListPrice|MSRP/i.test(String(ps.priceType ?? ""))) {
          const lp = num(ps.price); if (lp && (!listPrice || lp > listPrice)) listPrice = lp;
        }
      }
    }
  }
  if (!nowPrice || currency !== "USD" || nowPrice > 20000) return null;
  const name = typeof p.name === "string" ? decode(p.name) : null;
  if (!name) return null;
  const imgRaw = asArr(p.image as unknown)[0];
  const image = typeof imgRaw === "string" ? imgRaw : imgRaw && typeof imgRaw === "object" ? String((imgRaw as Json).url ?? (imgRaw as Json).contentUrl ?? "") : "";
  const url = typeof p.url === "string" && /^https?:/.test(p.url) ? p.url : pageUrl;
  const sku = String(p.sku ?? p.productID ?? p.productGroupID ?? url).slice(0, 80);
  const id = `${brand.slug}--${sku.replace(/[^a-zA-Z0-9_-]+/g, "-").slice(0, 60)}`;

  // Discount evidence: schema.org strikethrough/list price, or a real drop vs our previous observation.
  let wasPrice = nowPrice; const tags: DealSectionTag[] = [];
  if (listPrice && listPrice > nowPrice) wasPrice = listPrice;
  const prev = prevPrices?.get(id);
  if (prev && prev > nowPrice && prev > wasPrice) wasPrice = prev;
  const pct = wasPrice > nowPrice ? Math.round(((wasPrice - nowPrice) / wasPrice) * 100) : 0;
  const isDeal = pct >= 10 && pct <= 88;
  if (isDeal) { tags.push("biggest_drop"); if (prev && prev > nowPrice) tags.push("just_went_on_sale"); }

  return {
    id, brandDomain: brand.domain, brandName: brand.name, brandSlug: brand.slug, category: brand.category, source: "jsonld",
    title: name, productType: typeof p.category === "string" ? p.category : undefined, productUrl: url,
    imageUrl: image && /^https?:/.test(image) ? image : image.startsWith("//") ? `https:${image}` : null,
    wasPrice: isDeal ? wasPrice : nowPrice, nowPrice, discountPct: isDeal ? pct : 0,
    savingsDollars: isDeal ? Math.round((wasPrice - nowPrice) * 100) / 100 : 0,
    available, sectionTags: tags, kind: isDeal ? "deal" : "catalog", createdAt: null, updatedAt: new Date().toISOString(),
  };
}

export async function fetchJsonLdBrand(brand: BrandDirectoryEntry, opts: { maxPages?: number; prevPrices?: Map<string, number> } = {}): Promise<NormalizedDeal[]> {
  const host = brand.domain;
  const rules = await getRobots(host);
  if (rules.blocked) return [];
  const urls = await discoverProductUrls(host);
  if (!urls.length) return [];
  // Prefer sale/clearance URLs, then a deterministic rotating sample so successive runs cover the catalog.
  const sale = urls.filter((u) => SALE_HINT.test(u) && PRODUCT_URL.test(u));
  const rest = urls.filter((u) => !sale.includes(u));
  const day = Math.floor(Date.now() / 86400000);
  const max = opts.maxPages ?? MAX_PAGES_PER_BRAND;
  const start = rest.length ? (day * max) % rest.length : 0;
  const picks = [...sale.slice(0, Math.ceil(max / 2)), ...rest.slice(start), ...rest.slice(0, start)].slice(0, max);

  const out: NormalizedDeal[] = [];
  for (const u of picks) {
    try {
      const r = await politeFetch(u, 10000);
      if (r.status === 403 || r.status === 429) break; // back off immediately if the site pushes back
      if (!r.ok) continue;
      const html = await r.text();
      for (const p of extractJsonLdProducts(html).slice(0, 1)) {
        const d = productToDeal(p, brand, u, opts.prevPrices);
        if (d && d.imageUrl) out.push(d);
      }
    } catch {
      /* skip */
    }
    await sleep(DELAY_MS);
  }
  return out;
}

export const jsonLdAdapter: DealsAdapter = {
  id: "jsonld",
  label: "schema.org JSON-LD (robots-allowed)",
  requiredEnvVars: [],
  signupUrl: null,
  isConfigured: () => true,
  async fetchDeals(brands) {
    const all: NormalizedDeal[] = [];
    for (const b of brands) if (b.source === "jsonld" && b.status === "live") all.push(...(await fetchJsonLdBrand(b)));
    return all;
  },
};

export const __discover = discoverProductUrls;

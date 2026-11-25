import type Database from "better-sqlite3";
import { formatDateTime, formatMoney } from "./format";

export type VerticalBenchmark = {
  vertical: string;
  stores: number;
  storesRunningSales: number;
  products: number;
  onSaleProducts: number;
  pctCatalogOnSale: number;
  variants: number;
  oosVariants: number;
  avgDiscountPct: number;
  maxDiscountPct: number;
  priceDrops: number;
  salesStarted: number;
  newProducts: number;
  stockouts: number;
};

export type DailyTimelinePoint = {
  date: string;
  label: string;
  priceDrops: number;
  salesStarted: number;
  priceIncreases: number;
  newProducts: number;
  stockouts: number;
  restocks: number;
  bannerChanges: number;
};

export type PromoBannerEntry = {
  domain: string;
  name: string;
  vertical: string;
  banner: string;
  changedAt: string | null;
  previousBanner: string | null;
};

export type DiscountedItem = {
  title: string;
  variantTitle: string | null;
  price: number;
  compareAtPrice: number;
  discountPct: number;
  productUrl: string;
  domain: string;
};

export type NewLaunchItem = {
  title: string;
  price: number | null;
  detectedAt: string;
  productUrl: string | null;
  domain: string;
};

export type StockoutItem = {
  title: string;
  variantCountOos: number;
  productUrl: string;
  domain: string;
};

export type CompetitorReportSection = {
  domain: string;
  name: string;
  vertical: string;
  foundInDb: boolean;
  status: string;
  lastScannedAt: string | null;
  productCount: number;
  variantCount: number;
  activeSaleCount: number;
  pctCatalogOnSale: number;
  avgDiscountPct: number;
  maxDiscountPct: number;
  outOfStockVariants: number;
  firstDiscountAt: string | null;
  promoBanner: string | null;
  bannerChanges: Array<{
    detectedAt: string;
    oldValue: string | null;
    newValue: string | null;
  }>;
  eventCounts: {
    priceDrops: number;
    salesStarted: number;
    priceIncreases: number;
    newProducts: number;
    stockouts: number;
    restocks: number;
  };
  topDiscounts: DiscountedItem[];
  topNewLaunches: NewLaunchItem[];
  topStockouts: StockoutItem[];
};

export type BlackFridayIndexData = {
  generatedAt: string;
  windowStart: string;
  windowEnd: string;
  overall: {
    totalStores: number;
    activeStores: number;
    storesRunningSales: number;
    totalProducts: number;
    totalVariants: number;
    totalOnSaleProducts: number;
    pctCatalogOnSale: number;
    avgDiscountPct: number;
    maxDiscountPct: number;
    totalOosVariants: number;
    totalEvents: number;
    totalPriceDrops: number;
    totalSalesStarted: number;
    totalNewProducts: number;
    totalStockoutEvents: number;
    totalBannerChanges: number;
  };
  verticals: VerticalBenchmark[];
  timeline: DailyTimelinePoint[];
  promoBanners: PromoBannerEntry[];
  topStoresByDiscountActivity: Array<{
    domain: string;
    name: string;
    vertical: string;
    productCount: number;
    activeSaleCount: number;
    pctCatalogOnSale: number;
    avgDiscountPct: number;
    maxDiscountPct: number;
    priceDrops: number;
    salesStarted: number;
    newProducts: number;
    firstDiscountAt: string | null;
    promoBanner: string | null;
  }>;
  deepestDiscounts: DiscountedItem[];
};

export type BlackFridayReport = {
  slug: string;
  title: string;
  brandName: string;
  brandUrl: string | null;
  category: string;
  generatedAt: string;
  windowLabel: string;
  summary: {
    competitorsAnalyzed: number;
    competitorsRunningSales: number;
    totalCompetitorProducts: number;
    totalCompetitorOnSale: number;
    avgCompetitorSalePct: number;
    avgCompetitorDiscountPct: number;
    maxCompetitorDiscountPct: number;
    earliestSaleStartedAt: string | null;
    totalPriceDrops: number;
    totalNewLaunches: number;
    totalStockoutVariants: number;
  };
  competitors: CompetitorReportSection[];
  categoryBenchmark: VerticalBenchmark | null;
  allVerticalBenchmarks: VerticalBenchmark[];
  overallIndex: BlackFridayIndexData["overall"];
  takeaways: string[];
};

export function normalizeVertical(v: string | null): string {
  const s = (v || "").trim().toLowerCase();
  if (!s) return "Other";
  if (s === "apparel" || s === "footwear") return "Apparel";
  if (s === "beauty" || s === "beauty/skincare") return "Beauty/Skincare";
  if (s === "home goods") return "Home Goods";
  if (s === "wellness") return "Wellness";
  return v!.trim();
}

export function cleanStoreName(name: string, domain: string): string {
  const trimmed = (name || "").trim();
  if (!trimmed) return domain;
  // Clean known messy storefront <title> strings while keeping authenticity
  if (domain === "cutsclothing.com" && trimmed.includes("For the Sport of Business")) {
    return "Cuts Clothing";
  }
  if (domain === "skratchlabs.com" && trimmed.includes("|")) {
    return "Skratch Labs";
  }
  if (domain === "pigletinbed.com" && trimmed.endsWith(" UK")) {
    return "Piglet in Bed";
  }
  if (domain === "organicbasics.com" && trimmed.endsWith(" EU")) {
    return "Organic Basics";
  }
  return trimmed;
}

export function cleanPromoBanner(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let text = raw.replace(/\s+/g, " ").trim();
  if (!text) return null;
  // Skip accessibility/UI widget strings that are not promotional offers
  if (/^enable accessibility$/i.test(text)) return null;
  // Strip accidental CSS/Tailwind class prefix artifact captured on storefront
  text = text.replace(/^[a-z0-9\[\]:&>_\-"'\s]*>\s*/i, (m) =>
    m.includes("[") || m.includes("font-[") ? "" : m,
  );
  // Deduplicate exact repeated sentences if banner scraped twice
  text = text.replace(/\s+/g, " ").trim();
  return text.length >= 6 ? text : null;
}

export function normalizeDomainInput(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/.*$/, "")
    .replace(/:\d+$/, "");
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function etDayKey(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
  return parts;
}

function etDayLabel(dayKey: string): string {
  const [y, m, d] = dayKey.split("-").map(Number);
  const dt = new Date(Date.UTC(y!, m! - 1, d!, 12, 0, 0));
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(dt);
}

type DbStoreRow = {
  id: number;
  domain: string;
  name: string;
  vertical: string | null;
  status: string;
  last_scanned_at: string | null;
  product_count: number;
  active_sale_count: number;
  out_of_stock_count: number;
  promo_banner: string | null;
};

type DbDiscountAgg = {
  store_id: number;
  sale_products: number;
  avg_discount_pct: number;
  max_discount_pct: number;
};

type DbVariantAgg = {
  store_id: number;
  total_variants: number;
  oos_variants: number;
};

type DbEventAgg = {
  store_id: number;
  price_drops: number;
  sales_started: number;
  price_increases: number;
  new_products: number;
  stockouts: number;
  restocks: number;
  banner_changes: number;
  first_discount_at: string | null;
};

export function buildVerticalBenchmarks(db: Database.Database): {
  verticals: VerticalBenchmark[];
  overall: BlackFridayIndexData["overall"];
  storeMetricsMap: Map<
    number,
    {
      store: DbStoreRow;
      vertical: string;
      variants: number;
      oosVariants: number;
      avgDiscountPct: number;
      maxDiscountPct: number;
      events: DbEventAgg;
    }
  >;
} {
  const allStores = db
    .prepare(
      `SELECT id, domain, name, vertical, status, last_scanned_at, product_count, active_sale_count, out_of_stock_count, promo_banner
       FROM stores`,
    )
    .all() as DbStoreRow[];

  const activeStores = allStores.filter((s) => s.status === "active");

  const discRows = db
    .prepare(
      `SELECT
         store_id,
         COUNT(DISTINCT product_id) AS sale_products,
         AVG((compare_at_price - price) / compare_at_price * 100.0) AS avg_discount_pct,
         MAX((compare_at_price - price) / compare_at_price * 100.0) AS max_discount_pct
       FROM product_snapshots
       WHERE compare_at_price IS NOT NULL AND compare_at_price > price AND compare_at_price > 0
       GROUP BY store_id`,
    )
    .all() as DbDiscountAgg[];
  const discMap = new Map(discRows.map((r) => [r.store_id, r]));

  const varRows = db
    .prepare(
      `SELECT store_id, COUNT(*) AS total_variants, SUM(CASE WHEN available = 0 THEN 1 ELSE 0 END) AS oos_variants
       FROM product_snapshots
       GROUP BY store_id`,
    )
    .all() as DbVariantAgg[];
  const varMap = new Map(varRows.map((r) => [r.store_id, r]));

  const evRows = db
    .prepare(
      `SELECT store_id,
         SUM(CASE WHEN event_type = 'PRICE_DROP' THEN 1 ELSE 0 END) AS price_drops,
         SUM(CASE WHEN event_type = 'SALE_STARTED' THEN 1 ELSE 0 END) AS sales_started,
         SUM(CASE WHEN event_type = 'PRICE_INCREASE' THEN 1 ELSE 0 END) AS price_increases,
         SUM(CASE WHEN event_type = 'NEW_PRODUCT' THEN 1 ELSE 0 END) AS new_products,
         SUM(CASE WHEN event_type = 'OUT_OF_STOCK' THEN 1 ELSE 0 END) AS stockouts,
         SUM(CASE WHEN event_type = 'BACK_IN_STOCK' THEN 1 ELSE 0 END) AS restocks,
         SUM(CASE WHEN event_type = 'PROMO_BANNER_CHANGED' THEN 1 ELSE 0 END) AS banner_changes,
         MIN(CASE WHEN event_type IN ('SALE_STARTED', 'PRICE_DROP') THEN detected_at ELSE NULL END) AS first_discount_at
       FROM change_events
       GROUP BY store_id`,
    )
    .all() as DbEventAgg[];
  const evMap = new Map(evRows.map((r) => [r.store_id, r]));

  const storeMetricsMap = new Map<
    number,
    {
      store: DbStoreRow;
      vertical: string;
      variants: number;
      oosVariants: number;
      avgDiscountPct: number;
      maxDiscountPct: number;
      events: DbEventAgg;
    }
  >();

  type Acc = {
    stores: number;
    storesRunningSales: number;
    products: number;
    onSaleProducts: number;
    variants: number;
    oosVariants: number;
    avgDiscs: number[];
    maxDiscs: number[];
    priceDrops: number;
    salesStarted: number;
    newProducts: number;
    stockouts: number;
  };

  const vertMap = new Map<string, Acc>();
  let totalEventsAll = 0;
  let totalBannerChangesAll = 0;

  for (const s of activeStores) {
    const vertical = normalizeVertical(s.vertical);
    const disc = discMap.get(s.id);
    const vars = varMap.get(s.id) || {
      store_id: s.id,
      total_variants: 0,
      oos_variants: s.out_of_stock_count,
    };
    const ev = evMap.get(s.id) || {
      store_id: s.id,
      price_drops: 0,
      sales_started: 0,
      price_increases: 0,
      new_products: 0,
      stockouts: 0,
      restocks: 0,
      banner_changes: 0,
      first_discount_at: null,
    };

    const avgDisc = disc ? round1(disc.avg_discount_pct) : 0;
    const maxDisc = disc ? round1(disc.max_discount_pct) : 0;

    storeMetricsMap.set(s.id, {
      store: s,
      vertical,
      variants: vars.total_variants,
      oosVariants: vars.oos_variants,
      avgDiscountPct: avgDisc,
      maxDiscountPct: maxDisc,
      events: ev,
    });

    if (!vertMap.has(vertical)) {
      vertMap.set(vertical, {
        stores: 0,
        storesRunningSales: 0,
        products: 0,
        onSaleProducts: 0,
        variants: 0,
        oosVariants: 0,
        avgDiscs: [],
        maxDiscs: [],
        priceDrops: 0,
        salesStarted: 0,
        newProducts: 0,
        stockouts: 0,
      });
    }
    const acc = vertMap.get(vertical)!;
    acc.stores += 1;
    if (s.active_sale_count > 0 || disc) acc.storesRunningSales += 1;
    acc.products += s.product_count;
    acc.onSaleProducts += s.active_sale_count;
    acc.variants += vars.total_variants;
    acc.oosVariants += vars.oos_variants;
    if (disc) {
      acc.avgDiscs.push(disc.avg_discount_pct);
      acc.maxDiscs.push(disc.max_discount_pct);
    }
    acc.priceDrops += ev.price_drops;
    acc.salesStarted += ev.sales_started;
    acc.newProducts += ev.new_products;
    acc.stockouts += ev.stockouts;

    totalEventsAll +=
      ev.price_drops +
      ev.sales_started +
      ev.price_increases +
      ev.new_products +
      ev.stockouts +
      ev.restocks +
      ev.banner_changes;
    totalBannerChangesAll += ev.banner_changes;
  }

  const verticals: VerticalBenchmark[] = Array.from(vertMap.entries())
    .map(([vertical, a]) => ({
      vertical,
      stores: a.stores,
      storesRunningSales: a.storesRunningSales,
      products: a.products,
      onSaleProducts: a.onSaleProducts,
      pctCatalogOnSale: a.products > 0 ? round1((a.onSaleProducts / a.products) * 100) : 0,
      variants: a.variants,
      oosVariants: a.oosVariants,
      avgDiscountPct: a.avgDiscs.length
        ? round1(a.avgDiscs.reduce((x, y) => x + y, 0) / a.avgDiscs.length)
        : 0,
      maxDiscountPct: a.maxDiscs.length ? round1(Math.max(...a.maxDiscs)) : 0,
      priceDrops: a.priceDrops,
      salesStarted: a.salesStarted,
      newProducts: a.newProducts,
      stockouts: a.stockouts,
    }))
    .sort((a, b) => b.pctCatalogOnSale - a.pctCatalogOnSale);

  const allAvgDiscs = Array.from(storeMetricsMap.values())
    .filter((m) => m.avgDiscountPct > 0)
    .map((m) => m.avgDiscountPct);
  const allMaxDiscs = Array.from(storeMetricsMap.values())
    .filter((m) => m.maxDiscountPct > 0)
    .map((m) => m.maxDiscountPct);

  const totalProducts = verticals.reduce((s, v) => s + v.products, 0);
  const totalOnSaleProducts = verticals.reduce((s, v) => s + v.onSaleProducts, 0);
  const totalVariants = verticals.reduce((s, v) => s + v.variants, 0);
  const totalOosVariants = verticals.reduce((s, v) => s + v.oosVariants, 0);

  const overall: BlackFridayIndexData["overall"] = {
    totalStores: allStores.length,
    activeStores: activeStores.length,
    storesRunningSales: verticals.reduce((s, v) => s + v.storesRunningSales, 0),
    totalProducts,
    totalVariants,
    totalOnSaleProducts,
    pctCatalogOnSale: totalProducts > 0 ? round1((totalOnSaleProducts / totalProducts) * 100) : 0,
    avgDiscountPct: allAvgDiscs.length
      ? round1(allAvgDiscs.reduce((a, b) => a + b, 0) / allAvgDiscs.length)
      : 0,
    maxDiscountPct: allMaxDiscs.length ? round1(Math.max(...allMaxDiscs)) : 0,
    totalOosVariants,
    totalEvents: totalEventsAll,
    totalPriceDrops: verticals.reduce((s, v) => s + v.priceDrops, 0),
    totalSalesStarted: verticals.reduce((s, v) => s + v.salesStarted, 0),
    totalNewProducts: verticals.reduce((s, v) => s + v.newProducts, 0),
    totalStockoutEvents: verticals.reduce((s, v) => s + v.stockouts, 0),
    totalBannerChanges: totalBannerChangesAll,
  };

  return { verticals, overall, storeMetricsMap };
}

export function buildBlackFridayIndex(db: Database.Database): BlackFridayIndexData {
  const { verticals, overall, storeMetricsMap } = buildVerticalBenchmarks(db);

  const bounds = db
    .prepare("SELECT MIN(detected_at) AS min_d, MAX(detected_at) AS max_d FROM change_events")
    .get() as { min_d: string | null; max_d: string | null };

  const rawEvents = db
    .prepare("SELECT detected_at, event_type FROM change_events ORDER BY detected_at ASC")
    .all() as Array<{ detected_at: string; event_type: string }>;

  const dayMap = new Map<string, DailyTimelinePoint>();
  for (const ev of rawEvents) {
    const dk = etDayKey(ev.detected_at);
    if (!dayMap.has(dk)) {
      dayMap.set(dk, {
        date: dk,
        label: etDayLabel(dk),
        priceDrops: 0,
        salesStarted: 0,
        priceIncreases: 0,
        newProducts: 0,
        stockouts: 0,
        restocks: 0,
        bannerChanges: 0,
      });
    }
    const row = dayMap.get(dk)!;
    switch (ev.event_type) {
      case "PRICE_DROP":
        row.priceDrops += 1;
        break;
      case "SALE_STARTED":
        row.salesStarted += 1;
        break;
      case "PRICE_INCREASE":
        row.priceIncreases += 1;
        break;
      case "NEW_PRODUCT":
        row.newProducts += 1;
        break;
      case "OUT_OF_STOCK":
        row.stockouts += 1;
        break;
      case "BACK_IN_STOCK":
        row.restocks += 1;
        break;
      case "PROMO_BANNER_CHANGED":
        row.bannerChanges += 1;
        break;
    }
  }

  const timeline = Array.from(dayMap.values()).sort((a, b) => a.date.localeCompare(b.date));

  const latestBannerChanges = db
    .prepare(
      `SELECT e.store_id, e.detected_at, e.old_value, e.new_value
       FROM change_events e
       WHERE e.event_type = 'PROMO_BANNER_CHANGED'
       ORDER BY e.detected_at DESC`,
    )
    .all() as Array<{
    store_id: number;
    detected_at: string;
    old_value: string | null;
    new_value: string | null;
  }>;
  const latestBannerByStore = new Map<
    number,
    { detectedAt: string; oldValue: string | null; newValue: string | null }
  >();
  for (const b of latestBannerChanges) {
    if (!latestBannerByStore.has(b.store_id)) {
      latestBannerByStore.set(b.store_id, {
        detectedAt: b.detected_at,
        oldValue: cleanPromoBanner(b.old_value),
        newValue: cleanPromoBanner(b.new_value),
      });
    }
  }

  const promoBanners: PromoBannerEntry[] = [];
  for (const m of storeMetricsMap.values()) {
    const cleaned = cleanPromoBanner(m.store.promo_banner);
    if (!cleaned) continue;
    const ch = latestBannerByStore.get(m.store.id);
    promoBanners.push({
      domain: m.store.domain,
      name: cleanStoreName(m.store.name, m.store.domain),
      vertical: m.vertical,
      banner: cleaned,
      changedAt: ch ? ch.detectedAt : null,
      previousBanner: ch ? ch.oldValue : null,
    });
  }
  promoBanners.sort((a, b) => {
    if (a.changedAt && !b.changedAt) return -1;
    if (!a.changedAt && b.changedAt) return 1;
    if (a.changedAt && b.changedAt) return b.changedAt.localeCompare(a.changedAt);
    return a.name.localeCompare(b.name);
  });

  const topStoresByDiscountActivity = Array.from(storeMetricsMap.values())
    .map((m) => ({
      domain: m.store.domain,
      name: cleanStoreName(m.store.name, m.store.domain),
      vertical: m.vertical,
      productCount: m.store.product_count,
      activeSaleCount: m.store.active_sale_count,
      pctCatalogOnSale:
        m.store.product_count > 0
          ? round1((m.store.active_sale_count / m.store.product_count) * 100)
          : 0,
      avgDiscountPct: m.avgDiscountPct,
      maxDiscountPct: m.maxDiscountPct,
      priceDrops: m.events.price_drops,
      salesStarted: m.events.sales_started,
      newProducts: m.events.new_products,
      firstDiscountAt: m.events.first_discount_at,
      promoBanner: cleanPromoBanner(m.store.promo_banner),
    }))
    .filter((x) => x.activeSaleCount > 0 || x.priceDrops > 0)
    .sort(
      (a, b) =>
        b.priceDrops + b.salesStarted - (a.priceDrops + a.salesStarted) ||
        b.pctCatalogOnSale - a.pctCatalogOnSale,
    )
    .slice(0, 25);

  const deepestRows = db
    .prepare(
      `SELECT p.title, p.variant_title, p.price, p.compare_at_price, p.product_url, s.domain,
         ((p.compare_at_price - p.price) / p.compare_at_price * 100.0) AS disc_pct
       FROM product_snapshots p
       JOIN stores s ON s.id = p.store_id
       WHERE p.compare_at_price IS NOT NULL AND p.compare_at_price > p.price AND p.compare_at_price > 0
         AND p.available = 1
       GROUP BY s.id, p.product_id
       ORDER BY disc_pct DESC
       LIMIT 20`,
    )
    .all() as Array<{
    title: string;
    variant_title: string | null;
    price: number;
    compare_at_price: number;
    product_url: string;
    domain: string;
    disc_pct: number;
  }>;

  const deepestDiscounts: DiscountedItem[] = deepestRows.map((r) => ({
    title: r.title,
    variantTitle: r.variant_title,
    price: r.price,
    compareAtPrice: r.compare_at_price,
    discountPct: round1(r.disc_pct),
    productUrl: r.product_url,
    domain: r.domain,
  }));

  return {
    generatedAt: new Date().toISOString(),
    windowStart: bounds.min_d || new Date().toISOString(),
    windowEnd: bounds.max_d || new Date().toISOString(),
    overall,
    verticals,
    timeline,
    promoBanners,
    topStoresByDiscountActivity,
    deepestDiscounts,
  };
}

export function buildBlackFridayReport(
  db: Database.Database,
  opts: {
    slug: string;
    title: string;
    brandName: string;
    brandUrl?: string | null;
    category: string;
    competitorDomains: string[];
  },
): BlackFridayReport {
  const { verticals, overall, storeMetricsMap } = buildVerticalBenchmarks(db);
  const byDomain = new Map(
    Array.from(storeMetricsMap.values()).map((m) => [m.store.domain.toLowerCase(), m]),
  );

  const normalizedCategory = normalizeVertical(opts.category);
  const categoryBenchmark =
    verticals.find((v) => v.vertical.toLowerCase() === normalizedCategory.toLowerCase()) || null;

  const domains = Array.from(
    new Set(opts.competitorDomains.map(normalizeDomainInput).filter(Boolean)),
  ).slice(0, 5);

  const competitors: CompetitorReportSection[] = [];

  for (const domain of domains) {
    const m = byDomain.get(domain);
    if (!m) {
      competitors.push({
        domain,
        name: domain,
        vertical: normalizedCategory,
        foundInDb: false,
        status: "not_tracked",
        lastScannedAt: null,
        productCount: 0,
        variantCount: 0,
        activeSaleCount: 0,
        pctCatalogOnSale: 0,
        avgDiscountPct: 0,
        maxDiscountPct: 0,
        outOfStockVariants: 0,
        firstDiscountAt: null,
        promoBanner: null,
        bannerChanges: [],
        eventCounts: {
          priceDrops: 0,
          salesStarted: 0,
          priceIncreases: 0,
          newProducts: 0,
          stockouts: 0,
          restocks: 0,
        },
        topDiscounts: [],
        topNewLaunches: [],
        topStockouts: [],
      });
      continue;
    }

    const storeId = m.store.id;

    const topDiscountsRaw = db
      .prepare(
        `SELECT title, variant_title, price, compare_at_price, product_url,
           ((compare_at_price - price) / compare_at_price * 100.0) AS disc_pct
         FROM product_snapshots
         WHERE store_id = ? AND compare_at_price IS NOT NULL AND compare_at_price > price AND compare_at_price > 0
           AND available = 1
         GROUP BY product_id
         ORDER BY disc_pct DESC, (compare_at_price - price) DESC
         LIMIT 8`,
      )
      .all(storeId) as Array<{
      title: string;
      variant_title: string | null;
      price: number;
      compare_at_price: number;
      product_url: string;
      disc_pct: number;
    }>;

    const newLaunchesRaw = db
      .prepare(
        `SELECT product_title AS title, new_value, product_url, detected_at
         FROM change_events
         WHERE store_id = ? AND event_type = 'NEW_PRODUCT'
         GROUP BY product_title
         ORDER BY detected_at DESC
         LIMIT 8`,
      )
      .all(storeId) as Array<{
      title: string | null;
      new_value: string | null;
      product_url: string | null;
      detected_at: string;
    }>;

    const stockoutsRaw = db
      .prepare(
        `SELECT title, COUNT(*) AS oos_variants, MAX(product_url) AS product_url
         FROM product_snapshots
         WHERE store_id = ? AND available = 0
         GROUP BY product_id, title
         ORDER BY oos_variants DESC, title ASC
         LIMIT 8`,
      )
      .all(storeId) as Array<{
      title: string;
      oos_variants: number;
      product_url: string;
    }>;

    const bannerChangesRaw = db
      .prepare(
        `SELECT detected_at, old_value, new_value
         FROM change_events
         WHERE store_id = ? AND event_type = 'PROMO_BANNER_CHANGED'
         ORDER BY detected_at DESC`,
      )
      .all(storeId) as Array<{
      detected_at: string;
      old_value: string | null;
      new_value: string | null;
    }>;

    const pctOnSale =
      m.store.product_count > 0
        ? round1((m.store.active_sale_count / m.store.product_count) * 100)
        : 0;

    competitors.push({
      domain: m.store.domain,
      name: cleanStoreName(m.store.name, m.store.domain),
      vertical: m.vertical,
      foundInDb: true,
      status: m.store.status,
      lastScannedAt: m.store.last_scanned_at,
      productCount: m.store.product_count,
      variantCount: m.variants,
      activeSaleCount: m.store.active_sale_count,
      pctCatalogOnSale: pctOnSale,
      avgDiscountPct: m.avgDiscountPct,
      maxDiscountPct: m.maxDiscountPct,
      outOfStockVariants: m.oosVariants,
      firstDiscountAt: m.events.first_discount_at,
      promoBanner: cleanPromoBanner(m.store.promo_banner),
      bannerChanges: bannerChangesRaw.map((b) => ({
        detectedAt: b.detected_at,
        oldValue: cleanPromoBanner(b.old_value),
        newValue: cleanPromoBanner(b.new_value),
      })),
      eventCounts: {
        priceDrops: m.events.price_drops,
        salesStarted: m.events.sales_started,
        priceIncreases: m.events.price_increases,
        newProducts: m.events.new_products,
        stockouts: m.events.stockouts,
        restocks: m.events.restocks,
      },
      topDiscounts: topDiscountsRaw.map((r) => ({
        title: r.title,
        variantTitle: r.variant_title,
        price: r.price,
        compareAtPrice: r.compare_at_price,
        discountPct: round1(r.disc_pct),
        productUrl: r.product_url,
        domain: m.store.domain,
      })),
      topNewLaunches: newLaunchesRaw
        .filter((r) => Boolean(r.title))
        .map((r) => {
          const parsed = r.new_value ? Number(r.new_value.replace(/[^0-9.]/g, "")) : NaN;
          return {
            title: r.title!,
            price: Number.isFinite(parsed) && parsed > 0 ? parsed : null,
            detectedAt: r.detected_at,
            productUrl: r.product_url,
            domain: m.store.domain,
          };
        }),
      topStockouts: stockoutsRaw.map((r) => ({
        title: r.title,
        variantCountOos: r.oos_variants,
        productUrl: r.product_url,
        domain: m.store.domain,
      })),
    });
  }

  const tracked = competitors.filter((c) => c.foundInDb);
  const runningSales = tracked.filter((c) => c.activeSaleCount > 0 || c.avgDiscountPct > 0);
  const totalCompProducts = tracked.reduce((s, c) => s + c.productCount, 0);
  const totalCompOnSale = tracked.reduce((s, c) => s + c.activeSaleCount, 0);
  const avgCompSalePct =
    totalCompProducts > 0 ? round1((totalCompOnSale / totalCompProducts) * 100) : 0;
  const avgCompDisc = runningSales.length
    ? round1(runningSales.reduce((s, c) => s + c.avgDiscountPct, 0) / runningSales.length)
    : 0;
  const maxCompDisc = runningSales.length
    ? round1(Math.max(...runningSales.map((c) => c.maxDiscountPct)))
    : 0;
  const discountDates = tracked
    .map((c) => c.firstDiscountAt)
    .filter((d): d is string => Boolean(d))
    .sort();
  const earliestSaleStartedAt = discountDates[0] || null;
  const totalPriceDrops = tracked.reduce((s, c) => s + c.eventCounts.priceDrops, 0);
  const totalNewLaunches = tracked.reduce((s, c) => s + c.eventCounts.newProducts, 0);
  const totalStockoutVariants = tracked.reduce((s, c) => s + c.outOfStockVariants, 0);

  // Build 3-5 strictly data-backed actionable takeaways
  const takeaways: string[] = [];

  if (runningSales.length > 0) {
    const widest = [...tracked].sort((a, b) => b.pctCatalogOnSale - a.pctCatalogOnSale)[0];
    const deepest = [...runningSales].sort((a, b) => b.avgDiscountPct - a.avgDiscountPct)[0];
    const benchNote = categoryBenchmark
      ? ` vs. the ${categoryBenchmark.vertical} benchmark of ${categoryBenchmark.pctCatalogOnSale}% of catalog on sale and ${categoryBenchmark.avgDiscountPct}% average markdown`
      : "";
    takeaways.push(
      `Discount framing: ${runningSales.length} of ${tracked.length} tracked competitors are running active compare-at markdowns averaging ${avgCompDisc}% off across ${avgCompSalePct}% of combined SKUs${benchNote}. ${widest ? `${widest.name} has ${widest.pctCatalogOnSale}% of its catalog marked down` : ""}${deepest && deepest.domain !== widest?.domain ? `, while ${deepest.name} leads discount depth at ${deepest.avgDiscountPct}% avg (up to ${deepest.maxDiscountPct}% off).` : "."}`,
    );
  }

  if (earliestSaleStartedAt) {
    const earliestComp = tracked.find((c) => c.firstDiscountAt === earliestSaleStartedAt);
    const waveList = tracked
      .filter((c) => c.firstDiscountAt)
      .sort((a, b) => a.firstDiscountAt!.localeCompare(b.firstDiscountAt!))
      .map((c) => `${c.name} (${formatDateTime(c.firstDiscountAt)})`)
      .join(", ");
    takeaways.push(
      `Launch timing: Competitors did not wait for Black Friday morning — the first markdown wave hit on ${formatDateTime(earliestSaleStartedAt)}${earliestComp ? ` at ${earliestComp.name}` : ""}. Detected promo start timestamps: ${waveList}. Schedule next year's VIP/early-access drops before T-5 days to protect full-price ad efficiency.`,
    );
  }

  const holdouts = tracked.filter((c) => c.activeSaleCount === 0);
  const bannerStores = tracked.filter((c) => c.promoBanner);
  if (holdouts.length > 0 || bannerStores.length > 0) {
    const holdoutText =
      holdouts.length > 0
        ? `${holdouts.map((h) => h.name).join(", ")} held 0 compare-at markdowns on /products.json (either staying full-price or gating offers via checkout/banner codes).`
        : "";
    const bannerText =
      bannerStores.length > 0
        ? ` Storefront banners active in this set: ${bannerStores
            .slice(0, 3)
            .map((b) => `${b.name} (“${b.promoBanner}”)`)
            .join("; ")}.`
        : "";
    takeaways.push(
      `Promo mechanics & full-price holdouts: ${holdoutText}${bannerText} Compare checkout-code offers against visible strikethroughs so your paid-social landing pages match the friction level shoppers see elsewhere.`.trim(),
    );
  }

  if (totalStockoutVariants > 0) {
    const oosLeader = [...tracked].sort((a, b) => b.outOfStockVariants - a.outOfStockVariants)[0];
    takeaways.push(
      `Capture stranded demand from stockouts: Tracked rivals currently show ${totalStockoutVariants.toLocaleString()} out-of-stock variants${oosLeader ? `, led by ${oosLeader.name} (${oosLeader.outOfStockVariants.toLocaleString()} OOS variants; ${oosLeader.eventCounts.stockouts} stockout events logged this week)` : ""}. Shift Google Shopping and Meta retargeting budget toward equivalent in-stock SKUs where rivals are sold out of core sizes or colors.`,
    );
  }

  if (totalNewLaunches > 0) {
    const launchLeader = [...tracked].sort(
      (a, b) => b.eventCounts.newProducts - a.eventCounts.newProducts,
    )[0];
    takeaways.push(
      `Holiday SKU drops instead of pure discounting: Competitors launched ${totalNewLaunches} new products during Nov 20–25${launchLeader ? ` (${launchLeader.name} added ${launchLeader.eventCounts.newProducts})` : ""}. Watch those full-price gift/bundle arrivals—they protect blended gross margin even while core catalog items are discounted.`,
    );
  }

  return {
    slug: opts.slug,
    title: opts.title,
    brandName: opts.brandName,
    brandUrl: opts.brandUrl || null,
    category: normalizedCategory,
    generatedAt: new Date().toISOString(),
    windowLabel: "Nov 20 – Nov 25, 2026 (ET)",
    summary: {
      competitorsAnalyzed: tracked.length,
      competitorsRunningSales: runningSales.length,
      totalCompetitorProducts: totalCompProducts,
      totalCompetitorOnSale: totalCompOnSale,
      avgCompetitorSalePct: avgCompSalePct,
      avgCompetitorDiscountPct: avgCompDisc,
      maxCompetitorDiscountPct: maxCompDisc,
      earliestSaleStartedAt,
      totalPriceDrops,
      totalNewLaunches,
      totalStockoutVariants,
    },
    competitors,
    categoryBenchmark,
    allVerticalBenchmarks: verticals,
    overallIndex: overall,
    takeaways: takeaways.slice(0, 5),
  };
}

function esc(s: string | null | undefined): string {
  return (s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderBlackFridayReportHtml(report: BlackFridayReport): string {
  const s = report.summary;
  const bench = report.categoryBenchmark;

  const compRows = report.competitors
    .map((c) => {
      if (!c.foundInDb) {
        return `<tr>
          <td><strong>${esc(c.domain)}</strong></td>
          <td colspan="7" class="muted">Storefront not yet in historical baseline (queued for live scan).</td>
        </tr>`;
      }
      return `<tr>
        <td><strong>${esc(c.name)}</strong><div class="mono muted">${esc(c.domain)}</div></td>
        <td class="num">${c.productCount}</td>
        <td class="num"><strong>${c.pctCatalogOnSale}%</strong><div class="muted">${c.activeSaleCount} SKUs</div></td>
        <td class="num">${c.avgDiscountPct > 0 ? `${c.avgDiscountPct}%` : "0%"}</td>
        <td class="num">${c.maxDiscountPct > 0 ? `${c.maxDiscountPct}%` : "—"}</td>
        <td>${c.firstDiscountAt ? esc(formatDateTime(c.firstDiscountAt)) : '<span class="muted">No cuts logged</span>'}</td>
        <td class="num">${c.eventCounts.newProducts}</td>
        <td class="num">${c.outOfStockVariants.toLocaleString()}</td>
      </tr>`;
    })
    .join("\n");

  const verticalRows = report.allVerticalBenchmarks
    .map(
      (v) => `<tr class="${bench && v.vertical === bench.vertical ? "highlight-row" : ""}">
        <td><strong>${esc(v.vertical)}</strong></td>
        <td class="num">${v.storesRunningSales} / ${v.stores}</td>
        <td class="num">${v.pctCatalogOnSale}%</td>
        <td class="num">${v.avgDiscountPct}%</td>
        <td class="num">${v.maxDiscountPct}%</td>
        <td class="num">${v.priceDrops.toLocaleString()}</td>
        <td class="num">${v.newProducts}</td>
      </tr>`,
    )
    .join("\n");

  const compSections = report.competitors
    .filter((c) => c.foundInDb)
    .map((c) => {
      const discountsHtml =
        c.topDiscounts.length === 0
          ? `<p class="muted">No active compare-at price markdowns detected in the latest catalog snapshot.</p>`
          : `<table>
              <thead><tr><th>Product</th><th class="num">Compare-At</th><th class="num">Sale Price</th><th class="num">Discount</th></tr></thead>
              <tbody>
                ${c.topDiscounts
                  .slice(0, 6)
                  .map(
                    (d) => `<tr>
                      <td>${esc(d.title)}${d.variantTitle && d.variantTitle !== "Default Title" ? ` <span class="muted">— ${esc(d.variantTitle)}</span>` : ""}</td>
                      <td class="num muted">${esc(formatMoney(d.compareAtPrice))}</td>
                      <td class="num"><strong>${esc(formatMoney(d.price))}</strong></td>
                      <td class="num"><span class="badge badge-teal">-${d.discountPct}%</span></td>
                    </tr>`,
                  )
                  .join("")}
              </tbody>
            </table>`;

      const launchesHtml =
        c.topNewLaunches.length === 0
          ? `<p class="muted">0 new product launches detected Nov 20–25.</p>`
          : `<ul class="compact-list">${c.topNewLaunches
              .slice(0, 5)
              .map(
                (n) =>
                  `<li><strong>${esc(n.title)}</strong>${n.price ? ` (${esc(formatMoney(n.price))})` : ""} <span class="muted">· ${esc(formatDateTime(n.detectedAt))}</span></li>`,
              )
              .join("")}</ul>`;

      const stockoutsHtml =
        c.topStockouts.length === 0
          ? `<p class="muted">0 out-of-stock variants in latest snapshot.</p>`
          : `<ul class="compact-list">${c.topStockouts
              .slice(0, 5)
              .map(
                (o) =>
                  `<li><strong>${esc(o.title)}</strong> — <span class="muted">${o.variantCountOos} OOS variant(s)</span></li>`,
              )
              .join("")}</ul>`;

      const bannerBlock = c.promoBanner
        ? `<div class="banner-box"><span class="eyebrow-sm">Active Storefront Banner</span><div>“${esc(c.promoBanner)}”</div></div>`
        : `<div class="banner-box muted-box"><span class="eyebrow-sm">Storefront Banner</span><div>No sitewide promo banner detected on homepage scrape.</div></div>`;

      return `<section class="comp-card">
        <div class="comp-head">
          <div>
            <h3>${esc(c.name)}</h3>
            <div class="mono muted">${esc(c.domain)} · ${esc(c.vertical)} · Scanned ${esc(formatDateTime(c.lastScannedAt))}</div>
          </div>
          <div class="comp-pills">
            <span class="pill">${c.pctCatalogOnSale}% on sale</span>
            <span class="pill">${c.avgDiscountPct > 0 ? `${c.avgDiscountPct}% avg off` : "Full price"}</span>
            <span class="pill">${c.eventCounts.priceDrops} drops</span>
          </div>
        </div>
        ${bannerBlock}
        <h4>Deepest Active Markdowns</h4>
        ${discountsHtml}
        <div class="two-col">
          <div>
            <h4>New Launches (${c.eventCounts.newProducts})</h4>
            ${launchesHtml}
          </div>
          <div>
            <h4>Top Stockouts (${c.outOfStockVariants.toLocaleString()} OOS variants)</h4>
            ${stockoutsHtml}
          </div>
        </div>
      </section>`;
    })
    .join("\n");

  const takeawaysHtml = report.takeaways
    .map((t, idx) => `<li><span class="num-circle">${idx + 1}</span><span>${esc(t)}</span></li>`)
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(report.title)} — RivalSKU</title>
<style>
  @page { size: letter; margin: 0.55in; }
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    background: #F6F4EF;
    color: #0B1220;
    margin: 0;
    padding: 32px 16px;
    line-height: 1.5;
    font-size: 13px;
  }
  .page {
    max-width: 920px;
    margin: 0 auto;
    background: #FFFFFF;
    border: 1px solid #D9D3C7;
    border-radius: 16px;
    overflow: hidden;
  }
  .hero {
    background: #0B1220;
    color: #FFFFFF;
    padding: 36px 40px;
  }
  .eyebrow {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: #5EEAD4;
    margin: 0;
  }
  .eyebrow-sm {
    display: block;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: #0F766E;
    margin-bottom: 4px;
  }
  h1 {
    font-family: Georgia, "Times New Roman", serif;
    font-weight: 400;
    font-size: 34px;
    line-height: 1.15;
    margin: 10px 0 8px;
  }
  .sub {
    color: rgba(255,255,255,0.72);
    font-size: 14px;
    margin: 0;
  }
  .meta-bar {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    margin-top: 20px;
    font-size: 12px;
    color: rgba(255,255,255,0.65);
  }
  .content {
    padding: 32px 40px 40px;
  }
  h2 {
    font-family: Georgia, "Times New Roman", serif;
    font-weight: 400;
    font-size: 24px;
    margin: 28px 0 12px;
    padding-bottom: 6px;
    border-bottom: 1px solid #EDE9E0;
  }
  h2:first-child { margin-top: 0; }
  h3 {
    font-family: Georgia, "Times New Roman", serif;
    font-weight: 400;
    font-size: 20px;
    margin: 0 0 2px;
  }
  h4 {
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #475569;
    margin: 16px 0 8px;
  }
  .kpi-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
    margin: 16px 0 24px;
  }
  .kpi {
    background: #F6F4EF;
    border: 1px solid #EDE9E0;
    border-radius: 12px;
    padding: 14px 16px;
  }
  .kpi-label {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: #64748B;
  }
  .kpi-val {
    font-family: Georgia, "Times New Roman", serif;
    font-size: 26px;
    margin-top: 4px;
    color: #0B1220;
  }
  .kpi-sub {
    font-size: 11px;
    color: #64748B;
    margin-top: 2px;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 10px 0 16px;
    font-size: 12.5px;
  }
  th {
    text-align: left;
    font-size: 10.5px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #64748B;
    border-bottom: 2px solid #EDE9E0;
    padding: 8px 8px;
  }
  td {
    border-bottom: 1px solid #EDE9E0;
    padding: 9px 8px;
    vertical-align: top;
  }
  .num { text-align: right; font-variant-numeric: tabular-nums; }
  .mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 11.5px; }
  .muted { color: #64748B; }
  .highlight-row { background: #F0FDFA; }
  .badge {
    display: inline-block;
    padding: 2px 7px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 600;
  }
  .badge-teal { background: #CCFBF1; color: #0F766E; }
  .takeaways {
    list-style: none;
    padding: 0;
    margin: 12px 0 24px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .takeaways li {
    display: flex;
    gap: 12px;
    align-items: flex-start;
    background: #F6F4EF;
    border: 1px solid #EDE9E0;
    border-radius: 10px;
    padding: 12px 14px;
  }
  .num-circle {
    flex: none;
    width: 22px;
    height: 22px;
    border-radius: 999px;
    background: #0B1220;
    color: #2DD4BF;
    font-size: 11px;
    font-weight: 700;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    margin-top: 1px;
  }
  .comp-card {
    border: 1px solid #D9D3C7;
    border-radius: 12px;
    padding: 20px;
    margin-bottom: 18px;
    break-inside: avoid;
  }
  .comp-head {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
    flex-wrap: wrap;
    margin-bottom: 12px;
  }
  .comp-pills { display: flex; gap: 6px; flex-wrap: wrap; }
  .pill {
    background: #0B1220;
    color: #FFFFFF;
    font-size: 11px;
    font-weight: 600;
    padding: 4px 10px;
    border-radius: 999px;
  }
  .banner-box {
    background: #F0FDFA;
    border: 1px solid #99F6E4;
    border-radius: 8px;
    padding: 10px 12px;
    font-size: 12.5px;
    margin-bottom: 8px;
  }
  .muted-box {
    background: #F8FAFC;
    border-color: #E2E8F0;
    color: #64748B;
  }
  .two-col {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 18px;
  }
  .compact-list {
    margin: 0;
    padding-left: 16px;
    font-size: 12px;
  }
  .compact-list li { margin-bottom: 5px; }
  .footer {
    border-top: 1px solid #EDE9E0;
    padding: 18px 40px;
    font-size: 11.5px;
    color: #64748B;
    display: flex;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 8px;
    background: #FAF9F6;
  }
  @media print {
    body { background: #FFFFFF; padding: 0; }
    .page { border: none; border-radius: 0; max-width: none; }
    .hero { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .kpi, .pill, .badge-teal, .banner-box, .takeaways li { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head>
<body>
  <main class="page">
    <header class="hero">
      <p class="eyebrow">RivalSKU · Black Friday 2026 Competitor Report</p>
      <h1>${esc(report.title)}</h1>
      <p class="sub">Prepared for ${esc(report.brandName)}${report.brandUrl ? ` (${esc(report.brandUrl)})` : ""} · Category: ${esc(report.category)}</p>
      <div class="meta-bar">
        <span>Monitoring Window: ${esc(report.windowLabel)}</span>
        <span>Generated: ${esc(formatDateTime(report.generatedAt))}</span>
        <span>Source: Public Shopify storefront /products.json &amp; homepage scans</span>
      </div>
    </header>

    <div class="content">
      <h2>Executive Summary</h2>
      <div class="kpi-grid">
        <div class="kpi">
          <div class="kpi-label">Catalog on Sale</div>
          <div class="kpi-val">${s.avgCompetitorSalePct}%</div>
          <div class="kpi-sub">${s.totalCompetitorOnSale.toLocaleString()} of ${s.totalCompetitorProducts.toLocaleString()} SKUs</div>
        </div>
        <div class="kpi">
          <div class="kpi-label">Avg Discount Depth</div>
          <div class="kpi-val">${s.avgCompetitorDiscountPct > 0 ? `${s.avgCompetitorDiscountPct}%` : "0%"}</div>
          <div class="kpi-sub">Peak markdown: ${s.maxCompetitorDiscountPct}% off</div>
        </div>
        <div class="kpi">
          <div class="kpi-label">Price Drops Logged</div>
          <div class="kpi-val">${s.totalPriceDrops.toLocaleString()}</div>
          <div class="kpi-sub">First wave: ${s.earliestSaleStartedAt ? esc(formatDateTime(s.earliestSaleStartedAt)) : "—"}</div>
        </div>
        <div class="kpi">
          <div class="kpi-label">OOS Variants / New SKUs</div>
          <div class="kpi-val">${s.totalStockoutVariants.toLocaleString()} / ${s.totalNewLaunches}</div>
          <div class="kpi-sub">Demand gaps &amp; holiday drops</div>
        </div>
      </div>

      <h2>Actionable Takeaways</h2>
      <ul class="takeaways">
        ${takeawaysHtml}
      </ul>

      <h2>Competitor Side-by-Side</h2>
      <table>
        <thead>
          <tr>
            <th>Brand</th>
            <th class="num">SKUs</th>
            <th class="num">% On Sale</th>
            <th class="num">Avg Off</th>
            <th class="num">Max Off</th>
            <th>First Discount (ET)</th>
            <th class="num">New SKUs</th>
            <th class="num">OOS Vars</th>
          </tr>
        </thead>
        <tbody>
          ${compRows}
        </tbody>
      </table>

      <h2>Black Friday 2026 Category Benchmarks (${report.overallIndex.activeStores} Active DTC Stores)</h2>
      <p class="muted">Aggregate benchmark across ${report.overallIndex.totalProducts.toLocaleString()} Shopify products (${report.overallIndex.totalVariants.toLocaleString()} variants) and ${report.overallIndex.totalEvents.toLocaleString()} live change events tracked Nov 20–25, 2026: <strong>${report.overallIndex.pctCatalogOnSale}%</strong> of overall DTC catalog on sale, averaging <strong>${report.overallIndex.avgDiscountPct}% off</strong>.</p>
      <table>
        <thead>
          <tr>
            <th>Vertical</th>
            <th class="num">Stores w/ Sales</th>
            <th class="num">% Catalog on Sale</th>
            <th class="num">Avg Discount</th>
            <th class="num">Max Discount</th>
            <th class="num">Price Drops</th>
            <th class="num">New SKUs</th>
          </tr>
        </thead>
        <tbody>
          ${verticalRows}
        </tbody>
      </table>

      <h2>Competitor Deep Dives</h2>
      ${compSections}
    </div>

    <footer class="footer">
      <span>RivalSKU · Public Shopify Competitor Intelligence · rivalsku.com · hello@rivalsku.com</span>
      <span>100% observed storefront data — zero invented estimates.</span>
    </footer>
  </main>
</body>
</html>`;
}

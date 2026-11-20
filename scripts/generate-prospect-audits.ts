import fs from "fs";
import path from "path";
import {
  getDb,
  getStoreByDomain,
  type ChangeEvent,
  type ProductSnapshot,
  type Store,
} from "../src/lib/db";
import { normalizeDomain } from "../src/lib/monitor";
import {
  eventLabel,
  formatDateTime,
  formatMoney,
  formatPct,
} from "../src/lib/format";
import {
  COMPETITOR_COLUMNS,
  DEFAULT_PROSPECTS_CSV,
  loadProspectCsv,
} from "./lib/prospects-csv";

const AUDIT_DIR = path.resolve(
  process.env.AUDIT_DIR || path.join(process.cwd(), "audits"),
);

const MAX_SALE_ROWS = 20;
const MAX_DISCOUNT_ROWS = 10;
const MAX_STOCKOUT_ROWS = 20;
const MAX_EVENT_ROWS = 25;

type Prospect = {
  brandName: string;
  shopifyUrl: string;
  vertical: string;
  subNiche: string;
  competitorUrls: string[];
};

function slugify(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "prospect";
}

function discountPct(price: number, compare: number | null): number | null {
  if (compare === null || compare <= price || compare <= 0) return null;
  return Math.round(((compare - price) / compare) * 1000) / 10;
}

function isOnSale(row: ProductSnapshot): boolean {
  return row.compare_at_price !== null && row.compare_at_price > row.price;
}

function productLabel(row: ProductSnapshot | ChangeEvent): string {
  const title = "title" in row ? row.title : row.product_title;
  const variant = "variant_title" in row ? row.variant_title : row.variant_title;
  if (title && variant) return `${title} — ${variant}`;
  return title || variant || "Untitled";
}

function snapshotsFor(storeId: number): ProductSnapshot[] {
  return getDb()
    .prepare(
      `SELECT * FROM product_snapshots
       WHERE store_id = ?
       ORDER BY title COLLATE NOCASE ASC, variant_title COLLATE NOCASE ASC`,
    )
    .all(storeId) as ProductSnapshot[];
}

function eventsFor(storeId: number): ChangeEvent[] {
  return getDb()
    .prepare(
      `SELECT * FROM change_events
       WHERE store_id = ?
       ORDER BY detected_at DESC, id DESC`,
    )
    .all(storeId) as ChangeEvent[];
}

function mdLink(label: string, url: string | null | undefined): string {
  if (!url) return escapeMd(label);
  return `[${escapeMd(label)}](${url})`;
}

function escapeMd(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/[\[\]]/g, "\\$&");
}

function saleRows(snaps: ProductSnapshot[]): ProductSnapshot[] {
  return snaps
    .filter((s) => isOnSale(s) && s.available === 1)
    .sort((a, b) => {
      const pa = discountPct(a.price, a.compare_at_price) ?? 0;
      const pb = discountPct(b.price, b.compare_at_price) ?? 0;
      if (pb !== pa) return pb - pa;
      const da = (a.compare_at_price || 0) - a.price;
      const db = (b.compare_at_price || 0) - b.price;
      return db - da;
    });
}

function stockoutRows(snaps: ProductSnapshot[]): ProductSnapshot[] {
  return snaps.filter((s) => s.available === 0);
}

function topDiscounted(snaps: ProductSnapshot[]): ProductSnapshot[] {
  return [...snaps]
    .filter((s) => isOnSale(s))
    .sort((a, b) => {
      const pa = discountPct(a.price, a.compare_at_price) ?? 0;
      const pb = discountPct(b.price, b.compare_at_price) ?? 0;
      if (pb !== pa) return pb - pa;
      return (b.compare_at_price || 0) - b.price - ((a.compare_at_price || 0) - a.price);
    })
    .slice(0, MAX_DISCOUNT_ROWS);
}

function variantTable(rows: ProductSnapshot[], limit: number): string {
  if (rows.length === 0) return "_None in the current snapshot._\n";
  const shown = rows.slice(0, limit);
  const lines = [
    "| Product | SKU | Price | Compare at | Discount | Link |",
    "| --- | --- | ---: | ---: | ---: | --- |",
  ];
  for (const row of shown) {
    const pct = discountPct(row.price, row.compare_at_price);
    lines.push(
      `| ${escapeMd(productLabel(row))} | ${escapeMd(row.sku || "—")} | ${formatMoney(row.price)} | ${formatMoney(row.compare_at_price)} | ${pct !== null ? `${pct.toFixed(1)}%` : "—"} | ${row.product_url ? `[View](${row.product_url})` : "—"} |`,
    );
  }
  let out = lines.join("\n") + "\n";
  if (rows.length > limit) {
    out += `\n_Showing top ${limit} of ${rows.length} by discount size._\n`;
  }
  return out;
}

function eventsTable(events: ChangeEvent[]): string {
  if (events.length === 0) {
    return "_None yet — this is the Day-0 baseline snapshot. Subsequent scans will list price drops, new SKUs, sale starts, stockouts, and restocks here._\n";
  }
  const shown = events.slice(0, MAX_EVENT_ROWS);
  const lines = [
    "| When | Change | Product | From | To | Delta |",
    "| --- | --- | --- | --- | --- | ---: |",
  ];
  for (const ev of shown) {
    const title = ev.product_url
      ? mdLink(productLabel(ev), ev.product_url)
      : escapeMd(productLabel(ev));
    lines.push(
      `| ${escapeMd(formatDateTime(ev.detected_at))} | ${escapeMd(eventLabel(ev.event_type))} | ${title} | ${escapeMd(ev.old_value || "—")} | ${escapeMd(ev.new_value || "—")} | ${formatPct(ev.pct_change) || "—"} |`,
    );
  }
  let out = lines.join("\n") + "\n";
  if (events.length > MAX_EVENT_ROWS) {
    out += `\n_Showing the ${MAX_EVENT_ROWS} most recent of ${events.length} change events._\n`;
  }
  return out;
}

function statusLabel(store: Store | undefined, url: string): string {
  if (!store) return "Not in workspace";
  if (store.status === "unsupported") return "Unsupported / protected";
  if (store.status === "error") return "Scan error";
  if (!store.last_scanned_at) return "Imported, not yet scanned";
  return "Active";
}

function renderCompetitorSection(
  url: string,
  store: Store | undefined,
  snaps: ProductSnapshot[],
  events: ChangeEvent[],
): string {
  const domain = store?.domain || url;
  const name = store?.name && store.name !== domain ? store.name : domain;
  const parts: string[] = [];
  parts.push(`## ${name} (${domain})\n`);
  parts.push(`- **Storefront:** [https://${domain}](https://${domain})`);
  parts.push(`- **Status:** ${statusLabel(store, url)}`);
  if (store?.last_scanned_at) {
    parts.push(`- **Last scanned:** ${formatDateTime(store.last_scanned_at)}`);
  }
  if (store?.vertical) parts.push(`- **Vertical:** ${store.vertical}`);
  if (store?.promo_banner) {
    parts.push(`- **Promo banner:** “${store.promo_banner}”`);
  }
  parts.push("");

  if (!store) {
    parts.push(
      "_This competitor is in the starter list but is not in the RivalSKU `stores` table yet. Re-run `npm run import-prospects` to add it._\n",
    );
    return parts.join("\n");
  }
  if (store.status === "unsupported") {
    parts.push(
      "_RivalSKU could not read a public Shopify `/products.json` catalog for this storefront (blocked, headless, or protected). It is flagged and will be retried only if its status is reset to active._\n",
    );
    return parts.join("\n");
  }
  if (store.status === "error" && snaps.length === 0) {
    parts.push(
      "_The latest scan did not return a catalog snapshot for this store. It remains queued for the next scheduled run._\n",
    );
    return parts.join("\n");
  }

  const products = new Set(snaps.map((s) => s.product_id)).size;
  const sales = snaps.filter((s) => isOnSale(s));
  const oos = snaps.filter((s) => s.available === 0);
  parts.push(
    `Currently tracking **${products} products** / **${snaps.length} variants**, with **${sales.length} sale variant${sales.length === 1 ? "" : "s"}** and **${oos.length} out-of-stock variant${oos.length === 1 ? "" : "s"}**.\n`,
  );

  const inStockSales = saleRows(snaps);
  parts.push(`### Active sales (${inStockSales.length} in-stock sale variants)\n`);
  parts.push(variantTable(inStockSales, MAX_SALE_ROWS));

  parts.push(`### Top discounted SKUs\n`);
  const top = topDiscounted(snaps);
  parts.push(variantTable(top, MAX_DISCOUNT_ROWS));

  parts.push(`### Stockouts (${oos.length})\n`);
  parts.push(variantTable(stockoutRows(snaps), MAX_STOCKOUT_ROWS));

  parts.push(`### Newly detected price & SKU changes (${events.length})\n`);
  parts.push(eventsTable(events));

  return parts.join("\n");
}

function renderAudit(prospect: Prospect, generatedAt: string): string {
  const competitors = prospect.competitorUrls.map((url) => {
    let domain: string;
    try {
      domain = normalizeDomain(url);
    } catch {
      domain = url;
    }
    const store = getStoreByDomain(domain);
    const snaps = store ? snapshotsFor(store.id) : [];
    const events = store ? eventsFor(store.id) : [];
    return { url, domain, store, snaps, events };
  });

  const scanned = competitors.filter((c) => c.store && c.snaps.length > 0);
  const totalProducts = scanned.reduce(
    (n, c) => n + new Set(c.snaps.map((s) => s.product_id)).size,
    0,
  );
  const totalVariants = scanned.reduce((n, c) => n + c.snaps.length, 0);
  const totalSales = scanned.reduce(
    (n, c) => n + c.snaps.filter((s) => isOnSale(s)).length,
    0,
  );
  const totalOos = scanned.reduce(
    (n, c) => n + c.snaps.filter((s) => s.available === 0).length,
    0,
  );
  const totalEvents = competitors.reduce((n, c) => n + c.events.length, 0);
  const failed = competitors.filter(
    (c) => !c.store || c.store.status === "unsupported" || c.store.status === "error",
  );

  const niche = prospect.subNiche
    ? `${prospect.vertical} · ${prospect.subNiche}`
    : prospect.vertical;
  const countLabel =
    prospect.competitorUrls.length === 1
      ? "1 Shopify competitor"
      : `${prospect.competitorUrls.length} Shopify competitors`;

  const lines: string[] = [];
  lines.push(`# RivalSKU competitor snapshot for ${prospect.brandName}`);
  lines.push("");
  lines.push(
    `Hi ${prospect.brandName} — here’s a live look at what your ${countLabel} ${prospect.competitorUrls.length === 1 ? "is" : "are"} doing right now on their public storefronts. RivalSKU is watching them 24/7 for price cuts, new SKUs, sales, and stockouts.`,
  );
  lines.push("");
  lines.push(`- **Vertical:** ${niche || "—"}`);
  lines.push(
    `- **Your storefront:** [${prospect.shopifyUrl}](${prospect.shopifyUrl})`,
  );
  lines.push(`- **Generated:** ${generatedAt}`);
  lines.push(
    `- **Snapshot type:** ${totalEvents === 0 ? "Day-0 baseline (change events appear after the next scheduled scan)" : "Baseline plus newly detected change events"}`,
  );
  lines.push(
    `- **Coverage:** ${scanned.length} of ${competitors.length} competitor${competitors.length === 1 ? "" : "s"} scanned successfully`,
  );
  if (failed.length) {
    lines.push(
      `- **Needs attention:** ${failed.map((c) => `${c.domain} (${statusLabel(c.store, c.url)})`).join("; ")}`,
    );
  }
  lines.push("");
  lines.push("## At a glance");
  lines.push("");
  lines.push(
    "| Competitor | Status | Products | Variants | Sale variants | Out of stock | Last scanned |",
  );
  lines.push("| --- | --- | ---: | ---: | ---: | ---: | --- |");
  for (const c of competitors) {
    const name = c.store?.name && c.store.name !== c.domain ? c.store.name : c.domain;
    const products = c.snaps.length
      ? String(new Set(c.snaps.map((s) => s.product_id)).size)
      : "—";
    const variants = c.snaps.length ? String(c.snaps.length) : "—";
    const sales = c.snaps.length
      ? String(c.snaps.filter((s) => isOnSale(s)).length)
      : "—";
    const oos = c.snaps.length
      ? String(c.snaps.filter((s) => s.available === 0).length)
      : "—";
    lines.push(
      `| ${escapeMd(name)} (${c.domain}) | ${statusLabel(c.store, c.url)} | ${products} | ${variants} | ${sales} | ${oos} | ${c.store?.last_scanned_at ? escapeMd(formatDateTime(c.store.last_scanned_at)) : "—"} |`,
    );
  }
  lines.push("");
  lines.push(
    `**Combined (successful scans):** ${totalProducts} products · ${totalVariants} variants · ${totalSales} sale variants · ${totalOos} out of stock · ${totalEvents} change events.`,
  );
  lines.push("");

  for (const c of competitors) {
    lines.push(renderCompetitorSection(c.url, c.store, c.snaps, c.events));
    lines.push("");
  }

  lines.push("---");
  lines.push("");
  lines.push(
    "_Prepared by [RivalSKU](https://rivalsku.com) from public Shopify catalog data only. No Admin install, no competitor login. This file is an internal prospect snapshot — it has not been emailed or sent externally._",
  );
  lines.push("");
  return lines.join("\n");
}

function loadProspects(csvPath: string): Prospect[] {
  const rows = loadProspectCsv(csvPath);
  return rows.map((row) => ({
    brandName: row.brand_name || "Unknown brand",
    shopifyUrl: row.shopify_url || "",
    vertical: row.vertical || "",
    subNiche: row.sub_niche || "",
    competitorUrls: COMPETITOR_COLUMNS.map((col) => row[col]?.trim() || "").filter(
      Boolean,
    ),
  }));
}

function main() {
  // Touch the database so the schema exists even on a fresh machine.
  getDb();
  const csvPath = path.resolve(process.argv[2] || DEFAULT_PROSPECTS_CSV);
  const prospects = loadProspects(csvPath);
  fs.mkdirSync(AUDIT_DIR, { recursive: true });

  const generatedAt = formatDateTime(new Date().toISOString());
  const written: string[] = [];
  const usedSlugs = new Map<string, number>();

  for (const prospect of prospects) {
    let slug = slugify(prospect.brandName);
    const seen = usedSlugs.get(slug) || 0;
    usedSlugs.set(slug, seen + 1);
    if (seen > 0) slug = `${slug}-${seen + 1}`;
    const filePath = path.join(AUDIT_DIR, `${slug}.md`);
    fs.writeFileSync(filePath, renderAudit(prospect, generatedAt), "utf8");
    written.push(filePath);
    console.log(`  wrote ${filePath}`);
  }

  console.log(
    `[RivalSKU] Generated ${written.length} prospect audit(s) in ${AUDIT_DIR}`,
  );
}

try {
  main();
} catch (err) {
  console.error("[RivalSKU] generate-audits failed:", err);
  process.exit(1);
}


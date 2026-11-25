import type { Metadata } from "next";
import { Logo } from "@/components/Logo";
import { BF_SNAPSHOT } from "@/lib/bf-snapshot";
import { formatDateTime, formatMoney } from "@/lib/format";

export const metadata: Metadata = {
  title: "Black Friday 2026 DTC Discount Index",
  description:
    "Live aggregate benchmarks across 78 active Shopify DTC brands during Black Friday week 2026: % of catalog on sale, average discount depth, launch timing, and storefront promo banners.",
};

export default function BlackFridayIndexPage() {
  const { index, samples } = BF_SNAPSHOT;
  const { overall, verticals, timeline, promoBanners, topStoresByDiscountActivity, deepestDiscounts } =
    index;

  return (
    <div className="min-h-screen bg-mist-50 text-ink-900">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-ink-900/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <Logo invert />
          <nav className="hidden items-center gap-6 text-sm text-white/75 md:flex">
            <a href="/" className="hover:text-white">
              Home
            </a>
            <a href="/black-friday-report" className="hover:text-white">
              Custom Report ($49)
            </a>
            <a href="/black-friday-report#samples" className="hover:text-white">
              Samples
            </a>
            <a href="/dashboard" className="hover:text-white">
              Dashboard
            </a>
          </nav>
          <a
            href="/black-friday-report#order"
            className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-ink-900 hover:bg-accent-glow"
          >
            Get Your Report — $49
          </a>
        </div>
      </header>

      <section className="bg-ink-900 py-14 text-white">
        <div className="mx-auto max-w-6xl px-5">
          <p className="eyebrow text-accent-glow">
            Public Benchmark · Nov 20 – Nov 25, 2026 (ET)
          </p>
          <h1 className="mt-3 max-w-3xl font-serif text-4xl leading-tight sm:text-5xl">
            Black Friday 2026 DTC Discount Index
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/70">
            Observed across {overall.activeStores} active Shopify storefronts ({overall.totalProducts.toLocaleString()} products,{" "}
            {overall.totalVariants.toLocaleString()} variants, and{" "}
            {overall.totalEvents.toLocaleString()} logged change events). Every number below comes
            directly from public storefront scans.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <StatCard
              label="Stores Running Sales"
              value={`${overall.storesRunningSales} / ${overall.activeStores}`}
              sub={`${Math.round((overall.storesRunningSales / overall.activeStores) * 100)}% of tracked brands`}
            />
            <StatCard
              label="Catalog on Sale"
              value={`${overall.pctCatalogOnSale}%`}
              sub={`${overall.totalOnSaleProducts.toLocaleString()} discounted SKUs`}
              accent
            />
            <StatCard
              label="Avg Discount Depth"
              value={`${overall.avgDiscountPct}%`}
              sub={`Max observed: ${overall.maxDiscountPct}% off`}
            />
            <StatCard
              label="Price Drops Logged"
              value={overall.totalPriceDrops.toLocaleString()}
              sub={`${overall.totalSalesStarted.toLocaleString()} new sale triggers`}
            />
            <StatCard
              label="New SKUs / OOS Vars"
              value={`${overall.totalNewProducts} / ${overall.totalOosVariants.toLocaleString()}`}
              sub="Holiday launches & stockouts"
            />
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-6xl space-y-14 px-5 py-14">
        <section>
          <p className="eyebrow text-accent-dim">Category Benchmarks</p>
          <h2 className="mt-2 font-serif text-3xl">
            How each DTC vertical discounted this week
          </h2>
          <div className="mt-5 overflow-x-auto rounded-2xl border border-ink-900/10 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-ink-900/10 bg-mist-50/70 text-[11px] uppercase tracking-wider text-ink-700/65">
                <tr>
                  <th className="px-4 py-3">Vertical</th>
                  <th className="px-4 py-3 text-right">Stores w/ Sales</th>
                  <th className="px-4 py-3 text-right">Catalog on Sale</th>
                  <th className="px-4 py-3 text-right">Avg Discount</th>
                  <th className="px-4 py-3 text-right">Max Discount</th>
                  <th className="px-4 py-3 text-right">Price Drops</th>
                  <th className="px-4 py-3 text-right">New SKUs</th>
                  <th className="px-4 py-3 text-right">OOS Variants</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-900/10">
                {verticals.map((v) => (
                  <tr key={v.vertical} className="hover:bg-mist-50/50">
                    <td className="px-4 py-3 font-semibold">{v.vertical}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {v.storesRunningSales} / {v.stores}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums text-accent-dim">
                      {v.pctCatalogOnSale}%
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{v.avgDiscountPct}%</td>
                    <td className="px-4 py-3 text-right tabular-nums">{v.maxDiscountPct}%</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {v.priceDrops.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{v.newProducts}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {v.oosVariants.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <p className="eyebrow text-accent-dim">Promo Timing Timeline</p>
          <h2 className="mt-2 font-serif text-3xl">
            When brands pulled the trigger (Nov 20–25, ET)
          </h2>
          <p className="mt-2 text-sm text-ink-700/75">
            Tuesday Nov 24 delivered the single biggest surge: 2,141 price drops and 1,733
            sale-start triggers in one day, followed by 5 promo banner flips Wednesday morning.
          </p>
          <div className="mt-5 overflow-x-auto rounded-2xl border border-ink-900/10 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-ink-900/10 bg-mist-50/70 text-[11px] uppercase tracking-wider text-ink-700/65">
                <tr>
                  <th className="px-4 py-3">Date (ET)</th>
                  <th className="px-4 py-3 text-right">Price Drops</th>
                  <th className="px-4 py-3 text-right">Sales Started</th>
                  <th className="px-4 py-3 text-right">New SKUs</th>
                  <th className="px-4 py-3 text-right">Stockouts</th>
                  <th className="px-4 py-3 text-right">Restocks</th>
                  <th className="px-4 py-3 text-right">Banner Flips</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-900/10">
                {timeline.map((t) => (
                  <tr key={t.date} className="hover:bg-mist-50/50">
                    <td className="px-4 py-3 font-medium">{t.label}</td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums">
                      {t.priceDrops.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {t.salesStarted.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{t.newProducts}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{t.stockouts}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{t.restocks}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{t.bannerChanges}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <p className="eyebrow text-accent-dim">Live Storefront Offers</p>
          <h2 className="mt-2 font-serif text-3xl">
            Captured Black Friday promo banners &amp; codes
          </h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {promoBanners.slice(0, 14).map((b) => (
              <div
                key={b.domain}
                className="rounded-2xl border border-ink-900/10 bg-white p-5"
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <span className="font-serif text-xl text-ink-900">{b.name}</span>
                    <span className="ml-2 font-mono text-xs text-ink-700/60">
                      {b.domain}
                    </span>
                  </div>
                  <span className="rounded-full bg-mist-100 px-2.5 py-0.5 text-[11px] font-medium text-ink-700">
                    {b.vertical}
                  </span>
                </div>
                <p className="mt-3 rounded-xl border border-accent/30 bg-teal-50/60 px-3 py-2 text-sm text-ink-900">
                  “{b.banner}”
                </p>
                {b.changedAt && (
                  <p className="mt-2 text-xs text-ink-700/60">
                    Updated {formatDateTime(b.changedAt)}
                    {b.previousBanner ? ` (was: “${b.previousBanner.slice(0, 80)}”)` : ""}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>

        <section>
          <p className="eyebrow text-accent-dim">Most Active Discounters</p>
          <h2 className="mt-2 font-serif text-3xl">
            Top 20 stores by Black Friday week markdown activity
          </h2>
          <div className="mt-5 overflow-x-auto rounded-2xl border border-ink-900/10 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-ink-900/10 bg-mist-50/70 text-[11px] uppercase tracking-wider text-ink-700/65">
                <tr>
                  <th className="px-4 py-3">Brand</th>
                  <th className="px-4 py-3">Vertical</th>
                  <th className="px-4 py-3 text-right">% On Sale</th>
                  <th className="px-4 py-3 text-right">Avg Off</th>
                  <th className="px-4 py-3 text-right">Max Off</th>
                  <th className="px-4 py-3 text-right">Price Drops</th>
                  <th className="px-4 py-3">First Discount (ET)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-900/10">
                {topStoresByDiscountActivity.slice(0, 20).map((s) => (
                  <tr key={s.domain} className="hover:bg-mist-50/50">
                    <td className="px-4 py-3">
                      <div className="font-semibold">{s.name}</div>
                      <div className="font-mono text-xs text-ink-700/55">{s.domain}</div>
                    </td>
                    <td className="px-4 py-3 text-xs text-ink-700/75">{s.vertical}</td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums">
                      {s.pctCatalogOnSale}%
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {s.avgDiscountPct > 0 ? `${s.avgDiscountPct}%` : "—"}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {s.maxDiscountPct > 0 ? `${s.maxDiscountPct}%` : "—"}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {s.priceDrops.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-xs text-ink-700/75">
                      {s.firstDiscountAt ? formatDateTime(s.firstDiscountAt) : "Baseline sale"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <p className="eyebrow text-accent-dim">Deepest Markdowns Observed</p>
          <h2 className="mt-2 font-serif text-3xl">
            Selected single-SKU price cuts across tracked stores
          </h2>
          <div className="mt-5 overflow-x-auto rounded-2xl border border-ink-900/10 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-ink-900/10 bg-mist-50/70 text-[11px] uppercase tracking-wider text-ink-700/65">
                <tr>
                  <th className="px-4 py-3">Store</th>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3 text-right">Compare-At</th>
                  <th className="px-4 py-3 text-right">Sale Price</th>
                  <th className="px-4 py-3 text-right">Discount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-900/10">
                {deepestDiscounts.slice(0, 12).map((d, idx) => (
                  <tr key={`${d.domain}-${idx}`} className="hover:bg-mist-50/50">
                    <td className="px-4 py-3 font-mono text-xs">{d.domain}</td>
                    <td className="px-4 py-3 font-medium">{d.title}</td>
                    <td className="px-4 py-3 text-right text-ink-700/60 tabular-nums">
                      {formatMoney(d.compareAtPrice)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums">
                      {formatMoney(d.price)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-accent-dim tabular-nums">
                      -{d.discountPct}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-3xl bg-ink-900 p-8 text-white md:p-10">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div className="max-w-xl">
              <p className="eyebrow text-accent-glow">Custom Competitor Report · $49</p>
              <h2 className="mt-2 font-serif text-3xl">
                Want this exact breakdown for your 5 direct rivals?
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-white/70">
                Pick up to 5 Shopify competitors and get a custom HTML + PDF Black Friday
                2026 Competitor Report delivered today. Or explore our{" "}
                {samples.length} public sample reports first.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <a
                href="/black-friday-report#order"
                className="rounded-full bg-accent px-6 py-3 text-sm font-semibold text-ink-900 hover:bg-accent-glow"
              >
                Order Custom Report — $49
              </a>
              <a
                href="/black-friday-report#samples"
                className="rounded-full border border-white/25 px-5 py-3 text-sm font-semibold text-white hover:border-white/60"
              >
                View 3 Sample Reports
              </a>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-ink-800/80 p-4">
      <p className="text-[11px] uppercase tracking-wider text-white/45">{label}</p>
      <p className={`mt-1 font-serif text-3xl ${accent ? "text-accent" : "text-white"}`}>
        {value}
      </p>
      <p className="mt-1 text-xs text-white/55">{sub}</p>
    </div>
  );
}

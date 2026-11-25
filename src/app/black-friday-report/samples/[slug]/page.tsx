import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Logo } from "@/components/Logo";
import { BF_SNAPSHOT } from "@/lib/bf-snapshot";
import { formatDateTime, formatMoney } from "@/lib/format";

export function generateStaticParams() {
  return BF_SNAPSHOT.samples.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const sample = BF_SNAPSHOT.samples.find((s) => s.slug === slug);
  if (!sample) return { title: "Sample Report" };
  return {
    title: sample.title,
    description: sample.description,
  };
}

export default async function SampleReportPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const sample = BF_SNAPSHOT.samples.find((s) => s.slug === slug);
  if (!sample) notFound();

  const { report } = sample;
  const s = report.summary;

  return (
    <div className="min-h-screen bg-mist-50 text-ink-900">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-ink-900/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <Logo invert />
          <div className="flex flex-wrap items-center gap-3">
            <a
              href="/black-friday-report"
              className="hidden text-sm text-white/75 hover:text-white sm:inline"
            >
              All Samples
            </a>
            <a
              href={`/samples/${sample.slug}.pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-white/25 px-4 py-1.5 text-xs font-semibold text-white hover:border-white/60"
            >
              Download PDF
            </a>
            <a
              href="/black-friday-report#order"
              className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-ink-900 hover:bg-accent-glow"
            >
              Order Custom Report — $49
            </a>
          </div>
        </div>
      </header>

      <section className="bg-ink-900 py-14 text-white">
        <div className="mx-auto max-w-5xl px-5">
          <div className="flex flex-wrap items-center gap-2 text-xs text-accent-glow">
            <span className="eyebrow">Public Sample Report</span>
            <span>·</span>
            <span>{report.category}</span>
            <span>·</span>
            <span>{report.windowLabel}</span>
          </div>
          <h1 className="mt-3 font-serif text-4xl leading-tight sm:text-5xl">
            {report.title}
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-white/70">{sample.description}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href={`/samples/${sample.slug}.pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full bg-accent px-5 py-2.5 text-xs font-semibold text-ink-900 hover:bg-accent-glow"
            >
              Download Printable PDF
            </a>
            <a
              href={`/samples/${sample.slug}.html`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-white/25 px-5 py-2.5 text-xs font-semibold text-white hover:border-white/55"
            >
              Open Standalone HTML
            </a>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-4">
            <Kpi label="Catalog on Sale" value={`${s.avgCompetitorSalePct}%`} sub={`${s.totalCompetitorOnSale} / ${s.totalCompetitorProducts} SKUs`} />
            <Kpi label="Avg Discount Depth" value={`${s.avgCompetitorDiscountPct}%`} sub={`Max: ${s.maxCompetitorDiscountPct}% off`} />
            <Kpi label="Price Drops Logged" value={s.totalPriceDrops.toLocaleString()} sub={s.earliestSaleStartedAt ? `First: ${formatDateTime(s.earliestSaleStartedAt)}` : "—"} />
            <Kpi label="OOS Variants / New SKUs" value={`${s.totalStockoutVariants.toLocaleString()} / ${s.totalNewLaunches}`} sub="Demand gaps & launches" />
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-5xl space-y-12 px-5 py-12">
        <section>
          <p className="eyebrow text-accent-dim">Actionable Takeaways</p>
          <h2 className="mt-2 font-serif text-3xl">What this means for your brand</h2>
          <ol className="mt-4 space-y-3">
            {report.takeaways.map((t, i) => (
              <li
                key={i}
                className="flex gap-3 rounded-2xl border border-ink-900/10 bg-white p-5 text-sm leading-relaxed"
              >
                <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-ink-900 text-xs font-bold text-accent">
                  {i + 1}
                </span>
                <span>{t}</span>
              </li>
            ))}
          </ol>
        </section>

        <section>
          <p className="eyebrow text-accent-dim">Competitor Comparison</p>
          <h2 className="mt-2 font-serif text-3xl">Side-by-side scorecard</h2>
          <div className="mt-4 overflow-x-auto rounded-2xl border border-ink-900/10 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-ink-900/10 bg-mist-50/70 text-[11px] uppercase tracking-wider text-ink-700/65">
                <tr>
                  <th className="px-4 py-3">Brand</th>
                  <th className="px-4 py-3 text-right">SKUs</th>
                  <th className="px-4 py-3 text-right">% On Sale</th>
                  <th className="px-4 py-3 text-right">Avg Off</th>
                  <th className="px-4 py-3 text-right">Max Off</th>
                  <th className="px-4 py-3">First Discount (ET)</th>
                  <th className="px-4 py-3 text-right">New SKUs</th>
                  <th className="px-4 py-3 text-right">OOS Vars</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-900/10">
                {report.competitors.map((c) => (
                  <tr key={c.domain}>
                    <td className="px-4 py-3">
                      <div className="font-semibold">{c.name}</div>
                      <div className="font-mono text-xs text-ink-700/55">{c.domain}</div>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{c.productCount}</td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums">
                      {c.pctCatalogOnSale}%
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {c.avgDiscountPct > 0 ? `${c.avgDiscountPct}%` : "0%"}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {c.maxDiscountPct > 0 ? `${c.maxDiscountPct}%` : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-ink-700/75">
                      {c.firstDiscountAt ? formatDateTime(c.firstDiscountAt) : "No cuts logged"}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{c.eventCounts.newProducts}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {c.outOfStockVariants.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="space-y-6">
          <div>
            <p className="eyebrow text-accent-dim">Store-by-Store Deep Dives</p>
            <h2 className="mt-2 font-serif text-3xl">Markdowns, banners, launches &amp; stockouts</h2>
          </div>

          {report.competitors.map((c) => (
            <article
              key={c.domain}
              className="rounded-2xl border border-ink-900/15 bg-white p-6"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-serif text-2xl">{c.name}</h3>
                  <p className="font-mono text-xs text-ink-700/60">
                    {c.domain} · Scanned {formatDateTime(c.lastScannedAt)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 text-xs font-semibold">
                  <span className="rounded-full bg-ink-900 px-3 py-1 text-white">
                    {c.pctCatalogOnSale}% on sale
                  </span>
                  <span className="rounded-full bg-mist-100 px-3 py-1 text-ink-900">
                    {c.avgDiscountPct > 0 ? `${c.avgDiscountPct}% avg off` : "Full price"}
                  </span>
                  <span className="rounded-full bg-mist-100 px-3 py-1 text-ink-900">
                    {c.eventCounts.priceDrops} price drops
                  </span>
                </div>
              </div>

              {c.promoBanner && (
                <div className="mt-4 rounded-xl border border-accent/40 bg-teal-50/70 px-4 py-3 text-sm">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-accent-dim">
                    Captured Storefront Banner
                  </span>
                  “{c.promoBanner}”
                </div>
              )}

              {c.topDiscounts.length > 0 && (
                <div className="mt-5 overflow-x-auto">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-700/65">
                    Deepest Active Markdowns
                  </p>
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead className="border-b border-ink-900/10 text-[11px] uppercase text-ink-700/60">
                      <tr>
                        <th className="py-2 pr-3">Product</th>
                        <th className="py-2 px-3 text-right">Compare-At</th>
                        <th className="py-2 px-3 text-right">Sale</th>
                        <th className="py-2 pl-3 text-right">Discount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ink-900/10">
                      {c.topDiscounts.slice(0, 6).map((d, i) => (
                        <tr key={i}>
                          <td className="py-2 pr-3 font-medium">{d.title}</td>
                          <td className="py-2 px-3 text-right text-ink-700/60 tabular-nums">
                            {formatMoney(d.compareAtPrice)}
                          </td>
                          <td className="py-2 px-3 text-right font-semibold tabular-nums">
                            {formatMoney(d.price)}
                          </td>
                          <td className="py-2 pl-3 text-right font-semibold text-accent-dim tabular-nums">
                            -{d.discountPct}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="mt-5 grid gap-6 md:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-ink-700/65">
                    New Launches ({c.eventCounts.newProducts})
                  </p>
                  {c.topNewLaunches.length === 0 ? (
                    <p className="mt-2 text-xs text-ink-700/60">
                      0 new launches detected Nov 20–25.
                    </p>
                  ) : (
                    <ul className="mt-2 space-y-1.5 text-xs">
                      {c.topNewLaunches.slice(0, 5).map((n, i) => (
                        <li key={i}>
                          <strong>{n.title}</strong>
                          {n.price ? ` (${formatMoney(n.price)})` : ""} ·{" "}
                          <span className="text-ink-700/60">{formatDateTime(n.detectedAt)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-ink-700/65">
                    Top Stockouts ({c.outOfStockVariants.toLocaleString()} OOS variants)
                  </p>
                  {c.topStockouts.length === 0 ? (
                    <p className="mt-2 text-xs text-ink-700/60">
                      0 out-of-stock variants in latest snapshot.
                    </p>
                  ) : (
                    <ul className="mt-2 space-y-1.5 text-xs">
                      {c.topStockouts.slice(0, 5).map((o, i) => (
                        <li key={i}>
                          <strong>{o.title}</strong> —{" "}
                          <span className="text-ink-700/60">{o.variantCountOos} OOS variant(s)</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </article>
          ))}
        </section>

        <section className="rounded-3xl bg-ink-900 p-8 text-white">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="eyebrow text-accent-glow">Custom Black Friday 2026 Report · $49</p>
              <h2 className="mt-2 font-serif text-3xl">
                Get this exact report for your 5 direct competitors
              </h2>
            </div>
            <a
              href="/black-friday-report#order"
              className="rounded-full bg-accent px-6 py-3 text-sm font-semibold text-ink-900 hover:bg-accent-glow"
            >
              Order Custom Report — $49
            </a>
          </div>
        </section>
      </main>
    </div>
  );
}

function Kpi({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-ink-800/80 p-4">
      <p className="text-[11px] uppercase tracking-wider text-white/45">{label}</p>
      <p className="mt-1 font-serif text-2xl text-white">{value}</p>
      <p className="mt-1 text-xs text-white/55">{sub}</p>
    </div>
  );
}

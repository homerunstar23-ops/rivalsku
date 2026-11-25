import type { Metadata } from "next";
import { Logo } from "@/components/Logo";
import { BlackFridayOrderForm } from "@/components/bf/BlackFridayOrderForm";
import { BF_SNAPSHOT, STRIPE_PAYMENT_LINKS } from "@/lib/bf-snapshot";

export const metadata: Metadata = {
  title: "Black Friday 2026 Competitor Report ($49)",
  description:
    "One-time Black Friday 2026 competitor intelligence report for Shopify & DTC brands: exact discount depth, % of catalog on sale, sale start timing, promo banners, new launches, and stockouts across up to 5 rivals.",
};

const DELIVERABLES = [
  {
    title: "Discount depth & % of catalog on sale",
    body: "Exact average and peak compare-at markdowns per competitor, plus how much of their catalog was actually discounted vs. held at full price.",
  },
  {
    title: "Exact launch timing (ET)",
    body: "Timestamped first-discount waves and daily price-drop volume across Nov 20–25 so you know who jumped early on Friday vs. Tuesday morning.",
  },
  {
    title: "Promo banners & offer flips",
    body: "Every sitewide headline, coupon code, free-shipping threshold, and gift-with-purchase banner shift captured verbatim.",
  },
  {
    title: "New launches & stockout gaps",
    body: "Holiday SKU drops added during BFCM week and out-of-stock hero variants where you can capture stranded ad demand.",
  },
  {
    title: "78-store DTC category benchmarks",
    body: "Compare your rivals against live vertical averages across Apparel, Home Goods, Beauty/Skincare, and Wellness.",
  },
  {
    title: "3–5 actionable takeaways",
    body: "Clear merchandising, pricing, and paid-media adjustments grounded strictly in observed storefront changes.",
  },
];

export default async function BlackFridayReportPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const sp = await searchParams;
  const paidBanner = sp.order === "paid";
  const { index, samples } = BF_SNAPSHOT;

  return (
    <div className="min-h-screen bg-mist-50 text-ink-900">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-ink-900/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <Logo invert />
          <nav className="hidden items-center gap-6 text-sm text-white/75 md:flex">
            <a href="/" className="hover:text-white">
              Home
            </a>
            <a href="/black-friday-index" className="hover:text-white">
              2026 Discount Index
            </a>
            <a href="#samples" className="hover:text-white">
              Sample Reports
            </a>
            <a href="#order" className="hover:text-white">
              Order ($49)
            </a>
          </nav>
          <div className="flex items-center gap-3">
            <a
              href="/black-friday-index"
              className="text-xs text-white/70 hover:text-white md:hidden"
            >
              Index
            </a>
            <a
              href="#order"
              className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-ink-900 hover:bg-accent-glow"
            >
              Order Report — $49
            </a>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden bg-ink-900 text-white">
        <div className="grain pointer-events-none absolute inset-0 opacity-[0.07]" />
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-accent/10 blur-3xl" />
        <div className="relative mx-auto max-w-6xl px-5 pb-20 pt-14 md:pt-20">
          <p className="eyebrow text-accent-glow">
            Black Friday 2026 · One-Time Intelligence Report
          </p>
          <h1 className="mt-4 max-w-3xl font-serif text-4xl leading-[1.1] tracking-tight sm:text-5xl md:text-[3.4rem]">
            See every Black Friday move your competitors made — for $49.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-white/75 sm:text-lg">
            We scanned {index.overall.activeStores} leading Shopify DTC storefronts through
            Black Friday week (Nov 20–25, 2026) and logged{" "}
            {index.overall.totalEvents.toLocaleString()} live price, promo, new-SKU, and
            stockout events. Name up to 5 competitors and get a custom HTML + PDF report built
            from real storefront data.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="#order"
              className="rounded-full bg-accent px-6 py-3 text-sm font-semibold text-ink-900 hover:bg-accent-glow"
            >
              Order Custom Report — $49
            </a>
            <a
              href={STRIPE_PAYMENT_LINKS.bfReport}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-white/25 px-6 py-3 text-sm font-semibold text-white hover:border-white/60"
            >
              Pay $49 via Stripe →
            </a>
            <a
              href="/black-friday-index"
              className="px-3 py-3 text-sm text-white/70 hover:text-white"
            >
              Read the free 2026 DTC Discount Index →
            </a>
          </div>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-white/10 bg-ink-800/80 p-4">
              <p className="text-[11px] uppercase tracking-wider text-white/45">
                Active Stores Tracked
              </p>
              <p className="mt-1 font-serif text-3xl text-white">
                {index.overall.activeStores}
              </p>
              <p className="mt-1 text-xs text-white/55">
                {index.overall.storesRunningSales} running markdowns
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-ink-800/80 p-4">
              <p className="text-[11px] uppercase tracking-wider text-white/45">
                Catalog on Sale (Overall)
              </p>
              <p className="mt-1 font-serif text-3xl text-accent">
                {index.overall.pctCatalogOnSale}%
              </p>
              <p className="mt-1 text-xs text-white/55">
                {index.overall.totalOnSaleProducts.toLocaleString()} of{" "}
                {index.overall.totalProducts.toLocaleString()} SKUs
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-ink-800/80 p-4">
              <p className="text-[11px] uppercase tracking-wider text-white/45">
                Avg Discount Depth
              </p>
              <p className="mt-1 font-serif text-3xl text-white">
                {index.overall.avgDiscountPct}%
              </p>
              <p className="mt-1 text-xs text-white/55">
                Peak markdown observed: {index.overall.maxDiscountPct}%
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-ink-800/80 p-4">
              <p className="text-[11px] uppercase tracking-wider text-white/45">
                Live Events Logged
              </p>
              <p className="mt-1 font-serif text-3xl text-white">
                {index.overall.totalEvents.toLocaleString()}
              </p>
              <p className="mt-1 text-xs text-white/55">
                {index.overall.totalPriceDrops.toLocaleString()} price drops ·{" "}
                {index.overall.totalNewProducts} new SKUs
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-16">
        <p className="eyebrow text-accent-dim">What’s inside</p>
        <h2 className="mt-2 font-serif text-3xl sm:text-4xl">
          Everything you need for Black Friday &amp; Cyber Monday decisions.
        </h2>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {DELIVERABLES.map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-ink-900/10 bg-white p-6"
            >
              <h3 className="font-serif text-xl text-ink-900">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-700/75">
                {item.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section id="samples" className="border-y border-ink-900/10 bg-white py-16">
        <div className="mx-auto max-w-6xl px-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="eyebrow text-accent-dim">Public Sample Reports</p>
              <h2 className="mt-2 font-serif text-3xl sm:text-4xl">
                Inspect real Black Friday 2026 sample reports before you buy.
              </h2>
            </div>
            <a
              href="/black-friday-index"
              className="text-sm font-semibold text-accent-dim hover:underline"
            >
              View full 78-store Discount Index →
            </a>
          </div>

          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {samples.map((sample) => (
              <article
                key={sample.slug}
                className="flex flex-col rounded-2xl border border-ink-900/15 bg-mist-50/60 p-6"
              >
                <span className="eyebrow text-accent-dim">{sample.category}</span>
                <h3 className="mt-2 font-serif text-2xl text-ink-900">
                  {sample.title.replace(" — Black Friday 2026 Competitor Report", "")}
                </h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-700/75">
                  {sample.description}
                </p>
                <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl border border-ink-900/10 bg-white p-3 text-center">
                  <div>
                    <div className="font-serif text-lg text-ink-900">
                      {sample.report.summary.avgCompetitorSalePct}%
                    </div>
                    <div className="text-[10px] uppercase tracking-wider text-ink-700/60">
                      On sale
                    </div>
                  </div>
                  <div>
                    <div className="font-serif text-lg text-ink-900">
                      {sample.report.summary.avgCompetitorDiscountPct}%
                    </div>
                    <div className="text-[10px] uppercase tracking-wider text-ink-700/60">
                      Avg off
                    </div>
                  </div>
                  <div>
                    <div className="font-serif text-lg text-ink-900">
                      {sample.report.summary.totalPriceDrops.toLocaleString()}
                    </div>
                    <div className="text-[10px] uppercase tracking-wider text-ink-700/60">
                      Drops
                    </div>
                  </div>
                </div>
                <div className="mt-5 flex flex-wrap gap-2">
                  <a
                    href={`/black-friday-report/samples/${sample.slug}`}
                    className="rounded-full bg-ink-900 px-4 py-2 text-xs font-semibold text-white hover:bg-ink-800"
                  >
                    Read Sample
                  </a>
                  <a
                    href={`/samples/${sample.slug}.pdf`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full border border-ink-900/20 px-4 py-2 text-xs font-semibold text-ink-900 hover:border-ink-900/45"
                  >
                    PDF
                  </a>
                  <a
                    href={`/samples/${sample.slug}.html`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full border border-ink-900/20 px-4 py-2 text-xs font-semibold text-ink-900 hover:border-ink-900/45"
                  >
                    HTML
                  </a>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="order" className="mx-auto max-w-4xl px-5 py-16">
        <BlackFridayOrderForm
          paidBanner={paidBanner}
          defaultCheckoutUrl={STRIPE_PAYMENT_LINKS.bfReport}
        />
      </section>

      <footer className="border-t border-ink-900/10 bg-white py-8 text-xs text-ink-700/65">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5">
          <span>
            RivalSKU · Public Shopify Competitor Intelligence · hello@rivalsku.com
          </span>
          <div className="flex gap-5">
            <a href="/" className="hover:text-ink-900">
              Home
            </a>
            <a href="/black-friday-index" className="hover:text-ink-900">
              2026 Discount Index
            </a>
            <a href="/privacy" className="hover:text-ink-900">
              Privacy
            </a>
            <a href="/terms" className="hover:text-ink-900">
              Terms
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

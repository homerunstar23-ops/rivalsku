"use client";

import { useState } from "react";

type OrderSuccess = {
  id: number;
  brandName: string;
  brandUrl: string;
  email: string;
  category: string | null;
  competitorUrls: string[];
  checkoutUrl: string;
  message: string;
};

const CATEGORIES = [
  "Apparel",
  "Home Goods",
  "Beauty/Skincare",
  "Wellness",
  "Footwear / Accessories",
  "Food & Beverage",
  "Other DTC",
];

export function BlackFridayOrderForm({
  paidBanner,
  defaultCheckoutUrl,
}: {
  paidBanner?: boolean;
  defaultCheckoutUrl: string;
}) {
  const [brandName, setBrandName] = useState("");
  const [brandUrl, setBrandUrl] = useState("");
  const [email, setEmail] = useState("");
  const [category, setCategory] = useState("Apparel");
  const [comp1, setComp1] = useState("");
  const [comp2, setComp2] = useState("");
  const [comp3, setComp3] = useState("");
  const [comp4, setComp4] = useState("");
  const [comp5, setComp5] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [order, setOrder] = useState<OrderSuccess | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);
    const competitorUrls = [comp1, comp2, comp3, comp4, comp5]
      .map((s) => s.trim())
      .filter(Boolean);

    try {
      const res = await fetch("/api/bf-report-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand_name: brandName,
          brand_url: brandUrl,
          email,
          category,
          competitor_urls: competitorUrls,
        }),
      });
      const data = (await res.json()) as OrderSuccess & { error?: string };
      if (!res.ok) {
        setErrorMsg(data.error || "Could not submit order.");
        return;
      }
      setOrder(data);
    } catch {
      setErrorMsg("Network error submitting order. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-2xl border border-ink-900/15 bg-white p-6 shadow-lift md:p-8">
      {paidBanner && (
        <div className="mb-6 rounded-xl border border-emerald-500/30 bg-emerald-50 px-4 py-3 text-sm text-emerald-950">
          <p className="font-semibold">Payment confirmed — thank you!</p>
          <p className="mt-1 text-emerald-900/80">
            Your Black Friday 2026 Competitor Report is queued for delivery today. If you haven’t
            submitted your 5 competitor URLs yet, fill in the form below so we include the exact
            stores you want.
          </p>
        </div>
      )}

      {order ? (
        <div className="space-y-5">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-900">
            Order received · #{order.id}
          </div>
          <h3 className="font-serif text-3xl text-ink-900">
            We’ve logged your Black Friday 2026 Report for {order.brandName}.
          </h3>
          <p className="text-sm leading-relaxed text-ink-700/80">
            {order.message} We’ll deliver your custom HTML + PDF report to{" "}
            <span className="font-mono font-medium text-ink-900">{order.email}</span>.
          </p>

          <div className="rounded-xl border border-ink-900/10 bg-mist-50 p-4 text-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-700/60">
              Competitors queued ({order.competitorUrls.length})
            </p>
            <ul className="mt-2 space-y-1 font-mono text-xs text-ink-900">
              {order.competitorUrls.map((u) => (
                <li key={u}>• {u}</li>
              ))}
            </ul>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <a
              href={order.checkoutUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-full bg-accent px-6 py-3 text-sm font-semibold text-ink-900 hover:bg-accent-glow"
            >
              Complete $49 Stripe Checkout →
            </a>
            <button
              type="button"
              onClick={() => setOrder(null)}
              className="rounded-full border border-ink-900/20 px-4 py-3 text-xs font-semibold text-ink-900 hover:border-ink-900/40"
            >
              Submit another brand
            </button>
          </div>
          <p className="text-xs text-ink-700/60">
            Prefer an invoice after delivery? Just keep this confirmation — order #{order.id} is
            already saved in our queue.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink-900/10 pb-4">
            <div>
              <p className="eyebrow text-accent-dim">Custom Report Order</p>
              <h3 className="mt-1 font-serif text-2xl text-ink-900">
                Get your 5-competitor report today
              </h3>
            </div>
            <div className="text-right">
              <span className="font-serif text-3xl text-ink-900">$49</span>
              <span className="block text-[11px] uppercase tracking-wider text-ink-700/60">
                One-time · No subscription
              </span>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-ink-700/70">
              Brand name *
              <input
                type="text"
                required
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                placeholder="e.g. Cultiver"
                className="mt-1.5 h-11 w-full rounded-xl border border-ink-900/15 bg-mist-50/50 px-3 text-sm font-normal normal-case tracking-normal text-ink-900 outline-none focus:border-accent-dim focus:ring-2 focus:ring-accent/40"
              />
            </label>
            <label className="block text-xs font-semibold uppercase tracking-wider text-ink-700/70">
              Your site URL *
              <input
                type="text"
                required
                value={brandUrl}
                onChange={(e) => setBrandUrl(e.target.value)}
                placeholder="https://yourbrand.com"
                className="mt-1.5 h-11 w-full rounded-xl border border-ink-900/15 bg-mist-50/50 px-3 text-sm font-normal normal-case tracking-normal text-ink-900 outline-none focus:border-accent-dim focus:ring-2 focus:ring-accent/40"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
              />
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-ink-700/70">
              Work email *
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@yourbrand.com"
                className="mt-1.5 h-11 w-full rounded-xl border border-ink-900/15 bg-mist-50/50 px-3 text-sm font-normal normal-case tracking-normal text-ink-900 outline-none focus:border-accent-dim focus:ring-2 focus:ring-accent/40"
              />
            </label>
            <label className="block text-xs font-semibold uppercase tracking-wider text-ink-700/70">
              Category benchmark
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="mt-1.5 h-11 w-full rounded-xl border border-ink-900/15 bg-mist-50/50 px-3 text-sm font-normal normal-case tracking-normal text-ink-900 outline-none focus:border-accent-dim focus:ring-2 focus:ring-accent/40"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-700/70">
              Up to 5 Shopify competitor URLs *
            </p>
            <div className="mt-2 grid gap-2.5 sm:grid-cols-2">
              <input
                type="text"
                required
                value={comp1}
                onChange={(e) => setComp1(e.target.value)}
                placeholder="Competitor 1 (e.g. coyuchi.com) *"
                className="h-10 rounded-xl border border-ink-900/15 bg-mist-50/50 px-3 text-sm text-ink-900 outline-none focus:border-accent-dim focus:ring-2 focus:ring-accent/40"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
              />
              <input
                type="text"
                value={comp2}
                onChange={(e) => setComp2(e.target.value)}
                placeholder="Competitor 2 (optional)"
                className="h-10 rounded-xl border border-ink-900/15 bg-mist-50/50 px-3 text-sm text-ink-900 outline-none focus:border-accent-dim focus:ring-2 focus:ring-accent/40"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
              />
              <input
                type="text"
                value={comp3}
                onChange={(e) => setComp3(e.target.value)}
                placeholder="Competitor 3 (optional)"
                className="h-10 rounded-xl border border-ink-900/15 bg-mist-50/50 px-3 text-sm text-ink-900 outline-none focus:border-accent-dim focus:ring-2 focus:ring-accent/40"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
              />
              <input
                type="text"
                value={comp4}
                onChange={(e) => setComp4(e.target.value)}
                placeholder="Competitor 4 (optional)"
                className="h-10 rounded-xl border border-ink-900/15 bg-mist-50/50 px-3 text-sm text-ink-900 outline-none focus:border-accent-dim focus:ring-2 focus:ring-accent/40"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
              />
              <input
                type="text"
                value={comp5}
                onChange={(e) => setComp5(e.target.value)}
                placeholder="Competitor 5 (optional)"
                className="h-10 rounded-xl border border-ink-900/15 bg-mist-50/50 px-3 text-sm text-ink-900 outline-none focus:border-accent-dim focus:ring-2 focus:ring-accent/40 sm:col-span-2"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
              />
            </div>
          </div>

          {errorMsg && (
            <p className="rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-xs text-rose-800">
              {errorMsg}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-full bg-ink-900 px-6 py-3 text-sm font-semibold text-white hover:bg-ink-800 disabled:opacity-60"
            >
              {submitting ? "Submitting…" : "Order Custom Report — $49"}
            </button>
            <a
              href={defaultCheckoutUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-ink-900/20 px-5 py-3 text-sm font-semibold text-ink-900 hover:border-ink-900/45"
            >
              Direct Stripe Checkout →
            </a>
          </div>
          <p className="text-xs text-ink-700/60">
            Delivered as a polished HTML + PDF report built from public Shopify storefront scans.
            Zero store install or competitor login required.
          </p>
        </form>
      )}
    </div>
  );
}

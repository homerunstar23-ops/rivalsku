"use client";

import { useMemo, useState } from "react";
import { Logo } from "@/components/Logo";
import { formatMoney } from "@/lib/format";

type SampleProduct = {
  title: string;
  variantTitle: string;
  sku: string | null;
  price: number;
  compareAtPrice: number | null;
  available: boolean;
  productUrl: string;
  onSale: boolean;
};

type QuickScanOk = {
  ok: true;
  domain: string;
  name: string;
  promoBanner: string | null;
  productCount: number;
  variantCount: number;
  activeSaleCount: number;
  outOfStockCount: number;
  sampleProducts: SampleProduct[];
};

type QuickScanFail = {
  ok: false;
  unsupported: boolean;
  message: string;
  domain?: string;
  status?: number;
};

type QuickScanResponse = QuickScanOk | QuickScanFail;

const FAQS = [
  {
    q: "Do you need access to my Shopify Admin — or to a competitor’s backend?",
    a: "No. RivalSKU only reads publicly visible storefront data (the same product pages and public catalog endpoints a shopper can see). We do not require a Shopify app install, Admin API access, or any competitor login.",
  },
  {
    q: "Does this work on any Shopify store?",
    a: "It works on public Shopify storefronts we can reach, including most custom domains running Shopify. Password-protected, wholesale-gated, headless Hydrogen/Oxygen storefronts that block /products.json, or stores behind a bot checkpoint are out of scope — those show up as an “Unsupported / protected storefront,” and we won’t pretend otherwise.",
  },
  {
    q: "Is this only for my competitors, or can I watch my own store too?",
    a: "Both. Many teams add their own storefront so merchandising gets a clean, timestamped log of their public price and stock changes alongside the competitive set.",
  },
  {
    q: "How do you keep alerts from becoming noise?",
    a: "You set a minimum price-change threshold, pick event types (price, promo/compare-at, stock, new SKU), and can mute a store, collection, or SKU. Growth and Scale also support quiet hours and tighter rules. The weekly digest is there for teams that want a recap instead of a firehose.",
  },
  {
    q: "How is this different from Prisync or Visualping?",
    a: "Prisync is a broader, often heavier pricing-intelligence suite — strong for large catalogs and enterprise pricing workflows, usually at a higher price and implementation bar than a mid-market Shopify team wants for a first competitive-watch tool. Visualping (and similar page-change monitors) will tell you that a page changed, but not a structured SKU-level diff: old vs. new price, variant stock, compare-at, or a new product in the catalog. RivalSKU is narrower on purpose: Shopify / DTC storefronts, product-level change events, and alerts your merchandising or growth lead can act on the same day.",
  },
  {
    q: "Do you estimate competitor revenue or scrape private data?",
    a: "No. We track public prices, promotional signals, availability, and catalog additions/removals. We do not sell revenue estimates, customer lists, or anything behind a login.",
  },
  {
    q: "What’s in the Free Competitor Change Audit, exactly?",
    a: "A one-time snapshot of up to three public Shopify competitors you name, delivered within 24 hours to your email. It is a sample of the product, not a live monitoring subscription. Historical 14-day diffs are included when we can responsibly reconstruct them; otherwise you’ll get a live baseline clearly labeled as such.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. Plans are month-to-month. Cancel from your account (or email hello@rivalsku.com) and monitoring stops at the end of the current billing period. We’ll export your change history on request while it’s still on file.",
  },
  {
    q: "Who is this for — and who is it not for?",
    a: "It’s built for $1M–$20M Shopify / DTC teams that already have a known competitor set and feel the pain of checking those stores by hand. It is not an enterprise market-intelligence platform, not a dynamic-pricing engine, and not a tool for marketplace or non-Shopify catalog monitoring.",
  },
  {
    q: "How do I get started?",
    a: "Get a Free Competitor Change Audit, or start a 7-day trial at rivalsku.com. Questions: hello@rivalsku.com.",
  },
];

const PAINS = [
  {
    title: "Weekend flash sales you see on Monday",
    body: "A rival drops 20% off at 7 p.m. Friday. Your prospecting ads keep sending traffic to a full-price PDP all weekend. By the time someone notices, you’ve spent the budget and lost the conversion.",
  },
  {
    title: "Price cuts and quiet hikes",
    body: "A competitor undercuts your hero SKU — or quietly raises price after a cost increase you could have followed. Without a timestamped diff, merchandising is guessing.",
  },
  {
    title: "Bundle and compare-at-price games",
    body: "“Free gift with purchase,” a new bundle SKU, or a compare-at price that makes their product look cheaper than yours. These don’t show up in a casual homepage visit.",
  },
  {
    title: "Stockouts and restocks on hero variants",
    body: "When a competitor sells out of a core size or color, you have a short window to win the demand. When they restock, your merchandising and ads should already be ready — not finding out a week later.",
  },
  {
    title: "New SKU and collection drops",
    body: "A new product, colorway, or landing-page collection can steal category share before your team has a response, a price, or a creative brief.",
  },
];

export function LandingPage() {
  const [scanUrl, setScanUrl] = useState("allbirds.com");
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<QuickScanResponse | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [checkoutMsg, setCheckoutMsg] = useState<string | null>(null);
  const [checkingOut, setCheckingOut] = useState<string | null>(null);

  const [lead, setLead] = useState({
    work_email: "",
    brand_url: "",
    competitor1: "",
    competitor2: "",
    competitor3: "",
    role: "",
  });
  const [leadState, setLeadState] = useState<"idle" | "saving" | "done" | "error">("idle");
  const [leadMsg, setLeadMsg] = useState("");

  async function runScan(e?: React.FormEvent) {
    e?.preventDefault();
    const url = scanUrl.trim();
    if (!url) return;
    setScanning(true);
    setScanResult(null);
    try {
      const res = await fetch(`/api/quick-scan?url=${encodeURIComponent(url)}`);
      const data = (await res.json()) as QuickScanResponse;
      setScanResult(data);
    } catch {
      setScanResult({
        ok: false,
        unsupported: false,
        message: "Could not reach the scanner. Try again in a moment.",
      });
    } finally {
      setScanning(false);
    }
  }

  async function startCheckout(plan: string) {
    setCheckingOut(plan);
    setCheckoutMsg(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = (await res.json()) as {
        url?: string;
        error?: string;
        configured?: boolean;
      };
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setCheckoutMsg(
        data.error ||
          "Stripe is not configured yet. Add API keys from .env.example to enable checkout.",
      );
    } catch {
      setCheckoutMsg("Could not start checkout. Please try again.");
    } finally {
      setCheckingOut(null);
    }
  }

  async function submitLead(e: React.FormEvent) {
    e.preventDefault();
    setLeadState("saving");
    setLeadMsg("");
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          work_email: lead.work_email,
          brand_url: lead.brand_url,
          competitor_urls: [lead.competitor1, lead.competitor2, lead.competitor3],
          role: lead.role || undefined,
        }),
      });
      const data = (await res.json()) as { error?: string; message?: string };
      if (!res.ok) {
        setLeadState("error");
        setLeadMsg(data.error || "Could not submit the form.");
        return;
      }
      setLeadState("done");
      setLeadMsg(
        data.message ||
          "Audit request received. We’ll send a snapshot to your inbox within 24 hours.",
      );
    } catch {
      setLeadState("error");
      setLeadMsg("Could not submit the form. Please try again.");
    }
  }

  const year = useMemo(() => new Date().getFullYear(), []);

  return (
    <div className="min-h-screen bg-mist-50 text-ink-900">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-ink-900/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <Logo invert />
          <nav className="hidden items-center gap-7 text-sm text-white/75 md:flex">
            <a href="#product" className="hover:text-white">
              Product
            </a>
            <a href="#how-it-works" className="hover:text-white">
              How it works
            </a>
            <a href="#pricing" className="hover:text-white">
              Pricing
            </a>
            <a href="#faq" className="hover:text-white">
              FAQ
            </a>
            <a href="#audit" className="hover:text-white">
              Get a Free Audit
            </a>
          </nav>
          <div className="flex items-center gap-3">
            <a
              href="/dashboard"
              className="hidden text-sm text-white/70 hover:text-white sm:inline"
            >
              Dashboard
            </a>
            <a
              href="#pricing"
              className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-ink-900 hover:bg-accent-glow"
            >
              Start 7-Day Trial
            </a>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden bg-ink-900 text-white">
        <div className="grain pointer-events-none absolute inset-0 opacity-[0.07]" />
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-accent/10 blur-3xl" />
        <div className="relative mx-auto max-w-6xl px-5 pb-24 pt-16 md:pt-24">
          <p className="eyebrow text-accent-glow">Shopify / DTC competitor monitoring</p>
          <h1 className="mt-5 max-w-3xl font-serif text-4xl leading-[1.1] tracking-tight sm:text-5xl md:text-[3.6rem]">
            Your competitors just changed price. Did you catch it in time?
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/70">
            RivalSKU watches public Shopify storefronts 24/7 and alerts your team
            the moment a rival cuts a price, launches a promo, restocks a hero
            SKU, or drops a new product. No store install. No competitor login.
            Just the changes that actually move your margin and ROAS.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="#audit"
              className="rounded-full bg-accent px-5 py-3 text-sm font-semibold text-ink-900 hover:bg-accent-glow"
            >
              Get a Free Competitor Change Audit
            </a>
            <a
              href="#pricing"
              className="rounded-full border border-white/20 px-5 py-3 text-sm font-semibold text-white hover:border-white/50"
            >
              Start 7-Day Trial
            </a>
            <a
              href="#sample-alert"
              className="px-2 py-3 text-sm text-white/60 hover:text-white"
            >
              See Sample Alert
            </a>
          </div>

          <ul className="mt-10 flex flex-wrap gap-2 text-xs text-white/65">
            {[
              "Monitors public Shopify storefronts 24/7",
              "No store install or competitor login required",
              "Slack and email alerts when something actually changes",
              "Built for $1M–$20M Shopify / DTC teams",
            ].map((chip) => (
              <li
                key={chip}
                className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5"
              >
                {chip}
              </li>
            ))}
          </ul>

          <div
            id="product"
            className="mt-14 rounded-2xl border border-white/10 bg-ink-800/80 p-5 shadow-lift md:p-7"
          >
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="eyebrow text-accent-glow">Live Store Spy · Instant Scan</p>
                <h2 className="mt-2 font-serif text-2xl">
                  Paste any Shopify storefront. See the catalog in seconds.
                </h2>
              </div>
              <p className="max-w-sm text-xs leading-relaxed text-white/45">
                Works by reading the same public product pages and Shopify{" "}
                <span className="font-mono">/products.json</span> catalog your
                customers already see — then diffing it on a schedule you control.
              </p>
            </div>

            <form
              onSubmit={runScan}
              className="mt-5 flex flex-col gap-3 sm:flex-row"
            >
              <input
                value={scanUrl}
                onChange={(e) => setScanUrl(e.target.value)}
                placeholder="allbirds.com or brooklinen.com"
                className="h-12 flex-1 rounded-xl border border-white/15 bg-ink-900 px-4 text-white placeholder:text-white/35 outline-none ring-accent focus:ring-2"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
              />
              <button
                type="submit"
                disabled={scanning}
                className="h-12 rounded-xl bg-accent px-6 text-sm font-semibold text-ink-900 hover:bg-accent-glow disabled:opacity-60"
              >
                {scanning ? "Scanning…" : "Scan"}
              </button>
            </form>
            <p className="mt-2 text-xs text-white/35">
              Try allbirds.com, tentree.com, or colourpop.com
            </p>

            {scanResult && !scanResult.ok && (
              <div
                className={`mt-5 rounded-xl border px-4 py-4 text-sm ${
                  scanResult.unsupported
                    ? "border-amber-400/30 bg-amber-400/10 text-amber-100"
                    : "border-rose-400/30 bg-rose-400/10 text-rose-100"
                }`}
              >
                {scanResult.unsupported ? (
                  <>
                    <p className="font-semibold">Unsupported / protected storefront</p>
                    <p className="mt-1 text-amber-100/80">
                      This store doesn’t expose a public Shopify catalog we can
                      read — common with headless Hydrogen/Oxygen storefronts,
                      password-protected shops, or bot checkpoints (HTTP{" "}
                      {scanResult.status || "403/404/429"}). RivalSKU only
                      monitors public storefronts.
                    </p>
                  </>
                ) : (
                  <p>{scanResult.message}</p>
                )}
              </div>
            )}

            {scanResult && scanResult.ok && (
              <div className="mt-6">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-serif text-xl">
                    {scanResult.name}{" "}
                    <span className="font-sans text-sm text-white/45">
                      {scanResult.domain}
                    </span>
                  </p>
                  {scanResult.promoBanner && (
                    <p className="rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs text-accent-glow">
                      {scanResult.promoBanner}
                    </p>
                  )}
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                  <Stat label="Products" value={String(scanResult.productCount)} />
                  <Stat
                    label="Active discounts"
                    value={String(scanResult.activeSaleCount)}
                  />
                  <Stat
                    label="Out-of-stock SKUs"
                    value={String(scanResult.outOfStockCount)}
                  />
                  <Stat
                    label="Variants scanned"
                    value={String(scanResult.variantCount)}
                  />
                </dl>
                <div className="mt-4 overflow-hidden rounded-xl border border-white/10">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-white/5 text-xs uppercase tracking-wider text-white/45">
                      <tr>
                        <th className="px-4 py-2 font-medium">Product</th>
                        <th className="px-4 py-2 font-medium">Price</th>
                        <th className="hidden px-4 py-2 font-medium sm:table-cell">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {scanResult.sampleProducts.map((p) => (
                        <tr
                          key={p.productUrl + p.title}
                          className="border-t border-white/10"
                        >
                          <td className="px-4 py-2.5">
                            <a
                              href={p.productUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="hover:text-accent-glow"
                            >
                              {p.title}
                            </a>
                            {p.variantTitle && (
                              <span className="block text-xs text-white/40">
                                {p.variantTitle}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 font-mono text-xs">
                            {p.onSale && p.compareAtPrice ? (
                              <>
                                <span className="mr-2 text-white/40 line-through">
                                  {formatMoney(p.compareAtPrice)}
                                </span>
                                <span className="text-accent-glow">
                                  {formatMoney(p.price)}
                                </span>
                              </>
                            ) : (
                              formatMoney(p.price)
                            )}
                          </td>
                          <td className="hidden px-4 py-2.5 sm:table-cell">
                            {!p.available ? (
                              <span className="text-rose-300">Out of stock</span>
                            ) : p.onSale ? (
                              <span className="text-accent-glow">On sale</span>
                            ) : (
                              <span className="text-white/45">In stock</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-20">
        <p className="eyebrow text-accent-dim">The cost of checking tabs by hand</p>
        <h2 className="mt-3 max-w-3xl font-serif text-4xl tracking-tight">
          Manual competitor checks miss the moves that hit margin and ROAS.
        </h2>
        <p className="mt-5 max-w-2xl text-ink-700/80 leading-relaxed">
          Most mid-market Shopify teams still “keep an eye on” three to ten rival
          stores by visiting them on Monday, screenshotting a sale page, or asking
          an intern to update a spreadsheet. That workflow breaks the moment a
          competitor moves on a Saturday night.
        </p>
        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {PAINS.map((p, i) => (
            <article
              key={p.title}
              className={`rounded-2xl border border-ink-900/10 bg-white p-6 ${
                i === 4 ? "md:col-span-2 lg:col-span-1" : ""
              }`}
            >
              <span className="font-mono text-xs text-accent-dim">
                0{i + 1}
              </span>
              <h3 className="mt-3 font-serif text-xl leading-snug">{p.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-ink-700/75">
                {p.body}
              </p>
            </article>
          ))}
        </div>
        <p className="mt-8 max-w-2xl text-sm leading-relaxed text-ink-700/80">
          Every one of those changes is public. The problem isn’t access — it’s
          that nobody on your team can watch ten storefronts around the clock.
          RivalSKU can.
        </p>
      </section>

      <section id="how-it-works" className="bg-white py-20">
        <div className="mx-auto max-w-6xl px-5">
          <h2 className="font-serif text-4xl tracking-tight">
            Three steps. Then the feed runs itself.
          </h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {[
              {
                step: "01",
                title: "Add the stores you already watch",
                body: "Paste 3–25 public Shopify storefront URLs (yours plus the competitors you already check by hand). No Shopify Admin access, no pixel, no app install in their store — or yours.",
              },
              {
                step: "02",
                title: "RivalSKU diffs the catalog 24/7",
                body: "We check public product pages and catalog data on your plan’s schedule: prices, compare-at prices, promo badges, availability by variant, and new or removed SKUs.",
              },
              {
                step: "03",
                title: "Get only the alerts that matter",
                body: "When something meaningful changes, your team gets a Slack message, an email, or a weekly digest. Set thresholds so a $0.01 rounding change doesn’t wake anyone up.",
              },
            ].map((s) => (
              <article key={s.step} className="relative border-t border-ink-900/15 pt-6">
                <p className="font-mono text-sm text-accent-dim">{s.step}</p>
                <h3 className="mt-3 font-serif text-2xl">{s.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-ink-700/75">
                  {s.body}
                </p>
              </article>
            ))}
          </div>
          <a
            href="#sample-alert"
            className="mt-10 inline-block text-sm font-semibold text-accent-dim hover:text-ink-900"
          >
            See Sample Alert →
          </a>
        </div>
      </section>

      <section id="sample-alert" className="bg-ink-900 py-20 text-white">
        <div className="mx-auto max-w-6xl px-5">
          <p className="eyebrow text-accent-glow">Illustrative example only</p>
          <h2 className="mt-3 font-serif text-4xl tracking-tight">
            The alert your merchandising lead actually wants.
          </h2>
          <p className="mt-4 max-w-2xl text-sm text-white/60">
            Fictional competitor and figures, for layout and tone. Not a real
            customer alert or a claim about a live store. Real alerts use the
            competitor stores and thresholds you set.
          </p>
          <div className="alert-grid mt-10 max-w-2xl rounded-2xl border border-white/10 bg-ink-800 p-6 font-mono text-[13px] leading-relaxed shadow-lift">
            <p className="text-accent-glow">RivalSKU  ·  Competitor change alert</p>
            <p className="mt-1 text-white">Trailforge Outfitters  ·  trailforge.example</p>
            <p className="text-white/45">
              Detected  Sat, Nov 15, 2026  ·  6:14 AM ET
              <br />
              Check window: last 60 minutes
            </p>
            <div className="mt-5 space-y-4 text-white/85">
              <p>
                <span className="text-accent-glow">PRICE DROP</span>
                <br />
                Trail Pant — Slim  ·  SKU TF-PANT-SLIM-32
                <br />
                $128.00  →  $98.00{" "}
                <span className="text-accent-glow">(−23.4%)</span>
                <br />
                Compare-at now $128  ·  badge: “23% off”
              </p>
              <p>
                <span className="text-amber-300">PROMO</span>
                <br />
                Sitewide banner added: “Weekend Trail Sale — ends Sunday 11:59
                p.m. ET”
              </p>
              <p>
                <span className="text-sky-300">RESTOCK</span>
                <br />
                Trail Pant — Slim / Olive / 32
                <br />
                Was Out of Stock (11 days)  →  In Stock (84 units shown)
              </p>
              <p>
                <span className="text-white">NEW SKU</span>
                <br />
                Trailforge Packable Shell  ·  $189
                <br />
                4 colorways published  ·  added to /collections/new-arrivals
              </p>
            </div>
            <p className="mt-6 text-xs text-white/35">
              Open the full diff → &nbsp;&nbsp; Snooze this SKU &nbsp;&nbsp; Adjust
              alert rules
            </p>
          </div>
          <p className="mt-4 max-w-2xl text-xs text-white/45">
            This is a sample of the alert your merchandising or growth lead would
            get in Slack or email.
          </p>
        </div>
      </section>

      <section id="pricing" className="mx-auto max-w-6xl px-5 py-20">
        <h2 className="font-serif text-4xl tracking-tight">
          Start with the stores you already watch. Upgrade when the list grows.
        </h2>
        <p className="mt-4 max-w-2xl text-ink-700/80">
          Every plan includes public-storefront monitoring, change history, and a
          7-day trial. No annual lock-in required. Cancel anytime.
        </p>
        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          <PriceCard
            name="Starter"
            price="$49"
            audience="For founders and lean teams tracking a short rival set."
            features={[
              "3 competitor storefronts",
              "Checks every 6 hours",
              "Email alerts",
              "Weekly digest",
              "14-day change history",
              "Basic noise controls (price-change threshold)",
            ]}
            value="Less than one hour of manual checking — and it still runs on weekends."
            cta="Start 7-Day Trial"
            loading={checkingOut === "starter"}
            onCta={() => startCheckout("starter")}
            secondary
          />
          <PriceCard
            name="Growth"
            price="$99"
            popular
            audience="For Heads of E-Commerce and merchandising teams who need to act on changes the same day."
            features={[
              "10 competitor storefronts",
              "Checks every hour",
              "Email + Slack alerts",
              "Weekly digest",
              "90-day change history",
              "CSV export",
              "Alert rules by store, collection, or SKU",
              "Price, promo, stock, and new-SKU event types",
            ]}
            value="One missed weekend promo can waste more ad spend than a year of Growth. $99 is the cost of not noticing."
            cta="Start 7-Day Trial"
            loading={checkingOut === "growth"}
            onCta={() => startCheckout("growth")}
          />
          <PriceCard
            name="Scale"
            price="$199"
            audience="For growth and merchandising teams watching a full competitive set across a category."
            features={[
              "25 competitor storefronts",
              "Checks every 15 minutes",
              "Email + Slack alerts",
              "Weekly (or daily) digest",
              "12-month change history",
              "CSV export and full diff log",
              "Advanced alert rules and mute windows",
              "Shared workspace (up to 5 seats)",
              "Priority support via hello@rivalsku.com",
            ]}
            value="Category coverage at a mid-market price — without an enterprise competitive-intelligence contract."
            cta="Start 7-Day Trial"
            loading={checkingOut === "scale"}
            onCta={() => startCheckout("scale")}
          />
        </div>
        {checkoutMsg && (
          <div className="mt-6 rounded-xl border border-ink-900/10 bg-white px-5 py-4 text-sm text-ink-700">
            {checkoutMsg}
          </div>
        )}
        <ul className="mt-8 space-y-1 text-xs leading-relaxed text-ink-700/60">
          <li>All prices are USD, billed monthly. Annual billing can be added later if offered.</li>
          <li>“Competitor storefront” = one public Shopify domain you add to a plan.</li>
          <li>
            Monitoring covers publicly visible product data only. We never ask for
            Shopify Admin access or a competitor login.
          </li>
          <li>
            7-day trial includes Growth-plan features so you can judge alert
            quality before you pick a tier.
          </li>
          <li>
            Need more than 25 stores or a custom check window? Email{" "}
            <a href="mailto:hello@rivalsku.com" className="underline">
              hello@rivalsku.com
            </a>
            .
          </li>
        </ul>
      </section>

      <section id="audit" className="bg-ink-900 py-20 text-white">
        <div className="mx-auto grid max-w-6xl gap-12 px-5 lg:grid-cols-2">
          <div>
            <p className="eyebrow text-accent-glow">
              See it on your category before you start a trial
            </p>
            <h2 className="mt-3 font-serif text-4xl tracking-tight">
              Get a Free Competitor Change Audit
            </h2>
            <p className="mt-4 text-white/70 leading-relaxed">
              Send us your store and three competitor Shopify URLs. Within 24
              hours we’ll send a snapshot of their public pricing, promos, and SKU
              catalog — including what changed over a recent 14-day window when we
              can rebuild it from live data, plus a current catalog baseline.
            </p>
            <ul className="mt-6 space-y-3 text-sm text-white/75">
              {[
                "A current snapshot of up to 3 competitor catalogs (prices, compare-at/promo signals, in-stock vs. out-of-stock on tracked variants, new SKUs we can see on the live storefront)",
                "A 14-day change view where historical diffs are available; otherwise a clearly labeled live baseline you can compare against next week",
                "A one-page summary of the highest-impact moves (biggest price cuts, active promos, stock gaps, new products)",
                "A sample of what the same stores would look like as RivalSKU alerts",
              ].map((item) => (
                <li key={item} className="flex gap-3">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <form
            onSubmit={submitLead}
            className="rounded-2xl border border-white/10 bg-ink-800 p-6 shadow-lift"
          >
            <h3 className="mb-4 font-serif text-2xl">Request a Free 7-Day Competitor Audit</h3>
            <Field
              label="Your work email"
              type="email"
              required
              value={lead.work_email}
              onChange={(v) => setLead({ ...lead, work_email: v })}
              placeholder="you@yourbrand.com"
            />
            <Field
              label="Your Shopify store URL"
              required
              value={lead.brand_url}
              onChange={(v) => setLead({ ...lead, brand_url: v })}
              placeholder="yourbrand.com"
            />
            <Field
              label="Competitor store URL #1"
              required
              value={lead.competitor1}
              onChange={(v) => setLead({ ...lead, competitor1: v })}
              placeholder="competitor.com"
            />
            <Field
              label="Competitor store URL #2"
              value={lead.competitor2}
              onChange={(v) => setLead({ ...lead, competitor2: v })}
              placeholder="another-rival.com"
            />
            <Field
              label="Competitor store URL #3"
              hint="Optional but recommended"
              value={lead.competitor3}
              onChange={(v) => setLead({ ...lead, competitor3: v })}
            />
            <label className="mt-4 block text-xs uppercase tracking-wider text-white/45">
              Your role (optional)
              <select
                value={lead.role}
                onChange={(e) => setLead({ ...lead, role: e.target.value })}
                className="mt-1 h-11 w-full rounded-xl border border-white/15 bg-ink-900 px-3 text-sm text-white outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="">Select…</option>
                <option>Founder</option>
                <option>Head of E-Commerce</option>
                <option>Merchandising</option>
                <option>Growth</option>
                <option>Other</option>
              </select>
            </label>
            <p className="mt-4 text-xs leading-relaxed text-white/45">
              We’ll only use this to run your audit and follow up about RivalSKU.
              No store install. Public storefront data only. Typical turnaround:
              within 24 hours.
            </p>
            <button
              type="submit"
              disabled={leadState === "saving" || leadState === "done"}
              className="mt-5 w-full rounded-xl bg-accent py-3 text-sm font-semibold text-ink-900 hover:bg-accent-glow disabled:opacity-60"
            >
              {leadState === "saving"
                ? "Sending…"
                : leadState === "done"
                  ? "Request received"
                  : "Send My Free Audit"}
            </button>
            <p className="mt-3 text-center text-xs text-white/40">
              If a URL isn’t a Shopify storefront, we’ll tell you in the reply and
              won’t force a fit.
            </p>
            {leadMsg && (
              <p
                className={`mt-3 text-sm ${
                  leadState === "error" ? "text-rose-300" : "text-accent-glow"
                }`}
              >
                {leadMsg}
              </p>
            )}
          </form>
        </div>
      </section>

      <section id="faq" className="mx-auto max-w-3xl px-5 py-20">
        <h2 className="font-serif text-4xl tracking-tight">FAQ</h2>
        <div className="mt-8 divide-y divide-ink-900/10 border-y border-ink-900/10">
          {FAQS.map((item, i) => {
            const open = openFaq === i;
            return (
              <div key={item.q}>
                <button
                  type="button"
                  onClick={() => setOpenFaq(open ? null : i)}
                  className="flex w-full items-start justify-between gap-6 py-5 text-left"
                  aria-expanded={open}
                >
                  <span className="font-medium leading-snug">{item.q}</span>
                  <span className="mt-0.5 font-mono text-sm text-accent-dim">
                    {open ? "–" : "+"}
                  </span>
                </button>
                {open && (
                  <p className="pb-5 text-sm leading-relaxed text-ink-700/75">
                    {item.a}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="bg-ink-900 py-16 text-center text-white">
        <h2 className="font-serif text-4xl tracking-tight">
          Stop finding out on Monday.
        </h2>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <a
            href="#audit"
            className="rounded-full bg-accent px-5 py-3 text-sm font-semibold text-ink-900 hover:bg-accent-glow"
          >
            Get a Free Competitor Change Audit
          </a>
          <a
            href="#pricing"
            className="rounded-full border border-white/20 px-5 py-3 text-sm font-semibold hover:border-white/50"
          >
            Start 7-Day Trial
          </a>
        </div>
      </section>

      <footer className="border-t border-ink-900/10 bg-mist-50">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-8 text-sm text-ink-700/70 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} RivalSKU · rivalsku.com ·{" "}
            <a href="mailto:hello@rivalsku.com" className="hover:text-ink-900">
              hello@rivalsku.com
            </a>
          </p>
          <div className="flex gap-5">
            <a href="/privacy" className="hover:text-ink-900">
              Privacy
            </a>
            <a href="/terms" className="hover:text-ink-900">
              Terms
            </a>
            <a href="/dashboard" className="hover:text-ink-900">
              Dashboard
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-ink-900/60 px-4 py-3">
      <dt className="text-[11px] uppercase tracking-wider text-white/40">
        {label}
      </dt>
      <dd className="mt-1 font-serif text-2xl text-white">{value}</dd>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required,
  placeholder,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
  hint?: string;
}) {
  return (
    <label className="mt-3 block text-xs uppercase tracking-wider text-white/45 first:mt-0">
      {label}
      {hint && <span className="ml-2 normal-case tracking-normal text-white/30">({hint})</span>}
      <input
        type={type}
        required={required}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 h-11 w-full rounded-xl border border-white/15 bg-ink-900 px-3 text-sm normal-case tracking-normal text-white placeholder:text-white/25 outline-none focus:ring-2 focus:ring-accent"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
      />
    </label>
  );
}

function PriceCard({
  name,
  price,
  audience,
  features,
  value,
  cta,
  popular,
  secondary,
  loading,
  onCta,
}: {
  name: string;
  price: string;
  audience: string;
  features: string[];
  value: string;
  cta: string;
  popular?: boolean;
  secondary?: boolean;
  loading?: boolean;
  onCta: () => void;
}) {
  return (
    <article
      className={`flex flex-col rounded-2xl border p-7 ${
        popular
          ? "border-ink-900 bg-ink-900 text-white shadow-lift"
          : "border-ink-900/10 bg-white"
      }`}
    >
      <div className="flex items-center justify-between">
        <h3 className="font-serif text-2xl">{name}</h3>
        {popular && (
          <span className="rounded-full bg-accent px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-ink-900">
            Most Popular
          </span>
        )}
      </div>
      <p className="mt-4 font-serif text-5xl tracking-tight">
        {price}
        <span
          className={`text-base font-sans ${popular ? "text-white/50" : "text-ink-700/50"}`}
        >
          {" "}
          / month
        </span>
      </p>
      <p className={`mt-3 text-sm leading-relaxed ${popular ? "text-white/65" : "text-ink-700/70"}`}>
        {audience}
      </p>
      <ul className="mt-6 flex-1 space-y-2 text-sm">
        {features.map((f) => (
          <li key={f} className="flex gap-2">
            <span className={popular ? "text-accent" : "text-accent-dim"}>—</span>
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <p className={`mt-6 text-xs leading-relaxed ${popular ? "text-white/50" : "text-ink-700/60"}`}>
        {value}
      </p>
      <button
        type="button"
        onClick={onCta}
        disabled={loading}
        className={`mt-6 rounded-full py-3 text-sm font-semibold disabled:opacity-60 ${
          popular
            ? "bg-accent text-ink-900 hover:bg-accent-glow"
            : "bg-ink-900 text-white hover:bg-ink-800"
        }`}
      >
        {loading ? "Starting…" : cta}
      </button>
      {secondary && (
        <a
          href="#audit"
          className="mt-3 text-center text-xs text-ink-700/60 hover:text-ink-900"
        >
          Get a Free Competitor Change Audit
        </a>
      )}
    </article>
  );
}


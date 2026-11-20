"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Logo } from "@/components/Logo";
import { eventLabel, formatDateTime, formatMoney, formatPct } from "@/lib/format";

type Store = {
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
  created_at: string;
};

type Kpis = {
  trackedCompetitors: number;
  totalSkusMonitored: number;
  activeSalesDetected: number;
  recentChangeEvents: number;
};

type ProductSnapshot = {
  id: number;
  store_id: number;
  product_id: string;
  variant_id: string;
  title: string;
  variant_title: string | null;
  sku: string | null;
  price: number;
  compare_at_price: number | null;
  available: number;
  product_url: string;
  scanned_at: string;
};

type ChangeEvent = {
  id: number;
  store_id: number;
  event_type: string;
  product_title: string | null;
  variant_title: string | null;
  old_value: string | null;
  new_value: string | null;
  pct_change: number | null;
  product_url: string | null;
  detected_at: string;
  alerted: number;
  store_domain?: string;
  store_name?: string;
};

type AlertSettings = {
  email: string | null;
  slack_webhook_url: string | null;
  digest_frequency: string;
  min_price_drop_pct: number;
  slackConfigured?: boolean;
  emailDeliveryConfigured?: boolean;
};

type Tab = "stores" | "feed" | "alerts";
type Filter = "all" | "price" | "sales" | "stock" | "new";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "price", label: "Price Drops" },
  { id: "sales", label: "Sales" },
  { id: "stock", label: "Stockouts" },
  { id: "new", label: "New Products" },
];

export function DashboardApp() {
  const [tab, setTab] = useState<Tab>("stores");
  const [stores, setStores] = useState<Store[]>([]);
  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [events, setEvents] = useState<ChangeEvent[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newUrl, setNewUrl] = useState("");
  const [adding, setAdding] = useState(false);
  const [scanningAll, setScanningAll] = useState(false);
  const [scanningId, setScanningId] = useState<number | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<{
    store: Store;
    products: ProductSnapshot[];
    sales: ProductSnapshot[];
    stockouts: ProductSnapshot[];
  } | null>(null);
  const [detailTab, setDetailTab] = useState<"products" | "sales" | "stockouts">(
    "products",
  );
  const [report, setReport] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [settings, setSettings] = useState<AlertSettings>({
    email: "",
    slack_webhook_url: "",
    digest_frequency: "immediate",
    min_price_drop_pct: 5,
  });
  const [savingSettings, setSavingSettings] = useState(false);
  const [testingAlert, setTestingAlert] = useState(false);

  const loadStores = useCallback(async () => {
    const res = await fetch("/api/stores");
    const data = (await res.json()) as { stores: Store[]; kpis: Kpis };
    setStores(data.stores);
    setKpis(data.kpis);
  }, []);

  const loadEvents = useCallback(async (type: Filter = filter) => {
    const res = await fetch(`/api/events?type=${type}&limit=200`);
    const data = (await res.json()) as { events: ChangeEvent[] };
    setEvents(data.events);
  }, [filter]);

  const loadSettings = useCallback(async () => {
    const res = await fetch("/api/alerts");
    const data = (await res.json()) as { settings: AlertSettings };
    setSettings({
      email: data.settings.email || "",
      slack_webhook_url: data.settings.slack_webhook_url || "",
      digest_frequency: data.settings.digest_frequency || "immediate",
      min_price_drop_pct: data.settings.min_price_drop_pct ?? 5,
      slackConfigured: data.settings.slackConfigured,
      emailDeliveryConfigured: data.settings.emailDeliveryConfigured,
    });
  }, []);

  useEffect(() => {
    (async () => {
      try {
        await Promise.all([loadStores(), loadEvents("all"), loadSettings()]);
      } catch {
        setError("Could not load dashboard data.");
      } finally {
        setLoading(false);
      }
    })();
  }, [loadStores, loadEvents, loadSettings]);

  async function openStore(id: number) {
    setSelectedId(id);
    setDetail(null);
    setDetailTab("products");
    const res = await fetch(`/api/stores/${id}`);
    if (!res.ok) {
      setError("Could not load store details.");
      return;
    }
    setDetail(await res.json());
  }

  async function addStore(e: React.FormEvent) {
    e.preventDefault();
    if (!newUrl.trim()) return;
    setAdding(true);
    setError(null);
    setBanner(null);
    try {
      const res = await fetch("/api/stores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: newUrl.trim() }),
      });
      const data = await res.json();
      if (data.unsupported) {
        setBanner(
          `${data.store?.domain || newUrl}: Unsupported / protected storefront. Headless, password-protected, or bot-checked stores can’t be monitored via the public catalog.`,
        );
        await loadStores();
      } else if (!res.ok) {
        setError(data.error || "Could not add that store.");
      } else {
        setBanner(
          `Added ${data.store.name} (${data.store.domain}) — ${data.store.product_count} products, ${data.store.active_sale_count} on sale, ${data.store.out_of_stock_count} out of stock.`,
        );
        setNewUrl("");
        await Promise.all([loadStores(), loadEvents()]);
      }
    } catch {
      setError("Could not add that store.");
    } finally {
      setAdding(false);
    }
  }

  async function scanOne(id: number) {
    setScanningId(id);
    setError(null);
    try {
      const res = await fetch(`/api/stores/${id}/scan`, { method: "POST" });
      const data = await res.json();
      if (data.unsupported) {
        setBanner("Unsupported / protected storefront");
      } else if (!res.ok) {
        setError(data.error || "Scan failed.");
      } else {
        setBanner(data.message || "Scan complete.");
      }
      await Promise.all([loadStores(), loadEvents()]);
      if (selectedId === id) await openStore(id);
    } catch {
      setError("Scan failed.");
    } finally {
      setScanningId(null);
    }
  }

  async function scanAll() {
    setScanningAll(true);
    setError(null);
    try {
      const res = await fetch("/api/scan-all", { method: "POST" });
      const data = await res.json();
      const unsupported = (data.results || []).filter(
        (r: { unsupported?: boolean }) => r.unsupported,
      ).length;
      setBanner(
        unsupported
          ? `Scan complete. ${unsupported} store${unsupported === 1 ? "" : "s"} marked Unsupported / protected storefront.`
          : "Scan all complete. Latest catalogs and change events are up to date.",
      );
      await Promise.all([loadStores(), loadEvents()]);
    } catch {
      setError("Scan all failed.");
    } finally {
      setScanningAll(false);
    }
  }

  async function deleteStore(id: number, domain: string) {
    if (!confirm(`Remove ${domain} from tracking? This deletes its snapshots and events.`)) {
      return;
    }
    await fetch(`/api/stores/${id}`, { method: "DELETE" });
    if (selectedId === id) {
      setSelectedId(null);
      setDetail(null);
    }
    await Promise.all([loadStores(), loadEvents()]);
    setBanner(`Removed ${domain}.`);
  }

  async function changeFilter(next: Filter) {
    setFilter(next);
    await loadEvents(next);
  }

  async function generateReport() {
    const res = await fetch("/api/report?format=md");
    const data = (await res.json()) as { markdown: string };
    setReport(data.markdown);
    setReportOpen(true);
  }

  function downloadReport() {
    if (!report) return;
    const blob = new Blob([report], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rivalsku-competitor-audit-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function copyReport() {
    if (!report) return;
    await navigator.clipboard.writeText(report);
    setBanner("Audit report copied to clipboard.");
  }

  async function saveSettings(e: React.FormEvent) {
    e.preventDefault();
    setSavingSettings(true);
    setError(null);
    try {
      const res = await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: settings.email,
          slack_webhook_url: settings.slack_webhook_url,
          digest_frequency: settings.digest_frequency,
          min_price_drop_pct: Number(settings.min_price_drop_pct),
        }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error || "Could not save settings.");
      else {
        setBanner("Alert settings saved.");
        await loadSettings();
      }
    } finally {
      setSavingSettings(false);
    }
  }

  async function testAlert() {
    setTestingAlert(true);
    setError(null);
    try {
      const res = await fetch("/api/alerts/test", { method: "POST" });
      const data = await res.json();
      if (!res.ok) setError(data.error || "Test alert failed.");
      else setBanner(data.message);
    } finally {
      setTestingAlert(false);
    }
  }

  const detailRows = useMemo(() => {
    if (!detail) return [];
    if (detailTab === "sales") return detail.sales;
    if (detailTab === "stockouts") return detail.stockouts;
    return detail.products;
  }, [detail, detailTab]);

  return (
    <div className="min-h-screen bg-mist-50">
      <header className="border-b border-ink-900/10 bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5">
          <Logo />
          <div className="flex items-center gap-5 text-sm">
            <a href="/" className="text-ink-700/70 hover:text-ink-900">
              Marketing site
            </a>
            <span className="hidden text-ink-700/40 sm:inline">
              hello@rivalsku.com
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow text-accent-dim">Workspace</p>
            <h1 className="mt-1 font-serif text-3xl tracking-tight">
              Competitor radar
            </h1>
          </div>
          <div className="flex gap-2 rounded-full border border-ink-900/10 bg-white p-1 text-sm">
            {(
              [
                ["stores", "Tracked Stores"],
                ["feed", "Change Feed"],
                ["alerts", "Alerts & Billing"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`rounded-full px-4 py-1.5 ${
                  tab === id
                    ? "bg-ink-900 text-white"
                    : "text-ink-700/70 hover:text-ink-900"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {kpis && (
          <dl className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Kpi label="Tracked Competitors" value={kpis.trackedCompetitors} />
            <Kpi label="Total SKUs Monitored" value={kpis.totalSkusMonitored} />
            <Kpi label="Active Sales Detected" value={kpis.activeSalesDetected} />
            <Kpi label="Recent Change Events" value={kpis.recentChangeEvents} />
          </dl>
        )}

        {banner && (
          <div className="mt-5 rounded-xl border border-accent-dim/20 bg-teal-50 px-4 py-3 text-sm text-ink-800">
            {banner}
          </div>
        )}
        {error && (
          <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {error}
          </div>
        )}
        {loading && (
          <p className="mt-8 text-sm text-ink-700/60">Loading live data…</p>
        )}

        {tab === "stores" && !loading && (
          <section className="mt-8">
            <form
              onSubmit={addStore}
              className="flex flex-col gap-3 rounded-2xl border border-ink-900/10 bg-white p-4 sm:flex-row"
            >
              <input
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                placeholder="Add competitor store — e.g. tentree.com"
                className="h-11 flex-1 rounded-xl border border-ink-900/10 bg-mist-50 px-4 outline-none focus:ring-2 focus:ring-accent"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
              />
              <button
                type="submit"
                disabled={adding}
                className="h-11 rounded-xl bg-ink-900 px-5 text-sm font-semibold text-white hover:bg-ink-800 disabled:opacity-60"
              >
                {adding ? "Scanning…" : "Add Competitor Store"}
              </button>
              <button
                type="button"
                onClick={scanAll}
                disabled={scanningAll}
                className="h-11 rounded-xl border border-ink-900/15 px-5 text-sm font-semibold hover:bg-mist-100 disabled:opacity-60"
              >
                {scanningAll ? "Scanning all…" : "Scan All Now"}
              </button>
            </form>

            <div className="mt-5 overflow-hidden rounded-2xl border border-ink-900/10 bg-white">
              <table className="w-full text-left text-sm">
                <thead className="bg-mist-50 text-[11px] uppercase tracking-wider text-ink-700/55">
                  <tr>
                    <th className="px-4 py-3 font-medium">Store</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="hidden px-4 py-3 font-medium md:table-cell">
                      Products
                    </th>
                    <th className="hidden px-4 py-3 font-medium md:table-cell">
                      Sales
                    </th>
                    <th className="hidden px-4 py-3 font-medium lg:table-cell">
                      Out of stock
                    </th>
                    <th className="hidden px-4 py-3 font-medium lg:table-cell">
                      Last scanned
                    </th>
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {stores.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-ink-700/60">
                        No competitors yet. Add allbirds.com, tentree.com, or
                        colourpop.com to see a live catalog.
                      </td>
                    </tr>
                  )}
                  {stores.map((s) => (
                    <tr
                      key={s.id}
                      className={`border-t border-ink-900/8 hover:bg-mist-50 ${
                        selectedId === s.id ? "bg-mist-50" : ""
                      }`}
                    >
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => openStore(s.id)}
                          className="text-left"
                        >
                          <span className="block font-medium">{s.name}</span>
                          <span className="block text-xs text-ink-700/55">
                            {s.domain}
                          </span>
                          {s.promo_banner && (
                            <span className="mt-1 block max-w-xs truncate text-xs text-accent-dim">
                              {s.promo_banner}
                            </span>
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <StatusPill status={s.status} />
                      </td>
                      <td className="hidden px-4 py-3 md:table-cell">
                        {s.product_count}
                      </td>
                      <td className="hidden px-4 py-3 md:table-cell">
                        {s.active_sale_count}
                      </td>
                      <td className="hidden px-4 py-3 lg:table-cell">
                        {s.out_of_stock_count}
                      </td>
                      <td className="hidden px-4 py-3 text-xs text-ink-700/60 lg:table-cell">
                        {formatDateTime(s.last_scanned_at)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => scanOne(s.id)}
                          disabled={scanningId === s.id}
                          className="mr-3 text-xs font-semibold text-accent-dim hover:text-ink-900 disabled:opacity-50"
                        >
                          {scanningId === s.id ? "Scanning…" : "Scan"}
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteStore(s.id, s.domain)}
                          className="text-xs font-semibold text-rose-700 hover:text-rose-900"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {selectedId && (
              <div className="mt-5 rounded-2xl border border-ink-900/10 bg-white p-5">
                {!detail ? (
                  <p className="text-sm text-ink-700/60">Loading catalog…</p>
                ) : (
                  <>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h2 className="font-serif text-2xl">{detail.store.name}</h2>
                        <p className="text-sm text-ink-700/60">
                          {detail.store.domain}
                          {detail.store.status === "unsupported" && (
                            <span className="ml-2 text-amber-700">
                              · Unsupported / protected storefront
                            </span>
                          )}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedId(null);
                          setDetail(null);
                        }}
                        className="text-sm text-ink-700/60 hover:text-ink-900"
                      >
                        Close
                      </button>
                    </div>
                    <div className="mt-4 flex gap-2 text-sm">
                      {(
                        [
                          ["products", `Products (${detail.products.length})`],
                          ["sales", `Active sales (${detail.sales.length})`],
                          ["stockouts", `Stockouts (${detail.stockouts.length})`],
                        ] as const
                      ).map(([id, label]) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => setDetailTab(id)}
                          className={`rounded-full px-3 py-1 ${
                            detailTab === id
                              ? "bg-ink-900 text-white"
                              : "bg-mist-100 text-ink-700/70"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    <div className="mt-4 max-h-[420px] overflow-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="sticky top-0 bg-white text-[11px] uppercase tracking-wider text-ink-700/55">
                          <tr>
                            <th className="px-2 py-2 font-medium">Product</th>
                            <th className="px-2 py-2 font-medium">SKU</th>
                            <th className="px-2 py-2 font-medium">Price</th>
                            <th className="px-2 py-2 font-medium">Availability</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detailRows.length === 0 && (
                            <tr>
                              <td
                                colSpan={4}
                                className="px-2 py-8 text-center text-ink-700/55"
                              >
                                Nothing in this view.
                              </td>
                            </tr>
                          )}
                          {detailRows.map((p) => (
                            <tr
                              key={p.variant_id}
                              className="border-t border-ink-900/8"
                            >
                              <td className="px-2 py-2">
                                <a
                                  href={p.product_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="hover:underline"
                                >
                                  {p.title}
                                </a>
                                {p.variant_title && (
                                  <span className="block text-xs text-ink-700/50">
                                    {p.variant_title}
                                  </span>
                                )}
                              </td>
                              <td className="px-2 py-2 font-mono text-xs">
                                {p.sku || "—"}
                              </td>
                              <td className="px-2 py-2 font-mono text-xs">
                                {p.compare_at_price &&
                                p.compare_at_price > p.price ? (
                                  <>
                                    <span className="mr-2 text-ink-700/40 line-through">
                                      {formatMoney(p.compare_at_price)}
                                    </span>
                                    <span className="text-accent-dim">
                                      {formatMoney(p.price)}
                                    </span>
                                  </>
                                ) : (
                                  formatMoney(p.price)
                                )}
                              </td>
                              <td className="px-2 py-2">
                                {p.available ? (
                                  <span className="text-ink-700/60">In stock</span>
                                ) : (
                                  <span className="text-rose-700">
                                    Out of stock
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            )}
          </section>
        )}

        {tab === "feed" && !loading && (
          <section className="mt-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                {FILTERS.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => changeFilter(f.id)}
                    className={`rounded-full px-3 py-1.5 text-sm ${
                      filter === f.id
                        ? "bg-ink-900 text-white"
                        : "border border-ink-900/10 bg-white text-ink-700/70 hover:text-ink-900"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={generateReport}
                className="rounded-full bg-ink-900 px-4 py-2 text-sm font-semibold text-white hover:bg-ink-800"
              >
                Generate Competitor Audit Report
              </button>
            </div>

            <div className="mt-5 overflow-hidden rounded-2xl border border-ink-900/10 bg-white">
              {events.length === 0 ? (
                <p className="px-5 py-12 text-center text-sm text-ink-700/60">
                  No change events yet. The first successful scan of a store is a
                  baseline — later scans will record price drops, sales, stockouts,
                  and new products here.
                </p>
              ) : (
                <ul className="divide-y divide-ink-900/8">
                  {events.map((ev) => (
                    <li key={ev.id} className="flex flex-wrap gap-3 px-5 py-3 text-sm">
                      <span
                        className={`mt-0.5 rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${tone(
                          ev.event_type,
                        )}`}
                      >
                        {eventLabel(ev.event_type)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">
                          {[ev.product_title, ev.variant_title]
                            .filter(Boolean)
                            .join(" — ") || ev.store_name || ev.store_domain}
                        </p>
                        <p className="text-xs text-ink-700/55">
                          {ev.store_name} · {ev.store_domain}
                          {ev.old_value && ev.new_value
                            ? ` · ${
                                isPriceEvent(ev.event_type)
                                  ? `${formatMoney(parseFloat(ev.old_value))} → ${formatMoney(parseFloat(ev.new_value))}`
                                  : `${ev.old_value} → ${ev.new_value}`
                              }`
                            : ev.new_value
                              ? ` · ${ev.new_value}`
                              : ""}
                          {ev.pct_change !== null && ev.pct_change !== undefined
                            ? ` (${formatPct(ev.pct_change)})`
                            : ""}
                        </p>
                      </div>
                      <time className="text-xs text-ink-700/50">
                        {formatDateTime(ev.detected_at)}
                      </time>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        )}

        {tab === "alerts" && !loading && (
          <section className="mt-8 grid gap-6 lg:grid-cols-2">
            <form
              onSubmit={saveSettings}
              className="rounded-2xl border border-ink-900/10 bg-white p-6"
            >
              <h2 className="font-serif text-2xl">Alerts</h2>
              <p className="mt-2 text-sm text-ink-700/70">
                Payloads are always logged server-side. Delivery starts once a
                Slack webhook or Resend key is configured — the UI never crashes
                without them.
              </p>
              <label className="mt-5 block text-xs uppercase tracking-wider text-ink-700/55">
                Alert email
                <input
                  type="email"
                  value={settings.email || ""}
                  onChange={(e) =>
                    setSettings({ ...settings, email: e.target.value })
                  }
                  placeholder="you@yourbrand.com"
                  className="mt-1 h-11 w-full rounded-xl border border-ink-900/10 bg-mist-50 px-3 text-sm normal-case tracking-normal outline-none focus:ring-2 focus:ring-accent"
                />
              </label>
              <label className="mt-4 block text-xs uppercase tracking-wider text-ink-700/55">
                Slack webhook URL
                <input
                  value={settings.slack_webhook_url || ""}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      slack_webhook_url: e.target.value,
                    })
                  }
                  placeholder="https://hooks.slack.com/services/…"
                  className="mt-1 h-11 w-full rounded-xl border border-ink-900/10 bg-mist-50 px-3 text-sm normal-case tracking-normal outline-none focus:ring-2 focus:ring-accent"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                />
              </label>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="block text-xs uppercase tracking-wider text-ink-700/55">
                  Digest frequency
                  <select
                    value={settings.digest_frequency}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        digest_frequency: e.target.value,
                      })
                    }
                    className="mt-1 h-11 w-full rounded-xl border border-ink-900/10 bg-mist-50 px-3 text-sm normal-case tracking-normal outline-none focus:ring-2 focus:ring-accent"
                  >
                    <option value="immediate">Immediate</option>
                    <option value="daily">Daily digest</option>
                    <option value="weekly">Weekly digest</option>
                  </select>
                </label>
                <label className="block text-xs uppercase tracking-wider text-ink-700/55">
                  Min. price drop %
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    value={settings.min_price_drop_pct}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        min_price_drop_pct: Number(e.target.value),
                      })
                    }
                    className="mt-1 h-11 w-full rounded-xl border border-ink-900/10 bg-mist-50 px-3 text-sm normal-case tracking-normal outline-none focus:ring-2 focus:ring-accent"
                  />
                </label>
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={savingSettings}
                  className="rounded-full bg-ink-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-ink-800 disabled:opacity-60"
                >
                  {savingSettings ? "Saving…" : "Save settings"}
                </button>
                <button
                  type="button"
                  onClick={testAlert}
                  disabled={testingAlert}
                  className="rounded-full border border-ink-900/15 px-5 py-2.5 text-sm font-semibold hover:bg-mist-100 disabled:opacity-60"
                >
                  {testingAlert ? "Sending…" : "Test Slack/Email Alert"}
                </button>
              </div>
            </form>

            <div className="rounded-2xl border border-ink-900/10 bg-white p-6">
              <h2 className="font-serif text-2xl">Billing</h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-700/70">
                Plans: Starter $49 · Growth $99 · Scale $199, billed monthly. Stripe
                Checkout is wired to{" "}
                <code className="font-mono text-xs">/api/checkout</code>. Until
                Stripe keys are added, the button explains what’s missing instead
                of crashing.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                {(["starter", "growth", "scale"] as const).map((plan) => (
                  <CheckoutButton key={plan} plan={plan} onMessage={setBanner} />
                ))}
              </div>
              <p className="mt-6 text-xs text-ink-700/55">
                Questions about a plan or an invoice:{" "}
                <a href="mailto:hello@rivalsku.com" className="underline">
                  hello@rivalsku.com
                </a>
              </p>
            </div>
          </section>
        )}
      </main>

      {reportOpen && report && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink-900/50 p-4 sm:items-center">
          <div className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-2xl bg-white shadow-lift">
            <div className="flex items-center justify-between border-b border-ink-900/10 px-5 py-4">
              <h2 className="font-serif text-xl">Competitor Audit Report</h2>
              <button
                type="button"
                onClick={() => setReportOpen(false)}
                className="text-sm text-ink-700/60 hover:text-ink-900"
              >
                Close
              </button>
            </div>
            <pre className="flex-1 overflow-auto whitespace-pre-wrap px-5 py-4 font-mono text-xs leading-relaxed text-ink-800">
              {report}
            </pre>
            <div className="flex gap-3 border-t border-ink-900/10 px-5 py-4">
              <button
                type="button"
                onClick={copyReport}
                className="rounded-full bg-ink-900 px-4 py-2 text-sm font-semibold text-white"
              >
                Copy Markdown
              </button>
              <button
                type="button"
                onClick={downloadReport}
                className="rounded-full border border-ink-900/15 px-4 py-2 text-sm font-semibold"
              >
                Download .md
              </button>
              <a
                href="/api/report?format=html"
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-ink-900/15 px-4 py-2 text-sm font-semibold"
              >
                Open HTML
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-ink-900/10 bg-white px-5 py-4">
      <dt className="text-[11px] uppercase tracking-wider text-ink-700/50">
        {label}
      </dt>
      <dd className="mt-1 font-serif text-3xl">{value.toLocaleString()}</dd>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  if (status === "unsupported") {
    return (
      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
        Unsupported / protected storefront
      </span>
    );
  }
  if (status === "error") {
    return (
      <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-800">
        Error
      </span>
    );
  }
  return (
    <span className="rounded-full bg-teal-100 px-2 py-0.5 text-[11px] font-semibold text-teal-800">
      Active
    </span>
  );
}

function tone(type: string): string {
  switch (type) {
    case "PRICE_DROP":
    case "SALE_STARTED":
      return "bg-teal-100 text-teal-800";
    case "PRICE_INCREASE":
    case "SALE_ENDED":
      return "bg-slate-200 text-slate-700";
    case "OUT_OF_STOCK":
      return "bg-rose-100 text-rose-800";
    case "BACK_IN_STOCK":
    case "NEW_PRODUCT":
      return "bg-sky-100 text-sky-800";
    case "PROMO_BANNER_CHANGED":
      return "bg-amber-100 text-amber-800";
    default:
      return "bg-mist-100 text-ink-700";
  }
}

function isPriceEvent(type: string) {
  return type === "PRICE_DROP" || type === "PRICE_INCREASE";
}

function CheckoutButton({
  plan,
  onMessage,
}: {
  plan: "starter" | "growth" | "scale";
  onMessage: (msg: string) => void;
}) {
  const [loading, setLoading] = useState(false);
  const labels = { starter: "Starter $49", growth: "Growth $99", scale: "Scale $199" };
  return (
    <button
      type="button"
      onClick={async () => {
        setLoading(true);
        try {
          const res = await fetch("/api/checkout", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ plan }),
          });
          const data = await res.json();
          if (data.url) window.location.href = data.url;
          else onMessage(data.error || "Stripe is not configured yet.");
        } finally {
          setLoading(false);
        }
      }}
      className="rounded-full border border-ink-900/15 px-4 py-2 text-sm font-semibold hover:bg-mist-100 disabled:opacity-60"
      disabled={loading}
    >
      {loading ? "Starting…" : labels[plan]}
    </button>
  );
}

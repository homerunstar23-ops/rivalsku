"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { sourceLabel, statusLabel, TONE_CLASS } from "@/lib/brand-status";
import { matchScore, normalize, tokens } from "@/lib/fuzzy";
import type { AdapterStatusInfo, BrandDirectoryEntry } from "@/lib/adapters/types";

export function BrandDirectoryView({
  brands,
  adapters,
  categories,
  initialStatus = "all",
}: {
  brands: BrandDirectoryEntry[];
  adapters: AdapterStatusInfo[];
  categories: string[];
  initialStatus?: string;
}) {
  const [statusFilter, setStatusFilter] = useState<string>(initialStatus);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [search, setSearch] = useState<string>("");
  const [bigOnly, setBigOnly] = useState(false);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const router = useRouter();

  const indexed = useMemo(
    () =>
      brands.map((b) => ({
        b,
        toks: tokens(`${b.name} ${b.domain.replace(/^www\./, "").replace(/\.(com|co|net|us)$/, "")} ${b.category} ${(b.aliases ?? []).join(" ")}`),
        compact: normalize(b.name).replace(/ /g, ""),
      })),
    [brands],
  );

  const scored = useMemo(() => {
    const qt = tokens(search);
    return indexed
      .map((x) => ({ b: x.b, s: qt.length ? matchScore(qt, x.toks, x.compact) : 1 }))
      .filter((x) => x.s > 0);
  }, [indexed, search]);

  const filtered = useMemo(() => {
    const list = scored.filter(({ b }) => {
      if (statusFilter !== "all" && b.status !== statusFilter) return false;
      if (categoryFilter !== "all" && b.category !== categoryFilter) return false;
      if (sourceFilter !== "all" && b.source !== sourceFilter) return false;
      if (bigOnly && !b.bigName) return false;
      return true;
    });
    if (search.trim()) list.sort((a, b) => b.s - a.s || a.b.name.localeCompare(b.b.name));
    return list.map((x) => x.b);
  }, [scored, statusFilter, categoryFilter, sourceFilter, bigOnly, search]);

  const suggestions = search.trim().length >= 1 ? [...scored].sort((a, b) => b.s - a.s).slice(0, 8).map((x) => x.b) : [];

  const liveCount = brands.filter((b) => b.status === "live").length;
  const pendingCount = brands.filter((b) => b.status === "pending_key").length;
  const pausedCount = brands.filter((b) => b.status === "paused_tos").length;
  const bigLive = brands.filter((b) => b.bigName && b.status === "live").length;
  const nonShopifyLive = brands.filter((b) => b.status === "live" && b.source !== "shopify").length;

  return (
    <main className="mx-auto max-w-7xl px-4 pb-16 pt-8 sm:px-6">
      <div className="mb-8">
        <span className="font-mono text-xs font-semibold uppercase tracking-wider text-[#0D7C47]">
          Multi-Source Brand Directory
        </span>
        <h1 className="mt-2 font-serif text-4xl text-[#111111] sm:text-5xl">
          {brands.length} tracked brands &amp; retailers
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-[#555550] sm:text-base">
          <strong className="text-[#111111]">{liveCount} live</strong> ({nonShopifyLive} on non-Shopify stacks via
          structured product data, {bigLive} big names).{" "}
          <strong className="text-[#111111]">{pendingCount} big-name retailers</strong> (Nike, Target,
          Sephora, Best Buy, Walmart, Amazon…) are coming soon via partner feeds, and{" "}
          <strong className="text-[#111111]">{pausedCount} brands</strong> are paused because their Terms of
          Service restrict automated access or couldn&apos;t be verified. Search any of them below.
        </p>
      </div>

      {/* Adapter Status Grid */}
      <section className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {adapters.map((a) => (
          <div
            key={a.source}
            className="flex flex-col justify-between rounded-2xl border border-[#EAEAE2] bg-white p-4"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold text-[#111111]">
                  {a.label}
                </h2>
                <p className="mt-0.5 font-mono text-xs text-[#66665E]">
                  {a.brandCount} directory{" "}
                  {a.brandCount === 1 ? "brand" : "brands"}
                </p>
              </div>
              <span
                className={`rounded-full px-2.5 py-0.5 font-mono text-[11px] font-semibold ${
                  a.configured
                    ? "bg-[#0D7C47]/10 text-[#0D7C47]"
                    : "bg-[#FEF3C7] text-[#92400E]"
                }`}
              >
                {a.configured ? "Live" : "Pending Key"}
              </span>
            </div>
            {a.requiredEnvVars.length > 0 && (
              <p className="mt-2.5 truncate font-mono text-[11px] text-[#888880]">
                Keys: {a.requiredEnvVars.join(", ")}
              </p>
            )}
          </div>
        ))}
      </section>

      {/* Filters */}
      <section className="mb-6 grid gap-2.5 rounded-2xl border border-[#EAEAE2] bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative">
          <input
            type="search"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setSuggestOpen(true); setActiveIdx(-1); }}
            onFocus={() => setSuggestOpen(true)}
            onBlur={() => setTimeout(() => setSuggestOpen(false), 150)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") { e.preventDefault(); setActiveIdx((i) => Math.min(suggestions.length - 1, i + 1)); }
              else if (e.key === "ArrowUp") { e.preventDefault(); setActiveIdx((i) => Math.max(-1, i - 1)); }
              else if (e.key === "Enter" && activeIdx >= 0 && suggestions[activeIdx]) router.push(`/deals/brand/${encodeURIComponent(suggestions[activeIdx].slug)}`);
              else if (e.key === "Escape") setSuggestOpen(false);
            }}
            placeholder="Search any brand (typos OK)…"
            aria-label="Search brands"
            role="combobox"
            aria-expanded={suggestOpen && suggestions.length > 0}
            className="w-full rounded-xl border border-[#DCDCD4] bg-[#FAFAF8] px-3.5 py-2 text-sm text-[#111111] focus:border-[#111111] focus:bg-white focus:outline-none"
          />
          {suggestOpen && suggestions.length > 0 && (
            <div role="listbox" className="absolute left-0 right-0 z-30 mt-1.5 rounded-xl border border-[#E2E2DA] bg-white p-1.5 shadow-lg sm:min-w-[340px]">
              {suggestions.map((b, i) => {
                const st = statusLabel(b);
                return (
                  <Link key={b.slug} href={`/deals/brand/${encodeURIComponent(b.slug)}`} role="option" aria-selected={i === activeIdx}
                    className={`flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 ${i === activeIdx ? "bg-[#F3F3EE]" : "hover:bg-[#F7F7F3]"}`}>
                    <span className="min-w-0">
                      <span className="block truncate text-sm text-[#111111]">{b.name}</span>
                      <span className="block truncate text-[11px] text-[#8A8A82]">{sourceLabel(b)}</span>
                    </span>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold ${TONE_CLASS[st.tone]}`}>{st.text}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-[#DCDCD4] bg-[#FAFAF8] px-3 py-2 text-sm text-[#111111] focus:border-[#111111] focus:bg-white focus:outline-none"
        >
          <option value="all">All statuses ({brands.length})</option>
          <option value="live">Live now ({liveCount})</option>
          <option value="pending_key">Coming soon · partner feed ({pendingCount})</option>
          <option value="paused_tos">Coming soon · ToS review ({pausedCount})</option>
        </select>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-xl border border-[#DCDCD4] bg-[#FAFAF8] px-3 py-2 text-sm text-[#111111] focus:border-[#111111] focus:bg-white focus:outline-none"
        >
          <option value="all">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
          className="rounded-xl border border-[#DCDCD4] bg-[#FAFAF8] px-3 py-2 text-sm text-[#111111] focus:border-[#111111] focus:bg-white focus:outline-none"
        >
          <option value="all">All data sources</option>
          {adapters.map((a) => (
            <option key={a.source} value={a.source}>
              {a.label} ({a.brandCount})
            </option>
          ))}
        </select>
      </section>

      <label className="mb-3 inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-[#333330]">
        <input type="checkbox" checked={bigOnly} onChange={(e) => setBigOnly(e.target.checked)} className="accent-[#111111]" />
        Big-name brands only
      </label>
      <p className="mb-4 text-xs text-[#66665E]">
        Showing <strong className="font-mono text-[#111111]">{filtered.length}</strong>{" "}
        brands
      </p>

      {/* Brand Cards */}
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {filtered.map((b) => (
          <Link
            key={b.slug}
            href={`/deals/brand/${encodeURIComponent(b.slug)}`}
            className="flex flex-col justify-between rounded-2xl border border-[#EAEAE2] bg-white p-4 transition-all hover:border-[#111111] hover:shadow-xs"
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-semibold text-[#111111]">
                  {b.name}
                </h3>
                <span className={`shrink-0 rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold ${TONE_CLASS[statusLabel(b).tone]}`}>
                  {statusLabel(b).text}
                </span>
              </div>
              <p className="mt-1 truncate font-mono text-xs text-[#777770]">
                {b.domain}
              </p>
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-[#F0F0EA] pt-2.5 text-[11px] text-[#66665E]">
              <span>{b.category}</span>
              <span className="truncate pl-2 font-mono">{sourceLabel(b)}</span>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}

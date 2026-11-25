"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return brands.filter((b) => {
      if (statusFilter !== "all" && b.status !== statusFilter) return false;
      if (categoryFilter !== "all" && b.category !== categoryFilter) return false;
      if (sourceFilter !== "all" && b.source !== sourceFilter) return false;
      if (
        q &&
        !b.name.toLowerCase().includes(q) &&
        !b.domain.toLowerCase().includes(q) &&
        !b.category.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [brands, statusFilter, categoryFilter, sourceFilter, search]);

  const liveCount = brands.filter((b) => b.status === "live").length;
  const pendingCount = brands.filter((b) => b.status === "pending_key").length;

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
          <strong className="text-[#111111]">{liveCount} brands</strong> are
          live right now via direct catalog feeds.{" "}
          <strong className="text-[#111111]">{pendingCount} major retailers</strong>{" "}
          (Nike, Target, Sephora, Best Buy, Walmart, Amazon, Lululemon &amp;
          more) are wired into our env-gated adapters and unlock automatically
          when partner API keys are added.
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
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search brand or domain..."
          className="rounded-xl border border-[#DCDCD4] bg-[#FAFAF8] px-3.5 py-2 text-sm text-[#111111] focus:border-[#111111] focus:bg-white focus:outline-none"
        />

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-[#DCDCD4] bg-[#FAFAF8] px-3 py-2 text-sm text-[#111111] focus:border-[#111111] focus:bg-white focus:outline-none"
        >
          <option value="all">All statuses ({brands.length})</option>
          <option value="live">Live now ({liveCount})</option>
          <option value="pending_key">Coming soon ({pendingCount})</option>
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
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold ${
                    b.status === "live"
                      ? "bg-[#0D7C47]/10 text-[#0D7C47]"
                      : "bg-[#FEF3C7] text-[#92400E]"
                  }`}
                >
                  {b.status === "live" ? "Live" : "Coming soon"}
                </span>
              </div>
              <p className="mt-1 truncate font-mono text-xs text-[#777770]">
                {b.domain}
              </p>
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-[#F0F0EA] pt-2.5 text-[11px] text-[#66665E]">
              <span>{b.category}</span>
              <span className="font-mono">{b.source}</span>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}

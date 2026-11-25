"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { BrandDirectoryEntry, DealSectionTag, NormalizedDeal } from "@/lib/adapters/types";
import { DealCard } from "./DealCard";
import { EmailCaptureBar } from "./EmailCaptureBar";

type StatsSummary = {
  totalDeals: number;
  biggestDropsCount: number;
  justOnSaleCount: number;
  backInStockCount: number;
  newLaunchCount: number;
  totalDirectoryBrands: number;
  liveBrandsCount: number;
  pendingBrandsCount: number;
  brandsWithActiveDeals: number;
  lastUpdatedAt: string;
  categories: string[];
};

const SECTION_TABS: Array<{
  id: "all" | DealSectionTag;
  label: string;
}> = [
  { id: "biggest_drop", label: "Biggest Drops Today" },
  { id: "just_went_on_sale", label: "Just Went on Sale" },
  { id: "back_in_stock", label: "Back in Stock" },
  { id: "new_launch", label: "New Launches" },
  { id: "all", label: "Everything" },
];

export function DealsExplorer({
  initialDeals,
  initialTotal,
  stats,
  liveBrands,
  pendingPreviewBrands,
  initialCategory = "all",
}: {
  initialDeals: NormalizedDeal[];
  initialTotal: number;
  stats: StatsSummary;
  liveBrands: Array<{ slug: string; name: string }>;
  pendingPreviewBrands: BrandDirectoryEntry[];
  initialCategory?: string;
}) {
  const [deals, setDeals] = useState<NormalizedDeal[]>(initialDeals);
  const [total, setTotal] = useState<number>(initialTotal);
  const [section, setSection] = useState<"all" | DealSectionTag>("biggest_drop");
  const [category, setCategory] = useState<string>(initialCategory);
  const [brand, setBrand] = useState<string>("all");
  const [minDiscount, setMinDiscount] = useState<string>("0");
  const [priceRange, setPriceRange] = useState<string>("all");
  const [sort, setSort] = useState<"discount" | "savings" | "newest">(
    "discount",
  );
  const [search, setSearch] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const didMount = useRef(false);

  const buildQueryParams = useCallback(
    (offset: number) => {
      const sp = new URLSearchParams();
      sp.set("section", section);
      if (category !== "all") sp.set("category", category);
      if (brand !== "all") sp.set("brand", brand);
      if (Number(minDiscount) > 0) sp.set("minDiscount", minDiscount);
      if (priceRange === "under25") {
        sp.set("maxPrice", "25");
      } else if (priceRange === "under50") {
        sp.set("maxPrice", "50");
      } else if (priceRange === "50to150") {
        sp.set("minPrice", "50");
        sp.set("maxPrice", "150");
      } else if (priceRange === "150plus") {
        sp.set("minPrice", "150");
      }
      sp.set("sort", sort);
      if (search.trim()) sp.set("q", search.trim());
      sp.set("limit", "48");
      sp.set("offset", String(offset));
      return sp.toString();
    },
    [section, category, brand, minDiscount, priceRange, sort, search],
  );

  const fetchFiltered = useCallback(
    async (offset = 0, append = false) => {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      try {
        const res = await fetch(`/api/deals?${buildQueryParams(offset)}`);
        if (!res.ok) return;
        const json = (await res.json()) as {
          deals: NormalizedDeal[];
          total: number;
        };
        setTotal(json.total);
        if (append) {
          setDeals((prev) => {
            const seen = new Set(prev.map((d) => d.id));
            const next = [...prev];
            for (const item of json.deals) {
              if (!seen.has(item.id)) next.push(item);
            }
            return next;
          });
        } else {
          setDeals(json.deals);
        }
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [buildQueryParams],
  );

  useEffect(() => {
    if (!didMount.current) {
      didMount.current = true;
      return;
    }
    const timer = setTimeout(() => {
      void fetchFiltered(0, false);
    }, 180);
    return () => clearTimeout(timer);
  }, [fetchFiltered]);

  const hasFilters =
    category !== "all" ||
    brand !== "all" ||
    minDiscount !== "0" ||
    priceRange !== "all" ||
    search.trim() !== "";

  function clearFilters() {
    setCategory("all");
    setBrand("all");
    setMinDiscount("0");
    setPriceRange("all");
    setSearch("");
  }

  return (
    <main className="mx-auto max-w-7xl px-4 pb-12 pt-8 sm:px-6 sm:pt-10">
      {/* Editorial Hero */}
      <section className="mb-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex flex-wrap items-center gap-2 rounded-full border border-[#E2E2DA] bg-white px-3 py-1 text-xs font-medium text-[#444440]">
              <span className="h-2 w-2 rounded-full bg-[#0D7C47]" />
              <span>
                {stats.liveBrandsCount} live brands ·{" "}
                {stats.totalDeals.toLocaleString()} real catalog drops
              </span>
              <span className="text-[#999990]">·</span>
              <Link
                href="/deals/brands"
                className="font-semibold text-[#111111] underline-offset-2 hover:underline"
              >
                {stats.totalDirectoryBrands} brands tracked
              </Link>
            </div>
            <h1 className="mt-4 font-serif text-4xl tracking-tight text-[#111111] sm:text-5xl">
              Real-time price drops across the internet&apos;s best brands.
            </h1>
            <p className="mt-3 text-base leading-relaxed text-[#555550] sm:text-lg">
              Direct catalog markdowns, fresh restocks, and new launches from
              Lunya, DÔEN, Allbirds, Brooklinen, Gymshark, Our Place, Rare
              Beauty &amp; {stats.liveBrandsCount - 7}+ more — verified daily, no
              promo-code clutter.
            </p>
          </div>
        </div>

        <div className="mt-6">
          <EmailCaptureBar categories={stats.categories} compact />
        </div>
      </section>

      {/* Section Tabs */}
      <section className="mb-5 border-b border-[#E6E6DF]">
        <div className="-mb-px flex gap-1 overflow-x-auto pb-0.5 no-scrollbar">
          {SECTION_TABS.map((tab) => {
            const active = section === tab.id;
            const count =
              tab.id === "biggest_drop"
                ? stats.biggestDropsCount
                : tab.id === "just_went_on_sale"
                  ? stats.justOnSaleCount
                  : tab.id === "back_in_stock"
                    ? stats.backInStockCount
                    : tab.id === "new_launch"
                      ? stats.newLaunchCount
                      : stats.totalDeals;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setSection(tab.id);
                  if (tab.id === "just_went_on_sale" || tab.id === "new_launch" || tab.id === "back_in_stock") {
                    setSort("newest");
                  } else {
                    setSort("discount");
                  }
                }}
                className={`flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                  active
                    ? "border-[#111111] text-[#111111]"
                    : "border-transparent text-[#6B6B63] hover:text-[#111111]"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`rounded-full px-2 py-0.5 font-mono text-[11px] ${
                    active
                      ? "bg-[#111111] text-white"
                      : "bg-[#EFEFEA] text-[#66665E]"
                  }`}
                >
                  {count.toLocaleString()}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Category Pills */}
      <section className="mb-4 flex gap-2 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setCategory("all")}
          className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
            category === "all"
              ? "bg-[#111111] text-white"
              : "border border-[#E0E0D8] bg-white text-[#44443E] hover:border-[#111111]"
          }`}
        >
          All Categories
        </button>
        {stats.categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setCategory(cat)}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              category === cat
                ? "bg-[#111111] text-white"
                : "border border-[#E0E0D8] bg-white text-[#44443E] hover:border-[#111111]"
            }`}
          >
            {cat}
          </button>
        ))}
      </section>

      {/* Filter & Sort Controls */}
      <section className="mb-7 grid grid-cols-1 gap-2.5 rounded-2xl border border-[#EAEAE2] bg-white p-3.5 sm:grid-cols-2 lg:grid-cols-6">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search product or brand..."
          aria-label="Search deals"
          className="rounded-xl border border-[#DCDCD4] bg-[#FAFAF8] px-3.5 py-2 text-sm text-[#111111] placeholder:text-[#8A8A82] focus:border-[#111111] focus:bg-white focus:outline-none lg:col-span-2"
        />

        <select
          value={brand}
          onChange={(e) => setBrand(e.target.value)}
          aria-label="Filter by brand"
          className="rounded-xl border border-[#DCDCD4] bg-[#FAFAF8] px-3 py-2 text-sm text-[#222220] focus:border-[#111111] focus:bg-white focus:outline-none"
        >
          <option value="all">All Brands ({liveBrands.length} live)</option>
          {liveBrands.map((b) => (
            <option key={b.slug} value={b.slug}>
              {b.name}
            </option>
          ))}
        </select>

        <select
          value={minDiscount}
          onChange={(e) => setMinDiscount(e.target.value)}
          aria-label="Minimum discount percentage"
          className="rounded-xl border border-[#DCDCD4] bg-[#FAFAF8] px-3 py-2 text-sm text-[#222220] focus:border-[#111111] focus:bg-white focus:outline-none"
        >
          <option value="0">Any % off</option>
          <option value="20">20%+ off</option>
          <option value="30">30%+ off</option>
          <option value="40">40%+ off</option>
          <option value="50">50%+ off</option>
          <option value="70">70%+ off</option>
        </select>

        <select
          value={priceRange}
          onChange={(e) => setPriceRange(e.target.value)}
          aria-label="Price range"
          className="rounded-xl border border-[#DCDCD4] bg-[#FAFAF8] px-3 py-2 text-sm text-[#222220] focus:border-[#111111] focus:bg-white focus:outline-none"
        >
          <option value="all">Any price</option>
          <option value="under25">Under $25</option>
          <option value="under50">Under $50</option>
          <option value="50to150">$50 – $150</option>
          <option value="150plus">$150+</option>
        </select>

        <select
          value={sort}
          onChange={(e) =>
            setSort(e.target.value as "discount" | "savings" | "newest")
          }
          aria-label="Sort deals"
          className="rounded-xl border border-[#DCDCD4] bg-[#FAFAF8] px-3 py-2 text-sm font-medium text-[#111111] focus:border-[#111111] focus:bg-white focus:outline-none"
        >
          <option value="discount">Sort: Biggest % Off</option>
          <option value="savings">Sort: Most $ Saved</option>
          <option value="newest">Sort: Newest</option>
        </select>
      </section>

      {/* Results count + Clear */}
      <div className="mb-4 flex items-center justify-between text-xs text-[#66665E]">
        <span>
          Showing{" "}
          <strong className="font-mono text-[#111111]">
            {deals.length.toLocaleString()}
          </strong>{" "}
          of{" "}
          <strong className="font-mono text-[#111111]">
            {total.toLocaleString()}
          </strong>{" "}
          real catalog items
        </span>
        {hasFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="font-semibold text-[#111111] underline underline-offset-2"
          >
            Clear all filters
          </button>
        )}
      </div>

      {/* Product Grid */}
      {loading ? (
        <div className="grid grid-cols-2 gap-3.5 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="aspect-[3/4] animate-pulse rounded-2xl border border-[#EAEAE2] bg-white"
            />
          ))}
        </div>
      ) : deals.length === 0 ? (
        <div className="rounded-2xl border border-[#EAEAE2] bg-white px-6 py-16 text-center">
          <h3 className="font-serif text-2xl text-[#111111]">
            No matching deals right now
          </h3>
          <p className="mt-2 text-sm text-[#66665E]">
            Try lowering your minimum % off or clearing a filter to see more
            live price drops.
          </p>
          <button
            type="button"
            onClick={clearFilters}
            className="mt-5 rounded-xl bg-[#111111] px-5 py-2.5 text-sm font-semibold text-white"
          >
            Reset filters
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3.5 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
            {deals.map((deal) => (
              <DealCard key={deal.id} deal={deal} />
            ))}
          </div>

          {deals.length < total && (
            <div className="mt-10 flex justify-center">
              <button
                type="button"
                disabled={loadingMore}
                onClick={() => void fetchFiltered(deals.length, true)}
                className="rounded-xl border border-[#111111] bg-white px-7 py-3 text-sm font-semibold text-[#111111] transition-colors hover:bg-[#111111] hover:text-white disabled:opacity-50"
              >
                {loadingMore
                  ? "Loading more drops..."
                  : `Load more drops (${(total - deals.length).toLocaleString()} remaining)`}
              </button>
            </div>
          )}
        </>
      )}

      {/* Major Retailers Coming Soon Banner */}
      {pendingPreviewBrands.length > 0 && (
        <section className="mt-14 rounded-2xl border border-[#E6E6DE] bg-white p-6 sm:p-8">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <span className="font-mono text-xs font-semibold uppercase tracking-wider text-[#6B6B63]">
                Expanding Coverage · Official Feeds Queued
              </span>
              <h2 className="mt-1 font-serif text-2xl text-[#111111] sm:text-3xl">
                {stats.pendingBrandsCount} major retailers coming soon
              </h2>
              <p className="mt-1 max-w-2xl text-sm text-[#5A5A52]">
                Our multi-source adapters are built for Impact, Rakuten, CJ,
                Awin, Best Buy, Walmart, and Amazon feeds. These brand pages are
                live in our directory and activate automatically once partner
                feed keys are connected.
              </p>
            </div>
            <Link
              href="/deals/brands?status=pending_key"
              className="shrink-0 rounded-xl border border-[#111111] px-4 py-2.5 text-xs font-semibold text-[#111111] transition-colors hover:bg-[#111111] hover:text-white"
            >
              View all {stats.totalDirectoryBrands} brands &rarr;
            </Link>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {pendingPreviewBrands.slice(0, 18).map((b) => (
              <Link
                key={b.slug}
                href={`/deals/brand/${encodeURIComponent(b.slug)}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#E4E4DC] bg-[#FAFAF8] px-3 py-1.5 text-xs font-medium text-[#333330] transition-colors hover:border-[#111111]"
              >
                <span>{b.name}</span>
                <span className="rounded-full bg-[#EFEFEA] px-1.5 py-0.5 font-mono text-[10px] text-[#777770]">
                  Soon
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

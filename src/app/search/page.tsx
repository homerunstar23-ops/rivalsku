import type { Metadata } from "next";
import Link from "next/link";
import { DealCard } from "@/components/deals/DealCard";
import { DealsFooter } from "@/components/deals/DealsFooter";
import { DealsHeader } from "@/components/deals/DealsHeader";
import { SearchBar } from "@/components/deals/SearchBar";
import { sourceLabel, statusLabel, TONE_CLASS } from "@/lib/brand-status";
import { getDealsStats } from "@/lib/deals-engine";
import { searchAll } from "@/lib/search";

export const dynamic = "force-dynamic";

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ q?: string }> }): Promise<Metadata> {
  const { q } = await searchParams;
  return {
    title: q ? `“${q}” — deals & brands` : "Search brands & deals",
    description: "Search price drops and products across big-name and indie brands on RivalSKU Drops.",
    robots: { index: false, follow: true },
  };
}

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string; category?: string }> }) {
  const { q = "", category } = await searchParams;
  const stats = getDealsStats();
  const res = searchAll(q, { productLimit: 96, brandLimit: 12, category });

  return (
    <div className="min-h-screen bg-[#FAFAF8] text-[#111111]">
      <DealsHeader liveBrandsCount={stats.liveBrandsCount} totalBrandsCount={stats.totalDirectoryBrands} />
      <main className="mx-auto max-w-7xl px-4 pb-16 pt-8 sm:px-6">
        <div className="max-w-3xl">
          <h1 className="font-serif text-3xl text-[#111111] sm:text-4xl">{q ? <>Results for “{q}”</> : "Search brands & deals"}</h1>
          <div className="mt-4"><SearchBar variant="hero" initialQuery={q} autoFocus={!q} /></div>
          {q && (
            <p className="mt-2 text-xs text-[#77776F]">
              {res.brands.length} brands · {res.totalProducts.toLocaleString()} products · {res.tookMs} ms
            </p>
          )}
        </div>

        {q && res.brands.length > 0 && (
          <section className="mt-8">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#66665E]">Brands</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {res.brands.map((b) => {
                const st = statusLabel(b);
                return (
                  <Link key={b.slug} href={`/deals/brand/${encodeURIComponent(b.slug)}`} className="rounded-2xl border border-[#EAEAE2] bg-white p-4 transition-colors hover:border-[#111111]">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-semibold">{b.name}</span>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold ${TONE_CLASS[st.tone]}`}>{st.text}</span>
                    </div>
                    <p className="mt-1 truncate font-mono text-xs text-[#777770]">{b.domain.replace(/^www\./, "")}</p>
                    <p className="mt-2 text-[11px] text-[#66665E]">
                      {b.category} · {sourceLabel(b)}
                      {b.liveDealCount ? ` · ${b.liveDealCount} drops` : ""}
                    </p>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {q && (
          <section className="mt-10">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#66665E]">Products</h2>
            {res.products.length === 0 ? (
              <div className="rounded-2xl border border-[#EAEAE2] bg-white p-10 text-center text-sm text-[#66665E]">
                No live products match “{q}”.{" "}
                {res.brands.some((b) => b.status !== "live") ? "Some matching brands are coming soon — their feeds aren't connected yet." : "Try a broader term."}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3.5 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
                {res.products.map((d) => <DealCard key={d.id} deal={d} />)}
              </div>
            )}
          </section>
        )}
      </main>
      <DealsFooter />
    </div>
  );
}

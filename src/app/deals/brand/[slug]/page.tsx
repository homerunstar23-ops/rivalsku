import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DealCard } from "@/components/deals/DealCard";
import { DealsFooter } from "@/components/deals/DealsFooter";
import { DealsHeader } from "@/components/deals/DealsHeader";
import { EmailCaptureBar } from "@/components/deals/EmailCaptureBar";
import { ShareDealButton } from "@/components/deals/ShareDealButton";
import { getBrandBySlug } from "@/lib/adapters";
import { getBrandDeals, getDealsStats } from "@/lib/deals-engine";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const brand = getBrandBySlug(decodeURIComponent(slug));
  if (!brand) {
    return { title: "Brand Not Found · RivalSKU Drops" };
  }
  const deals = brand.status === "live" ? getBrandDeals(brand) : [];
  const topPct = deals.reduce((m, d) => Math.max(m, d.discountPct), 0);

  const title =
    brand.status === "live" && topPct > 0
      ? `${brand.name} Sale & Price Drops — Up to ${topPct}% Off`
      : `${brand.name} Price Drops & Sale Tracker (${brand.status === "live" ? "Live" : "Coming Soon"})`;

  const description =
    brand.status === "live"
      ? `Live ${brand.name} (${brand.domain}) markdowns, restocks, and new drops verified directly from their catalog. Tracked daily on RivalSKU Drops.`
      : `${brand.name} (${brand.domain}) is tracked in the RivalSKU Drops directory under ${brand.category}. Official ${brand.networkName} feed integration is queued — subscribe for launch alerts.`;

  const ogImg = `/deals/brand/${encodeURIComponent(brand.slug)}/opengraph-image`;

  return {
    title,
    description,
    openGraph: { title, description, images: [ogImg] },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImg],
    },
  };
}

export default async function BrandDealsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const brand = getBrandBySlug(decodeURIComponent(slug));
  if (!brand) notFound();

  const stats = getDealsStats();
  const deals = brand.status === "live" ? getBrandDeals(brand) : [];
  const discounts = deals.filter((d) => d.discountPct >= 10);
  const maxPct = discounts.reduce((m, d) => Math.max(m, d.discountPct), 0);

  return (
    <div className="min-h-screen bg-[#FAFAF8] text-[#111111]">
      <DealsHeader
        liveBrandsCount={stats.liveBrandsCount}
        totalBrandsCount={stats.totalDirectoryBrands}
      />

      <main className="mx-auto max-w-7xl px-4 pb-16 pt-8 sm:px-6">
        <nav className="mb-6 flex items-center gap-2 text-xs text-[#66665E]">
          <Link href="/deals" className="hover:text-[#111111] hover:underline">
            All Drops
          </Link>
          <span>/</span>
          <Link
            href="/deals/brands"
            className="hover:text-[#111111] hover:underline"
          >
            Brand Directory
          </Link>
          <span>/</span>
          <span className="text-[#111111]">{brand.name}</span>
        </nav>

        <section className="mb-8 rounded-3xl border border-[#EAEAE2] bg-white p-6 sm:p-8">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-[#EFEFEA] px-3 py-1 text-xs font-semibold text-[#333330]">
                  {brand.category}
                </span>
                {brand.status === "live" ? (
                  <span className="rounded-full bg-[#0D7C47]/10 px-3 py-1 font-mono text-xs font-semibold text-[#0D7C47]">
                    Live Catalog · {brand.networkName}
                  </span>
                ) : (
                  <span className="rounded-full bg-[#FEF3C7] px-3 py-1 font-mono text-xs font-semibold text-[#92400E]">
                    Coming Soon · {brand.networkName}
                  </span>
                )}
              </div>

              <h1 className="mt-3 font-serif text-4xl text-[#111111] sm:text-5xl">
                {brand.name} Drops
              </h1>
              <p className="mt-2 text-sm text-[#555550] sm:text-base">
                {brand.status === "live" ? (
                  <>
                    Tracking <span className="font-mono">{brand.domain}</span>{" "}
                    directly.{" "}
                    {deals.length > 0
                      ? `${deals.length} active drops, restocks & new launches${maxPct > 0 ? ` (up to ${maxPct}% off)` : ""}.`
                      : "No active markdowns above 10% detected today — check back tomorrow."}
                  </>
                ) : (
                  <>
                    <span className="font-mono">{brand.domain}</span> is
                    verified in our {stats.totalDirectoryBrands}-brand directory.
                    Live deals unlock automatically as soon as the official{" "}
                    <strong>{brand.networkName}</strong> feed key is active.
                  </>
                )}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <ShareDealButton
                title={`${brand.name} Price Drops on RivalSKU`}
                urlPath={`/deals/brand/${encodeURIComponent(brand.slug)}`}
              />
              <a
                href={`https://${brand.domain}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-xl border border-[#111111] bg-[#111111] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#2B2B28]"
              >
                Visit {brand.domain} &rarr;
              </a>
            </div>
          </div>
        </section>

        {brand.status === "pending_key" ? (
          <section className="mb-10 rounded-3xl border border-dashed border-[#D6D6CC] bg-white p-8 text-center sm:p-12">
            <span className="inline-flex rounded-full bg-[#FEF3C7] px-3.5 py-1 font-mono text-xs font-semibold uppercase tracking-wider text-[#92400E]">
              Coming Soon
            </span>
            <h2 className="mt-4 font-serif text-3xl text-[#111111]">
              {brand.name} live feed is queued
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-[#555550]">
              We never display fake or stale prices. {brand.name} uses{" "}
              <strong>{brand.networkName}</strong> instead of a public catalog
              feed, and our adapter is ready to go live as soon as partner
              credentials are connected.
            </p>
            <div className="mx-auto mt-8 max-w-3xl text-left">
              <EmailCaptureBar categories={stats.categories} compact />
            </div>
          </section>
        ) : deals.length === 0 ? (
          <section className="mb-10 rounded-3xl border border-[#EAEAE2] bg-white p-8 text-center sm:p-12">
            <h2 className="font-serif text-2xl text-[#111111]">
              {brand.name} is full-price today
            </h2>
            <p className="mx-auto mt-2 max-w-lg text-sm text-[#555550]">
              We checked {brand.domain} and found no items currently marked down
              10%+ or newly launched in the past 14 days. Join the morning drop
              digest to get alerted as soon as a sale starts.
            </p>
            <div className="mt-6">
              <Link
                href="/deals"
                className="inline-flex rounded-xl bg-[#111111] px-5 py-2.5 text-sm font-semibold text-white"
              >
                Browse all live drops &rarr;
              </Link>
            </div>
          </section>
        ) : (
          <>
            <div className="mb-8">
              <EmailCaptureBar categories={stats.categories} compact />
            </div>
            <div className="grid grid-cols-2 gap-3.5 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
              {deals.map((deal) => (
                <DealCard key={deal.id} deal={deal} />
              ))}
            </div>
          </>
        )}
      </main>

      <DealsFooter />
    </div>
  );
}

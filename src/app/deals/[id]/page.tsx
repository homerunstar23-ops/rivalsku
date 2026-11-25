import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DealCard } from "@/components/deals/DealCard";
import { DealsFooter } from "@/components/deals/DealsFooter";
import { DealsHeader } from "@/components/deals/DealsHeader";
import { EmailCaptureBar } from "@/components/deals/EmailCaptureBar";
import { ShareDealButton } from "@/components/deals/ShareDealButton";
import { getDealById, getDealsStats, queryDeals } from "@/lib/deals-engine";

export const dynamic = "force-dynamic";

function money(n: number) {
  return n % 1 === 0 ? `$${n.toFixed(0)}` : `$${n.toFixed(2)}`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const deal = getDealById(decodeURIComponent(id));
  if (!deal) {
    return { title: "Deal Not Found · RivalSKU Drops" };
  }
  const title =
    deal.discountPct >= 10
      ? `${deal.discountPct}% Off ${deal.brandName} ${deal.title} (${money(deal.nowPrice)})`
      : `${deal.brandName} — ${deal.title} (${money(deal.nowPrice)})`;
  const description =
    deal.discountPct >= 10
      ? `Live price drop at ${deal.brandName}: ${deal.title} is now ${money(deal.nowPrice)} (was ${money(deal.wasPrice)}, save ${money(deal.savingsDollars)}). Verified straight from ${deal.brandDomain}.`
      : `${deal.brandName} catalog item: ${deal.title} for ${money(deal.nowPrice)} at ${deal.brandDomain}.`;
  const ogImg = `/deals/${encodeURIComponent(deal.id)}/opengraph-image`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [ogImg],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImg],
    },
  };
}

export default async function DealDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const deal = getDealById(decodeURIComponent(id));
  if (!deal) notFound();

  const stats = getDealsStats();
  const related = queryDeals({
    brand: deal.brandSlug,
    sort: "discount",
    limit: 5,
  }).filter((d) => d.id !== deal.id).slice(0, 4);

  const isDiscount = deal.discountPct >= 10 && deal.wasPrice > deal.nowPrice;

  return (
    <div className="min-h-screen bg-[#FAFAF8] text-[#111111]">
      <DealsHeader
        liveBrandsCount={stats.liveBrandsCount}
        totalBrandsCount={stats.totalDirectoryBrands}
      />

      <main className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6">
        <nav className="mb-6 flex items-center gap-2 text-xs text-[#66665E]">
          <Link href="/deals" className="hover:text-[#111111] hover:underline">
            All Drops
          </Link>
          <span>/</span>
          <Link
            href={`/deals/brand/${encodeURIComponent(deal.brandSlug)}`}
            className="hover:text-[#111111] hover:underline"
          >
            {deal.brandName}
          </Link>
          <span>/</span>
          <span className="truncate text-[#111111]">{deal.title}</span>
        </nav>

        <div className="grid gap-8 rounded-3xl border border-[#EAEAE2] bg-white p-5 sm:p-8 lg:grid-cols-2 lg:gap-12">
          <div className="overflow-hidden rounded-2xl bg-[#F3F3EE]">
            {deal.imageUrl ? (
              <img
                src={deal.imageUrl}
                alt={`${deal.brandName} ${deal.title}`}
                className="aspect-[4/5] w-full object-cover"
              />
            ) : (
              <div className="flex aspect-[4/5] items-center justify-center text-sm text-[#888880]">
                {deal.brandName}
              </div>
            )}
          </div>

          <div className="flex flex-col justify-center">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/deals/brand/${encodeURIComponent(deal.brandSlug)}`}
                className="rounded-full border border-[#E0E0D8] bg-[#FAFAF8] px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[#333330] hover:border-[#111111]"
              >
                {deal.brandName}
              </Link>
              <span className="rounded-full bg-[#EFEFEA] px-3 py-1 text-xs font-medium text-[#555550]">
                {deal.category}
              </span>
              {isDiscount && (
                <span className="rounded-full bg-[#0D7C47] px-3 py-1 font-mono text-xs font-semibold text-white">
                  -{deal.discountPct}% OFF
                </span>
              )}
            </div>

            <h1 className="mt-4 font-serif text-3xl leading-tight text-[#111111] sm:text-4xl">
              {deal.title}
            </h1>

            {deal.variantTitle && (
              <p className="mt-2 text-sm text-[#66665E]">
                Variant: {deal.variantTitle}
              </p>
            )}

            <div className="mt-6 flex flex-wrap items-baseline gap-3 border-y border-[#EFEFE8] py-5">
              <span className="font-mono text-3xl font-semibold text-[#111111]">
                {money(deal.nowPrice)}
              </span>
              {isDiscount && (
                <>
                  <span className="font-mono text-xl text-[#8C8C82] line-through">
                    {money(deal.wasPrice)}
                  </span>
                  <span className="rounded-lg bg-[#0D7C47]/10 px-2.5 py-1 font-mono text-sm font-semibold text-[#0D7C47]">
                    You save {money(deal.savingsDollars)}
                  </span>
                </>
              )}
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <a
                href={`/go/${encodeURIComponent(deal.id)}`}
                target="_blank"
                rel="noopener noreferrer sponsored"
                className="inline-flex flex-1 items-center justify-center rounded-xl bg-[#111111] px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-[#2B2B28]"
              >
                Shop at {deal.brandName} &rarr;
              </a>
              <ShareDealButton
                title={`${deal.brandName} ${deal.title}`}
                urlPath={`/deals/${encodeURIComponent(deal.id)}`}
              />
            </div>

            <dl className="mt-7 grid grid-cols-2 gap-4 rounded-2xl bg-[#FAFAF8] p-4 text-xs">
              <div>
                <dt className="text-[#777770]">Official Storefront</dt>
                <dd className="mt-0.5 font-mono font-medium text-[#111111]">
                  {deal.brandDomain}
                </dd>
              </div>
              <div>
                <dt className="text-[#777770]">Availability</dt>
                <dd className="mt-0.5 font-medium text-[#0D7C47]">
                  {deal.available ? "In Stock" : "Limited Stock"}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        <div className="mt-10">
          <EmailCaptureBar categories={stats.categories} compact />
        </div>

        {related.length > 0 && (
          <section className="mt-12">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-serif text-2xl text-[#111111]">
                More live drops from {deal.brandName}
              </h2>
              <Link
                href={`/deals/brand/${encodeURIComponent(deal.brandSlug)}`}
                className="text-sm font-semibold text-[#111111] hover:underline"
              >
                View all &rarr;
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {related.map((item) => (
                <DealCard key={item.id} deal={item} />
              ))}
            </div>
          </section>
        )}
      </main>

      <DealsFooter />
    </div>
  );
}

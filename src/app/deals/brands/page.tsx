import type { Metadata } from "next";
import { BrandDirectoryView } from "@/components/deals/BrandDirectoryView";
import { DealsFooter } from "@/components/deals/DealsFooter";
import { DealsHeader } from "@/components/deals/DealsHeader";
import { getAdapterStatuses, getBrandDirectory } from "@/lib/adapters";
import { getDealsStats } from "@/lib/deals-engine";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Brand Directory (397 Tracked Brands) · RivalSKU Drops",
  description:
    "Browse all 397 brands and major retailers tracked by RivalSKU Drops across Shopify, Impact, Rakuten, CJ, Awin, Best Buy, Walmart, and Amazon adapters.",
};

export default async function BrandsDirectoryPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const sp = await searchParams;
  const brands = getBrandDirectory();
  const adapters = getAdapterStatuses();
  const stats = getDealsStats();

  return (
    <div className="min-h-screen bg-[#FAFAF8] text-[#111111]">
      <DealsHeader
        liveBrandsCount={stats.liveBrandsCount}
        totalBrandsCount={stats.totalDirectoryBrands}
      />
      <BrandDirectoryView
        brands={brands}
        adapters={adapters}
        categories={stats.categories}
        initialStatus={sp.status || "all"}
      />
      <DealsFooter />
    </div>
  );
}

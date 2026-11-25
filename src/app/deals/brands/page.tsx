import type { Metadata } from "next";
import { BrandDirectoryView } from "@/components/deals/BrandDirectoryView";
import { DealsFooter } from "@/components/deals/DealsFooter";
import { DealsHeader } from "@/components/deals/DealsHeader";
import { getAdapterStatuses, getBrandDirectory } from "@/lib/adapters";
import { getDealsStats } from "@/lib/deals-engine";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Brand Directory & Search — Big-Name and Indie Brands · RivalSKU Drops",
  description:
    "Search every brand and major retailer tracked by RivalSKU Drops, with each brand's live data source or coming-soon status.",
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

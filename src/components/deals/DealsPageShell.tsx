import { getBrandDirectory } from "@/lib/adapters";
import { getDealsStats, queryDeals } from "@/lib/deals-engine";
import { DealsExplorer } from "./DealsExplorer";
import { DealsFooter } from "./DealsFooter";
import { DealsHeader } from "./DealsHeader";

export function DealsPageShell({
  initialCategory = "all",
}: {
  initialCategory?: string;
}) {
  const stats = getDealsStats();
  const directory = getBrandDirectory();
  const liveBrands = directory
    .filter((b) => b.status === "live")
    .map((b) => ({ slug: b.slug, name: b.name }));
  const pendingPreviewBrands = directory.filter(
    (b) => b.status === "pending_key",
  );

  const initialMatches = queryDeals({
    section: "biggest_drop",
    category: initialCategory,
    sort: "discount",
  });

  return (
    <div className="min-h-screen bg-[#FAFAF8] text-[#111111]">
      <DealsHeader
        liveBrandsCount={stats.liveBrandsCount}
        totalBrandsCount={stats.totalDirectoryBrands}
      />
      <DealsExplorer
        initialDeals={initialMatches.slice(0, 48)}
        initialTotal={initialMatches.length}
        stats={stats}
        liveBrands={liveBrands}
        pendingPreviewBrands={pendingPreviewBrands}
        initialCategory={initialCategory}
      />
      <DealsFooter />
    </div>
  );
}

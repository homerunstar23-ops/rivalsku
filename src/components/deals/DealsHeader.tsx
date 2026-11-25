import Link from "next/link";

export function DealsHeader({
  liveBrandsCount,
  totalBrandsCount,
}: {
  liveBrandsCount?: number;
  totalBrandsCount?: number;
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-[#EAEAE4] bg-[#FAFAF8]/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
        <div className="flex items-center gap-3">
          <Link
            href="/deals"
            className="flex items-center gap-2.5 text-[#111111] transition-opacity hover:opacity-80"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#111111] text-sm font-semibold tracking-tight text-white">
              R
            </span>
            <div className="leading-none">
              <span className="font-serif text-xl tracking-tight text-[#111111]">
                RivalSKU
              </span>
              <span className="ml-1.5 rounded-full bg-[#0D7C47]/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-[#0D7C47]">
                Drops
              </span>
            </div>
          </Link>
          {typeof liveBrandsCount === "number" && (
            <span className="hidden rounded-full border border-[#E4E4DD] bg-white px-2.5 py-0.5 font-mono text-[11px] text-[#555550] md:inline-flex">
              {liveBrandsCount} live{" "}
              {totalBrandsCount ? `· ${totalBrandsCount} tracked` : "brands"}
            </span>
          )}
        </div>

        <nav className="flex items-center gap-2 sm:gap-4">
          <Link
            href="/deals"
            className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-[#222220] transition-colors hover:bg-[#EFEFEA]"
          >
            Live Drops
          </Link>
          <Link
            href="/deals/brands"
            className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-[#222220] transition-colors hover:bg-[#EFEFEA]"
          >
            Brands
          </Link>
          <Link
            href="/b2b"
            className="hidden rounded-lg border border-[#DCDCD4] bg-white px-3 py-1.5 text-xs font-medium text-[#444440] transition-colors hover:border-[#111111] hover:text-[#111111] sm:inline-flex"
          >
            For Brands (B2B)
          </Link>
        </nav>
      </div>
    </header>
  );
}

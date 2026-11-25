import Link from "next/link";

const CATEGORIES = [
  "Apparel",
  "Footwear",
  "Home",
  "Beauty",
  "Kitchen",
  "Outdoor",
  "Wellness",
  "Tech Accessories",
  "Jewelry",
  "Kids",
  "Pets",
];

export function DealsFooter() {
  return (
    <footer className="mt-16 border-t border-[#E6E6DF] bg-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#111111] text-xs font-semibold text-white">
                R
              </span>
              <span className="font-serif text-xl text-[#111111]">
                RivalSKU Drops
              </span>
            </div>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-[#555550]">
              A free daily tracker for real price drops, markdowns, restocks,
              and new launches from big-name retailers and indie brands — pulled straight
              from store catalogs with zero fake coupon codes.
            </p>
            <p className="mt-3 text-xs text-[#777770]">
              Disclosure: Some outbound links may include affiliate tracking at
              no extra cost to you. Prices and availability update continuously
              from official brand catalogs.
            </p>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#111111]">
              Categories
            </h3>
            <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm text-[#555550]">
              {CATEGORIES.map((cat) => (
                <li key={cat}>
                  <Link
                    href={`/deals?category=${encodeURIComponent(cat)}`}
                    className="hover:text-[#111111] hover:underline"
                  >
                    {cat}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#111111]">
              Platform
            </h3>
            <ul className="mt-3 space-y-2 text-sm text-[#555550]">
              <li>
                <Link href="/deals" className="hover:text-[#111111] hover:underline">
                  Today&apos;s Top Drops
                </Link>
              </li>
              <li>
                <Link
                  href="/deals/brands"
                  className="hover:text-[#111111] hover:underline"
                >
                  Brand Directory & Search
                </Link>
              </li>
              <li>
                <Link
                  href="/black-friday-index"
                  className="hover:text-[#111111] hover:underline"
                >
                  DTC Discount Index
                </Link>
              </li>
              <li>
                <Link href="/b2b" className="hover:text-[#111111] hover:underline">
                  RivalSKU for Brand Teams
                </Link>
              </li>
              <li>
                <Link
                  href="/dashboard"
                  className="hover:text-[#111111] hover:underline"
                >
                  Brand Monitor Dashboard
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}

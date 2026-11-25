import type { Metadata } from "next";
import { DealsPageShell } from "@/components/deals/DealsPageShell";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "RivalSKU Drops — Search Live Price Drops Across Big-Name & Indie Brands",
  description:
    "Track real-time markdowns, restocks, and new product drops across Old Navy, Banana Republic, Athleta, iRobot, Harry & David, Skullcandy, HexClad and 60+ more live brands. Search nearly 500 brands in one place. Updated daily.",
  openGraph: {
    title: "RivalSKU Drops — Real-Time Price Drops, Big Names to Indie Brands",
    description:
      "Live catalog markdowns, back-in-stock alerts, and new launches from big-name retailers and indie brands. Zero fake coupon codes.",
    images: ["/deals/opengraph-image"],
  },
  twitter: {
    card: "summary_large_image",
    title: "RivalSKU Drops — Real-Time Price Drops, Big Names to Indie Brands",
    description:
      "Live catalog markdowns, back-in-stock alerts, and new launches from big-name retailers and indie brands.",
    images: ["/deals/opengraph-image"],
  },
};

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const sp = await searchParams;
  return <DealsPageShell initialCategory={sp.category || "all"} />;
}

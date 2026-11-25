import type { Metadata } from "next";
import { DealsPageShell } from "@/components/deals/DealsPageShell";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Live Price Drops & Sales — 340+ Cult Brands",
  description:
    "Browse the biggest real-time price drops, restocks, and new launches across 340+ verified consumer brands. Updated daily straight from brand catalogs.",
  openGraph: {
    title: "RivalSKU Drops — Live Price Drops Across 340+ Cult Brands",
    description:
      "Real catalog markdowns, back-in-stock alerts, and new launches across 340+ top brands. Zero fake coupon codes.",
    images: ["/deals/opengraph-image"],
  },
  twitter: {
    card: "summary_large_image",
    title: "RivalSKU Drops — Live Price Drops Across 340+ Cult Brands",
    description:
      "Real catalog markdowns, back-in-stock alerts, and new launches across 340+ top brands.",
    images: ["/deals/opengraph-image"],
  },
};

export default async function DealsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const sp = await searchParams;
  return <DealsPageShell initialCategory={sp.category || "all"} />;
}

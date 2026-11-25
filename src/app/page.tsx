import type { Metadata } from "next";
import { DealsPageShell } from "@/components/deals/DealsPageShell";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "RivalSKU Drops — Live Price Drops Across 340+ Cult Brands",
  description:
    "Track real-time markdowns, restocks, and new product drops across Lunya, DÔEN, Allbirds, Brooklinen, Gymshark, Our Place & 340+ top consumer brands. Updated daily.",
  openGraph: {
    title: "RivalSKU Drops — Real-Time Price Drops Across 340+ Brands",
    description:
      "Live catalog markdowns, back-in-stock alerts, and new launches across 340+ cult DTC brands. Zero fake coupon codes.",
    images: ["/deals/opengraph-image"],
  },
  twitter: {
    card: "summary_large_image",
    title: "RivalSKU Drops — Real-Time Price Drops Across 340+ Brands",
    description:
      "Live catalog markdowns, back-in-stock alerts, and new launches across 340+ cult DTC brands.",
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

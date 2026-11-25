import { ImageResponse } from "next/og";
import { getBrandBySlug } from "@/lib/adapters";
import { getBrandDeals } from "@/lib/deals-engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const alt = "Brand Price Drops · RivalSKU Drops";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const brand = getBrandBySlug(decodeURIComponent(slug));
  const deals = brand && brand.status === "live" ? getBrandDeals(brand) : [];
  const maxPct = deals.reduce((m, d) => Math.max(m, d.discountPct), 0);

  const subline =
    brand?.status === "live"
      ? deals.length > 0
        ? `${deals.length} tracked drops${maxPct > 0 ? ` · Up to ${maxPct}% off` : ""}`
        : `Monitoring ${brand.domain} daily for markdowns & restocks`
      : `Queued via ${brand?.networkName || "Official Feed"}`;

  const footerUrl = `rivalsku.com/deals/brand/${brand?.slug || ""}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#FAFAF8",
          padding: "56px 64px",
          color: "#111111",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: "28px", fontWeight: 700 }}>RivalSKU Drops</span>
          <span
            style={{
              background: brand?.status === "live" ? "#0D7C47" : "#92400E",
              color: "#FFFFFF",
              padding: "10px 22px",
              borderRadius: "999px",
              fontSize: "20px",
              fontWeight: 700,
            }}
          >
            {brand?.status === "live" ? "Live Catalog" : "Coming Soon"}
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ display: "flex", fontSize: "24px", color: "#66665E", textTransform: "uppercase" }}>
            {brand?.category || "Brand Tracker"}
          </div>
          <div style={{ display: "flex", fontSize: "68px", fontWeight: 700, letterSpacing: "-0.03em" }}>
            {brand?.name || "RivalSKU Brand"}
          </div>
          <div style={{ display: "flex", fontSize: "30px", color: "#444440" }}>
            {subline}
          </div>
        </div>

        <div style={{ display: "flex", fontSize: "22px", color: "#66665E" }}>
          {footerUrl}
        </div>
      </div>
    ),
    { ...size },
  );
}

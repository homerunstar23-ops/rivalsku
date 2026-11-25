import { ImageResponse } from "next/og";
import { getDealsStats, queryDeals } from "@/lib/deals-engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const alt = "RivalSKU Drops — Real-Time Price Drops From Big Names to Indie Brands";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const stats = getDealsStats();
  const top3 = queryDeals({
    section: "biggest_drop",
    sort: "discount",
    limit: 3,
  });

  const badgeText = `${stats.liveBrandsCount} Live Brands · ${stats.totalDeals.toLocaleString()} Drops`;

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
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "12px",
                background: "#111111",
                color: "#FFFFFF",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "26px",
                fontWeight: 700,
              }}
            >
              R
            </div>
            <div style={{ display: "flex", fontSize: "34px", fontWeight: 700, letterSpacing: "-0.02em" }}>
              RivalSKU Drops
            </div>
          </div>
          <div
            style={{
              display: "flex",
              background: "#0D7C47",
              color: "#FFFFFF",
              borderRadius: "999px",
              padding: "10px 22px",
              fontSize: "20px",
              fontWeight: 700,
            }}
          >
            {badgeText}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div
            style={{
              display: "flex",
              fontSize: "58px",
              fontWeight: 700,
              lineHeight: 1.08,
              letterSpacing: "-0.03em",
            }}
          >
            Real-time price drops, big names to indie brands.
          </div>
          <div style={{ display: "flex", fontSize: "24px", color: "#555550" }}>
            Verified daily straight from official store catalogs. Zero expired promo codes.
          </div>
        </div>

        <div style={{ display: "flex", gap: "18px" }}>
          {top3.map((d) => (
            <div
              key={d.id}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                background: "#FFFFFF",
                border: "2px solid #E5E5DC",
                borderRadius: "20px",
                padding: "20px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "16px", fontWeight: 700, color: "#66665E", textTransform: "uppercase" }}>
                  {d.brandName}
                </span>
                <span
                  style={{
                    background: "#0D7C47",
                    color: "#FFFFFF",
                    borderRadius: "999px",
                    padding: "4px 12px",
                    fontSize: "16px",
                    fontWeight: 700,
                  }}
                >
                  {`-${d.discountPct}%`}
                </span>
              </div>
              <div style={{ display: "flex", fontSize: "20px", fontWeight: 600, marginTop: "10px", color: "#111111" }}>
                {d.title.slice(0, 38)}
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: "10px", marginTop: "12px" }}>
                <span style={{ fontSize: "26px", fontWeight: 700 }}>
                  {`$${d.nowPrice.toFixed(0)}`}
                </span>
                <span style={{ fontSize: "18px", color: "#888880", textDecoration: "line-through" }}>
                  {`$${d.wasPrice.toFixed(0)}`}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size },
  );
}

import { ImageResponse } from "next/og";
import { getDealById } from "@/lib/deals-engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const alt = "RivalSKU Live Price Drop";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

function money(n: number) {
  return n % 1 === 0 ? `$${n.toFixed(0)}` : `$${n.toFixed(2)}`;
}

export default async function Image({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const deal = getDealById(decodeURIComponent(id));

  if (!deal) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#FAFAF8",
            fontSize: "44px",
            fontWeight: 700,
            color: "#111111",
          }}
        >
          RivalSKU Drops
        </div>
      ),
      { ...size },
    );
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#FAFAF8",
          padding: "48px",
          gap: "44px",
          color: "#111111",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            width: "440px",
            height: "534px",
            borderRadius: "24px",
            overflow: "hidden",
            background: "#EEEEEC",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {deal.imageUrl ? (
            <img
              src={deal.imageUrl}
              alt={deal.title}
              style={{ width: "440px", height: "534px", objectFit: "cover" }}
            />
          ) : (
            <div style={{ display: "flex", fontSize: "28px", fontWeight: 700 }}>
              {deal.brandName}
            </div>
          )}
        </div>

        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "12px 0",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span
              style={{
                fontSize: "22px",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                color: "#555550",
              }}
            >
              {deal.brandName}
            </span>
            {deal.discountPct >= 10 && (
              <span
                style={{
                  background: "#0D7C47",
                  color: "#FFFFFF",
                  padding: "10px 22px",
                  borderRadius: "999px",
                  fontSize: "24px",
                  fontWeight: 700,
                }}
              >
                {`-${deal.discountPct}% OFF`}
              </span>
            )}
          </div>

          <div
            style={{
              display: "flex",
              fontSize: "48px",
              fontWeight: 700,
              lineHeight: 1.12,
              letterSpacing: "-0.02em",
            }}
          >
            {deal.title.slice(0, 72)}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: "18px" }}>
              <span style={{ fontSize: "54px", fontWeight: 700 }}>
                {money(deal.nowPrice)}
              </span>
              {deal.wasPrice > deal.nowPrice && (
                <span
                  style={{
                    fontSize: "34px",
                    color: "#888880",
                    textDecoration: "line-through",
                  }}
                >
                  {money(deal.wasPrice)}
                </span>
              )}
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                borderTop: "2px solid #E5E5DC",
                paddingTop: "18px",
                fontSize: "20px",
                color: "#555550",
              }}
            >
              <span>RivalSKU Drops · Verified Catalog Markdown</span>
              <span>rivalsku.com/deals</span>
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}

import { NextRequest, NextResponse } from "next/server";
import { isAllowedProductUrl, resolveOutboundUrl } from "@/lib/affiliate";
import { getDb, nowIso } from "@/lib/db";
import { getDealById } from "@/lib/deals-engine";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const decodedId = decodeURIComponent(id);
  const deal = getDealById(decodedId);

  if (!deal) {
    return NextResponse.redirect(new URL("/deals", req.url), 302);
  }

  if (!isAllowedProductUrl(deal.productUrl)) {
    return NextResponse.redirect(new URL("/deals", req.url), 302);
  }

  const { finalUrl, network } = resolveOutboundUrl(
    deal.productUrl,
    deal.brandDomain,
  );
  const createdAt = nowIso();
  const referer = req.headers.get("referer") || null;

  try {
    getDb()
      .prepare(
        `INSERT INTO deal_clicks (deal_id, brand_domain, brand_name, target_url, affiliate_network, referer, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        deal.id,
        deal.brandDomain,
        deal.brandName,
        finalUrl,
        network,
        referer,
        createdAt,
      );
  } catch {
    // Non-blocking if DB write has contention
  }

  console.log(
    JSON.stringify({
      event: "deal_click",
      dealId: deal.id,
      brandDomain: deal.brandDomain,
      brandName: deal.brandName,
      discountPct: deal.discountPct,
      nowPrice: deal.nowPrice,
      network,
      createdAt,
    }),
  );

  return NextResponse.redirect(finalUrl, 302);
}

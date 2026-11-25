import { NextRequest, NextResponse } from "next/server";
import type { DealSectionTag } from "@/lib/adapters/types";
import { getDealsStats, queryDeals } from "@/lib/deals-engine";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const category = sp.get("category") || undefined;
  const brand = sp.get("brand") || undefined;
  const sectionRaw = sp.get("section") || "all";
  const validSections = new Set([
    "all",
    "biggest_drop",
    "just_went_on_sale",
    "back_in_stock",
    "new_launch",
  ]);
  const section = validSections.has(sectionRaw)
    ? (sectionRaw as "all" | DealSectionTag)
    : "all";

  const sortRaw = sp.get("sort") || "discount";
  const sort =
    sortRaw === "savings" || sortRaw === "newest" ? sortRaw : "discount";

  const minDiscount = Number(sp.get("minDiscount") || "0") || 0;
  const minPrice = Number(sp.get("minPrice") || "0") || 0;
  const maxPriceParam = sp.get("maxPrice");
  const maxPrice =
    maxPriceParam && Number(maxPriceParam) > 0
      ? Number(maxPriceParam)
      : undefined;
  const q = sp.get("q") || undefined;
  const limit = Math.min(200, Math.max(1, Number(sp.get("limit") || "60") || 60));
  const offset = Math.max(0, Number(sp.get("offset") || "0") || 0);

  const allMatches = queryDeals({
    category,
    brand,
    section,
    sort,
    minDiscount,
    minPrice,
    maxPrice,
    q,
  });

  const paged = allMatches.slice(offset, offset + limit);
  const stats = getDealsStats();

  return NextResponse.json({
    total: allMatches.length,
    offset,
    limit,
    deals: paged,
    stats,
  });
}

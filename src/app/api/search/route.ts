import { NextRequest, NextResponse } from "next/server";
import { searchAll } from "@/lib/search";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const q = (sp.get("q") || "").slice(0, 120);
  const productLimit = Math.min(96, Math.max(1, Number(sp.get("limit") || "8") || 8));
  const brandLimit = Math.min(20, Math.max(1, Number(sp.get("brands") || "6") || 6));
  const result = searchAll(q, { productLimit, brandLimit, category: sp.get("category") || undefined });
  return NextResponse.json(result, { headers: { "Cache-Control": "public, max-age=60" } });
}

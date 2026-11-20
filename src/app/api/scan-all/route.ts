import { NextResponse } from "next/server";
import { getKpis } from "@/lib/db";
import { scanAllStores } from "@/lib/monitor";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST() {
  const results = await scanAllStores();
  return NextResponse.json({
    results,
    kpis: getKpis(),
  });
}

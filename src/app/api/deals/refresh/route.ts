import { NextResponse } from "next/server";
import { runStaggeredRefresh } from "@/lib/deals-engine";

export const dynamic = "force-dynamic";

export async function POST() {
  const result = await runStaggeredRefresh(true);
  return NextResponse.json({ ok: true, ...result });
}

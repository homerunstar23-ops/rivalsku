import { NextResponse } from "next/server";
import { getStore } from "@/lib/db";
import { scanStore } from "@/lib/monitor";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "Invalid store id." }, { status: 400 });
  }
  if (!getStore(id)) {
    return NextResponse.json({ error: "Store not found." }, { status: 404 });
  }
  try {
    const result = await scanStore(id, { dispatch: true });
    return NextResponse.json({
      ...result,
      message: result.unsupported
        ? "Unsupported / protected storefront"
        : result.firstScan
          ? "Baseline catalog saved."
          : `Scan complete. ${result.eventsInserted} new change${result.eventsInserted === 1 ? "" : "s"} detected.`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Scan failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

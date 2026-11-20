import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    getDb().prepare("SELECT 1").get();
    return NextResponse.json({ ok: true, service: "rivalsku" });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        service: "rivalsku",
        error: err instanceof Error ? err.message : "database unavailable",
      },
      { status: 503 },
    );
  }
}

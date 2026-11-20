import { NextResponse } from "next/server";
import { sendTestAlert } from "@/lib/alerts";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST() {
  try {
    const result = await sendTestAlert();
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Test alert failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

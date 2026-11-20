import { NextResponse } from "next/server";
import { quickScan } from "@/lib/monitor";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url") || searchParams.get("domain") || "";
  if (!url.trim()) {
    return NextResponse.json(
      {
        ok: false,
        unsupported: false,
        message: "Enter a Shopify store URL to scan.",
      },
      { status: 400 },
    );
  }
  const result = await quickScan(url);
  const status = result.ok ? 200 : result.unsupported ? 200 : 400;
  return NextResponse.json(result, { status });
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { url?: string };
  const url = body.url || "";
  if (!url.trim()) {
    return NextResponse.json(
      {
        ok: false,
        unsupported: false,
        message: "Enter a Shopify store URL to scan.",
      },
      { status: 400 },
    );
  }
  const result = await quickScan(url);
  const status = result.ok ? 200 : result.unsupported ? 200 : 400;
  return NextResponse.json(result, { status });
}

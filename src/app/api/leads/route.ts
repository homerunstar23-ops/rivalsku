import { NextResponse } from "next/server";
import { getDb, nowIso } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function GET() {
  const leads = getDb()
    .prepare("SELECT id, work_email, brand_url, competitor_urls, created_at FROM audit_leads ORDER BY created_at DESC")
    .all();
  return NextResponse.json({ leads });
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    work_email?: string;
    email?: string;
    brand_url?: string;
    competitor_urls?: string[] | string;
    competitor1?: string;
    competitor2?: string;
    competitor3?: string;
    role?: string;
  };

  const workEmail = (body.work_email || body.email || "").trim().toLowerCase();
  const brandUrl = (body.brand_url || "").trim();
  const urls = Array.isArray(body.competitor_urls)
    ? body.competitor_urls
    : typeof body.competitor_urls === "string"
      ? body.competitor_urls.split(/[\n,]/)
      : [body.competitor1, body.competitor2, body.competitor3];
  const competitorUrls = urls.map((u) => (u || "").trim()).filter(Boolean);

  if (!isEmail(workEmail)) {
    return NextResponse.json(
      { error: "Enter a valid work email." },
      { status: 400 },
    );
  }
  if (!brandUrl) {
    return NextResponse.json(
      { error: "Enter your Shopify store URL." },
      { status: 400 },
    );
  }
  if (competitorUrls.length === 0) {
    return NextResponse.json(
      { error: "Add at least one competitor store URL." },
      { status: 400 },
    );
  }

  const payload = JSON.stringify({
    urls: competitorUrls.slice(0, 3),
    role: body.role?.trim() || null,
  });

  const info = getDb()
    .prepare(
      `INSERT INTO audit_leads (work_email, brand_url, competitor_urls, created_at)
       VALUES (?, ?, ?, ?)`,
    )
    .run(workEmail, brandUrl, payload, nowIso());

  return NextResponse.json(
    {
      ok: true,
      id: Number(info.lastInsertRowid),
      message:
        "Audit request received. We’ll send a snapshot of those public storefronts to your inbox within 24 hours.",
    },
    { status: 201 },
  );
}

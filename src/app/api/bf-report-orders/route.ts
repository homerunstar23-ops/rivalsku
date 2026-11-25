import { NextResponse } from "next/server";
import { getDb, nowIso } from "@/lib/db";
import { STRIPE_PAYMENT_LINKS } from "@/lib/bf-snapshot";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function GET() {
  const orders = getDb()
    .prepare(
      `SELECT id, brand_name, brand_url, email, category, competitor_urls, amount_cents, payment_status, created_at
       FROM bf_report_orders
       ORDER BY created_at DESC
       LIMIT 50`,
    )
    .all();
  return NextResponse.json({ orders });
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    brand_name?: string;
    brand_url?: string;
    email?: string;
    category?: string;
    competitor_urls?: string[] | string;
  };

  const brandName = (body.brand_name || "").trim();
  const brandUrl = (body.brand_url || "").trim();
  const email = (body.email || "").trim().toLowerCase();
  const category = (body.category || "").trim() || null;

  const rawUrls = Array.isArray(body.competitor_urls)
    ? body.competitor_urls
    : typeof body.competitor_urls === "string"
      ? body.competitor_urls.split(/[\n,]/)
      : [];
  const competitorUrls = rawUrls
    .map((u) => (u || "").trim())
    .filter(Boolean)
    .slice(0, 5);

  if (!brandName) {
    return NextResponse.json(
      { error: "Enter your brand name." },
      { status: 400 },
    );
  }
  if (!brandUrl) {
    return NextResponse.json(
      { error: "Enter your brand website URL." },
      { status: 400 },
    );
  }
  if (!isEmail(email)) {
    return NextResponse.json(
      { error: "Enter a valid work email." },
      { status: 400 },
    );
  }
  if (competitorUrls.length === 0) {
    return NextResponse.json(
      { error: "Add at least one competitor store URL (up to 5)." },
      { status: 400 },
    );
  }

  const info = getDb()
    .prepare(
      `INSERT INTO bf_report_orders
         (brand_name, brand_url, email, category, competitor_urls, amount_cents, payment_status, created_at)
       VALUES (?, ?, ?, ?, ?, 4900, 'pending_checkout', ?)`,
    )
    .run(
      brandName,
      brandUrl,
      email,
      category,
      JSON.stringify(competitorUrls),
      nowIso(),
    );

  const orderId = Number(info.lastInsertRowid);
  const baseLink =
    process.env.STRIPE_BF_REPORT_PAYMENT_LINK?.trim() ||
    STRIPE_PAYMENT_LINKS.bfReport;
  const separator = baseLink.includes("?") ? "&" : "?";
  const checkoutUrl = `${baseLink}${separator}prefilled_email=${encodeURIComponent(email)}&client_reference_id=${encodeURIComponent(`bf_order_${orderId}`)}`;

  return NextResponse.json(
    {
      ok: true,
      id: orderId,
      brandName,
      brandUrl,
      email,
      category,
      competitorUrls,
      amount: "$49",
      checkoutUrl,
      message:
        "Order received. Complete the $49 Stripe checkout below to prioritize delivery to your inbox today.",
    },
    { status: 201 },
  );
}

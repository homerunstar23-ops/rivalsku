import { NextRequest, NextResponse } from "next/server";
import { getDb, nowIso } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { email?: string; category?: string };
    const email = (body.email || "").trim().toLowerCase();
    const category = (body.category || "all").trim().slice(0, 64);

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 },
      );
    }

    const createdAt = nowIso();
    const db = getDb();
    db.prepare(
      `INSERT INTO deal_subscribers (email, category, created_at)
       VALUES (?, ?, ?)
       ON CONFLICT(email) DO UPDATE SET category = excluded.category`,
    ).run(email, category, createdAt);

    console.log(
      JSON.stringify({
        event: "deal_subscriber",
        email,
        category,
        createdAt,
      }),
    );

    return NextResponse.json({
      ok: true,
      message: "You're in! Watch your inbox for tomorrow's top 10 price drops.",
    });
  } catch (err) {
    console.error("deal_subscribe_error", err);
    return NextResponse.json(
      { error: "Could not save your subscription right now." },
      { status: 500 },
    );
  }
}

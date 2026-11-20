import { NextResponse } from "next/server";
import Stripe from "stripe";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PLAN_ENV: Record<string, string> = {
  starter: "STRIPE_PRICE_STARTER",
  growth: "STRIPE_PRICE_GROWTH",
  scale: "STRIPE_PRICE_SCALE",
};

const SETUP_MESSAGE =
  "Stripe is not configured yet. Add STRIPE_SECRET_KEY and STRIPE_PRICE_STARTER / STRIPE_PRICE_GROWTH / STRIPE_PRICE_SCALE to the environment to enable checkout. See .env.example.";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { plan?: string };
  const plan = (body.plan || "growth").toLowerCase();
  const envKey = PLAN_ENV[plan];
  if (!envKey) {
    return NextResponse.json(
      { error: "Unknown plan. Choose starter, growth, or scale." },
      { status: 400 },
    );
  }

  const secret = process.env.STRIPE_SECRET_KEY?.trim();
  const priceId = process.env[envKey]?.trim();
  if (!secret || !priceId) {
    return NextResponse.json(
      {
        configured: false,
        error: SETUP_MESSAGE,
        plan,
      },
      { status: 501 },
    );
  }

  try {
    const stripe = new Stripe(secret);
    const origin = (
      process.env.NEXT_PUBLIC_APP_URL ||
      req.headers.get("origin") ||
      "http://localhost:3000"
    ).replace(/\/$/, "");
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/dashboard?checkout=success&plan=${plan}`,
      cancel_url: `${origin}/?checkout=cancelled#pricing`,
      allow_promotion_codes: true,
      metadata: { plan, product: "rivalsku" },
    });
    return NextResponse.json({ configured: true, url: session.url, plan });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Stripe error.";
    return NextResponse.json(
      { configured: true, error: `Stripe checkout failed: ${message}` },
      { status: 500 },
    );
  }
}

import { NextResponse } from "next/server";
import Stripe from "stripe";
import { STRIPE_PAYMENT_LINKS } from "@/lib/bf-snapshot";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PLAN_ENV: Record<string, string> = {
  starter: "STRIPE_PRICE_STARTER",
  growth: "STRIPE_PRICE_GROWTH",
  scale: "STRIPE_PRICE_SCALE",
};

const PLAN_PAYMENT_LINKS: Record<string, string> = {
  starter: STRIPE_PAYMENT_LINKS.starter,
  growth: STRIPE_PAYMENT_LINKS.growth,
  scale: STRIPE_PAYMENT_LINKS.scale,
};

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
    const fallbackLink = PLAN_PAYMENT_LINKS[plan];
    if (fallbackLink) {
      return NextResponse.json({
        configured: true,
        mode: "payment_link",
        url: fallbackLink,
        plan,
      });
    }
    return NextResponse.json(
      {
        configured: false,
        error:
          "Stripe is not configured yet. Add STRIPE_SECRET_KEY and STRIPE_PRICE_STARTER / STRIPE_PRICE_GROWTH / STRIPE_PRICE_SCALE to the environment to enable checkout.",
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

import { NextResponse } from "next/server";
import Stripe from "stripe";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  const secret = process.env.STRIPE_SECRET_KEY?.trim();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secret || !webhookSecret) {
    return NextResponse.json(
      {
        configured: false,
        error:
          "Stripe webhook is not configured. Set STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET.",
      },
      { status: 501 },
    );
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header." }, { status: 400 });
  }

  const body = await req.text();
  const stripe = new Stripe(secret);
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid signature.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  console.log(`[RivalSKU][stripe] Received event ${event.type} (${event.id})`);
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    console.log(
      "[RivalSKU][stripe] Checkout completed",
      JSON.stringify({
        id: session.id,
        customer: session.customer,
        subscription: session.subscription,
        plan: session.metadata?.plan,
        email: session.customer_details?.email,
      }),
    );
  }

  return NextResponse.json({ received: true, type: event.type });
}

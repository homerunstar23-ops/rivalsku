import { NextResponse } from "next/server";
import { getKpis, listStores } from "@/lib/db";
import { addStore, scanStore, UnsupportedStorefrontError } from "@/lib/monitor";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    stores: listStores(),
    kpis: getKpis(),
  });
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    url?: string;
    domain?: string;
    vertical?: string;
  };
  const input = (body.url || body.domain || "").trim();
  if (!input) {
    return NextResponse.json(
      { error: "Enter a competitor store URL." },
      { status: 400 },
    );
  }
  try {
    const store = await addStore(input, body.vertical);
    const result = await scanStore(store.id, { dispatch: true });
    return NextResponse.json(
      {
        store: result.store,
        eventsInserted: result.eventsInserted,
        firstScan: result.firstScan,
        unsupported: result.unsupported,
        message: result.unsupported
          ? "Unsupported / protected storefront"
          : undefined,
      },
      { status: result.unsupported ? 200 : 201 },
    );
  } catch (err) {
    if (err instanceof UnsupportedStorefrontError) {
      return NextResponse.json(
        {
          unsupported: true,
          message: "Unsupported / protected storefront",
          status: err.status,
        },
        { status: 200 },
      );
    }
    const message = err instanceof Error ? err.message : "Could not add store.";
    const code = /valid store URL/i.test(message) ? 400 : 500;
    return NextResponse.json({ error: message }, { status: code });
  }
}

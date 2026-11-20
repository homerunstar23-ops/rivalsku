import { NextResponse } from "next/server";
import { getDb, getStore, type ProductSnapshot } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function storeId(params: { id: string }): number {
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) throw new Error("Invalid store id.");
  return id;
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const id = storeId(await ctx.params);
  const store = getStore(id);
  if (!store) {
    return NextResponse.json({ error: "Store not found." }, { status: 404 });
  }
  const db = getDb();
  const products = db
    .prepare(
      `SELECT * FROM product_snapshots
       WHERE store_id = ?
       ORDER BY title ASC, variant_title ASC`,
    )
    .all(id) as ProductSnapshot[];

  const sales = products.filter(
    (p) => p.compare_at_price !== null && p.compare_at_price > p.price,
  );
  const stockouts = products.filter((p) => p.available === 0);

  return NextResponse.json({ store, products, sales, stockouts });
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const id = storeId(await ctx.params);
  const store = getStore(id);
  if (!store) {
    return NextResponse.json({ error: "Store not found." }, { status: 404 });
  }
  const db = getDb();
  db.prepare("DELETE FROM change_events WHERE store_id = ?").run(id);
  db.prepare("DELETE FROM product_snapshots WHERE store_id = ?").run(id);
  db.prepare("DELETE FROM stores WHERE id = ?").run(id);
  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { getDb, type ChangeEvent } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const FILTERS: Record<string, string[]> = {
  all: [],
  price: ["PRICE_DROP", "PRICE_INCREASE"],
  drops: ["PRICE_DROP"],
  sales: ["SALE_STARTED", "SALE_ENDED", "PROMO_BANNER_CHANGED"],
  stock: ["OUT_OF_STOCK", "BACK_IN_STOCK"],
  stockouts: ["OUT_OF_STOCK", "BACK_IN_STOCK"],
  new: ["NEW_PRODUCT"],
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const filter = (searchParams.get("type") || searchParams.get("filter") || "all")
    .toLowerCase();
  const storeId = searchParams.get("store_id");
  const limit = Math.min(Number(searchParams.get("limit")) || 200, 500);

  const types = FILTERS[filter] || (filter === "all" ? [] : [filter.toUpperCase()]);
  const db = getDb();
  const where: string[] = [];
  const params: unknown[] = [];

  if (types.length > 0) {
    where.push(`e.event_type IN (${types.map(() => "?").join(",")})`);
    params.push(...types);
  }
  if (storeId) {
    const id = Number(storeId);
    if (Number.isInteger(id) && id > 0) {
      where.push("e.store_id = ?");
      params.push(id);
    }
  }

  const sql = `
    SELECT e.*, s.domain AS store_domain, s.name AS store_name
    FROM change_events e
    JOIN stores s ON s.id = e.store_id
    ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
    ORDER BY e.detected_at DESC, e.id DESC
    LIMIT ?
  `;
  params.push(limit);
  const events = db.prepare(sql).all(...params) as Array<
    ChangeEvent & { store_domain: string; store_name: string }
  >;

  return NextResponse.json({ events, filter, count: events.length });
}

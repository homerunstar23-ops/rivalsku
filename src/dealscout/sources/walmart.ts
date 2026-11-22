/**
 * Walmart Affiliate (walmart.io) Product API adapter.
 * https://walmart.io/apidocs/affiliates/affiliate-marketing-api
 * Needs WALMART_CONSUMER_ID, WALMART_PRIVATE_KEY (PEM text, or a path to the PEM file),
 * WALMART_KEY_VERSION (default "1"), and optionally WALMART_PUBLISHER_ID (Impact ID).
 * Requests are signed with RSA-SHA256 over "consumerId\ntimestamp\nkeyVersion\n".
 */
import crypto from "crypto";
import fs from "fs";
import type { RetailOffer, SourceStatus } from "./types";

const BASE = "https://developer.api.walmart.com/api-proxy/service/affil/product/v2";

function creds() {
  const consumerId = process.env.WALMART_CONSUMER_ID?.trim();
  let privateKey = process.env.WALMART_PRIVATE_KEY?.trim();
  const keyVersion = process.env.WALMART_KEY_VERSION?.trim() || "1";
  const publisherId = process.env.WALMART_PUBLISHER_ID?.trim();
  if (privateKey && !privateKey.includes("BEGIN") && fs.existsSync(privateKey)) {
    privateKey = fs.readFileSync(privateKey, "utf8");
  }
  if (!consumerId || !privateKey) return null;
  return { consumerId, privateKey, keyVersion, publisherId };
}

export function walmartStatus(): SourceStatus {
  const enabled = !!creds();
  return {
    id: "walmart",
    label: "Walmart Affiliate API (UPC price check, search)",
    enabled,
    note: enabled ? "credentials found" : "skipped: WALMART_CONSUMER_ID / WALMART_PRIVATE_KEY not set",
  };
}

export function walmartHeaders(consumerId: string, privateKey: string, keyVersion: string, ts = Date.now()) {
  const toSign = `${consumerId}\n${ts}\n${keyVersion}\n`;
  const signature = crypto.createSign("RSA-SHA256").update(toSign).sign(privateKey, "base64");
  return {
    "WM_CONSUMER.ID": consumerId,
    "WM_CONSUMER.INTIMESTAMP": String(ts),
    "WM_SEC.KEY_VERSION": keyVersion,
    "WM_SEC.AUTH_SIGNATURE": signature,
  };
}

type WmItem = {
  itemId: number;
  name: string;
  brandName?: string;
  upc?: string;
  salePrice?: number;
  msrp?: number;
  productUrl?: string;
  productTrackingUrl?: string;
  stock?: string;
  availableOnline?: boolean;
};

export function parseWalmartItem(i: WmItem): RetailOffer | null {
  if (!i.salePrice) return null;
  if (i.stock && i.stock !== "Available") return null;
  return {
    source: "walmart",
    retailer: "Walmart",
    retailerUrl: i.productUrl ?? `https://www.walmart.com/ip/${i.itemId}`,
    upc: i.upc,
    title: i.name,
    brand: i.brandName,
    buyPrice: i.salePrice,
    regularPrice: i.msrp,
  };
}

async function wmGet(path: string, params: Record<string, string>): Promise<any> {
  const c = creds();
  if (!c) throw new Error("Walmart credentials not set");
  const qs = new URLSearchParams(params);
  if (c.publisherId) qs.set("publisherId", c.publisherId);
  const res = await fetch(`${BASE}${path}?${qs}`, {
    headers: walmartHeaders(c.consumerId, c.privateKey, c.keyVersion),
  });
  if (!res.ok) throw new Error(`Walmart ${path} HTTP ${res.status}`);
  return res.json();
}

/** Reverse lookup: Walmart price for each UPC (one request per UPC). */
export async function walmartByUpcs(upcs: string[]): Promise<RetailOffer[]> {
  const out: RetailOffer[] = [];
  for (const upc of upcs) {
    if (!/^\d{12,13}$/.test(upc)) continue;
    try {
      const data = await wmGet("/items", { upc });
      for (const i of (data.items ?? []) as WmItem[]) {
        const o = parseWalmartItem(i);
        if (o) out.push({ ...o, upc: o.upc ?? upc });
      }
    } catch {
      /* UPC not carried; keep going */
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  return out;
}

/** Forward sourcing: keyword searches (e.g. "clearance toys"), keeping items with an msrp markdown. */
export async function walmartSearch(queries: string[]): Promise<RetailOffer[]> {
  const out: RetailOffer[] = [];
  for (const query of queries) {
    const data = await wmGet("/search", { query, numItems: "25" });
    for (const i of (data.items ?? []) as WmItem[]) {
      const o = parseWalmartItem(i);
      if (o?.upc && o.regularPrice && o.regularPrice > o.buyPrice * 1.25) out.push(o);
    }
  }
  return out;
}

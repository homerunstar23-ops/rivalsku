import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "crypto";
import { evaluateDeal } from "../fees";
import { applyFilters } from "../filters";
import { parseKeepaProduct, mapKeepaCategory } from "../sources/keepa";
import { parseBestBuyProduct } from "../sources/bestbuy";
import { parseWalmartItem, walmartHeaders } from "../sources/walmart";
import { ebayBreakeven, soldCompsLink } from "../sources/ebay-channel";

const DIMS = { lengthIn: 10, widthIn: 6, heightIn: 1.5, weightLb: 0.75 };
const D = new Date("2026-06-15T12:00:00-04:00");

test("filters pass a good deal and list unknowns", () => {
  const deal = evaluateDeal({ buyPrice: 12, amazonPrice: 34.99, category: "toys", dims: DIMS, date: D, hasResaleCertificate: true });
  const f = applyFilters(deal, { asin: "B0TEST", title: "x", amazonPrice: 34.99, avgPrice90: 33.5, estMonthlySales: 120, amazonOnListing: false, fbaOfferCount: 6, hazmat: false });
  assert.equal(f.pass, true, f.reasons.join(","));
  assert.ok(f.unknowns.some((u) => u.includes("gating")));
});

test("filters reject thin, slow, Amazon-sold, crowded, blocked-brand deals", () => {
  const deal = evaluateDeal({ buyPrice: 18, amazonPrice: 34.99, category: "toys", dims: DIMS, date: D });
  const f = applyFilters(deal, { asin: "B0TEST", title: "x", brand: "Allbirds", amazonPrice: 34.99, avgPrice90: 25, estMonthlySales: 10, amazonOnListing: true, fbaOfferCount: 30, hazmat: true });
  assert.equal(f.pass, false);
  for (const s of ["ROI", "sales/mo", "Amazon sells it", "offers", "hazmat", "blocked brand", "90-day"]) {
    assert.ok(f.reasons.some((r) => r.includes(s)), `missing ${s}: ${f.reasons}`);
  }
});

test("Keepa product parsing", () => {
  const cur: number[] = Array(20).fill(-1);
  cur[18] = 3499; cur[11] = 7;
  const avg: number[] = Array(20).fill(-1);
  avg[18] = 3399;
  const m = parseKeepaProduct({
    asin: "B0X", title: "Toy", brand: "Acme", upcList: ["012345678905"], packageLength: 254, packageWidth: 152, packageHeight: 38,
    packageWeight: 340, categoryTree: [{ catId: 165793011, name: "Toys & Games" }], monthlySold: 200, availabilityAmazon: -1,
    stats: { current: cur, avg90: avg },
  })!;
  assert.equal(m.amazonPrice, 34.99);
  assert.equal(m.avgPrice90, 33.99);
  assert.equal(m.category, "toys");
  assert.equal(m.fbaOfferCount, 7);
  assert.equal(m.amazonOnListing, false);
  assert.ok(Math.abs(m.dims!.lengthIn - 10) < 0.01);
  assert.equal(mapKeepaCategory("Home & Kitchen"), "kitchen");
});

test("Best Buy and Walmart parsing", () => {
  const bb = parseBestBuyProduct({ sku: 1, upc: "012345678905", name: "Game", manufacturer: "Acme", salePrice: 14.99, regularPrice: 29.99, url: "https://bestbuy.com/x", onlineAvailability: true })!;
  assert.equal(bb.buyPrice, 14.99);
  assert.equal(parseBestBuyProduct({ sku: 2, name: "x", salePrice: 5, onlineAvailability: false }), null);
  const wm = parseWalmartItem({ itemId: 9, name: "Toy", upc: "012345678905", salePrice: 12, msrp: 25, stock: "Available" })!;
  assert.equal(wm.retailerUrl, "https://www.walmart.com/ip/9");
  assert.equal(parseWalmartItem({ itemId: 9, name: "Toy", salePrice: 12, stock: "Not available" }), null);
});

test("Walmart request signing verifies with the public key", () => {
  const { privateKey, publicKey } = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
  const pem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
  const h = walmartHeaders("cid", pem, "1", 1700000000000);
  const ok = crypto.createVerify("RSA-SHA256").update("cid\n1700000000000\n1\n").verify(publicKey, h["WM_SEC.AUTH_SIGNATURE"], "base64");
  assert.equal(ok, true);
});

test("eBay breakeven and comps link", () => {
  // $40 cost, $6 label: invested 42.80, target 12.84 → (42.80 - 0.80 + 0.40 + 6 + 12.84) / 0.864
  assert.ok(Math.abs(ebayBreakeven(40, 6) - 70.88) < 0.02);
  assert.ok(soldCompsLink("Lunya", "Washable Silk Set").includes("LH_Sold=1"));
});

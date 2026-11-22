import { test } from "node:test";
import assert from "node:assert/strict";
import {
  evaluateDeal, fulfillmentFee, referralFee, sizeTier, priceBand, isPeakFulfillment, isQ4Storage, type Dimensions,
} from "../fees";

// Worked example from the research Page: toy bought at $18.00, sells for $34.99,
// large standard, 12 oz. Box 10 x 6 x 1.5 in (dimensional weight 0.65 lb, 0.052 cu ft).
const TOY: Dimensions = { lengthIn: 10, widthIn: 6, heightIn: 1.5, weightLb: 0.75 };
const NON_PEAK = new Date("2026-06-15T12:00:00-04:00");
const PEAK = new Date("2026-11-22T12:00:00-05:00");
const near = (a: number, b: number, tol = 0.011) => assert.ok(Math.abs(a - b) <= tol, `${a} != ${b}`);

test("size tier, price band and calendars", () => {
  assert.equal(sizeTier(TOY), "large_standard");
  assert.equal(sizeTier({ lengthIn: 9, widthIn: 6, heightIn: 0.5, weightLb: 0.5 }), "small_standard");
  assert.equal(sizeTier({ lengthIn: 30, widthIn: 20, heightIn: 10, weightLb: 15 }), "oversize");
  assert.equal(priceBand(9.99), "under10");
  assert.equal(priceBand(10), "10to50");
  assert.equal(priceBand(50), "10to50");
  assert.equal(priceBand(50.01), "over50");
  assert.equal(isPeakFulfillment(new Date(2026, 9, 14)), false);
  assert.equal(isPeakFulfillment(new Date(2026, 9, 15)), true);
  assert.equal(isPeakFulfillment(new Date(2027, 0, 14)), true);
  assert.equal(isPeakFulfillment(new Date(2027, 0, 15)), false);
  assert.equal(isQ4Storage(new Date(2026, 9, 1)), true);
  assert.equal(isQ4Storage(new Date(2026, 8, 30)), false);
});

test("referral fees by category", () => {
  near(referralFee("toys", 34.99), 5.25);
  near(referralFee("beauty", 9), 0.72);
  near(referralFee("clothing", 25), 4.25);
  near(referralFee("electronics_accessories", 150), 19);
  near(referralFee("toys", 1), 0.3); // $0.30 minimum
});

test("fulfillment fee: published rate-card points incl. 3.5% surcharge", () => {
  // fbaessentials: large standard 16 oz at $9.99 → $3.91, at $10–$50 → $4.76, at $50.01 → $5.03
  const lb1: Dimensions = { lengthIn: 8, widthIn: 6, heightIn: 2.5, weightLb: 1 };
  near(fulfillmentFee(lb1, 9.99, NON_PEAK)!.total, 3.91);
  near(fulfillmentFee(lb1, 30, NON_PEAK)!.total, 4.76);
  near(fulfillmentFee(lb1, 50.01, NON_PEAK)!.total, 5.03);
  // Peak: same item $10–$50 → $4.89 base → $5.06 with surcharge (fba-calculator.com)
  near(fulfillmentFee(lb1, 30, PEAK)!.total, 5.06);
  // Small standard 6 oz at $18.99 → $3.57
  near(fulfillmentFee({ lengthIn: 9, widthIn: 6, heightIn: 0.5, weightLb: 0.375 }, 18.99, NON_PEAK)!.total, 3.57);
  // Large standard 32 oz at $59.99 → $6.29
  near(fulfillmentFee({ lengthIn: 10, widthIn: 8, heightIn: 3, weightLb: 2 }, 59.99, NON_PEAK)!.total, 6.29);
  // Above 3 lb: 4 lb at $10–$50 = 6.97 + 4 × 0.08 = 7.29 base
  near(fulfillmentFee({ lengthIn: 12, widthIn: 10, heightIn: 4, weightLb: 4 }, 30, NON_PEAK)!.baseFee, 7.29);
});

test("worked example, non-peak, no resale certificate", () => {
  const r = evaluateDeal({ buyPrice: 18, amazonPrice: 34.99, category: "toys", dims: TOY, date: NON_PEAK });
  near(r.lines.referral, 5.25);
  near(r.lines.fulfillment, 4.35); // $4.20 + 3.5%
  near(r.lines.salesTax, 1.26);
  near(r.lines.cashback, 0.36);
  near(r.lines.prep, 0.65);
  near(r.lines.inbound + r.lines.placement, 0.7);
  near(r.lines.returnsReserve, 0.7);
  near(r.lines.storage, 0.08); // 0.052 cu ft × $0.78 × 2 months
  near(r.cashInvested, 20.61);
  // Page showed $4.21 using $0.23 storage (0.15 cu ft); with the 10×6×1.5 box it is $0.15 better.
  near(r.profit, 4.36);
  near(r.roi, 0.2116, 0.001);
});

test("worked example, non-peak, with FL resale certificate", () => {
  const r = evaluateDeal({ buyPrice: 18, amazonPrice: 34.99, category: "toys", dims: TOY, date: NON_PEAK, hasResaleCertificate: true });
  near(r.lines.salesTax, 0);
  near(r.profit, 5.62);
  near(r.roi, 0.2904, 0.001);
});

test("worked example, holiday peak (Nov 22) with Q4 storage", () => {
  const r = evaluateDeal({ buyPrice: 18, amazonPrice: 34.99, category: "toys", dims: TOY, date: PEAK });
  near(r.lines.fulfillment, 4.64); // $4.48 peak + 3.5%
  near(r.lines.storage, 0.25); // 0.052 cu ft × $2.40 × 2
  near(r.profit, 3.9);
  assert.ok(r.roi < 0.2);
});

test("max buy price solves for exactly 30% ROI", () => {
  const r = evaluateDeal({ buyPrice: 18, amazonPrice: 34.99, category: "toys", dims: TOY, date: NON_PEAK, hasResaleCertificate: true });
  const at = evaluateDeal({ buyPrice: r.maxBuyFor30Roi, amazonPrice: 34.99, category: "toys", dims: TOY, date: NON_PEAK, hasResaleCertificate: true });
  near(at.roi, 0.3, 0.002);
  assert.ok(r.maxBuyFor30Roi > 17 && r.maxBuyFor30Roi < 18.5);
});

test("oversize items are flagged, not priced", () => {
  const r = evaluateDeal({ buyPrice: 50, amazonPrice: 120, category: "home", dims: { lengthIn: 30, widthIn: 20, heightIn: 10, weightLb: 15 }, date: NON_PEAK });
  assert.equal(r.ok, false);
});

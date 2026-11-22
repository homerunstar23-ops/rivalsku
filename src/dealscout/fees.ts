/**
 * DealScout 2026 Amazon FBA fee engine (US marketplace, non-apparel, non-dangerous goods).
 *
 * Sources (checked Nov 2026):
 * - Non-peak rate card effective Jan 15, 2026: https://fbaessentials.com/fees/fulfillment
 * - 3.5% fuel & logistics surcharge since Apr 17, 2026: https://thefbagirl.com/news/amazon-fee-changes-2026/
 * - Peak rate card Oct 15, 2026 – Jan 14, 2027: https://fee-math.com/news/amazon-fba-peak-fulfillment-fees-2026/
 * - Storage $0.78 / $2.40 per cu ft: https://amazonfba.org/amazon-fba-fees
 * - Referral fees by category: Amazon 2026 fees guide
 *
 * Peak adders for weight bands Amazon's excerpted tables did not list are interpolated
 * between published neighbours (marked "interp" below). Always confirm a real buy in
 * Amazon's Revenue Calculator.
 */

export type SizeTier = "small_standard" | "large_standard" | "oversize";
export type PriceBand = "under10" | "10to50" | "over50";

type Row = { maxLb: number; fees: [number, number, number]; peakAdd: number };

// [under $10, $10–$50, over $50] base fees before the 3.5% surcharge.
const SMALL_STANDARD: Row[] = [
  { maxLb: 0.125, fees: [2.43, 3.32, 3.58], peakAdd: 0.19 },
  { maxLb: 0.25, fees: [2.49, 3.42, 3.68], peakAdd: 0.19 }, // interp
  { maxLb: 0.375, fees: [2.56, 3.45, 3.71], peakAdd: 0.2 }, // interp
  { maxLb: 0.5, fees: [2.66, 3.54, 3.8], peakAdd: 0.2 },
  { maxLb: 0.625, fees: [2.77, 3.68, 3.94], peakAdd: 0.21 }, // interp
  { maxLb: 0.75, fees: [2.82, 3.78, 4.04], peakAdd: 0.21 }, // interp
  { maxLb: 0.875, fees: [2.92, 3.91, 4.17], peakAdd: 0.22 }, // interp
  { maxLb: 1, fees: [2.95, 3.96, 4.22], peakAdd: 0.22 },
];

const LARGE_STANDARD: Row[] = [
  { maxLb: 0.25, fees: [2.91, 3.73, 3.99], peakAdd: 0.24 },
  { maxLb: 0.5, fees: [3.13, 3.95, 4.21], peakAdd: 0.26 }, // interp
  { maxLb: 0.75, fees: [3.38, 4.2, 4.46], peakAdd: 0.28 },
  { maxLb: 1, fees: [3.78, 4.6, 4.86], peakAdd: 0.29 },
  { maxLb: 1.25, fees: [4.22, 5.04, 5.3], peakAdd: 0.3 },
  { maxLb: 1.5, fees: [4.6, 5.42, 5.68], peakAdd: 0.31 }, // interp
  { maxLb: 1.75, fees: [4.75, 5.57, 5.83], peakAdd: 0.32 }, // interp
  { maxLb: 2, fees: [5.0, 5.82, 6.08], peakAdd: 0.33 },
  { maxLb: 2.25, fees: [5.1, 5.92, 6.18], peakAdd: 0.37 },
  { maxLb: 2.5, fees: [5.28, 6.1, 6.36], peakAdd: 0.38 }, // interp
  { maxLb: 2.75, fees: [5.44, 6.26, 6.52], peakAdd: 0.4 }, // interp
  { maxLb: 3, fees: [5.85, 6.67, 6.93], peakAdd: 0.41 },
];
// Above 3 lb (large standard, up to 20 lb): base + $0.08 per 4 oz over 3 lb.
const LARGE_OVER3_BASE: [number, number, number] = [6.15, 6.97, 7.23];
const LARGE_OVER3_PEAK_ADD = 0.54;
const LARGE_OVER3_STEP = 0.08;

export const FUEL_SURCHARGE = 0.035;
export const DIM_DIVISOR = 139;

export const STORAGE_PER_CUFT = { nonPeak: 0.78, q4: 2.4 }; // standard size, per month

export type ReferralCategory =
  | "toys"
  | "home"
  | "kitchen"
  | "sports"
  | "pets"
  | "office"
  | "tools"
  | "garden"
  | "beauty"
  | "health"
  | "baby"
  | "grocery"
  | "electronics"
  | "electronics_accessories"
  | "computers"
  | "clothing"
  | "shoes"
  | "luggage"
  | "furniture"
  | "automotive"
  | "other";

/** Referral fee for the whole sale price (item + shipping). Minimum $0.30 where Amazon sets one. */
export function referralFee(category: ReferralCategory, price: number): number {
  let fee: number;
  switch (category) {
    case "beauty":
    case "health":
    case "baby":
      fee = price <= 10 ? price * 0.08 : price * 0.15;
      break;
    case "grocery":
      return round2(price <= 15 ? price * 0.08 : price * 0.15); // no minimum
    case "electronics":
    case "computers":
      fee = price * 0.08;
      break;
    case "electronics_accessories":
      fee = Math.min(price, 100) * 0.15 + Math.max(0, price - 100) * 0.08;
      break;
    case "clothing":
      fee = price <= 15 ? price * 0.05 : price <= 20 ? price * 0.1 : price * 0.17;
      break;
    case "furniture":
      fee = Math.min(price, 200) * 0.15 + Math.max(0, price - 200) * 0.1;
      break;
    case "automotive":
    case "tools":
      fee = price * 0.12;
      break;
    default:
      fee = price * 0.15;
  }
  return round2(Math.max(0.3, fee));
}

export type Dimensions = { lengthIn: number; widthIn: number; heightIn: number; weightLb: number };

export function sizeTier(d: Dimensions): SizeTier {
  const [a, b, c] = [d.lengthIn, d.widthIn, d.heightIn].sort((x, y) => y - x);
  if (a <= 15 && b <= 12 && c <= 0.75 && d.weightLb <= 1) return "small_standard";
  if (a <= 18 && b <= 14 && c <= 8 && d.weightLb <= 20) return "large_standard";
  return "oversize";
}

export function billableWeightLb(d: Dimensions, tier: SizeTier): number {
  if (tier === "small_standard") return d.weightLb;
  const dim = (d.lengthIn * d.widthIn * d.heightIn) / DIM_DIVISOR;
  return Math.max(d.weightLb, dim);
}

export function priceBand(price: number): PriceBand {
  if (price < 10) return "under10";
  if (price <= 50) return "10to50";
  return "over50";
}

/** True when a unit shipping on this date pays the holiday peak card (Oct 15 – Jan 14). */
export function isPeakFulfillment(date: Date): boolean {
  const m = date.getMonth() + 1;
  const d = date.getDate();
  return (m === 10 && d >= 15) || m === 11 || m === 12 || (m === 1 && d <= 14);
}

/** True when monthly storage bills at the Q4 rate (Oct – Dec). */
export function isQ4Storage(date: Date): boolean {
  return date.getMonth() >= 9;
}

export type FulfillmentQuote = {
  tier: SizeTier;
  billableLb: number;
  band: PriceBand;
  peak: boolean;
  baseFee: number;
  surcharge: number;
  total: number;
};

export function fulfillmentFee(d: Dimensions, price: number, shipDate: Date): FulfillmentQuote | null {
  const tier = sizeTier(d);
  if (tier === "oversize") return null;
  const billableLb = billableWeightLb(d, tier);
  const band = priceBand(price);
  const idx = band === "under10" ? 0 : band === "10to50" ? 1 : 2;
  const peak = isPeakFulfillment(shipDate);
  let base: number;
  if (tier === "large_standard" && billableLb > 3) {
    const steps = Math.ceil((billableLb - 3) / 0.25 - 1e-9);
    base = LARGE_OVER3_BASE[idx] + steps * LARGE_OVER3_STEP + (peak ? LARGE_OVER3_PEAK_ADD : 0);
  } else {
    const table = tier === "small_standard" ? SMALL_STANDARD : LARGE_STANDARD;
    const row = table.find((r) => billableLb <= r.maxLb + 1e-9) ?? table[table.length - 1];
    base = row.fees[idx] + (peak ? row.peakAdd : 0);
  }
  base = round2(base);
  const surcharge = round2(base * FUEL_SURCHARGE);
  return { tier, billableLb, band, peak, baseFee: base, surcharge, total: round2(base + surcharge) };
}

export type CostAssumptions = {
  prepPerUnit: number; // prep center receive + FNSKU label
  inboundPerLb: number; // ship to Amazon, billed on at least 1 lb
  placementPerUnit: number; // inbound placement (minimal splits)
  storageMonths: number;
  returnsReservePct: number; // of sale price
  salesTaxPct: number; // 0.07 Palm Beach County; 0 with resale certificate
  cashbackPct: number; // of pre-tax buy cost
};

export const DEFAULT_ASSUMPTIONS: CostAssumptions = {
  prepPerUnit: 0.65,
  inboundPerLb: 0.4,
  placementPerUnit: 0.3,
  storageMonths: 2,
  returnsReservePct: 0.02,
  salesTaxPct: 0.07,
  cashbackPct: 0.02,
};

export type DealInput = {
  buyPrice: number;
  amazonPrice: number;
  category: ReferralCategory;
  dims: Dimensions;
  date?: Date; // ship / evaluation date; drives peak and Q4 storage
  hasResaleCertificate?: boolean;
};

export type DealResult = {
  ok: boolean;
  reason?: string;
  fulfillment?: FulfillmentQuote;
  lines: {
    salePrice: number;
    buyCost: number;
    salesTax: number;
    cashback: number;
    referral: number;
    fulfillment: number;
    prep: number;
    inbound: number;
    placement: number;
    storage: number;
    returnsReserve: number;
  };
  cashInvested: number;
  profit: number;
  roi: number; // profit / cash invested
  margin: number; // profit / sale price
  maxBuyFor30Roi: number; // highest buy price that still clears 30% ROI
};

export function evaluateDeal(input: DealInput, a: CostAssumptions = DEFAULT_ASSUMPTIONS): DealResult {
  const date = input.date ?? new Date();
  const taxPct = input.hasResaleCertificate ? 0 : a.salesTaxPct;
  const f = fulfillmentFee(input.dims, input.amazonPrice, date);
  const cuft = (input.dims.lengthIn * input.dims.widthIn * input.dims.heightIn) / 1728;
  const storageRate = isQ4Storage(date) ? STORAGE_PER_CUFT.q4 : STORAGE_PER_CUFT.nonPeak;

  const referral = referralFee(input.category, input.amazonPrice);
  const fulfillment = f ? f.total : 0;
  const prep = a.prepPerUnit;
  const inbound = round2(a.inboundPerLb * Math.max(1, input.dims.weightLb));
  const placement = a.placementPerUnit;
  const storage = round2(cuft * storageRate * a.storageMonths);
  const returnsReserve = round2(input.amazonPrice * a.returnsReservePct);
  const salesTax = round2(input.buyPrice * taxPct);
  const cashback = round2(input.buyPrice * a.cashbackPct);

  const fixedFees = referral + fulfillment + prep + inbound + placement + storage + returnsReserve;
  const profit = round2(input.amazonPrice - input.buyPrice - salesTax + cashback - fixedFees);
  const cashInvested = round2(input.buyPrice + salesTax + prep + inbound + placement);

  // Solve profit(c) = 0.30 * invested(c) for buy price c.
  // profit = P - fixed - c(1 + tax - cb); invested = c(1 + tax) + prep + inbound + placement
  const k = 1 + taxPct - a.cashbackPct;
  const maxBuy = (input.amazonPrice - fixedFees - 0.3 * (prep + inbound + placement)) / (k + 0.3 * (1 + taxPct));

  return {
    ok: !!f,
    reason: f ? undefined : "oversize: not modeled in v1, skip",
    fulfillment: f ?? undefined,
    lines: {
      salePrice: input.amazonPrice,
      buyCost: input.buyPrice,
      salesTax,
      cashback,
      referral,
      fulfillment,
      prep,
      inbound,
      placement,
      storage,
      returnsReserve,
    },
    cashInvested,
    profit,
    roi: cashInvested > 0 ? profit / cashInvested : 0,
    margin: input.amazonPrice > 0 ? profit / input.amazonPrice : 0,
    maxBuyFor30Roi: round2(Math.max(0, maxBuy)),
  };
}

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

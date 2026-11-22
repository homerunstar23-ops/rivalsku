# DealScout morning report — Sunday, November 22, 2026 at 11:56 AM ET

Mode: **PAPER** (recommendations only; nothing is bought). Resale certificate: no (7% FL tax added to buy cost).

## Sources
| Source | Status | Items |
|---|---|---|
| Keepa API (Amazon prices, sales rank, UPC match, reverse sourcing) | skipped: KEEPA_API_KEY not set | – |
| Best Buy Products API (on-sale items with UPC) | skipped: BESTBUY_API_KEY not set | – |
| Walmart Affiliate API (UPC price check, search) | skipped: WALMART_CONSUMER_ID / WALMART_PRIVATE_KEY not set | – |
| eBay channel (RivalSKU Shopify markdowns) | runs on RivalSKU data; sold comps need a manual check (eBay blocks scripted sold searches; EBAY_CLIENT_ID/SECRET not set) | 521 |

## Amazon FBA buy list
No Amazon candidates today: the Keepa API key is not set, so retailer items cannot be matched to Amazon prices, sales rank or fees. No retailer source is enabled either (Best Buy / Walmart keys not set).

## Fee engine check (worked example: $18 toy → $34.99 on Amazon, 12 oz, 10×6×1.5 in)
Today's rules (holiday peak card, Q4 storage): referral $5.25, fulfillment $4.64, storage $0.25, tax $1.26 → profit **$3.90**, ROI **19%**, max buy price for 30% ROI **$16.33**.

## eBay channel: DTC markdowns from RivalSKU
521 in-stock products at 35%+ off were checked. **15 promising**, 8 marginal. Promising = the eBay price needed for max(30% ROI, $8 profit) after eBay's 13.6% + $0.40 and an estimated shipping label is at or below an assumed resale value (55% of retail for apparel/footwear, 50% home, 45% beauty, 35% wellness). Sold comps: eBay's sold search returned HTTP 403 to a scripted request, so every row needs a manual sold-comps check via its link before buying.

| Brand | Product | Sale | Retail | Off | Need on eBay | Assumed resale | Comps |
|---|---|---|---|---|---|---|---|
| Year & Day | [Everyday Napkin Tablecloth Set (midnight)](https://yearandday.com/products/everyday-napkin-tablecloth-set) | $60.00 | $251.00 | 76.1% | $110.72 | $125.50 | [sold comps](https://www.ebay.com/sch/i.html?_nkw=Year%20%26%20Day%20Everyday%20Napkin%20Tablecloth%20Set&LH_Sold=1&LH_Complete=1&LH_ItemCondition=1000) |
| Hill House Home | [The Ribbon Ellie Nap Dress - Winter Jasmine Brocad (Winter Jasmine Brocade / )](https://hillhousehome.com/products/the-ribbon-ellie-nap-dress-winter-jasmine-brocade) | $79.00 | $298.00 | 73.5% | $132.77 | $163.90 | [sold comps](https://www.ebay.com/sch/i.html?_nkw=Hill%20House%20Home%20The%20Ribbon%20Ellie%20Nap%20Dress%20-%20Winter%20Jasmine%20Brocade&LH_Sold=1&LH_Complete=1&LH_ItemCondition=1000) |
| Year & Day | [Everyday Napkin Placemat Set (dune)](https://yearandday.com/products/everyday-napkin-placemat-set) | $36.00 | $160.00 | 77.5% | $72.63 | $80.00 | [sold comps](https://www.ebay.com/sch/i.html?_nkw=Year%20%26%20Day%20Everyday%20Napkin%20Placemat%20Set&LH_Sold=1&LH_Complete=1&LH_ItemCondition=1000) |
| KOIO | [Capri Leather Sneaker in Sandstone (9 (US) / 39 (EU))](https://koio.co/products/capri-sandstone-womens) | $79.50 | $265.00 | 70% | $133.56 | $145.75 | [sold comps](https://www.ebay.com/sch/i.html?_nkw=KOIO%20Capri%20Leather%20Sneaker%20in%20Sandstone&LH_Sold=1&LH_Complete=1&LH_ItemCondition=1000) |
| KOIO | [Lido Leather Loafer in Parchment (7 (US) / 40 (EU))](https://koio.co/products/lido-in-parchment) | $79.50 | $265.00 | 70% | $133.56 | $145.75 | [sold comps](https://www.ebay.com/sch/i.html?_nkw=KOIO%20Lido%20Leather%20Loafer%20in%20Parchment&LH_Sold=1&LH_Complete=1&LH_ItemCondition=1000) |
| KOIO | [Capri Suede Sneaker in Rose (7 (US) / 40 (EU))](https://koio.co/products/capri-suede-sneaker-in-rose) | $79.50 | $265.00 | 70% | $133.56 | $145.75 | [sold comps](https://www.ebay.com/sch/i.html?_nkw=KOIO%20Capri%20Suede%20Sneaker%20in%20Rose&LH_Sold=1&LH_Complete=1&LH_ItemCondition=1000) |
| KOIO | [Capri Leather Sneaker in Nero (5 (US) / 35 (EU))](https://koio.co/products/capri-nero-womens) | $79.50 | $265.00 | 70% | $133.56 | $145.75 | [sold comps](https://www.ebay.com/sch/i.html?_nkw=KOIO%20Capri%20Leather%20Sneaker%20in%20Nero&LH_Sold=1&LH_Complete=1&LH_ItemCondition=1000) |
| KOIO | [Ostuni Suede Espadrille in Nutmeg (7 (US) / 40 (EU))](https://koio.co/products/ostuni-nutmeg-mens) | $73.50 | $245.00 | 70% | $124.04 | $134.75 | [sold comps](https://www.ebay.com/sch/i.html?_nkw=KOIO%20Ostuni%20Suede%20Espadrille%20in%20Nutmeg&LH_Sold=1&LH_Complete=1&LH_ItemCondition=1000) |
| KOIO | [Ostuni Suede Espadrille in Adria (8 (US) / 41 (EU))](https://koio.co/products/ostuni-adria-mens) | $73.50 | $245.00 | 70% | $124.04 | $134.75 | [sold comps](https://www.ebay.com/sch/i.html?_nkw=KOIO%20Ostuni%20Suede%20Espadrille%20in%20Adria&LH_Sold=1&LH_Complete=1&LH_ItemCondition=1000) |
| Hill House Home | [The Anjuli Nap Dress - Black Crepe (Black Crepe / XXL)](https://hillhousehome.com/products/the-anjuli-nap-dress-black-crepe) | $59.00 | $198.00 | 70.2% | $101.03 | $108.90 | [sold comps](https://www.ebay.com/sch/i.html?_nkw=Hill%20House%20Home%20The%20Anjuli%20Nap%20Dress%20-%20Black%20Crepe&LH_Sold=1&LH_Complete=1&LH_ItemCondition=1000) |
| Hill House Home | [The Anjuli Nap Dress - Navy Crepe (Wrinkle Resistant Navy Cr)](https://hillhousehome.com/products/the-anjuli-nap-dress-navy-crepe) | $59.00 | $198.00 | 70.2% | $101.03 | $108.90 | [sold comps](https://www.ebay.com/sch/i.html?_nkw=Hill%20House%20Home%20The%20Anjuli%20Nap%20Dress%20-%20Navy%20Crepe&LH_Sold=1&LH_Complete=1&LH_ItemCondition=1000) |
| American Giant | [Women's Linen Short (Cotton / S)](https://american-giant.com/products/womens-linen-short) | $20.00 | $80.00 | 75% | $40.97 | $44.00 | [sold comps](https://www.ebay.com/sch/i.html?_nkw=American%20Giant%20Women's%20Linen%20Short&LH_Sold=1&LH_Complete=1&LH_ItemCondition=1000) |
| KOIO | [Vegan 01 Sneaker in Iceberg (10 (US) / 40 (EU))](https://koio.co/products/vegan-01-iceberg-womens) | $49.50 | $165.00 | 70% | $85.95 | $90.75 | [sold comps](https://www.ebay.com/sch/i.html?_nkw=KOIO%20Vegan%2001%20Sneaker%20in%20Iceberg&LH_Sold=1&LH_Complete=1&LH_ItemCondition=1000) |
| KOIO | [Vegan 01 Sneaker in Wind (7 (US) / 37 (EU))](https://koio.co/products/vegan-01-wind-womens) | $49.50 | $165.00 | 70% | $85.95 | $90.75 | [sold comps](https://www.ebay.com/sch/i.html?_nkw=KOIO%20Vegan%2001%20Sneaker%20in%20Wind&LH_Sold=1&LH_Complete=1&LH_ItemCondition=1000) |
| Hill House Home | [The Fleur Mini Dress - White (White / L)](https://hillhousehome.com/products/the-fleur-mini-dress-white) | $69.00 | $218.00 | 68.3% | $116.90 | $119.90 | [sold comps](https://www.ebay.com/sch/i.html?_nkw=Hill%20House%20Home%20The%20Fleur%20Mini%20Dress%20-%20White&LH_Sold=1&LH_Complete=1&LH_ItemCondition=1000) |

Promising by brand: KOIO 8, Hill House Home 4, Year & Day 2, American Giant 1.

Note: Allbirds and Coyuchi publish authorized-reseller policies; one-off resale of genuine items on eBay is common, but keep volumes small and never use brand images.

## To turn on live Amazon sourcing
- `KEEPA_API_KEY` (Keepa API Starter, €49/mo) — required for any Amazon candidate.
- `BESTBUY_API_KEY` (free, developer.bestbuy.com).
- `WALMART_CONSUMER_ID`, `WALMART_PRIVATE_KEY`, `WALMART_KEY_VERSION` (+ optional `WALMART_PUBLISHER_ID`) from walmart.io / Impact.
- Optional: `EBAY_CLIENT_ID`, `EBAY_CLIENT_SECRET` (eBay developer account) for active-listing price proxies.
- `DEALSCOUT_RESALE_CERT=1` once the Florida Annual Resale Certificate is in hand.

Run #3. Every buy still needs Cory's explicit approval and Pay tap.

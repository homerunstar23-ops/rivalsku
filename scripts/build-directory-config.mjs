// Rebuilds brand directory configs from measured probe results (2026-11-25).
// Inputs: /tmp/allshop-tos.json (Shopify ToS check). Non-Shopify results are recorded inline below.
import fs from "fs";
const tos = fs.existsSync("/tmp/allshop-tos.json") ? JSON.parse(fs.readFileSync("/tmp/allshop-tos.json", "utf8")) : {};
const now = new Date().toISOString();
const slug = (s) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// 1) Shopify: existing + newly verified (products.json OK)
const dtc = JSON.parse(fs.readFileSync("src/config/dtc-brands.json", "utf8"));
const newShopify = [
  ["peets.com","Peet's Coffee","Kitchen"],["davidstea.com","DAVIDsTEA","Kitchen"],["t3micro.com","T3","Beauty"],["pyrexhome.com","Pyrex","Kitchen"],
  ["waterford.com","Waterford","Home"],["hoover.com","Hoover","Home"],["blissworld.com","Bliss","Beauty"],["dirtdevil.com","Dirt Devil","Home"],
  ["sharperimage.com","Sharper Image","Tech Accessories"],["schoolhouse.com","Schoolhouse","Home"],["fiestafactorydirect.com","Fiesta","Kitchen"],
  ["skullcandy.com","Skullcandy","Tech Accessories"],["gibson.com","Gibson","Tech Accessories"],["burton.com","Burton","Outdoor"],
  ["republicoftea.com","The Republic of Tea","Kitchen"],["pfaltzgraff.com","Pfaltzgraff","Kitchen"],["bluemercury.com","Bluemercury","Beauty"],
  ["corelle.com","Corelle","Kitchen"],["instantpot.com","Instant Pot","Kitchen"],["dylanscandybar.com","Dylan's Candy Bar","Kitchen"],
  ["bulletproof.com","Bulletproof","Wellness"],["dreametech.com","Dreame","Home"],["rachaelray.com","Rachael Ray","Kitchen"],
  ["chemexcoffeemaker.com","Chemex","Kitchen"],["brookstone.com","Brookstone","Tech Accessories"],["wusthof.com","Wüsthof","Kitchen"],
  ["keenfootwear.com","KEEN","Footwear"],["stanley1913.com","Stanley","Outdoor"],["reebok.com","Reebok","Footwear"],["zojirushi.com","Zojirushi","Kitchen"],
  ["revlon.com","Revlon","Beauty"],["godiva.com","Godiva","Kitchen"],["natori.com","Natori","Apparel"],["hestanculinary.com","Hestan Culinary","Kitchen"],
  ["thermos.com","Thermos","Outdoor"],["lenox.com","Lenox","Home"],["ediblearrangements.com","Edible Arrangements","Kitchen"],
  ["casper.com","Casper","Home"],["altrarunning.com","Altra Running","Footwear"],
];
const BIG = new Set(["peets.com","waterford.com","hoover.com","sharperimage.com","skullcandy.com","gibson.com","burton.com","instantpot.com","pyrexhome.com","corelle.com","stanley1913.com","reebok.com","revlon.com","godiva.com","casper.com","keenfootwear.com","brookstone.com","wusthof.com","thermos.com","lenox.com","allbirds.com","gymshark.com","glossier.com","fashionnova.com","kyliecosmetics.com","fentybeauty.com","rarebeauty.com","awaytravel.com","therabody.com","olaplex.com","bonobos.com","untuckit.com","brooklinen.com","skims.com","bluemercury.com","dirtdevil.com","edibleArrangements.com","ediblearrangements.com"]);
const seen = new Set();
const shopify = [];
for (const b of dtc.brands) { seen.add(b.domain); shopify.push({ domain: b.domain, name: b.name, slug: b.slug, category: b.category, sampleProductCount: b.sampleProductCount }); }
for (const [domain, name, category] of newShopify) if (!seen.has(domain)) { seen.add(domain); shopify.push({ domain, name, slug: slug(name), category }); }
for (const b of shopify) {
  const prior = dtc.brands.find((x) => x.domain === b.domain);
  const t = tos[b.domain] || (prior?.tosStatus ? { s: prior.tosStatus, why: prior.tosNote } : { s: "unverified", why: "not checked" });
  b.platform = "Shopify";
  b.tosStatus = t.s; b.tosNote = t.why || undefined;
  b.status = t.s === "clean" ? "live" : "paused_tos";
  b.bigName = BIG.has(b.domain) || undefined;
}
// de-dup slugs
const slugs = new Set();
for (const b of shopify) { let s = b.slug; let i = 2; while (slugs.has(s)) s = `${b.slug}-${i++}`; b.slug = s; slugs.add(s); }
fs.writeFileSync("src/config/dtc-brands.json", JSON.stringify({ updatedAt: now, totalCount: shopify.length, tosCheckedAt: now, brands: shopify }, null, 2));

// 2) JSON-LD (non-Shopify) brands: robots.txt allows product pages, product pages expose schema.org Product/Offer, ToS has no anti-automation clause.
const jsonld = [
  { domain: "oldnavy.gap.com", aliases: ["oldnavy.com"], name: "Old Navy", category: "Apparel", platform: "Custom (Gap Inc.)", tosUrl: "https://oldnavy.gap.com/customerService/info.do?cid=3319" },
  { domain: "bananarepublic.gap.com", aliases: ["bananarepublic.com"], name: "Banana Republic", category: "Apparel", platform: "Custom (Gap Inc.)", tosUrl: "https://oldnavy.gap.com/customerService/info.do?cid=3319" },
  { domain: "athleta.gap.com", aliases: ["athleta.com"], name: "Athleta", category: "Apparel", platform: "Custom (Gap Inc.)", tosUrl: "https://oldnavy.gap.com/customerService/info.do?cid=3319" },
  { domain: "www.madewell.com", aliases: ["madewell.com"], name: "Madewell", category: "Apparel", platform: "Salesforce Commerce Cloud", tosUrl: "https://www.madewell.com/terms-of-use.html" },
  { domain: "www.bose.com", aliases: ["bose.com"], name: "Bose", category: "Tech Accessories", platform: "Salesforce Commerce Cloud", tosUrl: "https://www.bose.com/legal/terms-of-use" },
  { domain: "theordinary.com", aliases: [], name: "The Ordinary", category: "Beauty", platform: "Salesforce Commerce Cloud", tosUrl: "https://theordinary.com/en-us/terms-of-use.html" },
  { domain: "www.lookfantastic.com", aliases: ["lookfantastic.com"], name: "LOOKFANTASTIC", category: "Beauty", platform: "THG Ingenuity", tosUrl: "https://www.lookfantastic.com/info/terms-and-conditions.list" },
  { domain: "www.worldmarket.com", aliases: ["worldmarket.com"], name: "World Market", category: "Home", platform: "Salesforce Commerce Cloud", tosUrl: "https://www.worldmarket.com/customer-service/terms-and-conditions.html" },
  { domain: "www.harryanddavid.com", aliases: ["harryanddavid.com"], name: "Harry & David", category: "Kitchen", platform: "Custom", tosUrl: "https://www.harryanddavid.com/About-Us-Terms-of-Use" },
  { domain: "www.henckels.com", aliases: ["henckels.com"], name: "HENCKELS", category: "Kitchen", platform: "Salesforce Commerce Cloud", tosUrl: "https://www.henckels.com/us/terms.html" },
  { domain: "www.irobot.com", aliases: ["irobot.com"], name: "iRobot", category: "Home", platform: "Salesforce Commerce Cloud", tosUrl: "https://www.irobot.com/en_US/legal/terms-and-conditions.html" },
].map((b) => ({ ...b, slug: slug(b.name), source: "jsonld", status: "live", tosStatus: "clean", bigName: true }));
fs.writeFileSync("src/config/jsonld-brands.json", JSON.stringify({ updatedAt: now, note: "Robots.txt-allowed schema.org Product JSON-LD; ToS reviewed with no anti-automation clause. Capped, delayed page fetches.", brands: jsonld }, null, 2));

// 3) Partner / blocked / ToS-restricted big names (not live). Remove ones now live via JSON-LD.
const liveDomains = new Set(jsonld.flatMap((b) => [b.domain.replace(/^www\./, ""), ...b.aliases]));
const partner = JSON.parse(fs.readFileSync("src/config/partner-brands.json", "utf8")).brands.filter((b) => !liveDomains.has(b.domain));
const fix = { "nike.com": "cj", "lululemon.com": "awin" };
const NET = {
  impact: ["Impact", ["IMPACT_ACCOUNT_SID", "IMPACT_AUTH_TOKEN"], "https://app.impact.com/signup/partner"],
  cj: ["CJ Affiliate", ["CJ_PERSONAL_ACCESS_TOKEN", "CJ_COMPANY_ID"], "https://signup.cj.com/member/signup/publisher/"],
  rakuten: ["Rakuten Advertising", ["RAKUTEN_CLIENT_ID", "RAKUTEN_CLIENT_SECRET", "RAKUTEN_SID"], "https://rakutenadvertising.com/publisher/"],
  awin: ["Awin", ["AWIN_API_TOKEN", "AWIN_PUBLISHER_ID"], "https://ui.awin.com/publisher-signup/en/awin/step1"],
  skimlinks: ["Skimlinks", ["SKIMLINKS_API_KEY", "SKIMLINKS_PUBLISHER_ID"], "https://www.skimlinks.com/signup/"],
};
for (const b of partner) if (fix[b.domain]) { const n = NET[fix[b.domain]]; Object.assign(b, { source: fix[b.domain], networkName: n[0], envKeysNeeded: n[1], signupUrl: n[2] }); }
const existing = new Set([...partner.map((b) => b.domain), ...shopify.map((b) => b.domain), ...liveDomains]);
// Measured today: bot wall / robots 403 / ToS prohibits / no structured data. Routed to Skimlinks catch-all unless a specific network is known.
const extra = [
  ["kohls.com","Kohl's","Apparel","rakuten","bot wall (robots.txt 403)"],["costco.com","Costco","Home","skimlinks","bot wall"],["columbia.com","Columbia Sportswear","Outdoor","skimlinks","bot wall"],
  ["puma.com","PUMA","Footwear","skimlinks","bot wall"],["crocs.com","Crocs","Footwear","skimlinks","bot wall"],["ugg.com","UGG","Footwear","skimlinks","timed out"],
  ["teva.com","Teva","Footwear","skimlinks","bot wall"],["merrell.com","Merrell","Footwear","skimlinks","timed out"],["vans.com","Vans","Footwear","skimlinks","bot wall"],
  ["timberland.com","Timberland","Footwear","skimlinks","bot wall"],["thenorthface.com","The North Face","Outdoor","skimlinks","bot wall"],["landsend.com","Lands' End","Apparel","skimlinks","bot wall"],
  ["llbean.com","L.L.Bean","Outdoor","skimlinks","bot wall"],["carhartt.com","Carhartt","Apparel","skimlinks","bot wall"],["express.com","Express","Apparel","skimlinks","bot wall"],
  ["ae.com","American Eagle","Apparel","skimlinks","HTTP 403"],["hollisterco.com","Hollister","Apparel","skimlinks","bot wall"],["victoriassecret.com","Victoria's Secret","Apparel","skimlinks","bot wall"],
  ["bathandbodyworks.com","Bath & Body Works","Beauty","skimlinks","redirect wall"],["kiehls.com","Kiehl's","Beauty","skimlinks","HTTP 403"],["clinique.com","Clinique","Beauty","skimlinks","bot wall"],
  ["esteelauder.com","Estée Lauder","Beauty","skimlinks","bot wall"],["maccosmetics.com","MAC Cosmetics","Beauty","skimlinks","bot wall"],["benefitcosmetics.com","Benefit Cosmetics","Beauty","skimlinks","bot wall"],
  ["elfcosmetics.com","e.l.f. Cosmetics","Beauty","skimlinks","bot wall"],["cerave.com","CeraVe","Beauty","skimlinks","bot wall"],["dermstore.com","Dermstore","Beauty","skimlinks","bot wall"],
  ["backcountry.com","Backcountry","Outdoor","skimlinks","bot wall"],["dickssportinggoods.com","DICK'S Sporting Goods","Outdoor","skimlinks","bot wall"],["basspro.com","Bass Pro Shops","Outdoor","skimlinks","bot wall"],
  ["kitchenaid.com","KitchenAid","Kitchen","skimlinks","bot wall"],["keurig.com","Keurig","Kitchen","skimlinks","bot wall"],["ninjakitchen.com","Ninja","Kitchen","skimlinks","bot wall"],
  ["sharkclean.com","Shark","Home","skimlinks","bot wall"],["solostove.com","Solo Stove","Outdoor","skimlinks","bot wall"],["rh.com","RH","Home","skimlinks","bot wall"],
  ["serenaandlily.com","Serena & Lily","Home","skimlinks","bot wall"],["arhaus.com","Arhaus","Home","skimlinks","HTTP 430"],["birkenstock.com","Birkenstock","Footwear","skimlinks","bot wall"],
  ["clarks.com","Clarks","Footwear","skimlinks","bot wall"],["drmartens.com","Dr. Martens","Footwear","skimlinks","no product sitemap"],["saucony.com","Saucony","Footwear","skimlinks","no product sitemap"],
  ["weber.com","Weber","Outdoor","skimlinks","no structured product data"],["traeger.com","Traeger","Outdoor","skimlinks","no structured product data"],["zappos.com","Zappos","Footwear","skimlinks","ToS prohibits bots/data mining"],
  ["lovesac.com","Lovesac","Home","skimlinks","ToS prohibits robots/data mining"],["lecreuset.com","Le Creuset","Kitchen","skimlinks","ToS prohibits robots/spiders"],["subzero-wolf.com","Sub-Zero & Wolf","Kitchen","skimlinks","ToS prohibits scraping"],
  ["oralb.com","Oral-B","Beauty","skimlinks","P&G ToS prohibits scraping"],["illy.com","illy","Kitchen","skimlinks","ToS prohibits scraping"],["skechers.com","Skechers","Footwear","skimlinks","ToS not located for review"],
  ["academy.com","Academy Sports + Outdoors","Outdoor","skimlinks","ToS not located for review"],["vitamix.com","Vitamix","Kitchen","skimlinks","ToS not located for review"],["paulaschoice.com","Paula's Choice","Beauty","skimlinks","ToS not located for review"],
  ["waterpik.com","Waterpik","Wellness","skimlinks","ToS not located for review"],["1800flowers.com","1-800-Flowers","Home","skimlinks","ToS not located for review"],["aloyoga.com","Alo Yoga","Apparel","skimlinks","ToS prohibits automated collection"],
  ["vuori.com","Vuori","Apparel","awin","catalog JSON blocked"],["ulta.com","Ulta Beauty","Beauty","impact","no structured product data"],["homedepot.com","The Home Depot","Home","cj","no structured product data"],
];
for (const [domain, name, category, net, reason] of extra) {
  if (existing.has(domain)) { const p = partner.find((b) => b.domain === domain); if (p) p.blockReason = reason; continue; }
  const n = NET[net]; partner.push({ domain, name, slug: slug(name), category, source: net, networkName: n[0], envKeysNeeded: n[1], signupUrl: n[2], blockReason: reason }); existing.add(domain);
}
for (const b of partner) { b.bigName = true; if (!b.blockReason) b.blockReason = "direct catalog blocked or unavailable; partner feed needed"; }
fs.writeFileSync("src/config/partner-brands.json", JSON.stringify({ updatedAt: now, brands: partner }, null, 2));
const live = shopify.filter((b) => b.status === "live");
console.log({ shopifyTotal: shopify.length, shopifyLive: live.length, shopifyPausedTos: shopify.length - live.length, shopifyBigLive: live.filter((b) => b.bigName).length, jsonldLive: jsonld.length, partnerPending: partner.length, total: shopify.length + jsonld.length + partner.length });

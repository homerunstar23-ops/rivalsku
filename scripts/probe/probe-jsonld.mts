import fs from "fs";
const UA = "RivalSKU-Deals/1.0 (+https://rivalsku.com/deals; polite-catalog-sync)";
const domains = fs.readFileSync(process.argv[2], "utf8").split(/\s+/).filter(Boolean);

async function get(url: string, ms = 7000) {
  const c = new AbortController(); const t = setTimeout(() => c.abort(), ms);
  try {
    const r = await fetch(url, { headers: { "User-Agent": UA, Accept: "text/html,application/xml,*/*" }, signal: c.signal, redirect: "follow" });
    const text = r.ok ? await r.text() : "";
    return { status: r.status, text, url: r.url };
  } catch (e: any) { return { status: 0, text: "", url, err: e.name }; } finally { clearTimeout(t); }
}

function parseRobots(txt: string) {
  const groups: { agents: string[]; dis: string[]; allow: string[] }[] = []; const sitemaps: string[] = [];
  let cur: any = null; let lastWasAgent = false;
  for (const raw of txt.split("\n")) {
    const line = raw.split("#")[0].trim(); if (!line) continue;
    const idx = line.indexOf(":"); if (idx < 0) continue;
    const k = line.slice(0, idx).trim().toLowerCase(); const v = line.slice(idx + 1).trim();
    if (k === "sitemap") { sitemaps.push(v); continue; }
    if (k === "user-agent") { if (!lastWasAgent) { cur = { agents: [], dis: [], allow: [] }; groups.push(cur); } cur.agents.push(v.toLowerCase()); lastWasAgent = true; continue; }
    lastWasAgent = false;
    if (!cur) continue;
    if (k === "disallow" && v) cur.dis.push(v); if (k === "allow" && v) cur.allow.push(v);
  }
  const g = groups.find((g) => g.agents.some((a) => a.includes("rivalsku"))) || groups.find((g) => g.agents.includes("*")) || { dis: [], allow: [] };
  return { dis: g.dis, allow: g.allow, sitemaps };
}
function allowed(r: { dis: string[]; allow: string[] }, path: string) {
  const m = (p: string) => { const re = new RegExp("^" + p.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\\\$$/, "$")); return re.test(path); };
  let best = ""; let ok = true;
  for (const d of r.dis) if (m(d) && d.length > best.length) { best = d; ok = false; }
  for (const a of r.allow) if (m(a) && a.length >= best.length) { best = a; ok = true; }
  return ok;
}
function locs(xml: string) { return [...xml.matchAll(/<loc>\s*(?:<!\[CDATA\[)?([^<\]]+)/g)].map((m) => m[1].trim()); }
function extractProducts(html: string) {
  const out: any[] = [];
  for (const m of html.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const j = JSON.parse(m[1].trim());
      const walk = (n: any) => { if (!n || typeof n !== "object") return; if (Array.isArray(n)) return n.forEach(walk);
        const t = n["@type"]; if (t === "Product" || (Array.isArray(t) && t.includes("Product")) || t === "ProductGroup") out.push(n);
        if (n["@graph"]) walk(n["@graph"]); };
      walk(j);
    } catch {}
  }
  return out;
}

async function probe(domain: string) {
  const res: any = { domain };
  const rb = await get(`https://${domain}/robots.txt`);
  res.robots = rb.status;
  if (rb.status === 403 || rb.status === 0) { res.verdict = "blocked_or_unreachable"; return res; }
  const robots = parseRobots(rb.text);
  if (!allowed(robots, "/")) { res.verdict = "robots_disallow_all"; return res; }
  const home = await get(`https://${domain}/`);
  res.home = home.status;
  if (home.status !== 200) { res.verdict = `home_${home.status}`; return res; }
  res.platform = /cdn\.shopify|Shopify\.theme/i.test(home.text) ? "shopify" : /bigcommerce|cdn11\.bigcommerce/i.test(home.text) ? "bigcommerce" : /woocommerce|wp-content/i.test(home.text) ? "woocommerce" : /Magento|mage\/|static\/version/i.test(home.text) ? "magento" : /demandware|dwanalytics|on\/demandware/i.test(home.text) ? "sfcc" : "custom";
  let sm = robots.sitemaps.length ? robots.sitemaps : [`https://${domain}/sitemap.xml`];
  let productUrls: string[] = [];
  for (let depth = 0; depth < 3 && productUrls.length === 0 && sm.length; depth++) {
    const next: string[] = [];
    for (const s of sm.slice(0, 4)) {
      const x = await get(s); if (x.status !== 200) continue;
      const L = locs(x.text);
      if (/<sitemapindex/i.test(x.text)) { const pr = L.filter((u) => /product/i.test(u)); next.push(...(pr.length ? pr : L).slice(0, 3)); }
      else productUrls.push(...L.filter((u) => /\/(p|product|products|shop|item)s?\/|\.html$|\/p\//i.test(u) || /product/i.test(s)));
    }
    sm = next;
  }
  productUrls = productUrls.filter((u) => { try { return allowed(robots, new URL(u).pathname); } catch { return false; } });
  res.productUrls = productUrls.length;
  if (!productUrls.length) { res.verdict = "no_product_sitemap"; return res; }
  let jsonld = 0, withPrice = 0, strike = 0; let sample: any = null;
  for (const u of productUrls.slice(0, 3)) {
    const p = await get(u); if (p.status !== 200) { res.pageStatus = p.status; continue; }
    const prods = extractProducts(p.text);
    if (prods.length) { jsonld++; const s = JSON.stringify(prods); if (/"price"\s*:/.test(s)) withPrice++; if (/StrikethroughPrice|ListPrice|highPrice/i.test(s)) strike++; sample = sample || prods[0]?.name; }
  }
  res.jsonld = jsonld; res.withPrice = withPrice; res.strike = strike; res.sample = sample;
  res.verdict = withPrice ? "jsonld_ok" : jsonld ? "jsonld_noprice" : "no_jsonld";
  return res;
}

const out: any[] = []; let i = 0;
await Promise.all(Array.from({ length: 12 }, async () => { while (i < domains.length) { const d = domains[i++]; out.push(await probe(d)); } }));
out.sort((a, b) => a.domain.localeCompare(b.domain));
for (const o of out) console.log(`${o.domain.padEnd(28)} ${o.verdict.padEnd(24)} plat=${o.platform||"-"} prodUrls=${o.productUrls??"-"} ld=${o.jsonld??"-"} price=${o.withPrice??"-"} strike=${o.strike??"-"} ${o.sample||""}`);
fs.writeFileSync(process.argv[3] || "/tmp/jsonld-results.json", JSON.stringify(out, null, 1));
const tally: any = {}; for (const o of out) tally[o.verdict] = (tally[o.verdict] || 0) + 1; console.log(tally);

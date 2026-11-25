// Probe WooCommerce Store API (public, unauthenticated by design) on candidate domains.
const UA = "RivalSKU-Deals/1.0 (+https://rivalsku.com/deals; polite-catalog-sync)";
const candidates = process.argv.slice(2).length ? process.argv.slice(2) : (await import("fs")).readFileSync("/tmp/woo-candidates.txt","utf8").split(/\s+/).filter(Boolean);

async function robotsAllows(domain: string, path: string) {
  try {
    const c = new AbortController(); const t = setTimeout(()=>c.abort(), 4000);
    const r = await fetch(`https://${domain}/robots.txt`, { headers: { "User-Agent": UA }, signal: c.signal });
    clearTimeout(t);
    if (!r.ok) return true;
    const txt = await r.text();
    let applies = false; const dis: string[] = [];
    for (const raw of txt.split("\n")) {
      const line = raw.split("#")[0].trim(); if (!line) continue;
      const [k, ...rest] = line.split(":"); const v = rest.join(":").trim();
      if (/^user-agent$/i.test(k)) applies = v === "*" || /rivalsku/i.test(v);
      else if (applies && /^disallow$/i.test(k) && v) dis.push(v);
    }
    return !dis.some((d) => path.startsWith(d.replace(/\*.*$/, "")));
  } catch { return true; }
}

async function probe(domain: string) {
  const path = "/wp-json/wc/store/v1/products";
  const c = new AbortController(); const t = setTimeout(()=>c.abort(), 6000);
  try {
    const r = await fetch(`https://${domain}${path}?per_page=20&on_sale=true`, { headers: { "User-Agent": UA, Accept: "application/json" }, signal: c.signal });
    const ct = r.headers.get("content-type") || "";
    if (!r.ok || !ct.includes("json")) return { domain, ok: false, status: r.status };
    const j = await r.json();
    if (!Array.isArray(j)) return { domain, ok: false, status: r.status, note: "not array" };
    const allowed = await robotsAllows(domain, path);
    return { domain, ok: true, allowed, onSale: j.length, sample: j[0]?.name };
  } catch (e: any) { return { domain, ok: false, status: e.name }; } finally { clearTimeout(t); }
}

const out: any[] = []; let i = 0;
await Promise.all(Array.from({ length: 16 }, async () => { while (i < candidates.length) { const d = candidates[i++]; out.push(await probe(d)); } }));
const good = out.filter((o) => o.ok);
console.log(JSON.stringify(good, null, 1));
console.log(`WOO OK: ${good.length}/${candidates.length}; robots-allowed: ${good.filter(g=>g.allowed).length}`);
(await import("fs")).writeFileSync("/tmp/woo-results.json", JSON.stringify(out, null, 1));

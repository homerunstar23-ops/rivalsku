import fs from "fs";
const UA = "RivalSKU-Deals/1.0 (+https://rivalsku.com/deals; polite-catalog-sync)";
const domains = process.argv.slice(2);
async function get(url: string) { const c = new AbortController(); const t = setTimeout(() => c.abort(), 8000);
  try { const r = await fetch(url, { headers: { "User-Agent": UA }, signal: c.signal, redirect: "follow" }); return { s: r.status, t: r.ok ? await r.text() : "", u: r.url }; } catch { return { s: 0, t: "", u: url }; } finally { clearTimeout(t); } }
const out: any = {};
await Promise.all(domains.map(async (d) => {
  const h = await get(`https://${d}/`);
  const links = [...h.t.matchAll(/href="([^"]*(?:terms|conditions|legal|tos)[^"]*)"/gi)].map((m) => m[1]).filter((l) => !/privacy|cookie/i.test(l));
  let found: string | null = null; let hits: string[] = []; let url = "";
  for (const l of links.slice(0, 4)) {
    url = new URL(l, h.u || `https://${d}/`).toString();
    const p = await get(url); if (!p.t) continue;
    const text = p.t.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
    if (text.length < 3000) continue;
    found = url;
    for (const m of text.matchAll(/[^.]{0,160}\b(robot|spider|scrap|crawl|data min|automated (?:means|system|device|tool)|harvest)[^.]{0,160}\./gi)) hits.push(m[0].trim().slice(0, 260));
    break;
  }
  out[d] = { tos: found, hits: hits.slice(0, 2), linkCount: links.length };
}));
for (const d of domains) console.log(`\n## ${d} tos=${out[d].tos} hits=${out[d].hits.length}\n${out[d].hits.join("\n")}`);
fs.writeFileSync("/tmp/tos-results.json", JSON.stringify(out, null, 1));

// ToS check v3 for Shopify brands: any anti-automation keyword in the rendered ToS => "prohibits";
// a real ToS (governing law / liability / indemnification language) with none => "clean"; otherwise "unverified".
import fs from "fs";
const UA = "RivalSKU-Deals/1.0 (+https://rivalsku.com/deals; polite-catalog-sync)";
const file = "src/config/dtc-brands.json";
const cfg = JSON.parse(fs.readFileSync(file, "utf8"));
const strong = /\b(spiders?|scrap(?:e|er|ers|ing)|crawl(?:er|ers|ing)?|data[- ]min(?:e|ing)|automated (?:means|systems?|devices?|tools?|process(?:es)?|software|scripts?)|harvest(?:ing)?|robots? \(?(?:or|and)? ?["“]?bots?)\b/i;
const realTos = /governing law|limitation of liability|indemnif|disclaimer of warrant/i;
let i = 0;
await Promise.all(Array.from({ length: 12 }, async () => {
  while (i < cfg.brands.length) {
    const b = cfg.brands[i++];
    try {
      const c = new AbortController(); const t = setTimeout(() => c.abort(), 9000);
      const r = await fetch(`https://${b.domain}/policies/terms-of-service`, { headers: { "User-Agent": UA }, signal: c.signal, redirect: "follow" });
      clearTimeout(t);
      if (!r.ok) { b.tosStatus = "unverified"; b.tosNote = `no ToS page (${r.status})`; continue; }
      const text = (await r.text()).replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<noscript[\s\S]*?<\/noscript>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&[a-z#0-9]+;/gi, " ").replace(/\s+/g, " ");
      const m = text.match(new RegExp(`[^.;]{0,140}${strong.source}[^.;]{0,140}`, "i"));
      if (m) { b.tosStatus = "prohibits"; b.tosNote = m[0].trim().slice(0, 240); }
      else if (realTos.test(text)) { b.tosStatus = "clean"; b.tosNote = undefined; }
      else { b.tosStatus = "unverified"; b.tosNote = "ToS text not readable"; }
    } catch { b.tosStatus = "unverified"; b.tosNote = "fetch error"; }
  }
}));
for (const b of cfg.brands) b.status = b.tosStatus === "clean" ? "live" : "paused_tos";
cfg.tosCheckedAt = new Date().toISOString();
fs.writeFileSync(file, JSON.stringify(cfg, null, 2));
const t = {}; for (const b of cfg.brands) t[b.tosStatus] = (t[b.tosStatus] || 0) + 1;
console.log(t, "big live:", cfg.brands.filter((b) => b.status === "live" && b.bigName).map((b) => b.name).join(", "));

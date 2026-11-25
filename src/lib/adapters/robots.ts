// Minimal robots.txt parser (RFC 9309 longest-match semantics) with an in-memory cache.
export const USER_AGENT =
  "RivalSKU-Deals/1.0 (+https://rivalsku.com/deals; polite-catalog-sync)";

type Rules = { allow: string[]; disallow: string[]; sitemaps: string[]; blocked: boolean; fetchedAt: number };
const cache = new Map<string, Rules>();
const TTL = 12 * 60 * 60 * 1000;

export async function politeFetch(url: string, timeoutMs = 8000, accept = "text/html,application/xml;q=0.9,*/*;q=0.8") {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), timeoutMs);
  try {
    return await fetch(url, { headers: { "User-Agent": USER_AGENT, Accept: accept }, signal: c.signal, redirect: "follow", cache: "no-store" });
  } finally {
    clearTimeout(t);
  }
}

export function parseRobots(txt: string): Omit<Rules, "fetchedAt" | "blocked"> {
  const groups: { agents: string[]; allow: string[]; disallow: string[] }[] = [];
  const sitemaps: string[] = [];
  let cur: { agents: string[]; allow: string[]; disallow: string[] } | null = null;
  let lastAgent = false;
  for (const raw of txt.split(/\r?\n/)) {
    const line = raw.split("#")[0].trim();
    const i = line.indexOf(":");
    if (!line || i < 0) continue;
    const k = line.slice(0, i).trim().toLowerCase();
    const v = line.slice(i + 1).trim();
    if (k === "sitemap") { sitemaps.push(v); continue; }
    if (k === "user-agent") {
      if (!lastAgent || !cur) { cur = { agents: [], allow: [], disallow: [] }; groups.push(cur); }
      cur.agents.push(v.toLowerCase()); lastAgent = true; continue;
    }
    lastAgent = false;
    if (!cur) continue;
    if (k === "disallow" && v) cur.disallow.push(v);
    if (k === "allow" && v) cur.allow.push(v);
  }
  const g = groups.find((x) => x.agents.some((a) => a.includes("rivalsku"))) || groups.find((x) => x.agents.includes("*"));
  return { allow: g?.allow ?? [], disallow: g?.disallow ?? [], sitemaps };
}

function toRe(p: string) {
  const esc = p.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
  return new RegExp("^" + (esc.endsWith("\\$") ? esc.slice(0, -2) + "$" : esc));
}

export function isPathAllowed(rules: Pick<Rules, "allow" | "disallow">, path: string) {
  let best = -1; let ok = true;
  for (const d of rules.disallow) if (toRe(d).test(path) && d.length > best) { best = d.length; ok = false; }
  for (const a of rules.allow) if (toRe(a).test(path) && a.length >= best) { best = a.length; ok = true; }
  return ok;
}

export async function getRobots(host: string): Promise<Rules> {
  const hit = cache.get(host);
  if (hit && Date.now() - hit.fetchedAt < TTL) return hit;
  let rules: Rules;
  try {
    const r = await politeFetch(`https://${host}/robots.txt`, 6000, "text/plain");
    if (r.status === 401 || r.status === 403) rules = { allow: [], disallow: ["/"], sitemaps: [], blocked: true, fetchedAt: Date.now() };
    else if (!r.ok) rules = { allow: [], disallow: [], sitemaps: [], blocked: false, fetchedAt: Date.now() };
    else rules = { ...parseRobots(await r.text()), blocked: false, fetchedAt: Date.now() };
  } catch {
    // Unreachable robots.txt: be conservative and treat as disallowed.
    rules = { allow: [], disallow: ["/"], sitemaps: [], blocked: true, fetchedAt: Date.now() };
  }
  cache.set(host, rules);
  return rules;
}

export async function robotsAllows(url: string) {
  const u = new URL(url);
  const rules = await getRobots(u.host);
  return !rules.blocked && isPathAllowed(rules, u.pathname + u.search);
}

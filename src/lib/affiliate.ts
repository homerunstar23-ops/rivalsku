import { getBrandDirectory } from "./adapters";

export type AffiliateBrandConfig = {
  network?: string;
  urlPrefix?: string;
  params?: Record<string, string>;
};

export type AffiliateResolution = {
  finalUrl: string;
  network: string;
};

let cachedMapRaw: string | undefined;
let cachedMap: Record<string, AffiliateBrandConfig> = {};

function getAffiliateMap(): Record<string, AffiliateBrandConfig> {
  const raw = process.env.AFFILIATE_MAP || "";
  if (raw === cachedMapRaw) return cachedMap;
  cachedMapRaw = raw;
  if (!raw.trim()) {
    cachedMap = {};
    return cachedMap;
  }
  try {
    const parsed = JSON.parse(raw) as Record<string, AffiliateBrandConfig>;
    cachedMap = parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    cachedMap = {};
  }
  return cachedMap;
}

let allowedDomainsCache: Set<string> | null = null;
function getAllowedDomains(): Set<string> {
  if (allowedDomainsCache) return allowedDomainsCache;
  const set = new Set<string>();
  for (const b of getBrandDirectory()) {
    set.add(b.domain.toLowerCase().replace(/^www\./, ""));
  }
  allowedDomainsCache = set;
  return set;
}

export function isAllowedProductUrl(rawUrl: string): boolean {
  try {
    const u = new URL(rawUrl);
    if (u.protocol !== "https:" && u.protocol !== "http:") return false;
    const host = u.hostname.toLowerCase().replace(/^www\./, "");
    const allowed = getAllowedDomains();
    if (allowed.has(host)) return true;
    // Allow subdomains of known brand domains (e.g. shop.brand.com)
    for (const d of allowed) {
      if (host === d || host.endsWith(`.${d}`)) return true;
    }
    return false;
  } catch {
    return false;
  }
}

export function resolveOutboundUrl(
  targetUrl: string,
  brandDomain: string,
): AffiliateResolution {
  const cleanDomain = brandDomain.toLowerCase().replace(/^www\./, "");
  const map = getAffiliateMap();
  const brandCfg = map[cleanDomain] || map[brandDomain];

  // Ensure valid URL with clean attribution params
  let enrichedUrl = targetUrl;
  try {
    const u = new URL(targetUrl);
    if (!u.searchParams.has("utm_source")) {
      u.searchParams.set("utm_source", "rivalsku");
      u.searchParams.set("utm_medium", "deals");
    }
    if (brandCfg?.params) {
      for (const [k, v] of Object.entries(brandCfg.params)) {
        u.searchParams.set(k, v);
      }
    }
    enrichedUrl = u.toString();
  } catch {
    enrichedUrl = targetUrl;
  }

  // 1. Brand-specific affiliate link wrapper (Impact / Rakuten / CJ / Awin deep link)
  if (brandCfg?.urlPrefix) {
    return {
      finalUrl: `${brandCfg.urlPrefix}${encodeURIComponent(enrichedUrl)}`,
      network: brandCfg.network || "configured_partner",
    };
  }

  // 2. Skimlinks catch-all monetization if publisher ID is configured
  const skimlinksId = process.env.SKIMLINKS_PUBLISHER_ID?.trim();
  if (skimlinksId) {
    return {
      finalUrl: `https://go.skimresources.com?id=${encodeURIComponent(
        skimlinksId,
      )}&url=${encodeURIComponent(enrichedUrl)}`,
      network: "skimlinks",
    };
  }

  // 3. Direct brand link with clean UTM attribution
  return {
    finalUrl: enrichedUrl,
    network: "direct_utm",
  };
}

export function buildGoPath(dealId: string): string {
  return `/go/${encodeURIComponent(dealId)}`;
}

import type { BrandDirectoryEntry } from "./adapters/types";

export function statusLabel(b: Pick<BrandDirectoryEntry, "status">): { text: string; tone: "live" | "soon" | "paused" } {
  if (b.status === "live") return { text: "Live", tone: "live" };
  if (b.status === "paused_tos") return { text: "Coming soon · ToS", tone: "paused" };
  return { text: "Coming soon", tone: "soon" };
}

export const TONE_CLASS: Record<"live" | "soon" | "paused", string> = {
  live: "bg-[#0D7C47]/10 text-[#0D7C47]",
  soon: "bg-[#FEF3C7] text-[#92400E]",
  paused: "bg-[#EFEFEA] text-[#66665E]",
};

export function sourceLabel(b: Pick<BrandDirectoryEntry, "source" | "platform" | "networkName">): string {
  if (b.source === "shopify") return "Shopify catalog";
  if (b.source === "jsonld") return `${b.platform ?? "Storefront"} · JSON-LD`;
  if (b.source === "woocommerce") return "WooCommerce Store API";
  return b.networkName;
}

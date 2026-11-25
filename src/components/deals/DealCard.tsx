"use client";

import Link from "next/link";
import { useState } from "react";
import type { NormalizedDeal } from "@/lib/adapters/types";

function formatMoney(n: number): string {
  return n % 1 === 0 ? `$${n.toFixed(0)}` : `$${n.toFixed(2)}`;
}

export function DealCard({ deal }: { deal: NormalizedDeal }) {
  const [copied, setCopied] = useState(false);

  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/deals/${encodeURIComponent(deal.id)}`
      : `https://rivalsku.com/deals/${encodeURIComponent(deal.id)}`;

  async function handleShare(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const title =
      deal.discountPct > 0
        ? `${deal.discountPct}% off ${deal.brandName} ${deal.title} (${formatMoney(deal.nowPrice)}, was ${formatMoney(deal.wasPrice)})`
        : `${deal.brandName} — ${deal.title} (${formatMoney(deal.nowPrice)})`;

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, url: shareUrl });
        return;
      } catch {
        // Fallback to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  const isDiscount = deal.discountPct >= 10 && deal.wasPrice > deal.nowPrice;
  const isNewLaunch =
    !isDiscount && deal.sectionTags.includes("new_launch");
  const isRestock =
    !isDiscount && !isNewLaunch && deal.sectionTags.includes("back_in_stock");

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-[#EAEAE2] bg-white transition-all duration-200 hover:-translate-y-0.5 hover:border-[#D0D0C6] hover:shadow-md">
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-[#F3F3EE]">
        <Link
          href={`/deals/${encodeURIComponent(deal.id)}`}
          className="block h-full w-full"
        >
          {deal.imageUrl ? (
            <img
              src={deal.imageUrl}
              alt={`${deal.brandName} ${deal.title}`}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-[#888880]">
              {deal.brandName}
            </div>
          )}
        </Link>

        {/* Top-left badge */}
        <div className="pointer-events-none absolute left-2.5 top-2.5 flex flex-wrap gap-1.5">
          {isDiscount ? (
            <span className="rounded-full bg-[#0D7C47] px-2.5 py-1 font-mono text-xs font-semibold text-white shadow-xs">
              -{deal.discountPct}%
            </span>
          ) : isNewLaunch ? (
            <span className="rounded-full bg-[#111111] px-2.5 py-1 font-mono text-[11px] font-semibold uppercase tracking-wide text-white shadow-xs">
              New Drop
            </span>
          ) : isRestock ? (
            <span className="rounded-full bg-[#1E40AF] px-2.5 py-1 font-mono text-[11px] font-semibold uppercase tracking-wide text-white shadow-xs">
              Restocked
            </span>
          ) : null}
        </div>

        {/* Top-right share button */}
        <button
          type="button"
          onClick={handleShare}
          title="Share deal link"
          aria-label={`Share ${deal.title}`}
          className="absolute right-2.5 top-2.5 rounded-full border border-black/10 bg-white/90 px-2.5 py-1 text-[11px] font-medium text-[#222220] backdrop-blur-xs transition-colors hover:bg-white"
        >
          {copied ? "Copied!" : "Share"}
        </button>
      </div>

      <div className="flex flex-1 flex-col p-3.5 sm:p-4">
        <div className="flex items-center justify-between gap-2">
          <Link
            href={`/deals/brand/${encodeURIComponent(deal.brandSlug)}`}
            className="truncate text-xs font-semibold uppercase tracking-wider text-[#66665E] hover:text-[#111111]"
          >
            {deal.brandName}
          </Link>
          <span className="shrink-0 text-[11px] text-[#8E8E84]">
            {deal.category}
          </span>
        </div>

        <Link
          href={`/deals/${encodeURIComponent(deal.id)}`}
          className="mt-1 line-clamp-2 text-sm font-medium leading-snug text-[#111111] hover:underline sm:text-[15px]"
        >
          {deal.title}
        </Link>

        <div className="mt-auto pt-3">
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="font-mono text-base font-semibold text-[#111111] sm:text-lg">
              {formatMoney(deal.nowPrice)}
            </span>
            {isDiscount && (
              <>
                <span className="font-mono text-xs text-[#8A8A80] line-through sm:text-sm">
                  {formatMoney(deal.wasPrice)}
                </span>
                <span className="ml-auto font-mono text-[11px] font-medium text-[#0D7C47]">
                  Save {formatMoney(deal.savingsDollars)}
                </span>
              </>
            )}
          </div>

          <a
            href={`/go/${encodeURIComponent(deal.id)}`}
            target="_blank"
            rel="noopener noreferrer sponsored"
            className="mt-3 flex w-full items-center justify-center rounded-xl bg-[#111111] px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#2B2B28] sm:text-sm"
          >
            {isDiscount ? "Shop deal" : "View product"} &rarr;
          </a>
        </div>
      </div>
    </article>
  );
}

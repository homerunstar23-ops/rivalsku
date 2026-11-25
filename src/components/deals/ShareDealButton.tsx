"use client";

import { useState } from "react";

export function ShareDealButton({
  title,
  urlPath,
}: {
  title: string;
  urlPath: string;
}) {
  const [copied, setCopied] = useState(false);

  async function onShare() {
    const fullUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}${urlPath}`
        : `https://rivalsku.com${urlPath}`;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, url: fullUrl });
        return;
      } catch {
        // Fallback
      }
    }
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={onShare}
      className="inline-flex items-center justify-center rounded-xl border border-[#D4D4CC] bg-white px-5 py-3 text-sm font-semibold text-[#111111] transition-colors hover:border-[#111111]"
    >
      {copied ? "Link copied!" : "Share this drop"}
    </button>
  );
}

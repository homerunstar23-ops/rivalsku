"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import type { BrandDirectoryEntry, NormalizedDeal } from "@/lib/adapters/types";
import { statusLabel, TONE_CLASS } from "@/lib/brand-status";

type Brand = BrandDirectoryEntry & { liveDealCount: number };
type Resp = { brands: Brand[]; products: NormalizedDeal[]; totalProducts: number };

function money(n: number) {
  return n % 1 === 0 ? `$${n.toFixed(0)}` : `$${n.toFixed(2)}`;
}

export function SearchBar({
  variant = "header",
  initialQuery = "",
  autoFocus = false,
}: {
  variant?: "header" | "hero";
  initialQuery?: string;
  autoFocus?: boolean;
}) {
  const router = useRouter();
  const listId = useId();
  const [q, setQ] = useState(initialQuery);
  const [data, setData] = useState<Resp | null>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const boxRef = useRef<HTMLDivElement>(null);
  const reqId = useRef(0);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) { setData(null); return; }
    const id = ++reqId.current;
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/search?q=${encodeURIComponent(term)}&limit=6&brands=5`);
        const j = (await r.json()) as Resp;
        if (id === reqId.current) { setData(j); setActive(-1); }
      } catch { /* ignore */ }
    }, 140);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const items: Array<{ href: string; key: string }> = [
    ...(data?.brands ?? []).map((b) => ({ href: `/deals/brand/${encodeURIComponent(b.slug)}`, key: `b-${b.slug}` })),
    ...(data?.products ?? []).map((p) => ({ href: `/deals/${encodeURIComponent(p.id)}`, key: `p-${p.id}` })),
  ];

  function go(href?: string) {
    setOpen(false);
    if (href) router.push(href);
    else if (q.trim()) router.push(`/search?q=${encodeURIComponent(q.trim())}`);
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); setActive((a) => Math.min(items.length - 1, a + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(-1, a - 1)); }
    else if (e.key === "Enter") { e.preventDefault(); go(active >= 0 ? items[active]?.href : undefined); }
    else if (e.key === "Escape") setOpen(false);
  }

  const hero = variant === "hero";
  const showDrop = open && q.trim().length >= 2 && data;

  return (
    <div ref={boxRef} className={`relative ${hero ? "w-full" : "w-full max-w-md"}`}>
      <form role="search" onSubmit={(e) => { e.preventDefault(); go(); }} className="relative">
        <svg aria-hidden viewBox="0 0 20 20" className={`pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8A8A82] ${hero ? "h-5 w-5" : "h-4 w-4"}`} fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="9" r="6" /><path d="m14 14 4 4" strokeLinecap="round" /></svg>
        <input
          type="search"
          value={q}
          autoFocus={autoFocus}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKey}
          placeholder={hero ? "Search brands & products — try “Old Navy”, “cashmere”, or “Nike”" : "Search brands & products…"}
          aria-label="Search brands and products"
          aria-autocomplete="list"
          aria-controls={listId}
          aria-expanded={Boolean(showDrop)}
          role="combobox"
          className={`w-full rounded-xl border border-[#D8D8D0] bg-white text-[#111111] placeholder:text-[#8A8A82] focus:border-[#111111] focus:outline-none ${hero ? "py-3.5 pl-11 pr-28 text-base shadow-sm" : "py-2 pl-9 pr-3 text-sm"}`}
        />
        {hero && (
          <button type="submit" className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-lg bg-[#111111] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2B2B28]">
            Search
          </button>
        )}
      </form>

      {showDrop && (
        <div id={listId} role="listbox" className="absolute left-0 right-0 z-50 mt-2 max-h-[70vh] overflow-y-auto rounded-2xl border border-[#E2E2DA] bg-white p-2 shadow-xl">
          {data.brands.length === 0 && data.products.length === 0 && (
            <p className="px-3 py-4 text-sm text-[#66665E]">No matches for “{q}”. Try another spelling or browse the <Link href="/deals/brands" className="underline">brand directory</Link>.</p>
          )}
          {data.brands.length > 0 && (
            <div className="mb-1">
              <p className="px-3 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#8A8A82]">Brands</p>
              {data.brands.map((b, i) => {
                const st = statusLabel(b);
                return (
                  <button key={b.slug} type="button" role="option" aria-selected={active === i} onMouseEnter={() => setActive(i)} onClick={() => go(`/deals/brand/${encodeURIComponent(b.slug)}`)}
                    className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left ${active === i ? "bg-[#F3F3EE]" : ""}`}>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-[#111111]">{b.name}</span>
                      <span className="block truncate font-mono text-[11px] text-[#8A8A82]">{b.domain.replace(/^www\./, "")} · {b.category}{b.liveDealCount ? ` · ${b.liveDealCount} drops` : ""}</span>
                    </span>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold ${TONE_CLASS[st.tone]}`}>{st.text}</span>
                  </button>
                );
              })}
            </div>
          )}
          {data.products.length > 0 && (
            <div>
              <p className="px-3 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#8A8A82]">Products</p>
              {data.products.map((p, j) => {
                const i = data.brands.length + j;
                return (
                  <button key={p.id} type="button" role="option" aria-selected={active === i} onMouseEnter={() => setActive(i)} onClick={() => go(`/deals/${encodeURIComponent(p.id)}`)}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left ${active === i ? "bg-[#F3F3EE]" : ""}`}>
                    {p.imageUrl ? <img src={p.imageUrl} alt="" className="h-10 w-10 shrink-0 rounded-md bg-[#F3F3EE] object-cover" loading="lazy" /> : <span className="h-10 w-10 shrink-0 rounded-md bg-[#F3F3EE]" />}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-[#111111]">{p.title}</span>
                      <span className="block truncate text-[11px] text-[#8A8A82]">{p.brandName}</span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block font-mono text-sm font-semibold text-[#111111]">{money(p.nowPrice)}</span>
                      {p.discountPct >= 10 && <span className="block font-mono text-[11px] font-semibold text-[#0D7C47]">-{p.discountPct}%</span>}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
          <button type="button" onClick={() => go()} className="mt-1 w-full rounded-lg border-t border-[#F0F0EA] px-3 py-2.5 text-left text-sm font-semibold text-[#111111] hover:bg-[#F3F3EE]">
            See all {data.totalProducts.toLocaleString()} results for “{q.trim()}” →
          </button>
        </div>
      )}
    </div>
  );
}

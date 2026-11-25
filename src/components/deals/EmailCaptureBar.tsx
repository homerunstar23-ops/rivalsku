"use client";

import { useState } from "react";

export function EmailCaptureBar({
  categories,
  compact = false,
}: {
  categories: string[];
  compact?: boolean;
}) {
  const [email, setEmail] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">(
    "idle",
  );
  const [message, setMessage] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("loading");
    setMessage("");
    try {
      const res = await fetch("/api/deals/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, category }),
      });
      const data = (await res.json()) as { message?: string; error?: string };
      if (!res.ok) {
        setStatus("error");
        setMessage(data.error || "Please check your email and try again.");
        return;
      }
      setStatus("done");
      setMessage(
        data.message || "Subscribed! Watch your inbox for tomorrow's drops.",
      );
      setEmail("");
    } catch {
      setStatus("error");
      setMessage("Network error — please try again.");
    }
  }

  return (
    <div
      className={
        compact
          ? "rounded-2xl border border-[#E5E5DD] bg-white p-4 sm:p-5"
          : "rounded-2xl border border-[#DFDFD6] bg-white p-5 shadow-xs sm:p-6"
      }
    >
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex h-2 w-2 rounded-full bg-[#0D7C47]" />
            <span className="text-xs font-semibold uppercase tracking-wider text-[#0D7C47]">
              Free Daily Drop Alert
            </span>
          </div>
          <h2 className="mt-1 font-serif text-xl text-[#111111] sm:text-2xl">
            Get the top 10 drops every morning
          </h2>
          <p className="mt-0.5 text-sm text-[#5A5A54]">
            Verified markdowns &amp; restocks from Old Navy, Athleta, iRobot, HexClad
            &amp; 60+ more brands. Zero spam.
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto lg:min-w-[460px]"
        >
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            aria-label="Email address"
            className="min-w-0 flex-1 rounded-xl border border-[#D8D8D0] bg-[#FAFAF8] px-3.5 py-2.5 text-sm text-[#111111] placeholder:text-[#8A8A82] focus:border-[#111111] focus:bg-white focus:outline-none"
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            aria-label="Preferred category"
            className="rounded-xl border border-[#D8D8D0] bg-[#FAFAF8] px-3 py-2.5 text-sm text-[#333330] focus:border-[#111111] focus:bg-white focus:outline-none"
          >
            <option value="all">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={status === "loading"}
            className="whitespace-nowrap rounded-xl bg-[#111111] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#2A2A28] disabled:opacity-60"
          >
            {status === "loading" ? "Saving..." : "Send me drops"}
          </button>
        </form>
      </div>

      {message && (
        <p
          className={`mt-2.5 text-xs font-medium ${
            status === "error" ? "text-[#B91C1C]" : "text-[#0D7C47]"
          }`}
        >
          {message}
        </p>
      )}
    </div>
  );
}

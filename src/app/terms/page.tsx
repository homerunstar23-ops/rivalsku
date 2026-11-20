import type { Metadata } from "next";
import { Logo } from "@/components/Logo";

export const metadata: Metadata = { title: "Terms" };

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-mist-50">
      <header className="border-b border-ink-900/10 bg-white">
        <div className="mx-auto flex h-16 max-w-3xl items-center px-5">
          <Logo />
        </div>
      </header>
      <article className="mx-auto max-w-3xl px-5 py-16">
        <h1 className="font-serif text-4xl">Terms</h1>
        <p className="mt-6 text-sm leading-relaxed text-ink-700/80">
          RivalSKU is a month-to-month subscription for monitoring public
          Shopify storefronts. Plans can be cancelled at any time; monitoring
          stops at the end of the current billing period. Change history can be
          exported on request while it is still on file.
        </p>
        <p className="mt-4 text-sm leading-relaxed text-ink-700/80">
          The service covers publicly visible product data only. Password-
          protected, wholesale-gated, headless, or bot-protected catalogs may
          appear as an unsupported storefront and are out of scope.
        </p>
        <p className="mt-4 text-sm leading-relaxed text-ink-700/80">
          Questions:{" "}
          <a href="mailto:hello@rivalsku.com" className="underline">
            hello@rivalsku.com
          </a>
          .
        </p>
      </article>
    </div>
  );
}

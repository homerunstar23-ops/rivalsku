import type { Metadata } from "next";
import { Logo } from "@/components/Logo";

export const metadata: Metadata = { title: "Privacy" };

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-mist-50">
      <header className="border-b border-ink-900/10 bg-white">
        <div className="mx-auto flex h-16 max-w-3xl items-center px-5">
          <Logo />
        </div>
      </header>
      <article className="mx-auto max-w-3xl px-5 py-16">
        <h1 className="font-serif text-4xl">Privacy</h1>
        <p className="mt-6 text-sm leading-relaxed text-ink-700/80">
          RivalSKU monitors publicly visible Shopify storefront data only — the
          same product pages and public catalog a shopper can already see. We do
          not request Shopify Admin access, competitor logins, or private
          customer data.
        </p>
        <p className="mt-4 text-sm leading-relaxed text-ink-700/80">
          If you request a free audit, we use the work email and store URLs you
          submit solely to run that audit and follow up about RivalSKU. We do
          not sell contact lists or estimated competitor revenue.
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

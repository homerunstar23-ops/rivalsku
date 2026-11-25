import type { Metadata } from "next";
import { LandingPage } from "@/components/landing/LandingPage";

export const metadata: Metadata = {
  title: "RivalSKU for Brands — Competitor Price, Promo & SKU Alerts",
  description:
    "RivalSKU watches public Shopify storefronts 24/7 and alerts your team the moment a rival cuts a price, launches a promo, restocks a hero SKU, or drops a new product.",
};

export default function B2BPage() {
  return <LandingPage />;
}

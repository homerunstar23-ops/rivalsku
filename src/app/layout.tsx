import type { Metadata } from "next";
import { DM_Sans, IBM_Plex_Mono, Instrument_Serif } from "next/font/google";
import "./globals.css";

const sans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const serif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-serif",
  display: "swap",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "https://rivalsku.com",
  ),
  title: {
    default:
      "RivalSKU — Competitor price, promo, and SKU alerts for Shopify brands",
    template: "%s · RivalSKU",
  },
  description:
    "RivalSKU watches public Shopify storefronts 24/7 and alerts your team the moment a rival cuts a price, launches a promo, restocks a hero SKU, or drops a new product. No store install. No competitor login.",
  icons: { icon: "/icon.svg" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${sans.variable} ${serif.variable} ${mono.variable}`}>
      <body className="min-h-screen font-sans antialiased">{children}</body>
    </html>
  );
}

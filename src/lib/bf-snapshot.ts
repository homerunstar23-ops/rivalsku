import snapshotData from "@/data/bf-2026-snapshot.json";
import type { BlackFridayIndexData, BlackFridayReport } from "@/lib/bf-report";

export type SampleReportItem = {
  slug: string;
  title: string;
  brandName: string;
  brandUrl: string;
  category: string;
  description: string;
  competitorDomains: string[];
  report: BlackFridayReport;
};

export type BlackFridaySnapshot = {
  index: BlackFridayIndexData;
  samples: SampleReportItem[];
};

export const BF_SNAPSHOT = snapshotData as unknown as BlackFridaySnapshot;

export const STRIPE_PAYMENT_LINKS = {
  bfReport:
    process.env.NEXT_PUBLIC_STRIPE_BF_REPORT_LINK ||
    "https://buy.stripe.com/test_cNi4gz5TbebQcixfIogA800",
  starter:
    process.env.NEXT_PUBLIC_STRIPE_LINK_STARTER ||
    "https://buy.stripe.com/test_00wcN5chzebQfuJ1RygA801",
  growth:
    process.env.NEXT_PUBLIC_STRIPE_LINK_GROWTH ||
    "https://buy.stripe.com/test_5kQ9ATbdv1p4eqFdAggA803",
  scale:
    process.env.NEXT_PUBLIC_STRIPE_LINK_SCALE ||
    "https://buy.stripe.com/test_fZu00j5Tb5FkfuJ2VCgA802",
} as const;

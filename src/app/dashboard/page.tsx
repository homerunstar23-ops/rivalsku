import type { Metadata } from "next";
import { DashboardApp } from "@/components/dashboard/DashboardApp";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default function DashboardPage() {
  return <DashboardApp />;
}

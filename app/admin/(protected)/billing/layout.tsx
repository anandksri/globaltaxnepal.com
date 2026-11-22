import type { ReactNode } from "react";
import { requirePermission } from "@/lib/admin/auth";

export default async function BillingLayout({ children }: { children: ReactNode }) {
  await requirePermission("BILLING", "VIEW");
  return children;
}

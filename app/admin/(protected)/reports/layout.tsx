import type { ReactNode } from "react";
import { requirePermission } from "@/lib/admin/auth";

export default async function ReportsLayout({ children }: { children: ReactNode }) {
  await requirePermission("REPORTS", "VIEW");
  return children;
}

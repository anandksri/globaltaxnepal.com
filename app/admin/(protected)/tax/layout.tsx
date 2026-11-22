import type { ReactNode } from "react";
import { requirePermission } from "@/lib/admin/auth";

export default async function TaxLayout({ children }: { children: ReactNode }) {
  await requirePermission("TAX", "VIEW");
  return children;
}

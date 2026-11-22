import type { ReactNode } from "react";
import { requirePermission } from "@/lib/admin/auth";

export default async function ReceiptVouchersLayout({ children }: { children: ReactNode }) {
  await requirePermission("VOUCHERS", "VIEW");
  return children;
}

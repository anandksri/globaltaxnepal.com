import type { ReactNode } from "react";
import { requirePermission } from "@/lib/admin/auth";

export default async function PaymentVouchersLayout({ children }: { children: ReactNode }) {
  await requirePermission("VOUCHERS", "VIEW");
  return children;
}

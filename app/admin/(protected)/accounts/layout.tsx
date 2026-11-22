import type { ReactNode } from "react";
import { requirePermission } from "@/lib/admin/auth";

export default async function AccountsLayout({ children }: { children: ReactNode }) {
  await requirePermission("ACCOUNTS", "VIEW");
  return children;
}

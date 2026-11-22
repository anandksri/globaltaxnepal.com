import type { ReactNode } from "react";
import { requirePermission } from "@/lib/admin/auth";

export default async function ClientsLayout({ children }: { children: ReactNode }) {
  await requirePermission("CLIENTS", "VIEW");
  return children;
}

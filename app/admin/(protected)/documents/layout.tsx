import type { ReactNode } from "react";
import { requirePermission } from "@/lib/admin/auth";

export default async function DocumentsLayout({ children }: { children: ReactNode }) {
  await requirePermission("DOCUMENTS", "VIEW");
  return children;
}

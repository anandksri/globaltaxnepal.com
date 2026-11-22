import type { ReactNode } from "react";
import { requireSuperAdmin } from "@/lib/admin/auth";

export default async function RolesLayout({ children }: { children: ReactNode }) {
  await requireSuperAdmin();
  return children;
}

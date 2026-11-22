import type { ReactNode } from "react";
import { AdminModule, PermissionAction } from "@prisma/client";
import { requirePermission } from "@/lib/admin/auth";

export default async function StaffLayout({ children }: { children: ReactNode }) {
  await requirePermission(AdminModule.STAFF_MANAGEMENT, PermissionAction.VIEW);
  return children;
}

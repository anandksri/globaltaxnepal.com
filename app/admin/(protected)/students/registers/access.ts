import { AdminModule, PermissionAction } from "@prisma/client";
import { requirePermission } from "@/lib/admin/auth";
import type { RegisterKind } from "@/lib/admin/office-registers";

export function registerModules(kind: RegisterKind): AdminModule[] {
  const modules: AdminModule[] = [
    AdminModule.CLIENTS,
    AdminModule.TAX,
    AdminModule.STAFF_MANAGEMENT,
  ];
  if (kind !== "staff-time") modules.push(AdminModule.DOCUMENTS);
  if (kind === "client-follow-up" || kind === "client-tracking") {
    modules.push(AdminModule.BILLING);
  }
  return modules;
}

export async function requireRegisterAccess(
  kind: RegisterKind,
  action: PermissionAction = PermissionAction.VIEW,
) {
  const admin = await requirePermission(AdminModule.STUDENTS, PermissionAction.VIEW);
  if (action !== PermissionAction.VIEW) {
    await requirePermission(AdminModule.STUDENTS, action);
  }
  for (const module of registerModules(kind)) {
    await requirePermission(module, PermissionAction.VIEW);
  }
  return admin;
}

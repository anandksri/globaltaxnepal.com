import type { Metadata } from "next";
import { getRoleData, permissionActions, permissionModules } from "@/lib/admin/settings";
import { RolePermissionForm } from "../settings-forms";

export const metadata: Metadata = { title: "Roles and permissions" };
export const dynamic = "force-dynamic";

export default async function RolesPage() {
  const roles = await getRoleData();
  return (
    <div className="space-y-4">
      <p className="text-sm text-text-secondary">Super Admin permissions are fixed. Changes to other roles take effect immediately, including for active sessions.</p>
      {roles.map((role) => <RolePermissionForm actions={permissionActions} key={role.id} modules={permissionModules} role={role} selected={role.permissions} />)}
    </div>
  );
}

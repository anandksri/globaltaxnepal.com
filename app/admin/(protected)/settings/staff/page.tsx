import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { getStaffData } from "@/lib/admin/settings";
import { AdminModule, PermissionAction } from "@prisma/client";
import { requirePermission } from "@/lib/admin/auth";

export const metadata: Metadata = { title: "Staff management" };
export const dynamic = "force-dynamic";

export default async function StaffPage() {
  const admin = await requirePermission(AdminModule.STAFF_MANAGEMENT, PermissionAction.VIEW);
  const canCreate = admin.roleName === "SUPER_ADMIN" || admin.permissions.some((permission) =>
    permission.module === AdminModule.STAFF_MANAGEMENT && permission.action === PermissionAction.CREATE
  );
  const canEdit = admin.roleName === "SUPER_ADMIN" || admin.permissions.some((permission) =>
    permission.module === AdminModule.STAFF_MANAGEMENT && permission.action === PermissionAction.EDIT
  );
  const { users } = await getStaffData();
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-text-secondary">Manage existing staff accounts. Passwords are never displayed or retrieved.</p>
        {canCreate && <Link className="button button-primary" href="/admin/settings/staff/new"><Plus aria-hidden="true" className="size-4" strokeWidth={1.75} />Add staff member</Link>}
      </div>
      <section className="overflow-hidden border border-border bg-surface">
        {users.length === 0 ? <div className="px-5 py-12 text-center"><h2 className="font-semibold text-primary">No staff accounts</h2><p className="mt-1 text-sm text-text-secondary">Add a staff member to begin.</p></div> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[52rem] text-left text-sm">
              <thead className="bg-background text-xs uppercase tracking-wide text-text-secondary"><tr><th className="px-4 py-3">Staff member</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">Mobile</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Action</th></tr></thead>
              <tbody className="divide-y divide-border">{users.map((user) => <tr key={user.id}>
                <td className="px-4 py-3 font-medium text-primary">{user.name || "—"}</td>
                <td className="px-4 py-3">{user.email}</td>
                <td className="px-4 py-3">{user.phone || "—"}</td>
                <td className="px-4 py-3">{user.role.name.replaceAll("_", " ")}</td>
                <td className={`px-4 py-3 ${user.isActive ? "text-success" : "text-text-secondary"}`}>{user.isActive ? "Active" : "Inactive"}</td>
                <td className="px-4 py-3">{canEdit ? <Link className="font-medium text-secondary hover:text-primary" href={`/admin/settings/staff/${user.id}`}>Edit</Link> : "—"}</td>
              </tr>)}</tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

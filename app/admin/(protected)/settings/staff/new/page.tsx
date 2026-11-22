import type { Metadata } from "next";
import Link from "next/link";
import { AdminModule, PermissionAction } from "@prisma/client";
import { requirePermission } from "@/lib/admin/auth";
import { getStaffData } from "@/lib/admin/settings";
import { StaffForm } from "../../settings-forms";

export const metadata: Metadata = { title: "Add staff member" };
export const dynamic = "force-dynamic";

export default async function NewStaffPage() {
  const admin = await requirePermission(AdminModule.STAFF_MANAGEMENT, PermissionAction.CREATE);
  const { roles } = await getStaffData();
  const assignableRoles = admin.roleName === "SUPER_ADMIN" ? roles : roles.filter((role) => role.name !== "SUPER_ADMIN");
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link className="text-sm font-medium text-secondary hover:text-primary" href="/admin/settings/staff">← Staff management</Link>
      <section className="border border-border bg-surface p-5 sm:p-7">
        <StaffForm roles={assignableRoles} />
      </section>
    </div>
  );
}

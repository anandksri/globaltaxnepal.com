import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { AdminModule, PermissionAction } from "@prisma/client";
import { requirePermission } from "@/lib/admin/auth";
import { getStaffData } from "@/lib/admin/settings";
import { StaffEditForm } from "../../settings-forms";

export const metadata: Metadata = { title: "Staff account" };
export const dynamic = "force-dynamic";

export default async function StaffDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requirePermission(AdminModule.STAFF_MANAGEMENT, PermissionAction.EDIT);
  const { id } = await params;
  const parsed = z.string().min(1).max(191).safeParse(id);
  if (!parsed.success) notFound();
  const { users, roles } = await getStaffData();
  const user = users.find((item) => item.id === parsed.data);
  if (!user) notFound();
  if (user.role.name === "SUPER_ADMIN" && admin.roleName !== "SUPER_ADMIN") notFound();
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link className="text-sm font-medium text-secondary hover:text-primary" href="/admin/settings/staff">← Staff management</Link>
      <section className="border border-border bg-surface p-5 sm:p-7">
        <p className="mb-5 text-sm text-text-secondary">Created {user.createdAt.toLocaleDateString("en-NP", { dateStyle: "medium" })}</p>
        <StaffEditForm roles={admin.roleName === "SUPER_ADMIN" ? roles : roles.filter((role) => role.name !== "SUPER_ADMIN")} user={{ ...user, roleId: user.role.id }} />
      </section>
    </div>
  );
}

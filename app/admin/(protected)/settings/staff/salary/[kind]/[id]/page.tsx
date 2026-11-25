import { AdminModule, PermissionAction } from "@prisma/client";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requirePermission } from "@/lib/admin/auth";
import { emptySalaryAmounts, parseSalaryAmounts, parseSalaryYear } from "@/lib/admin/staff-salary";
import { prisma } from "@/lib/prisma";
import { saveSalary } from "../../actions";
import { SalaryForm } from "../../salary-form";

export const dynamic = "force-dynamic";

export default async function SalaryDetailsPage({ params, searchParams }: {
  params: Promise<{ kind: string; id: string }>; searchParams: Promise<{ year?: string }>;
}) {
  const admin = await requirePermission(AdminModule.STAFF_MANAGEMENT, PermissionAction.VIEW);
  const { kind, id } = await params;
  const year = parseSalaryYear((await searchParams).year);
  if ((kind !== "account" && kind !== "manual") || !z.string().cuid().safeParse(id).success || !year.success) notFound();
  const [account, manual, salary] = await Promise.all([
    kind === "account" ? prisma.user.findUnique({ where: { id }, select: { name: true, email: true, phone: true, isActive: true, role: { select: { name: true } } } }) : null,
    kind === "manual" ? prisma.manualSalaryStaff.findUnique({ where: { id } }) : null,
    prisma.staffSalaryYear.findUnique({ where: kind === "account" ? { userId_year: { userId: id, year: year.data } } : { manualStaffId_year: { manualStaffId: id, year: year.data } } }),
  ]);
  if ((!account && !manual) || (account?.role.name === "SUPER_ADMIN" && admin.roleName !== "SUPER_ADMIN")) notFound();
  const parsed = parseSalaryAmounts(salary?.amounts ?? emptySalaryAmounts());
  if (!parsed.success) throw new Error(`Invalid stored salary data for staff ${id}: ${parsed.error}`);
  const canEdit = admin.roleName === "SUPER_ADMIN" || admin.permissions.some((p) => p.module === AdminModule.STAFF_MANAGEMENT && p.action === PermissionAction.EDIT);
  return <div className="mx-auto max-w-6xl space-y-5">
    <Link className="text-sm font-medium text-secondary" href={`/admin/settings/staff/salary?year=${year.data}`}>← Staff salary register</Link>
    {account && <section className="space-y-2 border border-border bg-surface p-5 sm:p-7">
      <h2 className="font-semibold text-primary">{account.name || account.email}</h2>
      <p className="text-sm text-text-secondary">{account.email} · {account.phone || "No mobile"} · {account.role.name.replaceAll("_", " ")} · {account.isActive ? "Active" : "Inactive"}</p>
      {canEdit && <Link className="text-sm text-secondary" href={`/admin/settings/staff/${id}`}>Edit staff account</Link>}
    </section>}
    <SalaryForm action={saveSalary.bind(null, kind, id, String(year.data))} canEdit={canEdit} year={year.data} amounts={parsed.amounts} remarks={salary?.remarks ?? ""}
      manual={manual ? { name: manual.name, phone: manual.phone ?? "", email: manual.email ?? "", address: manual.address ?? "", designation: manual.designation ?? "" } : undefined} />
  </div>;
}

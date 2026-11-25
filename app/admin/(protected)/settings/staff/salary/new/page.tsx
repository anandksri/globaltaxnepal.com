import { AdminModule, PermissionAction } from "@prisma/client";
import Link from "next/link";
import { requirePermission } from "@/lib/admin/auth";
import { parseSalaryYear } from "@/lib/admin/staff-salary";
import { createManualStaff } from "../actions";
import { NewManualStaffForm } from "../salary-form";

export default async function NewManualSalaryStaffPage({ searchParams }: { searchParams: Promise<{ year?: string }> }) {
  await requirePermission(AdminModule.STAFF_MANAGEMENT, PermissionAction.CREATE);
  const { year } = await searchParams;
  const parsedYear = parseSalaryYear(year);
  return <div className="mx-auto max-w-3xl space-y-5">
    <Link className="text-sm font-medium text-secondary" href="/admin/settings/staff/salary">← Staff salary register</Link>
    <NewManualStaffForm action={createManualStaff} year={parsedYear.success ? String(parsedYear.data) : ""} />
  </div>;
}

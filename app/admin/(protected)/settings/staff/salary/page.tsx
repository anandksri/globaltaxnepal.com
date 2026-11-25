import { AdminModule, PermissionAction } from "@prisma/client";
import Link from "next/link";
import { requirePermission } from "@/lib/admin/auth";
import { nepaliMonths } from "@/lib/admin/client-monthly-data";
import { parseSalaryAmounts, parseSalaryYear } from "@/lib/admin/staff-salary";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function StaffSalaryPage({ searchParams }: { searchParams: Promise<{ year?: string; q?: string }> }) {
  const admin = await requirePermission(AdminModule.STAFF_MANAGEMENT, PermissionAction.VIEW);
  const canCreate = admin.roleName === "SUPER_ADMIN" || admin.permissions.some((p) => p.module === AdminModule.STAFF_MANAGEMENT && p.action === PermissionAction.CREATE);
  const params = await searchParams;
  const yearResult = parseSalaryYear(params.year);
  const year = yearResult.success ? yearResult.data : null;
  const q = typeof params.q === "string" ? params.q.trim().slice(0, 100) : "";
  const [accounts, manual] = await Promise.all([
    prisma.user.findMany({
      where: {
        ...(admin.roleName !== "SUPER_ADMIN" ? { role: { name: { not: "SUPER_ADMIN" } } } : {}),
        ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { phone: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }] } : {}),
      },
      orderBy: [{ name: "asc" }, { id: "asc" }],
      select: { id: true, name: true, phone: true, email: true, role: { select: { name: true } }, salaryYears: { where: { year: year ?? 0 }, select: { amounts: true } } },
    }),
    prisma.manualSalaryStaff.findMany({
      where: q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { phone: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }] } : {},
      orderBy: [{ name: "asc" }, { id: "asc" }],
      select: { id: true, name: true, phone: true, email: true, designation: true, salaryYears: { where: { year: year ?? 0 }, select: { amounts: true } } },
    }),
  ]);
  const rows = [
    ...accounts.map((staff) => ({ ...staff, kind: "account", designation: staff.role.name.replaceAll("_", " ") })),
    ...manual.map((staff) => ({ ...staff, kind: "manual" })),
  ];
  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-text-secondary">View salary amounts recorded as paid in NPR, by BS year. Manual staff are separate from login accounts.</p>
      {canCreate && <div className="flex flex-wrap gap-2">
        <Link className="button button-secondary" href="/admin/settings/staff/new">Add staff account</Link>
        <Link className="button button-primary" href={`/admin/settings/staff/salary/new${year ? `?year=${year}` : ""}`}>Add manually</Link>
      </div>}
    </div>
    <form className="flex flex-wrap items-end gap-3 border border-border bg-surface p-4" method="get">
      <div><label className="form-label" htmlFor="salary-year">BS year *</label><input className="form-control" defaultValue={params.year ?? ""} id="salary-year" inputMode="numeric" maxLength={4} name="year" pattern="[2-9][0-9]{3}" placeholder="e.g. 2083" required /></div>
      <div><label className="form-label" htmlFor="salary-search">Search name, mobile or email</label><input className="form-control" defaultValue={q} id="salary-search" maxLength={100} name="q" type="search" /></div>
      <button className="button button-primary" type="submit">Show</button>
    </form>
    {params.year && !year && <p className="text-sm text-error" role="alert">Enter a four-digit BS year from 2000 to 9999.</p>}
    {!year ? <p className="text-sm text-text-secondary">Choose a BS year to view or edit salary data.</p> : <section aria-label={`Staff salary for ${year} BS`} className="overflow-x-auto border border-border bg-surface">
      <table className="w-full min-w-[120rem] text-left text-sm">
        <thead className="bg-background text-xs uppercase text-text-secondary"><tr>
          <th className="px-3 py-3" scope="col">S.N.</th><th className="px-3 py-3" scope="col">Staff</th><th className="px-3 py-3" scope="col">Mobile</th><th className="px-3 py-3" scope="col">Role / designation</th>
          {nepaliMonths.map((month) => <th className="px-3 py-3" key={month.key} scope="col">{month.label}</th>)}
          <th className="px-3 py-3" scope="col">Action</th>
        </tr></thead>
        <tbody className="divide-y divide-border">{rows.map((staff, index) => {
          const parsed = staff.salaryYears[0] ? parseSalaryAmounts(staff.salaryYears[0].amounts) : null;
          if (parsed && !parsed.success) throw new Error(`Invalid stored salary data for staff ${staff.id}: ${parsed.error}`);
          return <tr key={`${staff.kind}-${staff.id}`}>
            <td className="px-3 py-3">{index + 1}</td>
            <td className="px-3 py-3 font-medium">{staff.name || staff.email}{staff.kind === "manual" && <span className="ml-1 text-xs text-text-secondary">(Manual)</span>}</td>
            <td className="whitespace-nowrap px-3 py-3">{staff.phone || "—"}</td><td className="px-3 py-3">{staff.designation || "—"}</td>
            {nepaliMonths.map((month) => <td className="whitespace-nowrap px-3 py-3" key={month.key}>{parsed?.success ? parsed.amounts[month.key] || "—" : "—"}</td>)}
            <td className="px-3 py-3"><Link className="text-secondary" href={`/admin/settings/staff/salary/${staff.kind}/${staff.id}?year=${year}`}>View / edit</Link></td>
          </tr>;
        })}</tbody>
      </table>
      {rows.length === 0 && <p className="p-5 text-sm text-text-secondary">No staff found.</p>}
    </section>}
  </div>;
}

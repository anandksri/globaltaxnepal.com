import type { Metadata } from "next";
import { AdminModule, PermissionAction, Prisma } from "@prisma/client";
import Link from "next/link";
import { getServiceLabel } from "@/lib/admin/students";
import { requirePermission } from "@/lib/admin/auth";
import { prisma } from "@/lib/prisma";
import { registerDefinitions, type RegisterKind } from "@/lib/admin/office-registers";
import { registerModules } from "./registers/access";

export const metadata: Metadata = { title: "Student details" };
export const dynamic = "force-dynamic";

const pageSize = 20;

type SearchParams = Promise<{
  q?: string;
  status?: string;
  page?: string;
}>;

function getPageHref(page: number, filters: { q: string; status: string }) {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.status) params.set("status", filters.status);
  params.set("page", String(page));
  return `/admin/students?${params.toString()}`;
}

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const admin = await requirePermission(AdminModule.STUDENTS, PermissionAction.VIEW);
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim().slice(0, 100) : "";
  const status =
    params.status === "PENDING" ||
    params.status === "APPROVED" ||
    params.status === "REJECTED"
      ? params.status
      : "";
  const rawPage = Number.parseInt(params.page ?? "1", 10);
  const requestedPage =
    Number.isSafeInteger(rawPage) && rawPage > 0 ? rawPage : 1;
  const where: Prisma.StudentRegistrationWhereInput = {
    ...(status ? { approvalStatus: status } : {}),
    ...(q
      ? {
          OR: [
            { studentName: { contains: q, mode: "insensitive" } },
            { mobile: { contains: q, mode: "insensitive" } },
            { panCompanyName: { contains: q, mode: "insensitive" } },
            { admissionBatch: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  const total = await prisma.studentRegistration.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(requestedPage, totalPages);
  const students = await prisma.studentRegistration.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    skip: (page - 1) * pageSize,
    take: pageSize,
    select: {
      id: true,
      studentName: true,
      mobile: true,
      admissionBatch: true,
      serviceTypes: true,
      totalAmount: true,
      receivedAmount: true,
      approvalStatus: true,
      createdAt: true,
      assignedTo: { select: { name: true, email: true } },
    },
  });
  const canCreate = admin.roleName === "SUPER_ADMIN" || admin.permissions.some(
    (permission) =>
      permission.module === AdminModule.STUDENTS &&
      permission.action === PermissionAction.CREATE,
  );
  const filters = { q, status };

  return (
    <div className="space-y-5">
      <section aria-labelledby="student-register-selector" className="border border-border bg-surface p-4 sm:p-5">
        <h2 className="font-semibold text-primary" id="student-register-selector">Choose a register</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <span aria-current="page" className="button button-primary">Student admissions</span>
          {(Object.keys(registerDefinitions) as RegisterKind[]).filter((kind) =>
            admin.roleName === "SUPER_ADMIN" || registerModules(kind).every((module) =>
              admin.permissions.some((permission) => permission.module === module && permission.action === PermissionAction.VIEW),
            ),
          ).map((kind) => (
            <Link className="button button-secondary" href={`/admin/students/registers/${kind}`} key={kind}>
              {registerDefinitions[kind].title}
            </Link>
          ))}
        </div>
      </section>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-text-secondary">
          Search and manage student admission records.
        </p>
        {canCreate && (
          <Link className="button button-primary" href="/admin/students/new">
            Register student
          </Link>
        )}
      </div>
      <form action="/admin/students" className="admin-filter-grid border border-border bg-surface p-4" method="get">
        <div>
          <label className="form-label" htmlFor="student-search">Search students</label>
          <input className="form-control" defaultValue={q} id="student-search" maxLength={100} name="q" placeholder="Name, mobile, PAN, or batch" type="search" />
        </div>
        <div>
          <label className="form-label" htmlFor="student-status">Approval status</label>
          <select className="form-control" defaultValue={status} id="student-status" name="status">
            <option value="">All statuses</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
        <div className="flex gap-2">
          <button className="button button-primary" type="submit">Apply filters</button>
          <Link className="button button-secondary" href="/admin/students">Clear</Link>
        </div>
      </form>

      <section aria-label="Student records" className="overflow-hidden border border-border bg-surface">
        {students.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="font-medium text-primary">No student records found</p>
            <p className="mt-1 text-sm text-text-secondary">
              {q || status ? "Try changing the filters." : "Register a student to get started."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[58rem] text-left text-sm">
              <thead className="bg-background text-xs uppercase tracking-wide text-text-secondary">
                <tr>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Mobile</th>
                  <th className="px-4 py-3">Batch / services</th>
                  <th className="px-4 py-3">Assigned staff</th>
                  <th className="px-4 py-3">Due (NPR)</th>
                  <th className="px-4 py-3">Approval</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {students.map((student) => (
                  <tr key={student.id}>
                    <td className="px-4 py-3">
                      <Link className="font-medium text-secondary hover:text-primary" href={`/admin/students/${student.id}`}>
                        {student.studentName}
                      </Link>
                      <p className="mt-1 text-xs text-text-secondary">
                        Added {student.createdAt.toLocaleDateString("en-NP", { dateStyle: "medium", timeZone: "UTC" })}
                      </p>
                    </td>
                    <td className="px-4 py-3">{student.mobile || "—"}</td>
                    <td className="px-4 py-3">
                      <span>{student.admissionBatch || "—"}</span>
                      <p className="mt-1 text-xs text-text-secondary">
                        {student.serviceTypes.map(getServiceLabel).join(", ") || "No service selected"}
                      </p>
                    </td>
                    <td className="px-4 py-3">{student.assignedTo?.name || student.assignedTo?.email || "Unassigned"}</td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {student.totalAmount.sub(student.receivedAmount).toFixed(2)}
                    </td>
                    <td className="px-4 py-3">{student.approvalStatus.toLowerCase()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {totalPages > 1 && (
          <nav aria-label="Student record pages" className="flex items-center justify-between border-t border-border px-4 py-3">
            <span className="text-sm text-text-secondary">Page {page} of {totalPages} · {total} students</span>
            <div className="flex gap-2">
              {page > 1 && <Link className="button button-secondary min-h-9 px-3 text-sm" href={getPageHref(page - 1, filters)}>Previous</Link>}
              {page < totalPages && <Link className="button button-secondary min-h-9 px-3 text-sm" href={getPageHref(page + 1, filters)}>Next</Link>}
            </div>
          </nav>
        )}
      </section>
    </div>
  );
}

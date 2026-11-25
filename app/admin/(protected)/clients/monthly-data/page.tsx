import { AdminModule, PermissionAction } from "@prisma/client";
import Link from "next/link";
import { requirePermission } from "@/lib/admin/auth";
import { nepaliMonths, parseMonthlyDates } from "@/lib/admin/client-monthly-data";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
const pageSize = 20;

export default async function ClientMonthlyList({ searchParams }: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const admin = await requirePermission(AdminModule.CLIENTS, PermissionAction.VIEW);
  await requirePermission(AdminModule.DOCUMENTS, PermissionAction.VIEW);
  const canCreate = admin.roleName === "SUPER_ADMIN" || admin.permissions.some((permission) =>
    permission.module === AdminModule.CLIENTS && permission.action === PermissionAction.CREATE);
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim().slice(0, 100) : "";
  const rawPage = Number.parseInt(params.page ?? "1", 10);
  const requestedPage = Number.isSafeInteger(rawPage) && rawPage > 0 ? rawPage : 1;
  const where = q ? { OR: [
    { displayName: { contains: q, mode: "insensitive" as const } },
    { panNumber: { contains: q, mode: "insensitive" as const } },
    { phone: { contains: q, mode: "insensitive" as const } },
  ] } : {};
  const [clientCount, manualCount] = await Promise.all([
    prisma.client.count({ where }), prisma.manualMonthlyClient.count({ where }),
  ]);
  const count = clientCount + manualCount;
  const totalPages = Math.max(1, Math.ceil(count / pageSize));
  const page = Math.min(requestedPage, totalPages);
  const offset = (page - 1) * pageSize;
  const clientTake = Math.max(0, Math.min(pageSize, clientCount - offset));
  const [clients, manualClients] = await Promise.all([
    clientTake ? prisma.client.findMany({
      where, orderBy: [{ displayName: "asc" }, { id: "asc" }], skip: offset, take: clientTake,
      select: { id: true, displayName: true, phone: true, panNumber: true, monthlyData: {
        select: { dates: true, remarks: true, _count: { select: { documents: true } } },
      } },
    }) : Promise.resolve([]),
    pageSize > clientTake ? prisma.manualMonthlyClient.findMany({
      where, orderBy: [{ displayName: "asc" }, { id: "asc" }],
      skip: Math.max(0, offset - clientCount), take: pageSize - clientTake,
      select: { id: true, displayName: true, phone: true, panNumber: true, dates: true, remarks: true, _count: { select: { documents: true } } },
    }) : Promise.resolve([]),
  ]);
  const rows = [
    ...clients.map((client) => ({ ...client, manual: false, dates: client.monthlyData?.dates, remarks: client.monthlyData?.remarks, documentCount: client.monthlyData?._count.documents ?? 0 })),
    ...manualClients.map((client) => ({ ...client, manual: true, documentCount: client._count.documents })),
  ];
  const pageHref = (next: number) => `/admin/clients/monthly-data?${new URLSearchParams({ ...(q ? { q } : {}), page: String(next) })}`;

  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-text-secondary">Existing clients are listed first; manual entries are separate from client records. Enter dates in Bikram Sambat (BS).</p>
      {canCreate && <div className="flex flex-wrap gap-2">
        <Link className="button button-secondary" href="/admin/clients/new">Add client</Link>
        <Link className="button button-primary" href="/admin/clients/monthly-data/manual/new">Add manually</Link>
      </div>}
    </div>
    <form className="flex flex-wrap items-end gap-3 border border-border bg-surface p-4" method="get">
      <div><label className="mb-1.5 block text-sm font-semibold text-text" htmlFor="monthly-search">Search client, PAN or mobile</label><input className="form-control" defaultValue={q} id="monthly-search" maxLength={100} name="q" type="search" /></div>
      <button className="button button-primary" type="submit">Search</button>
      <Link className="button button-secondary" href="/admin/clients/monthly-data">Clear</Link>
    </form>
    <section aria-label="Client monthly data" className="overflow-x-auto border border-border bg-surface">
      <table className="w-full min-w-[120rem] text-left text-sm">
        <thead className="bg-background text-xs uppercase text-text-secondary"><tr>
          <th className="px-3 py-3" scope="col">S.N.</th><th className="px-3 py-3" scope="col">Client</th><th className="px-3 py-3" scope="col">PAN</th><th className="px-3 py-3" scope="col">Mobile</th>
          {nepaliMonths.map((month) => <th className="px-3 py-3" key={month.key} scope="col">{month.label}</th>)}
          <th className="px-3 py-3" scope="col">Remarks</th><th className="px-3 py-3" scope="col">Documents</th><th className="px-3 py-3" scope="col">Action</th>
        </tr></thead>
        <tbody className="divide-y divide-border">{rows.map((client, index) => {
          const parsed = client.dates ? parseMonthlyDates(client.dates) : null;
          if (parsed && !parsed.success) throw new Error(`Invalid stored monthly data for client ${client.id}: ${parsed.error}`);
          const href = client.manual ? `/admin/clients/monthly-data/manual/${client.id}` : `/admin/clients/monthly-data/${client.id}`;
          return <tr key={`${client.manual ? "manual" : "client"}-${client.id}`}>
            <td className="px-3 py-3">{(page - 1) * pageSize + index + 1}</td>
            <td className="px-3 py-3 font-medium"><Link className="text-secondary" href={client.manual ? href : `/admin/clients/${client.id}`}>{client.displayName}</Link>{client.manual && <span className="ml-1 text-xs text-text-secondary">(Manual)</span>}</td>
            <td className="px-3 py-3">{client.panNumber || "—"}</td>
            <td className="whitespace-nowrap px-3 py-3">{client.phone || "—"}</td>
            {nepaliMonths.map((month) => <td className="whitespace-nowrap px-3 py-3" key={month.key}>{parsed?.success ? parsed.dates[month.key] || "—" : "—"}</td>)}
            <td className="max-w-56 whitespace-pre-wrap break-words px-3 py-3">{client.remarks || "—"}</td>
            <td className="px-3 py-3">{client.documentCount}</td>
            <td className="px-3 py-3"><Link className="text-secondary" href={href}>Open</Link></td>
          </tr>;
        })}</tbody>
      </table>
      {rows.length === 0 && <p className="p-5 text-sm text-text-secondary">No clients found.</p>}
    </section>
    <div className="flex items-center gap-3 text-sm">
      {page > 1 && <Link className="button button-secondary" href={pageHref(page - 1)}>Previous</Link>}
      <span>Page {page} of {totalPages}</span>
      {page < totalPages && <Link className="button button-secondary" href={pageHref(page + 1)}>Next</Link>}
    </div>
  </div>;
}

import { AdminModule, PermissionAction, Prisma } from "@prisma/client";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { isRegisterKind, registerDefinitions, validateRegisterData } from "@/lib/admin/office-registers";
import { prisma } from "@/lib/prisma";
import { requireRegisterAccess } from "../access";

export const dynamic = "force-dynamic";

export default async function RegisterListPage({ params, searchParams }: {
  params: Promise<{ kind: string }>;
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { kind } = await params;
  if (!isRegisterKind(kind)) notFound();
  const admin = await requireRegisterAccess(kind);
  const canCreate = admin.roleName === "SUPER_ADMIN" || admin.permissions.some((permission) =>
    permission.module === AdminModule.STUDENTS && permission.action === PermissionAction.CREATE);
  const search = await searchParams;
  const from = typeof search.from === "string" ? search.from : "";
  const to = typeof search.to === "string" ? search.to : "";
  const datesValid = (!from || z.iso.date().safeParse(from).success) &&
    (!to || z.iso.date().safeParse(to).success) && (!from || !to || from <= to);
  const fromDate = datesValid && from ? new Date(`${from}T00:00:00.000Z`) : undefined;
  const toDate = datesValid && to ? new Date(`${to}T00:00:00.000Z`) : undefined;
  if (toDate) toDate.setUTCDate(toDate.getUTCDate() + 1);
  const records = await prisma.officeRegister.findMany({
    where: {
      kind,
      ...(datesValid && (fromDate || toDate) ? { createdAt: { ...(fromDate ? { gte: fromDate } : {}), ...(toDate ? { lt: toDate } : {}) } } : {}),
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true, createdAt: true, data: true, client: { select: { id: true, displayName: true, createdAt: true } } },
  });
  const clients = new Map(records.flatMap((record) => record.client ? [[record.client.id, record.client] as const] : []));
  const responses = new Map<string, Set<string>>();
  if (kind === "client-follow-up") {
    for (const record of records) {
      if (!record.client) continue;
      const validated = validateRegisterData(kind, record.data);
      if (!validated.success) throw new Error(`Invalid stored register data: ${validated.error}`);
      const statuses = responses.get(record.client.id) ?? new Set<string>();
      for (const ad of validated.data.ads) if (ad.response) statuses.add(ad.response);
      responses.set(record.client.id, statuses);
    }
  }
  const bills = kind === "client-follow-up" && clients.size
    ? await prisma.bill.findMany({
      where: { clientId: { in: [...clients.keys()] }, status: { notIn: ["DRAFT", "CANCELLED"] } },
      select: { currencyCode: true, totalAmount: true, payments: { select: { amount: true } } },
    })
    : [];
  const totals = new Map<string, { billed: Prisma.Decimal; received: Prisma.Decimal }>();
  for (const bill of bills) {
    const total = totals.get(bill.currencyCode) ?? { billed: new Prisma.Decimal(0), received: new Prisma.Decimal(0) };
    total.billed = total.billed.add(bill.totalAmount);
    total.received = bill.payments.reduce((sum, payment) => sum.add(payment.amount), total.received);
    totals.set(bill.currencyCode, total);
  }
  return <div className="space-y-5">
    <Link className="text-sm font-medium text-secondary hover:text-primary" href="/admin/students">← Student section</Link>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-lg font-semibold text-primary">{registerDefinitions[kind].title}</h2>
      {canCreate && <Link className="button button-primary" href={`/admin/students/registers/${kind}/new`}>Add register</Link>}
    </div>
    {kind === "client-follow-up" && <>
      <form className="admin-filter-grid border border-border bg-surface p-4" method="get">
        <div><label className="form-label" htmlFor="register-from">Registers created from</label><input className="form-control" defaultValue={from} id="register-from" name="from" type="date" /></div>
        <div><label className="form-label" htmlFor="register-to">Registers created to</label><input className="form-control" defaultValue={to} id="register-to" name="to" type="date" /></div>
        <button className="button button-primary" type="submit">Show period</button>
        <Link className="button button-secondary" href={`/admin/students/registers/${kind}`}>Clear</Link>
      </form>
      {!datesValid && <p className="text-sm text-error" role="alert">Enter a valid date range. Showing all registers.</p>}
      <section className="border border-border bg-surface p-5">
        <h3 className="font-semibold text-primary">Client summary</h3>
        <p className="mt-2 text-sm text-text-secondary">Counts cover the selected register creation period. A client may have both confirmed and ignored ad responses.</p>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div><dt className="text-xs text-text-secondary">Clients</dt><dd className="font-semibold">{clients.size}</dd></div>
          <div><dt className="text-xs text-text-secondary">Clients created in period</dt><dd className="font-semibold">{[...clients.values()].filter((client) => (!fromDate || client.createdAt >= fromDate) && (!toDate || client.createdAt < toDate)).length}</dd></div>
          <div><dt className="text-xs text-text-secondary">Confirmed ad responses</dt><dd className="font-semibold">{[...responses.values()].filter((status) => status.has("Confirmed")).length}</dd></div>
          <div><dt className="text-xs text-text-secondary">Ignored ad responses</dt><dd className="font-semibold">{[...responses.values()].filter((status) => status.has("Ignored")).length}</dd></div>
        </dl>
        <h4 className="mt-5 text-sm font-semibold text-primary">Current linked invoice totals</h4>
        <p className="mt-1 text-xs text-text-secondary">All-time invoice balances for these clients; draft and cancelled invoices are excluded.</p>
        {totals.size === 0 ? <p className="mt-3 text-sm text-text-secondary">No issued invoices.</p> :
          <div className="mt-3 overflow-x-auto"><table className="w-full min-w-[30rem] text-left text-sm">
            <thead><tr><th>Currency</th><th>Billed</th><th>Received</th><th>Due</th></tr></thead>
            <tbody>{[...totals].map(([currency, total]) => <tr className="border-t border-border" key={currency}>
              <td className="py-2">{currency}</td><td>{total.billed.toFixed(2)}</td><td>{total.received.toFixed(2)}</td><td>{total.billed.sub(total.received).toFixed(2)}</td>
            </tr>)}</tbody>
          </table></div>}
      </section>
    </>}
    <section className="border border-border bg-surface">
      {records.length === 0 ? <p className="px-5 py-8 text-sm text-text-secondary">No registers have been added.</p> :
        <ul className="divide-y divide-border">{records.map((record) => <li className="flex flex-wrap justify-between gap-3 px-5 py-4" key={record.id}>
          <div><Link className="font-medium text-secondary hover:text-primary" href={`/admin/students/registers/${kind}/${record.id}`}>{record.title}</Link><p className="mt-1 text-sm text-text-secondary">{record.client?.displayName ?? "No client selected"}</p></div>
          <span className="text-sm text-text-secondary">{record.createdAt.toLocaleDateString("en-NP", { dateStyle: "medium", timeZone: "UTC" })}</span>
        </li>)}</ul>}
    </section>
  </div>;
}

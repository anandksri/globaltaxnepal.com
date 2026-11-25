import { AdminModule, PermissionAction, Prisma } from "@prisma/client";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { isRegisterKind, registerDefinitions, validateRegisterData, type RegisterDefinition } from "@/lib/admin/office-registers";
import { prisma } from "@/lib/prisma";
import { requireRegisterAccess } from "../../access";
import { getRegisterOptions } from "../../options";

export const dynamic = "force-dynamic";

export default async function RegisterDetailsPage({ params }: { params: Promise<{ kind: string; id: string }> }) {
  const { kind, id } = await params;
  if (!isRegisterKind(kind) || !z.string().cuid().safeParse(id).success) notFound();
  const admin = await requireRegisterAccess(kind);
  const [record, options] = await Promise.all([
    prisma.officeRegister.findFirst({
      where: { id, kind },
      include: { client: { select: { id: true, displayName: true, phone: true, panNumber: true, contactPerson: true } } },
    }),
    getRegisterOptions(kind),
  ]);
  if (!record) notFound();
  const parsed = validateRegisterData(kind, record.data);
  if (!parsed.success) throw new Error(`Invalid stored register data: ${parsed.error}`);
  const canEdit = admin.roleName === "SUPER_ADMIN" || admin.permissions.some((permission) =>
    permission.module === AdminModule.STUDENTS && permission.action === PermissionAction.EDIT);
  const definition: RegisterDefinition = registerDefinitions[kind];
  const bills = record.clientId && (kind === "client-follow-up" || kind === "client-tracking")
    ? await prisma.bill.findMany({
      where: { clientId: record.clientId },
      orderBy: { billDate: "desc" },
      select: { id: true, billNumber: true, billType: true, status: true, currencyCode: true, totalAmount: true, dueDate: true, payments: { select: { amount: true } } },
    })
    : [];
  const reportDate = record.reportDate;
  const weekStart = reportDate ? new Date(reportDate) : null;
  if (weekStart) weekStart.setUTCDate(weekStart.getUTCDate() - ((weekStart.getUTCDay() + 6) % 7));
  const weekEnd = weekStart ? new Date(weekStart) : null;
  if (weekEnd) weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);
  const weeklyRecords = kind === "staff-time" && weekStart && weekEnd
    ? await prisma.officeRegister.findMany({
      where: { kind, reportDate: { gte: weekStart, lt: weekEnd } },
      select: { data: true },
    })
    : [];
  const weeklyEntries = weeklyRecords.flatMap((weeklyRecord) => {
    const validated = validateRegisterData("staff-time", weeklyRecord.data);
    if (!validated.success) throw new Error(`Invalid stored staff report: ${validated.error}`);
    return validated.data.entries;
  });
  const dailyEntries = kind === "staff-time" ? parsed.data.entries : [];
  const statusOf = (taskId: string) => options.tasks.find((task) => task.id === taskId)?.status;
  const weeklyStaff = new Map<string, { total: number; completed: number; pending: number; minutes: number }>();
  for (const entry of weeklyEntries) {
    const summary = weeklyStaff.get(entry.staff) ?? { total: 0, completed: 0, pending: 0, minutes: 0 };
    summary.total++;
    if (statusOf(entry.task) === "COMPLETED") summary.completed++;
    else summary.pending++;
    summary.minutes += durationMinutes(entry.start, entry.end);
    weeklyStaff.set(entry.staff, summary);
  }
  return <div className="mx-auto max-w-6xl space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Link className="text-sm font-medium text-secondary hover:text-primary" href={`/admin/students/registers/${kind}`}>← {definition.title}</Link>
      {canEdit && <Link className="button button-secondary" href={`/admin/students/registers/${kind}/${id}/edit`}>Edit register</Link>}
    </div>
    <section className="border border-border bg-surface p-5 sm:p-7">
      <h2 className="text-lg font-semibold text-primary">{record.title}</h2>
      {record.client && <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <div><dt className="text-text-secondary">Client</dt><dd><Link className="text-secondary" href={`/admin/clients/${record.client.id}`}>{record.client.displayName}</Link></dd></div>
        <div><dt className="text-text-secondary">Mobile</dt><dd>{record.client.phone || "—"}</dd></div>
        <div><dt className="text-text-secondary">PAN</dt><dd>{record.client.panNumber || "—"}</dd></div>
        <div><dt className="text-text-secondary">Contact person</dt><dd>{record.client.contactPerson || "—"}</dd></div>
      </dl>}
    </section>
    {definition.sections.map((section) => <section className="border border-border bg-surface p-5 sm:p-7" key={section.key}>
      <h2 className="border-b border-border pb-3 font-semibold text-primary">{section.label}</h2>
      {parsed.data[section.key].length === 0 ? <p className="mt-4 text-sm text-text-secondary">No entries.</p> :
        <div className="space-y-4">{parsed.data[section.key].map((row, index) => <div className="grid gap-4 border-b border-border py-4 last:border-0 sm:grid-cols-2 lg:grid-cols-3" key={index}>
          {section.fields.map((field) => {
            const value = row[field.key];
            const option = field.type === "staff" ? options.staff.find((item) => item.id === value)
              : field.type === "task" ? options.tasks.find((item) => item.id === value)
              : field.type === "document" ? options.documents.find((item) => item.id === value)
              : null;
            const href = field.type === "task" ? `/admin/tax/compliance/${value}` : field.type === "document" ? `/admin/documents/${value}` : null;
            return <div className="min-w-0" key={field.key}>
              <p className="text-xs font-medium text-text-secondary">{field.label}</p>
              <p className="mt-1 break-words whitespace-pre-wrap text-sm text-text">
                {href && value && option ? <Link className="text-secondary" href={href}>{option.label}</Link> : option?.label ?? (value || "—")}
              </p>
            </div>;
          })}
          {kind === "staff-time" && section.key === "entries" && <div>
            <p className="text-xs font-medium text-text-secondary">Total time</p>
            <p className="mt-1 text-sm">{duration(row.start, row.end)}</p>
          </div>}
        </div>)}</div>}
    </section>)}
    {kind !== "staff-time" && <section className="border border-border bg-surface p-5 sm:p-7">
      <h2 className="border-b border-border pb-3 font-semibold text-primary">Work summary</h2>
      <p className="mt-3 text-sm text-text-secondary">Counts use the current status of the linked work entries.</p>
      <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Summary label="Total work" value={String(parsed.data.tasks.length)} />
        <Summary label="Completed" value={String(parsed.data.tasks.filter((entry) => statusOf(entry.task) === "COMPLETED").length)} />
        <Summary label="In progress" value={String(parsed.data.tasks.filter((entry) => statusOf(entry.task) === "IN_PROGRESS").length)} />
        <Summary label="Pending" value={String(parsed.data.tasks.filter((entry) => statusOf(entry.task) === "PENDING").length)} />
      </dl>
    </section>}
    {kind === "staff-time" && <section className="border border-border bg-surface p-5 sm:p-7">
      <h2 className="border-b border-border pb-3 font-semibold text-primary">Daily and weekly work summary</h2>
      <p className="mt-3 text-sm text-text-secondary">Counts are work entries and use the current status of each linked task. The week runs Monday to Sunday.</p>
      <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Summary label="Assigned" value={String(dailyEntries.length)} />
        <Summary label="Completed" value={String(dailyEntries.filter((entry) => statusOf(entry.task) === "COMPLETED").length)} />
        <Summary label="In progress" value={String(dailyEntries.filter((entry) => statusOf(entry.task) === "IN_PROGRESS").length)} />
        <Summary label="Pending" value={String(dailyEntries.filter((entry) => statusOf(entry.task) === "PENDING").length)} />
        <Summary label="Working time" value={formatMinutes(dailyEntries.reduce((sum, entry) => sum + durationMinutes(entry.start, entry.end), 0))} />
      </dl>
      <h3 className="mt-6 font-semibold text-primary">Staff-wise work summary for this week</h3>
      {weeklyStaff.size === 0 ? <p className="mt-3 text-sm text-text-secondary">No entries for this week.</p> :
        <div className="mt-3 overflow-x-auto"><table className="w-full min-w-[35rem] text-left text-sm">
          <thead><tr><th>Staff</th><th>Total work</th><th>Completed</th><th>Pending / in progress</th><th>Time</th></tr></thead>
          <tbody>{[...weeklyStaff].map(([staffId, summary]) => <tr className="border-t border-border" key={staffId}>
            <td className="py-3">{options.staff.find((staff) => staff.id === staffId)?.label ?? "Unavailable staff"}</td>
            <td>{summary.total}</td><td>{summary.completed}</td><td>{summary.pending}</td><td>{formatMinutes(summary.minutes)}</td>
          </tr>)}</tbody>
        </table></div>}
    </section>}
    {(kind === "client-follow-up" || kind === "client-tracking") && <section className="border border-border bg-surface p-5 sm:p-7">
      <h2 className="border-b border-border pb-3 font-semibold text-primary">Linked billing and payments</h2>
      <p className="mt-3 text-sm text-text-secondary">Amounts are read from existing invoices; they are not contract prices.</p>
      {bills.length === 0 ? <p className="mt-4 text-sm text-text-secondary">No invoices linked to this client.</p> :
        <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[42rem] text-left text-sm">
          <thead><tr><th>Invoice</th><th>Status</th><th>Total</th><th>Received</th><th>Due</th><th>Due date</th></tr></thead>
          <tbody>{bills.map((bill) => {
            const received = bill.payments.reduce((sum, payment) => sum.add(payment.amount), new Prisma.Decimal(0));
            const due = bill.status === "DRAFT" || bill.status === "CANCELLED" ? null : bill.totalAmount.sub(received);
            return <tr className="border-t border-border" key={bill.id}>
              <td className="py-3"><Link className="text-secondary" href={bill.billType === "DETAILS" ? `/admin/details-bills/${bill.id}` : `/admin/billing/${bill.id}`}>{bill.billNumber}</Link></td>
              <td>{bill.status.replaceAll("_", " ")}</td><td>{bill.currencyCode} {bill.totalAmount.toFixed(2)}</td><td>{bill.currencyCode} {received.toFixed(2)}</td>
              <td>{due ? `${bill.currencyCode} ${due.toFixed(2)}` : "—"}</td><td>{bill.dueDate?.toLocaleDateString("en-NP", { dateStyle: "medium", timeZone: "UTC" }) ?? "—"}</td>
            </tr>;
          })}</tbody>
        </table></div>}
    </section>}
  </div>;
}

function duration(start: string, end: string) {
  return formatMinutes(durationMinutes(start, end));
}

function durationMinutes(start: string, end: string) {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  return eh * 60 + em - sh * 60 - sm;
}

function formatMinutes(minutes: number) {
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

function Summary({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-xs font-medium text-text-secondary">{label}</dt><dd className="mt-1 text-sm font-semibold text-primary">{value}</dd></div>;
}

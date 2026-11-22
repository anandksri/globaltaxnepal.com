import type { Metadata } from "next";
import Link from "next/link";
import { getTaxReport } from "@/lib/admin/reports";
import { EmptyTable, ExportLinks, ReportFilters, SummaryGrid } from "../report-components";

export const metadata: Metadata = { title: "Tax and compliance reports" };
export const dynamic = "force-dynamic";

export default async function TaxReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const data = await getTaxReport(await searchParams);
  const filters = { from: data.from, to: data.to };
  return (
    <div className="report-print space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <p className="text-sm text-text-secondary">Date range filters the deadline lists; summary counts are all-time. Deadlines are administrator-entered, with no statutory schedule or filing status inferred.</p>
        <ExportLinks filters={filters} report="tax" />
      </div>
      <SummaryGrid items={[
        { label: "Tax records", value: String(data.taxRecords) },
        { label: "Pending compliance tasks", value: String(data.pendingTasks) },
        { label: "Completed tasks", value: String(data.completedTasks) },
        { label: "Overdue tasks", value: String(data.overdueTasks) },
      ]} />
      <ReportFilters action="/admin/reports/tax" from={data.from} to={data.to} />
      <DeadlineTable title="Upcoming deadlines" tasks={data.upcomingDeadlines} empty="No upcoming deadlines in this date range." />
      <DeadlineTable title="Overdue tasks" tasks={data.overdueRows} empty="No overdue tasks in this date range." overdue />
    </div>
  );
}

function DeadlineTable({
  title, tasks, empty, overdue = false,
}: {
  title: string;
  tasks: Array<{ id: string; title: string; dueDate: Date; category: string; status: string; client: { displayName: string } | null; href: string; kind: string }>;
  empty: string;
  overdue?: boolean;
}) {
  return (
    <section className="overflow-hidden border border-border bg-surface">
      <h2 className="border-b border-border px-4 py-3 font-semibold text-primary">{title}</h2>
      {tasks.length === 0 ? <EmptyTable message={empty} title="Nothing to show" /> : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[44rem] text-left text-sm">
            <thead className="bg-background text-xs uppercase tracking-wide text-text-secondary"><tr><th className="px-4 py-3">Record</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Client</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">Due date</th><th className="px-4 py-3">Status</th></tr></thead>
            <tbody className="divide-y divide-border">
              {tasks.map((task) => <tr key={task.id}>
                <td className="px-4 py-3"><Link className="font-medium text-secondary hover:text-primary" href={task.href}>{task.title}</Link></td>
                <td className="whitespace-nowrap px-4 py-3">{task.kind}</td>
                <td className="px-4 py-3">{task.client?.displayName ?? "Company"}</td>
                <td className="px-4 py-3">{task.category}</td>
                <td className="whitespace-nowrap px-4 py-3">{task.dueDate.toLocaleDateString("en-NP", { dateStyle: "medium", timeZone: "UTC" })}</td>
                <td className={`px-4 py-3 ${overdue ? "text-error" : task.status === "COMPLETED" ? "text-success" : "text-secondary"}`}>{overdue ? "Overdue" : task.status.replaceAll("_", " ")}</td>
              </tr>)}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

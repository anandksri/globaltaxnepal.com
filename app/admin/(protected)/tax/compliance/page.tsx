import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { dueDateState, listComplianceTasks } from "@/lib/admin/tax";
import { Pagination } from "../pagination";
import { requirePermission } from "@/lib/admin/auth";

export const metadata: Metadata = { title: "Compliance tracking" };
export const dynamic = "force-dynamic";

export default async function CompliancePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission("TAX", "VIEW");
  const result = await listComplianceTasks(await searchParams);
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-text-secondary">Track manually configured compliance tasks and due dates.</p>
        <Link className="button button-primary" href="/admin/tax/compliance/new"><Plus aria-hidden="true" className="size-4" strokeWidth={1.75} />Add task</Link>
      </div>
      <form action="/admin/tax/compliance" className="grid gap-3 border border-border bg-surface p-4 sm:grid-cols-2 lg:grid-cols-[minmax(12rem,1fr)_12rem_12rem_auto_auto]" method="get">
        <div>
          <label className="form-label" htmlFor="compliance-search">Search</label>
          <input className="form-control" defaultValue={result.q} id="compliance-search" maxLength={100} name="q" placeholder="Task, client, category, or assignee" type="search" />
        </div>
        <div>
          <label className="form-label" htmlFor="compliance-status">Status</label>
          <select className="form-control" defaultValue={result.status} id="compliance-status" name="status">
            <option value="">All statuses</option>
            <option value="open">Pending and in progress</option>
            <option value="PENDING">Pending</option>
            <option value="IN_PROGRESS">In progress</option>
            <option value="COMPLETED">Completed</option>
            <option value="OVERDUE">Overdue</option>
          </select>
        </div>
        <div>
          <label className="form-label" htmlFor="compliance-category">Category</label>
          <select className="form-control" defaultValue={result.category} id="compliance-category" name="category">
            <option value="">All categories</option>
            {result.categories.map((category) => <option key={category} value={category}>{category}</option>)}
          </select>
        </div>
        <button className="button button-primary self-end" type="submit">Apply filters</button>
        <Link className="button button-secondary self-end" href="/admin/tax/compliance">Clear</Link>
      </form>
      <section aria-label="Compliance tasks" className="overflow-hidden border border-border bg-surface">
        {result.tasks.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <h2 className="font-semibold text-primary">No compliance tasks found</h2>
            <p className="mt-1 text-sm text-text-secondary">{result.total === 0 ? "Tasks you create will appear here." : "Try changing the search or filters."}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[60rem] border-collapse text-left text-sm">
              <thead className="bg-background text-xs uppercase tracking-wide text-text-secondary">
                <tr><th className="px-4 py-3">Task</th><th className="px-4 py-3">Client</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">Due date</th><th className="px-4 py-3">Assigned to</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Action</th></tr>
              </thead>
              <tbody className="divide-y divide-border">
                {result.tasks.map((task) => {
                  const state = dueDateState(task.dueDate, task.status);
                  return (
                    <tr className="hover:bg-background/70" key={task.id}>
                      <td className="max-w-64 px-4 py-3"><Link className="font-medium text-secondary hover:text-primary" href={`/admin/tax/compliance/${task.id}`}>{task.title}</Link></td>
                      <td className="px-4 py-3">{task.client?.displayName ?? "Company"}</td>
                      <td className="px-4 py-3">{task.category}</td>
                      <td className="whitespace-nowrap px-4 py-3">{task.dueDate.toLocaleDateString("en-NP", { dateStyle: "medium", timeZone: "UTC" })}</td>
                      <td className="px-4 py-3">{task.assignedTo?.name ?? task.assignedTo?.email ?? "Unassigned"}</td>
                      <td className={`whitespace-nowrap px-4 py-3 font-medium ${state === "overdue" ? "text-error" : state === "due-soon" ? "text-warning" : task.status === "COMPLETED" ? "text-success" : "text-secondary"}`}>{state === "overdue" ? "Overdue" : state === "due-soon" ? `${statusLabel(task.status)} · Due soon` : statusLabel(task.status)}</td>
                      <td className="whitespace-nowrap px-4 py-3"><Link className="font-medium text-secondary hover:text-primary" href={`/admin/tax/compliance/${task.id}`}>View</Link></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {result.total > 0 && <Pagination page={result.page} pages={result.pages} total={result.total} params={{ q: result.q, status: result.status, category: result.category }} path="/admin/tax/compliance" />}
      </section>
    </div>
  );
}

function statusLabel(status: string) {
  return status === "COMPLETED" ? "Completed" : status === "IN_PROGRESS" ? "In progress" : "Pending";
}

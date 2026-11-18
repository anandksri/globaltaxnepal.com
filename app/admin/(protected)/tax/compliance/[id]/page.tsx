import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { completeComplianceTask } from "../../actions";
import { CompleteComplianceTaskForm } from "../../tax-forms";
import { dueDateState, getComplianceTask } from "@/lib/admin/tax";

export const metadata: Metadata = { title: "Compliance task" };
export const dynamic = "force-dynamic";

export default async function ComplianceTaskDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = z.string().min(1).max(191).safeParse(id);
  if (!parsed.success) notFound();
  const task = await getComplianceTask(parsed.data);
  if (!task) notFound();
  const deadlineState = dueDateState(task.dueDate, task.status);
  const stateLabel = task.status === "COMPLETED" ? "Completed" : deadlineState === "overdue" ? "Overdue" : task.status === "IN_PROGRESS" ? "In progress" : "Pending";
  const stateColor = task.status === "COMPLETED" ? "text-success" : deadlineState === "overdue" ? "text-error" : deadlineState === "due-soon" ? "text-warning" : "text-secondary";

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link className="text-sm font-medium text-secondary hover:text-primary" href="/admin/tax/compliance">← Compliance tasks</Link>
        <Link className="button button-secondary" href={`/admin/tax/compliance/${task.id}/edit`}>Edit task</Link>
      </div>
      <section className="border border-border bg-surface p-5 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">{task.category}</p>
            <h2 className="mt-1 text-xl font-semibold text-primary">{task.title}</h2>
            {task.client ? <Link className="mt-1 inline-block text-sm font-medium text-secondary hover:text-primary" href={`/admin/clients/${task.client.id}`}>{task.client.displayName}</Link> : <p className="mt-1 text-sm text-text-secondary">Company task</p>}
          </div>
          <span className={`text-sm font-semibold ${stateColor}`}>{stateLabel}</span>
        </div>
        <dl className="grid gap-x-6 gap-y-4 py-5 sm:grid-cols-2">
          <Detail label="Due date" value={dateLabel(task.dueDate)} />
          <Detail label="Completion date" value={task.completedAt ? dateLabel(task.completedAt) : "Not completed"} />
          <Detail label="Assigned to" value={task.assignedTo?.name ?? task.assignedTo?.email ?? "Unassigned"} />
          <Detail label="Created by" value={task.createdBy?.name ?? task.createdBy?.email ?? "—"} />
          <Detail label="Description" value={task.description || "—"} />
          <Detail label="Notes" value={task.notes || "—"} />
        </dl>
        {task.status !== "COMPLETED" && (
          <div className="border-t border-border py-4">
            <CompleteComplianceTaskForm action={completeComplianceTask.bind(null, task.id)} />
          </div>
        )}
        <div className="border-t border-border pt-4">
          <h3 className="text-sm font-semibold text-primary">Related documents</h3>
          {task.documents.length === 0 ? <p className="mt-2 text-sm text-text-secondary">No documents linked.</p> : (
            <ul className="mt-2 space-y-2">
              {task.documents.map(({ document }) => <li key={document.id}><Link className="text-sm font-medium text-secondary hover:text-primary" href={`/admin/documents/${document.id}`}>{document.title}<span className="ml-2 font-normal text-text-secondary">{document.originalName}</span></Link></li>)}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

function dateLabel(date: Date) {
  return date.toLocaleDateString("en-NP", { dateStyle: "medium", timeZone: "UTC" });
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-xs font-semibold uppercase tracking-wide text-text-secondary">{label}</dt><dd className="mt-1 whitespace-pre-wrap break-words text-sm text-primary">{value}</dd></div>;
}

import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { requireAdmin } from "@/lib/admin/auth";
import { prisma } from "@/lib/prisma";
import { markAssignedTaskComplete } from "./actions";

export const metadata: Metadata = { title: "My tasks" };
export const dynamic = "force-dynamic";

export default async function MyTasksPage() {
  const admin = await requireAdmin();
  const tasks = await prisma.complianceTask.findMany({
    where: { assignedToId: admin.id },
    orderBy: [{ status: "asc" }, { dueDate: "asc" }],
    include: {
      client: { select: { id: true, displayName: true } },
    },
  });

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm text-text-secondary">
          Tasks assigned to {admin.name || admin.email}.
        </p>
      </div>
      {tasks.length === 0 ? (
        <section className="border border-border bg-surface px-5 py-12 text-center">
          <h2 className="font-semibold text-primary">No tasks assigned</h2>
          <p className="mt-1 text-sm text-text-secondary">
            Assigned work will appear here.
          </p>
        </section>
      ) : (
        <section className="grid gap-4 lg:grid-cols-2">
          {tasks.map((task) => (
            <article
              className="border border-border bg-surface p-5"
              key={task.id}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                    {task.category}
                  </p>
                  <h2 className="mt-1 text-lg font-semibold text-primary">
                    {task.title}
                  </h2>
                  <p className="mt-1 text-sm text-text-secondary">
                    {task.client?.displayName || "Company task"}
                  </p>
                </div>
                <span
                  className={`whitespace-nowrap text-xs font-semibold ${
                    task.status === "COMPLETED"
                      ? "text-success"
                      : task.status === "IN_PROGRESS"
                        ? "text-warning"
                        : "text-secondary"
                  }`}
                >
                  {task.status === "COMPLETED"
                    ? "Completed"
                    : task.status === "IN_PROGRESS"
                      ? "In progress"
                      : "Pending"}
                </span>
              </div>
              {task.description && (
                <p className="mt-4 text-sm leading-6 text-text-secondary">
                  {task.description}
                </p>
              )}
              {task.notes && (
                <div className="mt-4 border-l-2 border-secondary bg-background px-3 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-secondary">
                    Admin assignment note
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-text-secondary">
                    {task.notes}
                  </p>
                </div>
              )}
              <dl className="mt-4 border-t border-border pt-4">
                <dt className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                  Due date
                </dt>
                <dd className="mt-1 text-sm text-primary">
                  {task.dueDate.toLocaleDateString("en-NP", {
                    dateStyle: "medium",
                    timeZone: "UTC",
                  })}
                </dd>
              </dl>
              {task.status !== "COMPLETED" && (
                <form action={markAssignedTaskComplete.bind(null, task.id)} className="mt-5">
                  <button
                    className="button button-primary w-full"
                    type="submit"
                  >
                    <CheckCircle2 aria-hidden="true" className="size-4" />
                    Mark as done
                  </button>
                </form>
              )}
              {task.status === "COMPLETED" && (
                <Link
                  className="mt-5 inline-flex text-sm font-semibold text-success"
                  href="/admin/my-tasks"
                >
                  Completed
                </Link>
              )}
            </article>
          ))}
        </section>
      )}
    </div>
  );
}

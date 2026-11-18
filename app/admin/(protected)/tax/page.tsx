import type { Metadata } from "next";
import Link from "next/link";
import { getTaxDashboard } from "@/lib/admin/tax";

export const metadata: Metadata = { title: "Tax & compliance" };
export const dynamic = "force-dynamic";

export default async function TaxDashboardPage() {
  const dashboard = await getTaxDashboard();
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3">
        <Link className="button button-secondary" href="/admin/tax/records">Tax records</Link>
        <Link className="button button-primary" href="/admin/tax/compliance">Compliance tasks</Link>
      </div>
      <section aria-label="Tax and compliance summary" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Summary label="Tax records" value={String(dashboard.totalTaxRecords)} href="/admin/tax/records" />
        <Summary label="Pending tasks" value={String(dashboard.pendingTasks)} href="/admin/tax/compliance?status=open" />
        <Summary label="Completed tasks" value={String(dashboard.completedTasks)} href="/admin/tax/compliance?status=COMPLETED" />
        <Summary label="Overdue items" value={String(dashboard.overdueCount)} href="/admin/tax/compliance" tone={dashboard.overdueCount ? "error" : "normal"} />
      </section>
      <p className="text-sm text-text-secondary">
        Due soon means within 7 days. Upcoming deadlines are shown through the next 30 days. Dates are manually managed; no statutory deadlines are assumed.
      </p>
      <div className="grid gap-5 xl:grid-cols-2">
        <DeadlineSection title="Upcoming deadlines" entries={dashboard.upcomingDeadlines} empty="No upcoming deadlines within 30 days." />
        <DeadlineSection title="Overdue deadlines" entries={dashboard.overdueDeadlines} empty="No overdue items." />
      </div>
    </div>
  );
}

function Summary({
  label,
  value,
  href,
  tone = "normal",
}: {
  label: string;
  value: string;
  href: string;
  tone?: "normal" | "error";
}) {
  return (
    <Link className="border border-border bg-surface px-4 py-4 hover:border-secondary" href={href}>
      <p className="text-sm text-text-secondary">{label}</p>
      <p className={`mt-2 text-2xl font-semibold ${tone === "error" ? "text-error" : "text-primary"}`}>{value}</p>
    </Link>
  );
}

function DeadlineSection({
  title,
  entries,
  empty,
}: {
  title: string;
  entries: Array<{ id: string; href: string; title: string; party: string; dueDate: Date; kind: string; state: string }>;
  empty: string;
}) {
  return (
    <section className="border border-border bg-surface">
      <h2 className="border-b border-border px-4 py-3 font-semibold text-primary">{title}</h2>
      {entries.length === 0 ? (
        <p className="px-4 py-8 text-sm text-text-secondary">{empty}</p>
      ) : (
        <ul className="divide-y divide-border">
          {entries.map((entry) => (
            <li className="flex flex-wrap items-center justify-between gap-3 px-4 py-3" key={entry.id}>
              <div className="min-w-0">
                <Link className="block truncate text-sm font-medium text-secondary hover:text-primary" href={entry.href}>{entry.title}</Link>
                <p className="mt-1 text-xs text-text-secondary">{entry.party} · {entry.kind}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className={`text-xs font-semibold ${entry.state === "overdue" ? "text-error" : entry.state === "due-soon" ? "text-warning" : "text-text-secondary"}`}>
                  {entry.state === "overdue" ? "Overdue" : entry.state === "due-soon" ? "Due soon" : "Upcoming"}
                </p>
                <p className="mt-1 text-xs text-text-secondary">{entry.dueDate.toLocaleDateString("en-NP", { dateStyle: "medium", timeZone: "UTC" })}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

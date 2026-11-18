import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin/auth";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Overview",
};

export const dynamic = "force-dynamic";

function SummaryItem({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <section className="border border-border bg-surface p-5 sm:p-6">
      <h2 className="text-sm font-medium text-text-secondary">{label}</h2>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-primary">
        {value}
      </p>
    </section>
  );
}

export default async function AdminOverviewPage() {
  await requireAdmin();

  const [clientCount, userCount, activityCount, recentActivity, settings] =
    await Promise.all([
      prisma.client.count(),
      prisma.user.count(),
      prisma.activityLog.count(),
      prisma.activityLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          action: true,
          targetType: true,
          targetId: true,
          createdAt: true,
          actor: { select: { name: true, email: true } },
        },
      }),
      prisma.companySettings.findUnique({
        where: { id: "company" },
        select: { name: true, email: true, phone: true },
      }),
    ]);

  return (
    <div className="space-y-8">
      <section
        aria-label="Business summary"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
        id="business-summary"
      >
        <SummaryItem label="Clients" value={clientCount} />
        <SummaryItem label="User accounts" value={userCount} />
        <SummaryItem label="Recorded activity" value={activityCount} />
      </section>

      <section
        aria-labelledby="company-profile-heading"
        className="border border-border bg-surface p-5 sm:p-6"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2
              className="text-base font-semibold text-primary"
              id="company-profile-heading"
            >
              Company profile
            </h2>
            <p className="mt-1 text-sm text-text-secondary">
              Internal company settings, when configured.
            </p>
          </div>
        </div>
        {settings ? (
          <dl className="mt-5 grid gap-4 border-t border-border pt-5 sm:grid-cols-3">
            <div>
              <dt className="text-xs font-medium text-text-secondary">Name</dt>
              <dd className="mt-1 text-sm text-text">
                {settings.name || "Not configured"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-text-secondary">Email</dt>
              <dd className="mt-1 break-all text-sm text-text">
                {settings.email || "Not configured"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-text-secondary">Phone</dt>
              <dd className="mt-1 text-sm text-text">
                {settings.phone || "Not configured"}
              </dd>
            </div>
          </dl>
        ) : (
          <p className="mt-5 border-t border-border pt-5 text-sm text-text-secondary">
            No company profile settings have been added.
          </p>
        )}
      </section>

      <section
        aria-labelledby="recent-activity-heading"
        className="border border-border bg-surface"
        id="recent-activity"
      >
        <div className="border-b border-border px-5 py-4 sm:px-6">
          <h2
            className="text-base font-semibold text-primary"
            id="recent-activity-heading"
          >
            Recent activity
          </h2>
          <p className="mt-1 text-sm text-text-secondary">
            Administrative actions recorded in the system.
          </p>
        </div>
        {recentActivity.length ? (
          <ul className="divide-y divide-border">
            {recentActivity.map((item) => (
              <li
                className="flex flex-col gap-1 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-6"
                key={item.id}
              >
                <div>
                  <p className="text-sm font-medium text-text">
                    {item.action.replaceAll(/[_-]/g, " ")}
                    {item.targetType ? ` · ${item.targetType}` : ""}
                    {item.targetId ? ` ${item.targetId}` : ""}
                  </p>
                  <p className="mt-1 text-xs text-text-secondary">
                    {item.actor?.name || item.actor?.email || "Former user"}
                  </p>
                </div>
                <time
                  className="text-xs text-text-secondary"
                  dateTime={item.createdAt.toISOString()}
                >
                  {item.createdAt.toLocaleString("en-NP", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </time>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-5 py-6 text-sm text-text-secondary sm:px-6">
            No activity has been recorded yet.
          </p>
        )}
      </section>
    </div>
  );
}

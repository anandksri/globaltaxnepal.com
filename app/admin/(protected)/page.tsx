import type { Metadata } from "next";
import { AdminModule, PermissionAction } from "@prisma/client";
import Link from "next/link";
import { requirePermission } from "@/lib/admin/auth";
import { getAccountsOverview } from "@/lib/admin/accounts";
import { formatCurrency, moneyToCents } from "@/lib/admin/billing";
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
  const admin = await requirePermission("DASHBOARD", "VIEW");
  const canViewStudents =
    admin.roleName === "SUPER_ADMIN" ||
    admin.permissions.some(
      (permission) =>
        permission.module === AdminModule.STUDENTS &&
        permission.action === PermissionAction.VIEW,
    );
  const canCreateStudents =
    admin.roleName === "SUPER_ADMIN" ||
    admin.permissions.some(
      (permission) =>
        permission.module === AdminModule.STUDENTS &&
        permission.action === PermissionAction.CREATE,
    );
  const canViewAccounts =
    admin.roleName === "SUPER_ADMIN" ||
    admin.permissions.some(
      (permission) => permission.module === "ACCOUNTS" && permission.action === "VIEW",
    );

  const [
    clientCount,
    userCount,
    activityCount,
    recentActivity,
    settings,
    studentCount,
    recentStudents,
    recentEnquiries,
    enquiryCount,
  ] =
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
      canViewStudents ? prisma.studentRegistration.count() : Promise.resolve(0),
      canViewStudents
        ? prisma.studentRegistration.findMany({
            orderBy: { createdAt: "desc" },
            take: 5,
            select: {
              id: true,
              studentName: true,
              admissionBatch: true,
              approvalStatus: true,
              createdAt: true,
            },
          })
        : Promise.resolve([]),
      prisma.websiteEnquiry.findMany({
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: 5,
        select: { id: true, name: true, subject: true, createdAt: true },
      }),
      prisma.websiteEnquiry.count(),
    ]);
  const accountOverview = canViewAccounts ? await getAccountsOverview() : null;

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

      <section aria-labelledby="enquiries-heading" className="border border-border bg-surface" id="enquiries">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4 sm:px-6">
          <div>
            <h2 className="text-base font-semibold text-primary" id="enquiries-heading">Website enquiries</h2>
            <p className="mt-1 text-sm text-text-secondary">{enquiryCount} {enquiryCount === 1 ? "enquiry" : "enquiries"} received</p>
          </div>
          <Link className="button button-secondary" href="/admin/enquiries">View all enquiries</Link>
        </div>
        {recentEnquiries.length ? (
          <ul className="divide-y divide-border">
            {recentEnquiries.map((enquiry) => (
              <li className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 sm:px-6" key={enquiry.id}>
                <div>
                  <Link className="text-sm font-medium text-secondary hover:text-primary" href={`/admin/enquiries#enquiry-${enquiry.id}`}>
                    {enquiry.name}
                  </Link>
                  <p className="mt-1 text-xs text-text-secondary">{enquiry.subject || "Website enquiry"}</p>
                </div>
                <time className="text-xs text-text-secondary" dateTime={enquiry.createdAt.toISOString()}>
                  {enquiry.createdAt.toLocaleString("en-NP", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kathmandu" })}
                </time>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-5 py-6 text-sm text-text-secondary sm:px-6">No website enquiries have been received yet.</p>
        )}
      </section>

      {canViewStudents && (
        <section
          aria-labelledby="student-details-heading"
          className="border border-border bg-surface"
          id="student-details"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4 sm:px-6">
            <div>
              <h2 className="text-base font-semibold text-primary" id="student-details-heading">
                Student details
              </h2>
              <p className="mt-1 text-sm text-text-secondary">
                {studentCount} student {studentCount === 1 ? "registration" : "registrations"}
              </p>
            </div>
            <div className="flex gap-2">
              <Link className="button button-secondary" href="/admin/students">View students</Link>
              {canCreateStudents && (
                <Link className="button button-primary" href="/admin/students/new">Register student</Link>
              )}
            </div>
          </div>
          {recentStudents.length > 0 ? (
            <ul className="divide-y divide-border">
              {recentStudents.map((student) => (
                <li
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 sm:px-6"
                  key={student.id}
                >
                  <div>
                    <Link className="text-sm font-medium text-secondary hover:text-primary" href={`/admin/students/${student.id}`}>
                      {student.studentName}
                    </Link>
                    <p className="mt-1 text-xs text-text-secondary">
                      {student.admissionBatch || "No batch"} · {student.createdAt.toLocaleDateString("en-NP", { dateStyle: "medium", timeZone: "UTC" })}
                    </p>
                  </div>
                  <span className="text-xs font-medium text-text-secondary">
                    {student.approvalStatus.toLowerCase()}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-5 py-6 text-sm text-text-secondary sm:px-6">
              No students have been registered yet.
            </p>
          )}
        </section>
      )}

      {accountOverview && (
        <section aria-labelledby="financial-summary-heading" className="space-y-3">
          <h2 className="text-base font-semibold text-primary" id="financial-summary-heading">
            Financial summary
          </h2>
          {accountOverview.totalsByCurrency.length ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {accountOverview.totalsByCurrency.map((totals) => (
                <section className="border border-border bg-surface p-4" key={totals.currencyCode}>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                    {totals.currencyCode}
                  </h3>
                  <dl className="mt-3 space-y-2 text-sm">
                    <div className="flex justify-between gap-3">
                      <dt className="text-text-secondary">Income</dt>
                      <dd className="font-medium text-text">{formatCurrency(moneyToCents(totals.totalIncome), totals.currencyCode)}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-text-secondary">Expenses</dt>
                      <dd className="font-medium text-text">{formatCurrency(moneyToCents(totals.totalExpenses), totals.currencyCode)}</dd>
                    </div>
                    <div className="flex justify-between gap-3 border-t border-border pt-2">
                      <dt className="font-medium text-text">Net balance</dt>
                      <dd className="font-semibold text-primary">{formatCurrency(moneyToCents(totals.netBalance), totals.currencyCode)}</dd>
                    </div>
                  </dl>
                </section>
              ))}
            </div>
          ) : (
            <p className="border border-border bg-surface px-4 py-5 text-sm text-text-secondary">
              No financial activity recorded.
            </p>
          )}
        </section>
      )}

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

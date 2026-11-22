import type { Metadata } from "next";
import Link from "next/link";
import { formatCurrency, moneyToCents } from "@/lib/admin/billing";
import { getReportsDashboard } from "@/lib/admin/reports";
import { ExportLinks, ReportFilters, SummaryGrid } from "./report-components";

export const metadata: Metadata = { title: "Reports" };
export const dynamic = "force-dynamic";

export default async function ReportsDashboard({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const data = await getReportsDashboard(await searchParams);
  const filters = { from: data.from, to: data.to };
  const currencies = new Set([
    ...data.billed.map((row) => row.currencyCode),
    ...data.paymentsReceived.map((row) => row.currencyCode),
    ...data.outstanding.map((row) => row.currencyCode),
    ...data.financial.map((row) => row.currencyCode),
  ]);
  if (currencies.size === 0) currencies.add(data.currencyCode);
  return (
    <div className="report-print space-y-6 print:space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <p className="text-sm text-text-secondary">Date filters apply to transaction dates; billing totals exclude drafts and cancellations. Outstanding reflects selected-period issued bills.</p>
        <ExportLinks filters={filters} report="overview" />
      </div>
      <ReportFilters action="/admin/reports" from={data.from} to={data.to} />
      {[...currencies].sort().map((currencyCode) => {
        const find = (rows: Array<{ currencyCode: string; amount: string }>) =>
          rows.find((row) => row.currencyCode === currencyCode)?.amount ?? "0.00";
        const financial = data.financial.find((row) => row.currencyCode === currencyCode);
        return (
          <section aria-label={`${currencyCode} financial summary`} className="space-y-3" key={currencyCode}>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-text-secondary">{currencyCode} summary</h2>
            <SummaryGrid items={[
              { label: "Total billing amount", value: formatCurrency(moneyToCents(find(data.billed)), currencyCode) },
              { label: "Payments received", value: formatCurrency(moneyToCents(find(data.paymentsReceived)), currencyCode) },
              { label: "Outstanding balances", value: formatCurrency(moneyToCents(find(data.outstanding)), currencyCode) },
              { label: "Total income", value: formatCurrency(moneyToCents(financial?.totalIncome ?? "0"), currencyCode) },
              { label: "Total expenses", value: formatCurrency(moneyToCents(financial?.totalExpenses ?? "0"), currencyCode) },
              { label: "Net balance", value: formatCurrency(moneyToCents(financial?.netBalance ?? "0"), currencyCode) },
            ]} />
          </section>
        );
      })}

      <section className="border border-border bg-surface">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
          <h2 className="font-semibold text-primary">Recent financial activity</h2>
          <Link className="text-sm font-medium text-secondary hover:text-primary" href={`/admin/reports/financial${queryString(filters)}`}>View financial report</Link>
        </div>
        {data.activity.length === 0 ? <p className="px-4 py-9 text-sm text-text-secondary">No financial activity recorded for this period.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[54rem] text-left text-sm">
              <thead className="bg-background text-xs uppercase tracking-wide text-text-secondary"><tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Reference</th><th className="px-4 py-3">Party</th><th className="px-4 py-3">Description</th><th className="px-4 py-3">Type</th><th className="px-4 py-3 text-right">Amount</th></tr></thead>
              <tbody className="divide-y divide-border">
                {data.activity.map((item) => <tr key={item.id}>
                  <td className="whitespace-nowrap px-4 py-3">{item.date.toLocaleDateString("en-NP", { dateStyle: "medium", timeZone: "UTC" })}</td>
                  <td className="whitespace-nowrap px-4 py-3"><Link className="font-medium text-secondary hover:text-primary" href={item.href}>{item.reference}</Link></td>
                  <td className="max-w-48 truncate px-4 py-3">{item.party}</td>
                  <td className="max-w-64 truncate px-4 py-3 text-text-secondary">{item.description}</td>
                  <td className={item.direction === "Income" ? "px-4 py-3 text-success" : "px-4 py-3 text-warning"}>{item.direction}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">{formatCurrency(moneyToCents(item.amount), item.currencyCode)}</td>
                </tr>)}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="border border-border bg-surface">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
          <h2 className="font-semibold text-primary">Tax and compliance snapshot</h2>
          <Link className="text-sm font-medium text-secondary hover:text-primary" href="/admin/reports/tax">View tax report</Link>
        </div>
        <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-4">
          <SmallSummary label="Tax records" value={String(data.tax.totalRecords)} />
          <SmallSummary label="Pending compliance" value={String(data.tax.pendingTasks)} />
          <SmallSummary label="Completed tasks" value={String(data.tax.completedTasks)} />
          <SmallSummary label="Overdue tasks" value={String(data.tax.overdueTasks)} />
        </div>
      </section>
      <div className="flex flex-wrap gap-3 border-t border-border pt-4 print:hidden">
        <Link className="button button-secondary" href={`/admin/reports/billing${queryString(filters)}`}>Billing report</Link>
        <Link className="button button-secondary" href={`/admin/reports/clients${queryString(filters)}`}>Client report</Link>
        <Link className="button button-secondary" href={`/admin/reports/financial${queryString(filters)}`}>Income &amp; expense report</Link>
      </div>
    </div>
  );
}

function SmallSummary({ label, value }: { label: string; value: string }) {
  return <div className="border border-border px-3 py-3"><p className="text-sm text-text-secondary">{label}</p><p className="mt-1 text-lg font-semibold text-primary">{value}</p></div>;
}

function queryString(filters: Record<string, string>) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) if (value) query.set(key, value);
  const value = query.toString();
  return value ? `?${value}` : "";
}

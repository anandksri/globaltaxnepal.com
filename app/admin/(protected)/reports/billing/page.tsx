import type { Metadata } from "next";
import Link from "next/link";
import { getBillingReport } from "@/lib/admin/reports";
import { formatCurrency, moneyToCents } from "@/lib/admin/billing";
import { EmptyTable, ExportLinks, ReportFilters, ReportPagination } from "../report-components";

export const metadata: Metadata = { title: "Billing reports" };
export const dynamic = "force-dynamic";

export default async function BillingReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const data = await getBillingReport(await searchParams);
  const filters = { from: data.from, to: data.to, client: data.clientId, status: data.status };
  return (
    <div className="report-print space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <p className="text-sm text-text-secondary">Normal and Details Bills are listed together. Paid amounts include all recorded payments; draft and cancelled bills are excluded from billing and receivable totals.</p>
        <ExportLinks filters={filters} report="billing" />
      </div>
      <ReportFilters action="/admin/reports/billing" clientId={data.clientId} clients={data.clients} from={data.from} showClient showStatus status={data.status} to={data.to} />
      {data.totalsByCurrency.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-3">
          {data.totalsByCurrency.map((row) => <div className="contents" key={row.currencyCode}>
            <Summary label={`Total billed · ${row.currencyCode}`} value={formatCurrency(moneyToCents(row.billed), row.currencyCode)} />
            <Summary label={`Paid · ${row.currencyCode}`} value={formatCurrency(moneyToCents(row.paid), row.currencyCode)} />
            <Summary label={`Outstanding · ${row.currencyCode}`} value={formatCurrency(moneyToCents(row.outstanding), row.currencyCode)} />
          </div>)}
        </div>
      )}
      <section aria-label="Billing report" className="overflow-hidden border border-border bg-surface">
        {data.rows.length === 0 ? <EmptyTable message="No bill records match the selected filters." title="No billing records" /> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[70rem] text-left text-sm">
              <thead className="bg-background text-xs uppercase tracking-wide text-text-secondary"><tr><th className="px-4 py-3">Bill number</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Client</th><th className="px-4 py-3">Bill date</th><th className="px-4 py-3 text-right">Total</th><th className="px-4 py-3 text-right">Paid</th><th className="px-4 py-3 text-right">Outstanding</th><th className="px-4 py-3">Status</th></tr></thead>
              <tbody className="divide-y divide-border">
                {data.rows.map((row) => <tr key={row.id}>
                  <td className="whitespace-nowrap px-4 py-3"><Link className="font-medium text-secondary hover:text-primary" href={`/admin/billing/${row.id}`}>{row.billNumber}</Link></td>
                  <td className="px-4 py-3">{row.billType === "NORMAL" ? "Normal Bill" : "Details Bill"}</td>
                  <td className="max-w-52 truncate px-4 py-3">{row.clientName}</td>
                  <td className="whitespace-nowrap px-4 py-3">{row.billDate.toLocaleDateString("en-NP", { dateStyle: "medium", timeZone: "UTC" })}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">{formatCurrency(moneyToCents(row.totalAmount), row.currencyCode)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">{formatCurrency(moneyToCents(row.paidAmount), row.currencyCode)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">{formatCurrency(moneyToCents(row.outstandingAmount), row.currencyCode)}</td>
                  <td className="whitespace-nowrap px-4 py-3">{row.status.replaceAll("_", " ")}</td>
                </tr>)}
              </tbody>
            </table>
          </div>
        )}
        <ReportPagination filters={filters} page={data.page} pages={data.pages} path="/admin/reports/billing" total={data.total} />
      </section>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return <div className="border border-border bg-surface px-4 py-4"><p className="text-sm text-text-secondary">{label}</p><p className="mt-2 text-xl font-semibold text-primary">{value}</p></div>;
}
